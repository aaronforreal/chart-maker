# Quick Start Guide

## 🚀 Getting Started with Excel Chart Maker Web UI

### Step 1: Start the Backend (Terminal 1)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend API will be available at: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Step 2: Start the Frontend (Terminal 2)

```bash
cd frontend
npm install  # Only needed first time
npm run dev
```

The web app will be available at: http://localhost:5173

### Step 3: Use the Web UI

1. Open http://localhost:5173 in your browser
2. Drag & drop an Excel file or click to upload
3. Review your data in the preview table
4. Select chart type, theme, and format
5. Click "Generate Chart" to see a live preview
6. Download your chart in PNG, PDF, or SVG format

## 🎨 Available Themes

- **Professional**: Clean, business-ready charts (default)
- **Minimal**: Simple, distraction-free visualization
- **Vibrant**: Bold, eye-catching colors for presentations
- **Academic**: Publication-ready scientific charts

## 📊 Chart Types

- **Auto Detect**: Automatically chooses the best chart type
- **Line Chart**: Perfect for trends over time
- **Bar Chart**: Great for comparisons
- **Scatter Plot**: Shows relationships between variables
- **Pie Chart**: Displays proportions

## 🔧 Troubleshooting

### Backend won't start?
- Make sure you have Python 3.8+ installed
- Check if port 8000 is already in use
- Verify all dependencies are installed: `pip install -r requirements.txt`

### Frontend won't start?
- Make sure you have Node.js 16+ installed
- Delete `node_modules` and run `npm install` again
- Check if port 5173 is already in use

### CORS errors?
- Make sure both backend (port 8000) and frontend (port 5173) are running
- Check that the frontend is accessing http://localhost:8000/api

## 📝 Using the CLI Tool

If you prefer the command-line interface:

```bash
python chart_maker.py -i examples/sample_data.xlsx -t line -f png -o output/
```

See README.md for full CLI documentation.

## 🌐 Integrating into a Dashboard

This tool is designed to be integrated into larger dashboards:

1. **As a microservice**: Backend API can be consumed by other services
2. **As a React component**: Import components from `frontend/src/components`
3. **As an iframe**: Embed the entire UI in another application

For production deployment, see the backend and frontend README files.
