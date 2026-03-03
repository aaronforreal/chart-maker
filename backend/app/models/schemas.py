"""
Pydantic models for request/response schemas.
"""

from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


class GridOptions(BaseModel):
    """Options for chart grid lines."""
    enabled: bool = Field(default=True, description="Show grid lines")
    linestyle: Literal['solid', 'dashed', 'dotted'] = Field(
        default='solid', description="Grid line style"
    )
    alpha: Optional[float] = Field(
        default=None, description="Grid opacity (0.0-1.0). None uses theme default."
    )


class FontOptions(BaseModel):
    """Options for chart fonts."""
    family: Optional[str] = Field(default=None, description="Font family (e.g. 'serif', 'monospace'). None uses theme default.")
    title_size: Optional[int] = Field(default=None, description="Title font size. None uses theme default.")
    label_size: Optional[int] = Field(default=None, description="Axis label font size. None uses theme default.")
    tick_size: Optional[int] = Field(default=None, description="Tick label font size. None uses theme default.")


class UnitFormat(BaseModel):
    """Formatting options for axis tick labels."""
    x_prefix: str = Field(default='', description="Prefix for x-axis values (e.g. '$')")
    x_suffix: str = Field(default='', description="Suffix for x-axis values (e.g. '%')")
    y_prefix: str = Field(default='', description="Prefix for y-axis values (e.g. '$')")
    y_suffix: str = Field(default='', description="Suffix for y-axis values (e.g. '%')")


class DataLabelOptions(BaseModel):
    """Options for showing data labels on chart elements."""
    show: bool = Field(default=False, description="Show data labels on chart elements")
    format: Optional[str] = Field(default=None, description="Python format string for labels (e.g. ',.0f' for thousands)")


class ChartDataRequest(BaseModel):
    """Request model for Plotly chart data generation."""
    file_id: str = Field(..., description="ID of the uploaded file")
    chart_type: str = Field(default='auto', description="Type of chart: auto, line, bar, horizontal_bar, scatter, pie")
    theme: str = Field(default='professional', description="Chart theme")
    title: Optional[str] = Field(None, description="Custom chart title")
    xlabel: Optional[str] = Field(None, description="Custom x-axis label")
    ylabel: Optional[str] = Field(None, description="Custom y-axis label")
    colors: Optional[List[str]] = Field(None, description="Custom color list (hex codes)")
    # Trend line options — two independent lines
    show_linear_trend: bool = Field(default=False, description="Show linear regression trend line")
    linear_trend_color: Optional[str] = Field(None, description="Linear trend line hex color")
    linear_trend_linestyle: Literal['solid', 'dash', 'dot'] = Field(default='dash', description="Linear trend line dash style")
    linear_trend_label: Optional[str] = Field(None, description="Legend label for linear trend line")
    show_mean_line: bool = Field(default=False, description="Show mean (average) line")
    mean_line_color: Optional[str] = Field(None, description="Mean line hex color")
    mean_line_linestyle: Literal['solid', 'dash', 'dot'] = Field(default='dash', description="Mean line dash style")
    mean_line_label: Optional[str] = Field(None, description="Legend label for mean line")
    show_data_labels: bool = Field(default=False, description="Show data labels on chart elements")
    bar_colors: Optional[List[str]] = Field(None, description="Per-bar color list for single-series bar charts (hex codes, one per bar/row)")
    section_index: int = Field(default=0, description="0-based index of the section to chart (for multi-section files)")
    ratings_mode: bool = Field(default=False, description="Color bars red/yellow/green by threshold (horizontal_bar only)")
    ratings_low_threshold: float = Field(default=3.15, description="Values at or below this are colored red")
    ratings_high_threshold: float = Field(default=3.85, description="Values above this are colored green; between = yellow")


class ChartDataResponse(BaseModel):
    """Response model for Plotly chart data."""
    traces: List[Any] = Field(..., description="Plotly trace objects")
    layout: Any = Field(..., description="Plotly layout object")
    chart_type: str = Field(..., description="Resolved chart type")
    columns: List[str] = Field(..., description="Column names for reference")


class ChartRequest(BaseModel):
    """Request model for chart generation."""
    file_id: str = Field(..., description="ID of the uploaded file")
    chart_type: str = Field(default='auto', description="Type of chart: auto, line, bar, horizontal_bar, scatter, pie")
    theme: str = Field(default='professional', description="Chart theme")
    format: str = Field(default='png', description="Output format: png, pdf, svg")
    title: Optional[str] = Field(None, description="Custom chart title")
    dpi: int = Field(default=300, description="Image resolution (DPI)")
    xlabel: Optional[str] = Field(None, description="Custom x-axis label")
    ylabel: Optional[str] = Field(None, description="Custom y-axis label")
    colors: Optional[List[str]] = Field(None, description="Custom color list (hex codes) to override theme colors")
    grid: Optional[GridOptions] = Field(default=None, description="Grid customization")
    fonts: Optional[FontOptions] = Field(default=None, description="Font customization")
    units: Optional[UnitFormat] = Field(default=None, description="Axis tick label formatting (prefix/suffix)")
    data_labels: Optional[DataLabelOptions] = Field(default=None, description="Data label display options")

    @field_validator('colors')
    @classmethod
    def colors_must_not_be_empty(cls, v):
        if v is not None and len(v) == 0:
            raise ValueError('colors list must not be empty')
        return v


class DataPreview(BaseModel):
    """Response model for data preview."""
    columns: List[str] = Field(..., description="Column names from Excel")
    rows: List[List[Any]] = Field(..., description="Preview rows")
    total_rows: int = Field(..., description="Total number of rows in dataset")
    row_count: int = Field(..., description="Number of rows in preview")


class SectionPreview(BaseModel):
    """Metadata and data for a single detected data section within an Excel file."""
    index: int = Field(..., description="0-based position in the detected sections list")
    title: str = Field(..., description="Section heading extracted from the Excel row above the data")
    row_count: int = Field(..., description="Number of data rows in this section")
    data_start: int = Field(..., description="0-based row index of first data row in the raw sheet")
    data_end: int = Field(..., description="0-based row index of last data row in the raw sheet")
    columns: List[str] = Field(default_factory=list, description="Column names for this section")
    rows: List[List[Any]] = Field(default_factory=list, description="All data rows for this section")


class UploadResponse(BaseModel):
    """Response model for file upload."""
    file_id: str = Field(..., description="Unique identifier for uploaded file")
    filename: str = Field(..., description="Original filename")
    data_preview: DataPreview = Field(..., description="Preview of the data")
    extracted_title: Optional[str] = Field(None, description="Chart title extracted from Excel structure")
    sections: List["SectionPreview"] = Field(default_factory=list, description="Detected data sections. Empty list means single-section.")
    message: str = Field(default="File uploaded successfully")


class ChartResponse(BaseModel):
    """Response model for chart generation."""
    chart_base64: str = Field(..., description="Base64 encoded chart image")
    format: str = Field(..., description="Chart format")
    filename: str = Field(..., description="Suggested filename for download")


class ThemeInfo(BaseModel):
    """Information about a single theme."""
    name: str
    description: str
    colors: List[str]
    background: str
    grid_color: str
    grid_alpha: float
    font_family: str
    title_size: int
    label_size: int
    tick_size: int


class ThemesResponse(BaseModel):
    """Response model for available themes."""
    themes: dict[str, ThemeInfo]
    default_theme: str


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
