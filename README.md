# Excel Chart Maker

A standalone Python tool that generates publication-ready charts from Excel data files, solving the common problem of distorted and skewed charts when copying from Excel to Word.

## The Problem

When working with data in Excel and creating charts for reports or documents:
- Copy-pasting charts from Excel to Word often results in skewed, distorted, or improperly scaled visualizations
- Chart formatting frequently breaks during the transfer
- Manual reformatting wastes time and produces inconsistent results
- The final output rarely looks as professional as intended

## The Solution

Excel Chart Maker is a Python-based tool that:
- Reads data directly from Excel files (.xlsx, .xls)
- Generates high-quality, publication-ready charts
- Exports charts as image files (PNG, SVG, PDF) ready to insert into reports
- Ensures consistent formatting and scaling every time
- Produces professional visualizations suitable for presentations and documents

## Features

- **Web Interface & CLI**: Use the modern web UI or command-line interface
- **Multiple Chart Types**: Line charts, bar charts, scatter plots, pie charts, and more
- **Excel Integration**: Reads data directly from Excel spreadsheets
- **High-Quality Output**: Exports charts in multiple formats (PNG, SVG, PDF)
- **Customizable Styling**: Professional themes and color schemes
- **Drag & Drop**: Easy file upload with live preview (web UI)
- **Live Preview**: See your chart before downloading (web UI)
- **Consistent Formatting**: Charts maintain their appearance across different documents

## Installation

Choose between the **Web UI** (recommended for most users) or **CLI** (for automation):

### Web UI Setup (Recommended)

**Backend (FastAPI):**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend (React + Tailwind):**
```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

### CLI Setup

**Prerequisites:** Python 3.8 or higher, pip

```bash
# Install dependencies
pip install -r requirements.txt

# Run the CLI tool
python chart_maker.py --input data.xlsx
```

## Usage

### Web UI Usage (Recommended)

1. **Start the servers:**
   - Backend: `cd backend && uvicorn app.main:app --reload` (http://localhost:8000)
   - Frontend: `cd frontend && npm run dev` (http://localhost:5173)

2. **Create charts in 4 easy steps:**
   - **Step 1:** Drag & drop your Excel file or click to browse
   - **Step 2:** Review your data in the preview table
   - **Step 3:** Choose chart type, theme, and format (PNG/PDF/SVG)
   - **Step 4:** Generate and download your publication-ready chart

**Features:**
- 🎨 4 professional themes (Professional, Minimal, Vibrant, Academic)
- 📊 4 chart types (Line, Bar, Scatter, Pie) + Auto-detect
- 🖼️ Export as PNG, PDF, or SVG
- 👀 Live preview before downloading
- 📋 Data table view
- ⚙️ Adjustable DPI for quality control

### CLI Usage

**Basic Usage**

1. Prepare your Excel file with data in a structured format (rows/columns)

2. Run the chart maker:
```bash
python chart_maker.py --input data.xlsx --output charts/
```

3. Find your generated charts in the output directory, ready to insert into Word, PowerPoint, or any document

### Command Line Options

```bash
python chart_maker.py [options]

Options:
  --input, -i      Path to input Excel file (required)
  --output, -o     Output directory for charts (default: ./output)
  --type, -t       Chart type: line, bar, scatter, pie (default: auto-detect)
  --format, -f     Output format: png, svg, pdf (default: png)
  --theme          Color theme: default, professional, minimal (default: professional)
  --dpi            Image resolution for PNG (default: 300)
```

### Example

```bash
# Generate a bar chart from sales data
python chart_maker.py -i sales_data.xlsx -t bar -f png -o reports/charts/

# Generate high-res PDF charts
python chart_maker.py -i quarterly_data.xlsx -f pdf --dpi 600
```

## Excel File Format

Your Excel file should be structured with:
- First row: Column headers (will be used as labels)
- Subsequent rows: Data values
- Multiple sheets supported for batch generation

Example structure:
```
| Month    | Sales | Expenses |
|----------|-------|----------|
| January  | 5000  | 3000     |
| February | 6000  | 3200     |
| March    | 5500  | 3100     |
```

## Output

Charts are exported as standalone image files that can be:
- Inserted directly into Word documents without distortion
- Used in PowerPoint presentations
- Included in reports and publications
- Shared with collaborators

## Technology Stack

**Backend:**
- **FastAPI**: Modern Python web framework
- **pandas**: Excel file reading and data manipulation
- **matplotlib/seaborn**: Chart generation and visualization
- **openpyxl**: Excel file parsing
- **Pillow**: Image processing and export

**Frontend:**
- **React**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Axios**: API communication
- **react-dropzone**: Drag & drop file upload
- **lucide-react**: Icons

## Project Structure

```
chart-maker/
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── api/routes.py        # API endpoints
│   │   ├── services/chart_service.py
│   │   ├── models/schemas.py    # Pydantic models
│   │   └── config/themes.json
│   ├── uploads/                 # Temp uploaded files
│   ├── outputs/                 # Generated charts
│   └── requirements.txt
├── frontend/                    # React + Tailwind UI
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── services/api.js     # API client
│   │   └── App.jsx
│   ├── package.json
│   └── tailwind.config.js
├── chart_maker.py              # CLI tool (legacy)
├── config/themes.json          # CLI config
└── README.md
```

## Roadmap

- [ ] Web interface for easier use
- [ ] More chart types (heatmaps, box plots, violin plots)
- [ ] Interactive chart previews
- [ ] Batch processing from multiple Excel files
- [ ] Custom template support
- [ ] Chart annotation and labeling tools

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the examples folder for usage patterns

---

**Made with ❤️ to solve the Excel-to-Word chart problem once and for all**
