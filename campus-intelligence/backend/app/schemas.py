from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

try:
    from pydantic import ConfigDict
    BASE_CONFIG = ConfigDict(extra="ignore", arbitrary_types_allowed=True)
except ImportError:
    BASE_CONFIG = None


class BaseSchema(BaseModel):
    """Base schema providing cross-version Pydantic compatibility and resilient extra-field handling."""
    if BASE_CONFIG is not None:
        model_config = BASE_CONFIG
    else:
        class Config:
            extra = "ignore"
            arbitrary_types_allowed = True


class QueryRequest(BaseSchema):
    question: str = Field(default="", description="The user's natural language question regarding campus resource data")
    building_filter: Optional[str] = Field(default=None, description="Optional manual building filter override")


class ParsedIntent(BaseSchema):
    intent_type: str = Field(default="total", description="Type of analysis: 'total', 'average', 'ranking', 'comparison', 'timeseries', 'general'")
    metric: str = Field(default="kwh_usage", description="Target metric: 'kwh_usage', 'cost_usd', 'peak_demand_kw', 'occupancy'")
    target_buildings: List[str] = Field(default_factory=list, description="Buildings mentioned or targeted in the question")
    time_frame: Optional[str] = Field(default=None, description="Time frame filter e.g. 'weekend', 'weekday', 'peak', 'off-peak'")
    chart_type: str = Field(default="bar", description="Recommended chart type: 'bar', 'line', 'area', 'pie'")
    group_by: Optional[str] = Field(default="building", description="Dimension to group or aggregate by")


class ChartDataPoint(BaseSchema):
    name: str = ""
    value: float = 0.0
    secondary_value: Optional[float] = None
    category: Optional[str] = None


class ChartPayload(BaseSchema):
    chart_type: str = "bar"  # 'bar', 'line', 'area', 'pie'
    title: str = ""
    x_axis_key: str = "name"
    series: List[Dict[str, Any]] = Field(default_factory=list)
    data: List[Dict[str, Any]] = Field(default_factory=list)


class VerifiedResult(BaseSchema):
    metric_name: str = "Metric"
    primary_value: float = 0.0
    formatted_value: str = "0"
    unit: str = ""
    comparison_summary: Optional[str] = None
    summary_statement: str = ""
    chart: Optional[ChartPayload] = None
    supporting_records: List[Dict[str, Any]] = Field(default_factory=list)
    caveats: List[str] = Field(default_factory=list)


class QueryResponse(BaseSchema):
    question: str = ""
    intent: ParsedIntent = Field(default_factory=ParsedIntent)
    verified_result: VerifiedResult = Field(default_factory=VerifiedResult)
    explanation: str = ""
    ai_provider: str = "Verified Analysis Engine"
    processing_time_ms: float = 0.0


class DatasetSummary(BaseSchema):
    filename: str = "dataset.csv"
    total_records: int = 0
    buildings: List[str] = Field(default_factory=list)
    date_range_start: str = "N/A"
    date_range_end: str = "N/A"
    total_kwh: float = 0.0
    avg_kwh: float = 0.0
    total_cost: float = 0.0
    columns: List[str] = Field(default_factory=list)
    metric_columns: List[str] = Field(default_factory=list)
    primary_metric: str = "kwh_usage"
    entity_column: Optional[str] = None
    primary_total: float = 0.0
    primary_average: float = 0.0
    primary_unit: str = "units"
    primary_aggregation: str = "sum"
    missing_primary_values: int = 0
    missing_date_values: int = 0


class UploadResponse(BaseSchema):
    status: str = "success"
    message: str = "Dataset successfully loaded"
    summary: DatasetSummary = Field(default_factory=DatasetSummary)
