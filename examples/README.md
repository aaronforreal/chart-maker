# Example Data Files

This directory contains sample Excel files to demonstrate the chart maker.

## Sample Data Structure

To create your own Excel file for testing, use this structure:

### sample_data.xlsx

| Month    | Sales | Expenses |
|----------|-------|----------|
| January  | 5000  | 3000     |
| February | 6000  | 3200     |
| March    | 5500  | 3100     |
| April    | 7200  | 3500     |
| May      | 6800  | 3400     |
| June     | 7500  | 3600     |

## How to Create Sample File

After installing dependencies with `pip install -r requirements.txt`, run:

```python
python -c "import pandas as pd; df = pd.DataFrame({'Month': ['January', 'February', 'March', 'April', 'May', 'June'], 'Sales': [5000, 6000, 5500, 7200, 6800, 7500], 'Expenses': [3000, 3200, 3100, 3500, 3400, 3600]}); df.to_excel('examples/sample_data.xlsx', index=False)"
```

Or simply create an Excel file manually with the structure shown above.
