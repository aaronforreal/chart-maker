# Excel Chart Maker - Backend API

FastAPI backend for the Excel Chart Maker web application.

## Setup

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

Start the development server:
```bash
uvicorn app.main:app --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### POST /api/upload
Upload an Excel file and get a data preview.

**Request**: Multipart form data with Excel file

**Response**:
```json
{
  "file_id": "uuid-string",
  "filename": "data.xlsx",
  "data_preview": {
    "columns": ["Month", "Sales", "Expenses"],
    "rows": [["January", 5000, 3000], ...],
    "total_rows": 6,
    "row_count": 6
  },
  "message": "File uploaded successfully"
}
```

### POST /api/generate
Generate a chart from uploaded file.

**Request**:
```json
{
  "file_id": "uuid-string",
  "chart_type": "line",
  "theme": "professional",
  "format": "png",
  "title": "Monthly Sales",
  "dpi": 300
}
```

**Response**:
```json
{
  "chart_base64": "base64-encoded-image...",
  "format": "png",
  "filename": "data_chart.png"
}
```

### GET /api/themes
Get all available chart themes.

**Response**:
```json
{
  "themes": {
    "professional": {
      "name": "Professional",
      "description": "Clean, business-ready charts",
      "colors": ["#2E86AB", ...],
      ...
    }
  },
  "default_theme": "professional"
}
```

### GET /api/chart/{file_id}
Download a generated chart directly.

**Query Parameters**:
- `chart_type`: auto, line, bar, scatter, pie
- `theme`: professional, minimal, vibrant, academic
- `format`: png, pdf, svg
- `dpi`: Image resolution (default: 300)
- `title`: Custom chart title

### DELETE /api/cleanup/{file_id}
Delete uploaded file and generated charts.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py        # API endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   └── chart_service.py # Chart generation logic
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic models
│   └── config/
│       └── themes.json      # Theme configurations
├── uploads/                  # Temporary uploaded files
├── outputs/                  # Generated charts
├── requirements.txt
└── README.md
```

## Development

### Testing with curl

Upload a file:
```bash
curl -X POST -F "file=@sample_data.xlsx" http://localhost:8000/api/upload
```

Generate a chart:
```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"file_id":"your-file-id","chart_type":"line","theme":"professional","format":"png"}'
```

### Testing with Python

```python
import requests

# Upload file
with open('sample_data.xlsx', 'rb') as f:
    response = requests.post('http://localhost:8000/api/upload', files={'file': f})
    file_id = response.json()['file_id']

# Generate chart
response = requests.post('http://localhost:8000/api/generate', json={
    'file_id': file_id,
    'chart_type': 'line',
    'theme': 'professional',
    'format': 'png'
})

# Save chart
import base64
chart_data = base64.b64decode(response.json()['chart_base64'])
with open('chart.png', 'wb') as f:
    f.write(chart_data)
```
