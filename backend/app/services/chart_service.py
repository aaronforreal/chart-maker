"""
Chart Service
Refactored ChartMaker class for API usage with support for base64 encoding.
"""

import base64
import io
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for API
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib import rcParams


class ChartService:
    """Service class for generating charts from Excel data."""

    def __init__(self, theme='professional'):
        """Initialize the chart service with a theme."""
        self.theme = theme
        self.theme_config = self._load_theme()
        self._apply_theme()

    def _load_theme(self):
        """Load theme configuration from JSON file."""
        config_path = Path(__file__).parent.parent / 'config' / 'themes.json'
        try:
            with open(config_path, 'r') as f:
                themes = json.load(f)
                if self.theme in themes['themes']:
                    return themes['themes'][self.theme]
                else:
                    default_theme = themes['default_theme']
                    return themes['themes'][default_theme]
        except Exception as e:
            print(f"Error loading theme: {e}")
            return self._get_default_theme()

    def _get_default_theme(self):
        """Return a basic default theme if config file can't be loaded."""
        return {
            "colors": ["#2E86AB", "#A23B72", "#F18F01", "#C73E1D", "#6A994E"],
            "background": "#FFFFFF",
            "grid_color": "#E0E0E0",
            "grid_alpha": 0.3,
            "font_family": "sans-serif",
            "title_size": 16,
            "label_size": 12,
            "tick_size": 10
        }

    def _apply_theme(self):
        """Apply theme settings to matplotlib."""
        rcParams['figure.facecolor'] = self.theme_config['background']
        rcParams['axes.facecolor'] = self.theme_config['background']
        rcParams['font.family'] = self.theme_config['font_family']
        rcParams['axes.titlesize'] = self.theme_config['title_size']
        rcParams['axes.labelsize'] = self.theme_config['label_size']
        rcParams['xtick.labelsize'] = self.theme_config['tick_size']
        rcParams['ytick.labelsize'] = self.theme_config['tick_size']
        rcParams['axes.grid'] = True
        rcParams['grid.alpha'] = self.theme_config['grid_alpha']
        rcParams['grid.color'] = self.theme_config['grid_color']

        # Set seaborn style
        sns.set_palette(self.theme_config['colors'])

    @staticmethod
    def load_themes() -> Dict:
        """Load all available themes from config."""
        config_path = Path(__file__).parent.parent / 'config' / 'themes.json'
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading themes: {e}")
            return {"themes": {}, "default_theme": "professional"}

    def read_excel(self, file_path: str, sheet_name: int = 0) -> pd.DataFrame:
        """Read data from Excel file."""
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            return df
        except Exception as e:
            raise ValueError(f"Error reading Excel file: {e}")

    def get_data_preview(self, df: pd.DataFrame, max_rows: int = 100) -> Dict:
        """Get a preview of the dataframe for display."""
        return {
            "columns": df.columns.tolist(),
            "rows": df.head(max_rows).values.tolist(),
            "total_rows": len(df),
            "row_count": min(max_rows, len(df))
        }

    def create_chart(self, df: pd.DataFrame, chart_type: str = 'auto',
                     title: Optional[str] = None, xlabel: Optional[str] = None,
                     ylabel: Optional[str] = None):
        """Create a chart from the dataframe."""
        fig, ax = plt.subplots(figsize=(10, 6))

        # Auto-detect chart type if needed
        if chart_type == 'auto':
            chart_type = self._detect_chart_type(df)

        # Set title and labels
        if title:
            ax.set_title(title, fontweight='bold', pad=20)
        if xlabel:
            ax.set_xlabel(xlabel)
        if ylabel:
            ax.set_ylabel(ylabel)

        # Create the appropriate chart type
        if chart_type == 'line':
            self._create_line_chart(df, ax)
        elif chart_type == 'bar':
            self._create_bar_chart(df, ax)
        elif chart_type == 'scatter':
            self._create_scatter_chart(df, ax)
        elif chart_type == 'pie':
            self._create_pie_chart(df, ax)
        else:
            self._create_line_chart(df, ax)

        plt.tight_layout()
        return fig

    def _detect_chart_type(self, df: pd.DataFrame) -> str:
        """Auto-detect appropriate chart type based on data."""
        if len(df.columns) >= 2:
            return 'line'
        return 'bar'

    def _create_line_chart(self, df: pd.DataFrame, ax):
        """Create a line chart."""
        x_col = df.columns[0]
        for col in df.columns[1:]:
            ax.plot(df[x_col], df[col], marker='o', linewidth=2, markersize=6, label=col)

        ax.legend(frameon=True, fancybox=True, shadow=True)
        ax.set_xlabel(x_col)
        plt.xticks(rotation=45, ha='right')

    def _create_bar_chart(self, df: pd.DataFrame, ax):
        """Create a bar chart."""
        x_col = df.columns[0]

        if len(df.columns) == 2:
            ax.bar(df[x_col], df[df.columns[1]], color=self.theme_config['colors'][0])
            ax.set_xlabel(x_col)
            ax.set_ylabel(df.columns[1])
        else:
            df_plot = df.set_index(x_col)
            df_plot.plot(kind='bar', ax=ax, color=self.theme_config['colors'])
            ax.legend(frameon=True, fancybox=True, shadow=True)

        plt.xticks(rotation=45, ha='right')

    def _create_scatter_chart(self, df: pd.DataFrame, ax):
        """Create a scatter plot."""
        if len(df.columns) < 2:
            raise ValueError("Scatter plot requires at least 2 columns")

        x_col = df.columns[0]
        y_col = df.columns[1]

        ax.scatter(df[x_col], df[y_col], s=100, alpha=0.6,
                   color=self.theme_config['colors'][0], edgecolors='black', linewidth=1)
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_col)

    def _create_pie_chart(self, df: pd.DataFrame, ax):
        """Create a pie chart."""
        if len(df.columns) < 2:
            raise ValueError("Pie chart requires at least 2 columns (labels and values)")

        labels = df[df.columns[0]]
        values = df[df.columns[1]]

        ax.pie(values, labels=labels, autopct='%1.1f%%', startangle=90,
               colors=self.theme_config['colors'])
        ax.axis('equal')

    def save_chart_to_file(self, fig, output_path: str, format: str = 'png', dpi: int = 300):
        """Save the chart to a file."""
        try:
            fig.savefig(output_path, format=format, dpi=dpi, bbox_inches='tight')
            return output_path
        except Exception as e:
            raise ValueError(f"Error saving chart: {e}")
        finally:
            plt.close(fig)

    def chart_to_base64(self, fig, format: str = 'png', dpi: int = 300) -> str:
        """Convert chart figure to base64 encoded string."""
        try:
            buffer = io.BytesIO()
            fig.savefig(buffer, format=format, dpi=dpi, bbox_inches='tight')
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
            return img_base64
        except Exception as e:
            raise ValueError(f"Error encoding chart: {e}")
        finally:
            buffer.close()
            plt.close(fig)

    def chart_to_bytes(self, fig, format: str = 'png', dpi: int = 300) -> bytes:
        """Convert chart figure to bytes."""
        try:
            buffer = io.BytesIO()
            fig.savefig(buffer, format=format, dpi=dpi, bbox_inches='tight')
            buffer.seek(0)
            return buffer.read()
        except Exception as e:
            raise ValueError(f"Error converting chart to bytes: {e}")
        finally:
            buffer.close()
            plt.close(fig)

    def generate_chart(self, file_path: str, chart_type: str = 'auto',
                       format: str = 'png', dpi: int = 300,
                       title: Optional[str] = None,
                       return_base64: bool = True) -> Tuple[Any, pd.DataFrame]:
        """
        Generate a chart from an Excel file.

        Returns:
            Tuple of (chart_data, dataframe) where chart_data is either base64 string or bytes
        """
        df = self.read_excel(file_path)

        if not title:
            title = Path(file_path).stem.replace('_', ' ').title()

        fig = self.create_chart(df, chart_type=chart_type, title=title)

        if return_base64:
            chart_data = self.chart_to_base64(fig, format=format, dpi=dpi)
        else:
            chart_data = self.chart_to_bytes(fig, format=format, dpi=dpi)

        return chart_data, df
