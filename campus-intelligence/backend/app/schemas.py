from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class QueryRequest(BaseModel):
    question: str = Field(..., description="The user's natural language question regarding campus resource data")
    building_filter: Optional[str] = Field(None, description="Optional manual building filter override")

class ParsedIntent(BaseModel):
    intent_type: str = Field(..., description="Type of analysis: 'total', 'average', 'ranking', 'comparison', 'timeseries', 'general'")
    metric: str = Field(default="kwh_usage", description="Target metric: 'kwh_usage', 'cost_usd', 'peak_demand_kw', 'occupancy'")
    target_buildings: List[str] = Field(default_factory=list, description="Buildings mentioned or targeted in the question")
    time_frame: Optional[str] = Field(None, description="Time frame filter e.g. 'weekend', 'weekday', 'peak', 'off-peak'")
    chart_type: str = Field(default="bar", description="Recommended chart type: 'bar', 'line', 'area', 'pie'")
    group_by: Optional[str] = Field(default="building", description="Dimension to group or aggregate by")

class ChartDataPoint(BaseModel):
    name: str
    value: float
    secondary_value: Optional[float] = None
    category: Optional[str] = None

class ChartPayload(BaseModel):
    chart_type: str  # 'bar', 'line', 'area', 'pie'
    title: str
    x_axis_key: str = "name"
    series: List[Dict[str, Any]]
    data: List[Dict[str, Any]]

class VerifiedResult(BaseModel):
    metric_name: str
    primary_value: float
    formatted_value: str
    unit: str
    comparison_summary: Optional[str] = None
    summary_statement: str
    chart: Optional[ChartPayload] = None
    supporting_records: List[Dict[str, Any]] = Field(default_factory=list)
    caveats: List[str] = Field(default_factory=list)

class QueryResponse(BaseModel):
    question: str
    intent: ParsedIntent
    verified_result: VerifiedResult
    explanation: str
    ai_provider: str
    processing_time_ms: float

class DatasetSummary(BaseModel):
    filename: str
    total_records: int
    buildings: List[str]
    date_range_start: str
    date_range_end: str
    total_kwh: float
    avg_kwh: float
    total_cost: float
    columns: List[str]
    metric_columns: List[str] = Field(default_factory=list)
    primary_metric: str = "kwh_usage"
    entity_column: Optional[str] = None
    primary_total: float = 0.0
    primary_average: float = 0.0
    primary_unit: str = "units"
    primary_aggregation: str = "sum"
    missing_primary_values: int = 0
    missing_date_values: int = 0

class UploadResponse(BaseModel):
    status: str
    message: str
    summary: DatasetSummary

