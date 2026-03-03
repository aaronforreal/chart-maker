"""
API routes for chart generation.
"""

import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, UploadFile, HTTPException, status
from fastapi.responses import FileResponse, Response

from app.models.schemas import (
    ChartRequest,
    ChartDataRequest,
    ChartDataResponse,
    ChartResponse,
    UploadResponse,
    DataPreview,
    SectionPreview
)
from app.services.chart_service import ChartService

router = APIRouter(prefix="/api", tags=["charts"])

# Storage paths
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload an Excel file and get a preview of the data.

    Args:
        file: Excel file (.xlsx or .xls)

    Returns:
        UploadResponse with file_id and data preview
    """
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls', '.xlsm')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only .xlsx, .xls, and .xlsm files are supported."
        )

    # Generate unique file ID
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix
    file_path = UPLOAD_DIR / f"{file_id}{file_extension}"

    # Save uploaded file
    try:
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    # Read and preview data
    try:
        chart_service = ChartService()

        # Detect all sections in the file
        raw_sections = chart_service._detect_all_sections(str(file_path))

        # Read the first section (or whole sheet for single-section files)
        if len(raw_sections) > 1:
            section_previews = []
            for i, s in enumerate(raw_sections):
                section_df = chart_service.read_excel_section(str(file_path), section_index=i)
                section_data = chart_service.get_data_preview(section_df)
                section_previews.append(SectionPreview(
                    index=i,
                    title=s['title'],
                    row_count=len(s['data_rows']),
                    data_start=s['data_start'],
                    data_end=s['data_end'],
                    columns=section_data['columns'],
                    rows=section_data['rows'],
                ))
            df = chart_service.read_excel_section(str(file_path), section_index=0)
        else:
            section_previews = []
            df = chart_service.read_excel(str(file_path))

        data_preview = chart_service.get_data_preview(df)

        return UploadResponse(
            file_id=file_id,
            filename=file.filename,
            data_preview=DataPreview(**data_preview),
            extracted_title=chart_service.extracted_title,
            sections=section_previews,
            message="File uploaded successfully"
        )
    except Exception as e:
        # Clean up file on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read Excel file: {str(e)}"
        )


@router.post("/chart-data", response_model=ChartDataResponse)
async def get_chart_data(request: ChartDataRequest):
    """
    Generate Plotly-compatible chart data from an uploaded Excel file.

    Returns traces and layout objects for client-side rendering with Plotly.js.
    """
    file_path = None
    for ext in ['.xlsx', '.xls', '.xlsm']:
        potential_path = UPLOAD_DIR / f"{request.file_id}{ext}"
        if potential_path.exists():
            file_path = potential_path
            break

    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID {request.file_id} not found. Please upload the file first."
        )

    try:
        chart_service = ChartService(theme=request.theme)
        traces, layout, resolved_type, columns = chart_service.build_plotly_data(
            str(file_path), request.model_dump()
        )
        return ChartDataResponse(
            traces=traces,
            layout=layout,
            chart_type=resolved_type,
            columns=columns,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chart data: {str(e)}"
        )


@router.post("/generate", response_model=ChartResponse)
async def generate_chart(request: ChartRequest):
    """
    Generate a chart from an uploaded Excel file.

    Args:
        request: ChartRequest with file_id and chart options

    Returns:
        ChartResponse with base64 encoded chart
    """
    # Find uploaded file
    file_path = None
    for ext in ['.xlsx', '.xls', '.xlsm']:
        potential_path = UPLOAD_DIR / f"{request.file_id}{ext}"
        if potential_path.exists():
            file_path = potential_path
            break

    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID {request.file_id} not found. Please upload the file first."
        )

    # Generate chart
    try:
        chart_service = ChartService(theme=request.theme)
        chart_base64, df = chart_service.generate_chart(
            file_path=str(file_path),
            chart_type=request.chart_type,
            format=request.format,
            dpi=request.dpi,
            title=request.title,
            return_base64=True,
            xlabel=request.xlabel,
            ylabel=request.ylabel,
            colors=request.colors,
            grid=request.grid.model_dump() if request.grid else None,
            fonts=request.fonts.model_dump() if request.fonts else None,
            units=request.units.model_dump() if request.units else None,
            data_labels=request.data_labels.model_dump() if request.data_labels else None,
        )

        # Generate suggested filename
        original_filename = file_path.stem
        suggested_filename = f"{original_filename}_chart.{request.format}"

        return ChartResponse(
            chart_base64=chart_base64,
            format=request.format,
            filename=suggested_filename
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chart: {str(e)}"
        )


@router.get("/themes", response_model=dict)
async def get_themes():
    """
    Get all available chart themes.

    Returns:
        Dictionary of available themes and their configurations
    """
    try:
        themes = ChartService.load_themes()
        return themes
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load themes: {str(e)}"
        )


@router.get("/chart/{file_id}")
async def download_chart(
    file_id: str,
    chart_type: str = 'auto',
    theme: str = 'professional',
    format: str = 'png',
    dpi: int = 300,
    title: Optional[str] = None,
    xlabel: Optional[str] = None,
    ylabel: Optional[str] = None,
    colors: Optional[str] = None,
    grid_enabled: Optional[bool] = None,
    grid_linestyle: Optional[str] = None,
    grid_alpha: Optional[float] = None,
    font_family: Optional[str] = None,
    font_title_size: Optional[int] = None,
    font_label_size: Optional[int] = None,
    font_tick_size: Optional[int] = None,
    unit_x_prefix: str = '',
    unit_x_suffix: str = '',
    unit_y_prefix: str = '',
    unit_y_suffix: str = '',
    show_data_labels: bool = False,
    data_label_format: Optional[str] = None,
):
    """
    Generate and download a chart directly.

    Args:
        file_id: ID of uploaded file
        chart_type: Type of chart
        theme: Chart theme
        format: Output format
        dpi: Image resolution
        title: Custom title
        xlabel: Custom x-axis label
        ylabel: Custom y-axis label
        colors: Comma-separated hex color codes
        grid_enabled: Show grid lines
        grid_linestyle: Grid line style (solid, dashed, dotted)
        grid_alpha: Grid opacity (0.0-1.0)
        font_family: Font family override
        font_title_size: Title font size override
        font_label_size: Label font size override
        font_tick_size: Tick font size override
        unit_x_prefix: Prefix for x-axis values
        unit_x_suffix: Suffix for x-axis values
        unit_y_prefix: Prefix for y-axis values
        unit_y_suffix: Suffix for y-axis values
        show_data_labels: Show data labels on chart elements
        data_label_format: Python format string for data labels

    Returns:
        Chart file for download
    """
    # Find uploaded file
    file_path = None
    for ext in ['.xlsx', '.xls', '.xlsm']:
        potential_path = UPLOAD_DIR / f"{file_id}{ext}"
        if potential_path.exists():
            file_path = potential_path
            break

    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID {file_id} not found"
        )

    # Build option dicts from flat query params
    colors_list = [c.strip() for c in colors.split(',')] if colors else None

    grid_dict = None
    if grid_enabled is not None or grid_linestyle or grid_alpha is not None:
        grid_dict = {
            'enabled': grid_enabled if grid_enabled is not None else True,
            'linestyle': grid_linestyle or 'solid',
            'alpha': grid_alpha,
        }

    fonts_dict = None
    if font_family or font_title_size or font_label_size or font_tick_size:
        fonts_dict = {
            'family': font_family,
            'title_size': font_title_size,
            'label_size': font_label_size,
            'tick_size': font_tick_size,
        }

    units_dict = None
    if unit_x_prefix or unit_x_suffix or unit_y_prefix or unit_y_suffix:
        units_dict = {
            'x_prefix': unit_x_prefix,
            'x_suffix': unit_x_suffix,
            'y_prefix': unit_y_prefix,
            'y_suffix': unit_y_suffix,
        }

    data_labels_dict = None
    if show_data_labels:
        data_labels_dict = {
            'show': True,
            'format': data_label_format,
        }

    # Generate chart
    try:
        chart_service = ChartService(theme=theme)
        chart_bytes, df = chart_service.generate_chart(
            file_path=str(file_path),
            chart_type=chart_type,
            format=format,
            dpi=dpi,
            title=title,
            return_base64=False,
            xlabel=xlabel,
            ylabel=ylabel,
            colors=colors_list,
            grid=grid_dict,
            fonts=fonts_dict,
            units=units_dict,
            data_labels=data_labels_dict,
        )

        # Determine media type
        media_types = {
            'png': 'image/png',
            'pdf': 'application/pdf',
            'svg': 'image/svg+xml'
        }
        media_type = media_types.get(format, 'application/octet-stream')

        # Return file
        filename = f"chart.{format}"
        return Response(
            content=chart_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chart: {str(e)}"
        )


@router.delete("/cleanup/{file_id}")
async def cleanup_file(file_id: str):
    """
    Delete an uploaded file and its generated charts.

    Args:
        file_id: ID of file to delete

    Returns:
        Success message
    """
    deleted_files = []

    # Delete uploaded file
    for ext in ['.xlsx', '.xls', '.xlsm']:
        upload_path = UPLOAD_DIR / f"{file_id}{ext}"
        if upload_path.exists():
            upload_path.unlink()
            deleted_files.append(str(upload_path))

    # Delete generated charts
    for ext in ['png', 'pdf', 'svg']:
        output_path = OUTPUT_DIR / f"{file_id}_chart.{ext}"
        if output_path.exists():
            output_path.unlink()
            deleted_files.append(str(output_path))

    if not deleted_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No files found for ID {file_id}"
        )

    return {
        "message": "Files deleted successfully",
        "deleted_files": deleted_files
    }
