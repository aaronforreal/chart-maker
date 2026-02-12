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
    ChartResponse,
    UploadResponse,
    ThemesResponse,
    ErrorResponse,
    DataPreview
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
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only .xlsx and .xls files are supported."
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
        df = chart_service.read_excel(str(file_path))
        data_preview = chart_service.get_data_preview(df)

        return UploadResponse(
            file_id=file_id,
            filename=file.filename,
            data_preview=DataPreview(**data_preview),
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
    for ext in ['.xlsx', '.xls']:
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
            return_base64=True
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
    title: Optional[str] = None
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

    Returns:
        Chart file for download
    """
    # Find uploaded file
    file_path = None
    for ext in ['.xlsx', '.xls']:
        potential_path = UPLOAD_DIR / f"{file_id}{ext}"
        if potential_path.exists():
            file_path = potential_path
            break

    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File with ID {file_id} not found"
        )

    # Generate chart
    try:
        chart_service = ChartService(theme=theme)
        chart_bytes, df = chart_service.generate_chart(
            file_path=str(file_path),
            chart_type=chart_type,
            format=format,
            dpi=dpi,
            title=title,
            return_base64=False
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
    for ext in ['.xlsx', '.xls']:
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
