import pandas as pd
from typing import List, Dict, Any, Optional
from app.schemas import ParsedIntent, VerifiedResult, ChartPayload

class AnalysisEngine:
    @staticmethod
    def _aggregation(metric: str) -> str:
        compact = metric.lower().replace("_", "")
        return "mean" if any(term in compact for term in ("aqi", "pm25", "airquality", "co2", "temperature", "humidity", "concentration", "index", "score", "decibel", "noiselevel")) else "sum"

    @staticmethod
    def _label(metric: str) -> str:
        return metric.replace("_", " ").strip().title()

    @staticmethod
    def _unit(metric: str) -> str:
        name = metric.lower().replace("_", "")
        for token, unit in (("kwh", "kWh"), ("mwh", "MWh"), ("kw", "kW"), ("liter", "L"), ("litre", "L"), ("gallon", "gal"), ("kg", "kg"), ("ton", "tons"), ("usd", "$"), ("cost", "$"), ("spend", "$"), ("ppm", "ppm"), ("ppb", "ppb"), ("pm25", "µg/m³"), ("co2", "ppm"), ("percent", "%"), ("occupancy", "people"), ("count", "records"), ("trip", "trips")):
            if token in name:
                return unit
        return "units"

    @staticmethod
    def _group_column(df: pd.DataFrame) -> Optional[str]:
        if "building" in df.columns:
            return "building"
        excluded = {"timestamp", "timestamp_dt", "date", "is_weekend", "period"}
        candidates = [c for c in df.columns if c not in excluded and not pd.api.types.is_numeric_dtype(df[c])]
        return next((c for c in candidates if 1 < df[c].nunique(dropna=True) <= 50), None)

    @staticmethod
    def analyze(df: pd.DataFrame, intent: ParsedIntent) -> VerifiedResult:
        if df is None or df.empty:
            return VerifiedResult(
                metric_name="None",
                primary_value=0.0,
                formatted_value="0",
                unit="",
                summary_statement="No dataset loaded. Please upload a campus resource CSV file.",
                caveats=["No active dataset found in memory."]
            )

        numeric_metrics = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        metric = intent.metric if intent.metric in numeric_metrics else ("kwh_usage" if "kwh_usage" in numeric_metrics else (numeric_metrics[0] if numeric_metrics else None))
        if metric is None:
            df = df.copy()
            df["record_count"] = 1
            metric = "record_count"
        unit_map = {
            "kwh_usage": "kWh",
            "cost_usd": "USD ($)",
            "peak_demand_kw": "kW",
            "occupancy": "people"
        }
        unit = unit_map.get(metric, AnalysisEngine._unit(metric))

        # Apply a location/category filter when the CSV includes one.
        working_df = df.copy()
        group_col = AnalysisEngine._group_column(working_df)
        if intent.target_buildings and group_col:
            lower_targets = [b.lower() for b in intent.target_buildings]
            filtered = working_df[working_df[group_col].astype(str).str.lower().isin(lower_targets)]
            if not filtered.empty:
                working_df = filtered

        # Apply time frame filters
        if intent.time_frame and "period" in working_df.columns:
            if "peak" in intent.time_frame.lower() and "off" not in intent.time_frame.lower():
                working_df = working_df[working_df["period"].astype(str).str.lower() == "peak"]
            elif "off-peak" in intent.time_frame.lower() or "off peak" in intent.time_frame.lower():
                working_df = working_df[working_df["period"].astype(str).str.lower() == "off-peak"]

        if intent.time_frame and "is_weekend" in working_df.columns:
            if "weekend" in intent.time_frame.lower():
                working_df = working_df[working_df["is_weekend"].astype(str).str.lower() == "true"]
            elif "weekday" in intent.time_frame.lower():
                working_df = working_df[working_df["is_weekend"].astype(str).str.lower() == "false"]

        # If filtering emptied the dataframe, revert to base to prevent crashes
        if working_df.empty:
            working_df = df.copy()

        # Route by intent type
        if intent.intent_type == "comparison":
            if len(intent.target_buildings) >= 2 and group_col:
                return AnalysisEngine._analyze_comparison(df, intent, metric, unit)
            result = AnalysisEngine._analyze_total(working_df, intent, metric, unit)
            result.caveats.append("Two matching locations were not identified, so a direct comparison could not be computed.")
            return result
        elif intent.intent_type == "ranking":
            return AnalysisEngine._analyze_ranking(working_df, intent, metric, unit)
        elif intent.intent_type == "average":
            return AnalysisEngine._analyze_average(working_df, intent, metric, unit)
        elif intent.intent_type == "timeseries":
            return AnalysisEngine._analyze_timeseries(working_df, intent, metric, unit)
        else: # Default to total / aggregation
            return AnalysisEngine._analyze_total(working_df, intent, metric, unit)

    @staticmethod
    def _analyze_total(df: pd.DataFrame, intent: ParsedIntent, metric: str, unit: str) -> VerifiedResult:
        aggregation = AnalysisEngine._aggregation(metric)
        total_val = (float(df[metric].mean()) if df[metric].notna().any() else 0.0) if aggregation == "mean" else (float(df[metric].sum()) if metric in df.columns else 0.0)
        group_col = AnalysisEngine._group_column(df)
        buildings_count = df[group_col].nunique() if group_col else 0
        records_count = len(df)

        # Group results by a campus entity when the CSV contains one.
        chart_data = []
        chart_type = intent.chart_type or "bar"
        if group_col:
            grp = df.groupby(group_col)[metric].agg(aggregation).reset_index()
            grp = grp.sort_values(by=metric, ascending=False)
            for _, row in grp.iterrows():
                chart_data.append({
                    "name": str(row[group_col]),
                    "value": round(float(row[metric]), 2)
                })
        if not chart_data:
            chart_data = [{"name": "All records", "value": round(total_val, 2)}]

        # Caveats
        caveats = [
            f"Calculated from {records_count} rows in the uploaded dataset.",
            "Numerical aggregation performed strictly via Python Pandas."
        ]
        missing_count = int(df[metric].isna().sum())
        if missing_count:
            caveats.append(f"{missing_count} rows have no {AnalysisEngine._label(metric)} value and are excluded from the total.")
        if intent.target_buildings:
            caveats.append(f"Scope limited to: {', '.join(intent.target_buildings)}.")

        # Supporting records (top 10 by metric)
        display_cols = [c for c in df.columns if c != "timestamp_dt"]
        supporting = df.sort_values(by=metric, ascending=False)[display_cols].head(8).to_dict(orient="records")

        formatted_val = f"${total_val:,.2f}" if metric == "cost_usd" else f"{total_val:,.2f}"

        b_desc = f"across {', '.join(intent.target_buildings)}" if intent.target_buildings else (f"across {buildings_count} campus locations" if buildings_count else f"across {records_count} records")
        result_kind = "Average" if aggregation == "mean" else "Total"
        summary = f"{result_kind} verified {AnalysisEngine._label(metric)} is {formatted_val} {unit} ({b_desc})."

        chart = ChartPayload(
            chart_type="bar",
            title=f"{result_kind} {AnalysisEngine._label(metric)} by {group_col.title() if group_col else 'Category'}",
            series=[{"key": "value", "name": f"{result_kind} {unit}", "color": "#6366f1"}],
            data=chart_data
        )

        return VerifiedResult(
            metric_name=f"{result_kind} {metric.replace('_', ' ').title()}",
            primary_value=round(total_val, 2),
            formatted_value=formatted_val,
            unit=unit,
            summary_statement=summary,
            chart=chart,
            supporting_records=supporting,
            caveats=caveats
        )

    @staticmethod
    def _analyze_average(df: pd.DataFrame, intent: ParsedIntent, metric: str, unit: str) -> VerifiedResult:
        avg_val = float(df[metric].mean()) if metric in df.columns else 0.0
        median_val = float(df[metric].median()) if metric in df.columns else 0.0
        records_count = len(df)

        chart_data = []
        group_col = AnalysisEngine._group_column(df)
        if group_col:
            grp = df.groupby(group_col)[metric].mean().reset_index()
            grp = grp.sort_values(by=metric, ascending=False)
            for _, row in grp.iterrows():
                chart_data.append({
                    "name": str(row[group_col]),
                    "value": round(float(row[metric]), 2)
                })

        formatted_val = f"${avg_val:,.2f}" if metric == "cost_usd" else f"{avg_val:,.2f}"

        caveats = [
            f"Average computed across {records_count} readings (Median: {median_val:,.2f} {unit}).",
            f"{int(df[metric].isna().sum())} records have no value for this metric and are excluded from the average."
        ]

        display_cols = [c for c in df.columns if c != "timestamp_dt"]
        supporting = df.sample(min(8, len(df)))[display_cols].to_dict(orient="records")

        chart = ChartPayload(
            chart_type="bar",
            title=f"Mean {AnalysisEngine._label(metric)} by {group_col.title() if group_col else 'Category'}",
            series=[{"key": "value", "name": f"Mean {unit}", "color": "#38bdf8"}],
            data=chart_data
        )

        return VerifiedResult(
            metric_name=f"Mean {metric.replace('_', ' ').title()}",
            primary_value=round(avg_val, 2),
            formatted_value=formatted_val,
            unit=unit,
            summary_statement=f"The average verified {metric.replace('_', ' ')} per reading is {formatted_val} {unit}.",
            chart=chart,
            supporting_records=supporting,
            caveats=caveats
        )

    @staticmethod
    def _analyze_ranking(df: pd.DataFrame, intent: ParsedIntent, metric: str, unit: str) -> VerifiedResult:
        group_col = AnalysisEngine._group_column(df)
        if not group_col:
            result = AnalysisEngine._analyze_total(df, intent, metric, unit)
            result.caveats.append("No location or category column was found, so a ranking could not be computed.")
            return result

        aggregation = AnalysisEngine._aggregation(metric)
        grp = df.groupby(group_col)[metric].agg(aggregation).reset_index()
        if grp.empty:
            return AnalysisEngine._analyze_total(df, intent, metric, unit)
        grp = grp.sort_values(by=metric, ascending=False)

        top_row = grp.iloc[0]
        top_building = str(top_row[group_col])
        top_val = float(top_row[metric])

        bottom_row = grp.iloc[-1]
        bottom_building = str(bottom_row[group_col])
        bottom_val = float(bottom_row[metric])

        total_sum = float(grp[metric].sum())
        top_share = (top_val / total_sum * 100) if total_sum > 0 else 0.0

        chart_data = []
        for _, row in grp.iterrows():
            chart_data.append({
                "name": str(row[group_col]),
                "value": round(float(row[metric]), 2)
            })

        formatted_val = f"${top_val:,.2f}" if metric == "cost_usd" else f"{top_val:,.2f}"

        summary = (
            f"'{top_building}' ranks highest in {metric.replace('_', ' ')} at {formatted_val} {unit} "
            + (f"(average across its rows), whereas '{bottom_building}' recorded the lowest average ({bottom_val:,.2f} {unit})." if aggregation == "mean" else f"({top_share:.1f}% of the total), whereas '{bottom_building}' recorded the lowest ({bottom_val:,.2f} {unit}).")
        )

        caveats = [
            f"Rankings reflect cumulative aggregate of all recorded intervals.",
            f"Difference between top ({top_building}) and lowest ({bottom_building}) is {top_val - bottom_val:,.2f} {unit}."
        ]

        display_cols = [c for c in df.columns if c != "timestamp_dt"]
        supporting = df[df[group_col] == top_building][display_cols].head(8).to_dict(orient="records")

        chart = ChartPayload(
            chart_type="bar",
            title=f"{group_col.title()} Ranking by {metric.replace('_', ' ').title()}",
            series=[{"key": "value", "name": f"Total {unit}", "color": "#ec4899"}],
            data=chart_data
        )

        return VerifiedResult(
            metric_name=f"Highest: {top_building}",
            primary_value=round(top_val, 2),
            formatted_value=formatted_val,
            unit=unit,
            comparison_summary=f"+{((top_val/bottom_val)-1)*100:.1f}% vs lowest building ({bottom_building})" if bottom_val > 0 else None,
            summary_statement=summary,
            chart=chart,
            supporting_records=supporting,
            caveats=caveats
        )

    @staticmethod
    def _analyze_comparison(df: pd.DataFrame, intent: ParsedIntent, metric: str, unit: str) -> VerifiedResult:
        targets = intent.target_buildings
        b1, b2 = targets[0], targets[1]
        group_col = AnalysisEngine._group_column(df) or "building"

        df1 = df[df[group_col].astype(str).str.lower() == b1.lower()]
        df2 = df[df[group_col].astype(str).str.lower() == b2.lower()]

        aggregation = AnalysisEngine._aggregation(metric)
        val1 = (float(df1[metric].mean()) if df1[metric].notna().any() else 0.0) if aggregation == "mean" and not df1.empty else (float(df1[metric].sum()) if not df1.empty else 0.0)
        val2 = (float(df2[metric].mean()) if df2[metric].notna().any() else 0.0) if aggregation == "mean" and not df2.empty else (float(df2[metric].sum()) if not df2.empty else 0.0)

        diff = abs(val1 - val2)
        pct_diff = ((diff / min(val1, val2)) * 100) if min(val1, val2) > 0 else 0.0
        higher = b1 if val1 >= val2 else b2
        lower = b2 if val1 >= val2 else b1

        chart_data = [
            {"name": b1, "value": round(val1, 2)},
            {"name": b2, "value": round(val2, 2)}
        ]

        summary = (
            f"Comparison verified: {higher} recorded {max(val1, val2):,.2f} {unit} vs {lower} at {min(val1, val2):,.2f} {unit}. "
            f"The difference was {diff:,.2f} {unit} ({abs(pct_diff):.1f}%) for {metric.replace('_', ' ')}."
        )

        caveats = [
            f"Comparison based on {len(df1)} records for {group_col} '{b1}' and {len(df2)} records for {group_col} '{b2}'.",
            f"Values use {aggregation} aggregation; date coverage may differ."
        ]

        display_cols = [c for c in df.columns if c != "timestamp_dt"]
        supporting = pd.concat([df1.head(4), df2.head(4)])[display_cols].to_dict(orient="records")

        chart = ChartPayload(
            chart_type="bar",
            title=f"Direct Comparison: {b1} vs {b2}",
            series=[{"key": "value", "name": f"{aggregation.title()} {unit}", "color": "#10b981"}],
            data=chart_data
        )

        return VerifiedResult(
            metric_name=f"{b1} vs {b2}",
            primary_value=round(val1, 2),
            formatted_value=f"{val1:,.2f} vs {val2:,.2f}",
            unit=unit,
            comparison_summary=f"{higher} +{abs(pct_diff):.1f}% over {lower}",
            summary_statement=summary,
            chart=chart,
            supporting_records=supporting,
            caveats=caveats
        )

    @staticmethod
    def _analyze_timeseries(df: pd.DataFrame, intent: ParsedIntent, metric: str, unit: str) -> VerifiedResult:
        date_col = "date" if "date" in df.columns else ("timestamp" if "timestamp" in df.columns else None)
        if not date_col or not df[date_col].notna().any():
            result = AnalysisEngine._analyze_total(df, intent, metric, unit)
            result.caveats.append("No usable date column was found, so this result is a dataset total rather than a time-series analysis.")
            return result

        grp = df.groupby(date_col)[metric].agg(AnalysisEngine._aggregation(metric)).reset_index()
        if grp.empty:
            result = AnalysisEngine._analyze_total(df, intent, metric, unit)
            result.caveats.append("No dated observations were available for a time-series analysis.")
            return result
        grp = grp.sort_values(by=date_col)

        chart_data = []
        for _, row in grp.iterrows():
            # Format clean date e.g. Sep 01
            d_val = str(row[date_col])[:10]
            chart_data.append({
                "name": d_val,
                "value": round(float(row[metric]), 2)
            })

        total_val = float(grp[metric].sum())
        peak_day_row = grp.sort_values(by=metric, ascending=False).iloc[0]
        peak_day = str(peak_day_row[date_col])[:10]
        peak_val = float(peak_day_row[metric])

        summary = (
            f"Daily {metric.replace('_', ' ')} trend analyzed over {len(grp)} dates. "
            f"The highest recorded value occurred on {peak_day} with {peak_val:,.2f} {unit}."
        )

        caveats = [
            f"Aggregated across {len(grp)} dates with observations.",
            f"{int(df[metric].isna().sum())} rows without a {metric.replace('_', ' ')} value are excluded."
        ]

        display_cols = [c for c in df.columns if c != "timestamp_dt"]
        supporting = df.sort_values(by=metric, ascending=False)[display_cols].head(8).to_dict(orient="records")

        chart = ChartPayload(
            chart_type="area",
            title=f"Daily Trend: {metric.replace('_', ' ').title()}",
            series=[{"key": "value", "name": f"Daily {unit}", "color": "#8b5cf6"}],
            data=chart_data
        )

        return VerifiedResult(
            metric_name=f"Highest Daily {AnalysisEngine._label(metric)}",
            primary_value=round(peak_val, 2),
            formatted_value=f"{peak_val:,.2f} ({peak_day})",
            unit=unit,
            summary_statement=summary,
            chart=chart,
            supporting_records=supporting,
            caveats=caveats
        )

