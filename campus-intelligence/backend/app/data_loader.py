import os
try:
    from dotenv import load_dotenv
    load_dotenv()
    parent_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
    if os.path.exists(parent_env):
        load_dotenv(parent_env)
except ImportError:
    pass

import re
import pandas as pd
from typing import Optional, Dict, Any, List
from app.schemas import DatasetSummary

DEFAULT_CSV_PATH = os.getenv("DEFAULT_DATASET_PATH") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "campus_electricity.csv"))

ENTITY_ALIASES = {
    "building": "building", "building_name": "building", "location": "building",
    "facility": "building", "facility_name": "building", "building_id": "building", "site": "building",
    "site_name": "building", "station": "building", "zone": "building",
    "area": "building", "department": "building", "campus_area": "building",
}
NON_METRIC_COLUMNS = {"id", "record_id", "row_id", "index", "timestamp", "date", "timestamp_dt", "year", "month", "day", "hour", "lat", "lon", "latitude", "longitude"}
NON_METRIC_PARTS = ("_id", "_latitude", "_longitude", "_year", "_month", "_day", "_hour")
NON_ADDITIVE_PARTS = ("aqi", "pm25", "air_quality", "co2", "temperature", "humidity", "concentration", "index", "score", "decibel", "noise_level")


def metric_aggregation(column: str) -> str:
    compact = re.sub(r"[^a-z0-9]+", "", column.lower())
    return "mean" if any(term.replace("_", "") in compact for term in NON_ADDITIVE_PARTS) else "sum"


def metric_unit(column: str) -> str:
    name = column.lower().replace("_", " ")
    compact = re.sub(r"[^a-z0-9]+", "", name)
    if "pm25" in compact:
        return "µg/m³"
    if "aqi" in compact:
        return "index"
    if any(term in compact for term in ("occupancy", "people", "students", "attendance")):
        return "people"
    if "trip" in compact or "ridership" in compact:
        return "trips"
    if "count" in compact or "records" in compact:
        return "records"
    units = [
        (("kwh", "kilowatt hour"), "kWh"), (("kw", "kilowatt"), "kW"),
        (("mwh", "megawatt hour"), "MWh"), (("liter", "litre", " l "), "L"),
        (("gallon", "gal"), "gal"), (("m3", "cubic meter", "cubic metre"), "m³"),
        (("kg", "kilogram"), "kg"), (("tonne", "tons", "ton"), "tons"),
        (("usd", "dollar", "cost", "spend", "price", "amount"), "$"),
        (("ppm",), "ppm"), (("ppb",), "ppb"), (("pm25", "pm 2 5"), "µg/m³"), (("aqi", "index"), "index"),
        (("co2",), "ppm"), (("minute", "minutes", "min"), "minutes"),
        (("hour", "hours", " hr "), "hours"), (("visits",), "visits"),
        (("percent", "percentage", "rate"), "%"),
    ]
    padded = f" {name.replace('_', ' ')} "
    for terms, unit in units:
        if any(term in padded for term in terms):
            return unit
    return "units"


def metric_columns(df: pd.DataFrame) -> List[str]:
    return [
        col for col in df.columns
        if col not in NON_METRIC_COLUMNS
        and not any(part in col for part in NON_METRIC_PARTS)
        and pd.api.types.is_numeric_dtype(df[col])
    ]


def entity_column(df: pd.DataFrame) -> Optional[str]:
    if "building" in df.columns:
        return "building"
    excluded = {"timestamp", "timestamp_dt", "date", "period", "is_weekend"}
    candidates = [column for column in df.columns if column not in excluded and not pd.api.types.is_numeric_dtype(df[column])]
    return next((column for column in candidates if 1 < df[column].nunique(dropna=True) <= 50), None)


def primary_metric_for(df: pd.DataFrame) -> str:
    columns = metric_columns(df)
    if not columns:
        return "record_count"
    priorities = ("kwh", "energy", "water", "waste", "aqi", "pm25", "air_quality", "mobility", "usage", "consumption")
    for term in priorities:
        match = next((column for column in columns if term.replace("_", "") in re.sub(r"[^a-z0-9]+", "", column.lower())), None)
        if match:
            return match
    return columns[0]

