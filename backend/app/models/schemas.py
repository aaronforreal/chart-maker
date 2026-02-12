"""
Pydantic models for request/response schemas.
"""

from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ChartRequest(BaseModel):
    """Request model for chart generation."""
    file_id: str = Field(..., description="ID of the uploaded file")
    chart_type: str = Field(default='auto', description="Type of chart: auto, line, bar, scatter, pie")
    theme: str = Field(default='professional', description="Chart theme")
    format: str = Field(default='png', description="Output format: png, pdf, svg")
    title: Optional[str] = Field(None, description="Custom chart title")
    dpi: int = Field(default=300, description="Image resolution (DPI)")


class DataPreview(BaseModel):
    """Response model for data preview."""
    columns: List[str] = Field(..., description="Column names from Excel")
    rows: List[List[Any]] = Field(..., description="Preview rows")
    total_rows: int = Field(..., description="Total number of rows in dataset")
    row_count: int = Field(..., description="Number of rows in preview")


class UploadResponse(BaseModel):
    """Response model for file upload."""
    file_id: str = Field(..., description="Unique identifier for uploaded file")
    filename: str = Field(..., description="Original filename")
    data_preview: DataPreview = Field(..., description="Preview of the data")
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