class DataLoader:
    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self.current_filename: str = "campus_electricity.csv"
        self.load_default()

    def load_default(self) -> bool:
        if os.path.exists(DEFAULT_CSV_PATH):
            return self.load_from_csv(DEFAULT_CSV_PATH, filename="campus_electricity.csv")
        return False

    def load_from_csv(self, file_path_or_buffer, filename: str = "uploaded_dataset.csv") -> bool:
        try:
            df = pd.read_csv(file_path_or_buffer)
            if df.empty or len(df.columns) == 0:
                return False

            # Standardize headings while preserving the user's resource-specific field names.
            df.columns = [re.sub(r"[^a-z0-9]+", "_", str(c).strip().lower()).strip("_") for c in df.columns]
            if len(set(df.columns)) != len(df.columns):
                return False

            col_map = {column: ENTITY_ALIASES[column] for column in df.columns if column in ENTITY_ALIASES}
            time_column = next((column for column in ("timestamp", "datetime", "date_time", "date", "time", "observed_at", "recorded_at", "recorded_date", "recorded_time", "collection_date", "sample_date", "measurement_date", "created_at", "collected_at") if column in df.columns), None)
            if time_column:
                col_map[time_column] = "timestamp"
            df = df.rename(columns=col_map)
            if "building" in df.columns:
                df["building"] = df["building"].map(lambda value: str(value) if pd.notna(value) else None)

            # Convert numeric-looking fields, including values formatted with commas or units.
            for column in df.columns:
                if column == "timestamp" or column == "building":
                    continue
                source = df[column]
                cleaned = source.astype(str).str.replace(",", "", regex=False).str.replace(r"[^0-9eE+.-]", "", regex=True).str.strip()
                converted = pd.to_numeric(cleaned, errors="coerce")
                nonempty = source.notna() & source.astype(str).str.strip().ne("")
                if nonempty.any() and converted[nonempty].notna().mean() >= 0.8:
                    df[column] = converted

            # Parse recognizable date values for time-series grouping and reporting.
            if "timestamp" in df.columns:
                parsed_dates = pd.to_datetime(df["timestamp"], errors="coerce")
                if parsed_dates.notna().any():
                    df["timestamp"] = parsed_dates.dt.strftime("%Y-%m-%d %H:%M:%S")
                    df["date"] = parsed_dates.dt.strftime("%Y-%m-%d")
                    df["timestamp_dt"] = parsed_dates
                else:
                    df["timestamp"] = None
                    df["timestamp_dt"] = parsed_dates

            if not metric_columns(df):
                df["record_count"] = 1

            self.df = df
            self.current_filename = filename
            return True
        except Exception as e:
            print(f"Error loading CSV {filename}: {e}")
            return False

    def get_dataframe(self) -> pd.DataFrame:
        if self.df is None:
            self.load_default()
        return self.df

    def get_summary(self) -> DatasetSummary:
        df = self.get_dataframe()
        if df is None or df.empty:
            return DatasetSummary(
                filename="none",
                total_records=0,
                buildings=[],
                date_range_start="N/A",
                date_range_end="N/A",
                total_kwh=0.0,
                avg_kwh=0.0,
                total_cost=0.0,
                columns=[]
            )

        entity_col = entity_column(df)
        buildings = sorted(df[entity_col].dropna().astype(str).unique().tolist()) if entity_col else []
        
        start_date = "N/A"
        end_date = "N/A"
        if "timestamp" in df.columns:
            sorted_ts = df["timestamp"].dropna().sort_values()
            if not sorted_ts.empty:
                start_date = str(sorted_ts.iloc[0])[:10]
                end_date = str(sorted_ts.iloc[-1])[:10]

        metrics = metric_columns(df)
        primary_metric = primary_metric_for(df)
        if primary_metric == "record_count" and primary_metric not in df.columns:
            df[primary_metric] = 1
            metrics = [primary_metric]
        primary = df[primary_metric]
        primary_aggregation = metric_aggregation(primary_metric)
        primary_total = float(primary.mean()) if primary_aggregation == "mean" and primary.notna().any() else float(primary.sum())
        primary_average = float(primary.mean()) if primary.notna().any() else 0.0
        total_kwh = float(df["kwh_usage"].sum()) if "kwh_usage" in df.columns else 0.0
        avg_kwh = float(df["kwh_usage"].mean()) if "kwh_usage" in df.columns else 0.0
        total_cost = float(df["cost_usd"].sum()) if "cost_usd" in df.columns else 0.0

        return DatasetSummary(
            filename=self.current_filename,
            total_records=len(df),
            buildings=buildings,
            date_range_start=start_date,
            date_range_end=end_date,
            total_kwh=round(total_kwh, 2),
            avg_kwh=round(avg_kwh, 2),
            total_cost=round(total_cost, 2),
            columns=[c for c in df.columns if c != "timestamp_dt"],
            metric_columns=metrics,
            primary_metric=primary_metric,
            entity_column=entity_col,
            primary_total=round(primary_total, 2),
            primary_average=round(primary_average, 2),
            primary_unit=metric_unit(primary_metric),
            primary_aggregation=primary_aggregation,
            missing_primary_values=int(primary.isna().sum()),
            missing_date_values=int(df["timestamp"].isna().sum()) if "timestamp" in df.columns else 0
        )

    def get_sample_records(self, limit: int = 15) -> List[Dict[str, Any]]:
        df = self.get_dataframe()
        if df is None or df.empty:
            return []
        
        # Exclude internal helper columns like timestamp_dt from preview
        display_cols = [c for c in df.columns if c != "timestamp_dt"]
        sample_df = df[display_cols].head(limit)
        return sample_df.to_dict(orient="records")

# Singleton instance
data_loader = DataLoader()

