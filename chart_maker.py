#!/usr/bin/env python3
"""
Excel Chart Maker
A standalone tool to generate publication-ready charts from Excel files.
"""

import argparse
import json
import os
import sys
from pathlib import Path

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib import rcParams


class ChartMaker:
    """Main class for generating charts from Excel data."""

    def __init__(self, theme='professional'):
        """Initialize the chart maker with a theme."""
        self.theme = theme
        self.theme_config = self._load_theme()
        self._apply_theme()

    def _load_theme(self):
        """Load theme configuration from JSON file."""
        config_path = Path(__file__).parent / 'config' / 'themes.json'
        try:
            with open(config_path, 'r') as f:
                themes = json.load(f)
                if self.theme in themes['themes']:
                    return themes['themes'][self.theme]
                else:
                    print(f"Warning: Theme '{self.theme}' not found. Using default.")
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

    def read_excel(self, file_path, sheet_name=0):
        """Read data from Excel file."""
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            print(f"Successfully read {len(df)} rows from {file_path}")
            return df
        except Exception as e:
            print(f"Error reading Excel file: {e}")
            sys.exit(1)

    def create_chart(self, df, chart_type='auto', title=None, xlabel=None, ylabel=None):
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
            print(f"Unknown chart type: {chart_type}. Defaulting to line chart.")
            self._create_line_chart(df, ax)

        plt.tight_layout()
        return fig

    def _detect_chart_type(self, df):
        """Auto-detect appropriate chart type based on data."""
        # Simple heuristic: if first column is text/dates and rest are numeric, use line
        if len(df.columns) >= 2:
            return 'line'
        return 'bar'

    def _create_line_chart(self, df, ax):
        """Create a line chart."""
        # Use first column as x-axis, plot remaining columns
        x_col = df.columns[0]
        for col in df.columns[1:]:
            ax.plot(df[x_col], df[col], marker='o', linewidth=2, markersize=6, label=col)

        ax.legend(frameon=True, fancybox=True, shadow=True)
        ax.set_xlabel(x_col)
        plt.xticks(rotation=45, ha='right')

    def _create_bar_chart(self, df, ax):
        """Create a bar chart."""
        x_col = df.columns[0]

        if len(df.columns) == 2:
            # Single series bar chart
            ax.bar(df[x_col], df[df.columns[1]], color=self.theme_config['colors'][0])
            ax.set_xlabel(x_col)
            ax.set_ylabel(df.columns[1])
        else:
            # Grouped bar chart
            df_plot = df.set_index(x_col)
            df_plot.plot(kind='bar', ax=ax, color=self.theme_config['colors'])
            ax.legend(frameon=True, fancybox=True, shadow=True)

        plt.xticks(rotation=45, ha='right')

    def _create_scatter_chart(self, df, ax):
        """Create a scatter plot."""
        if len(df.columns) < 2:
            print("Scatter plot requires at least 2 columns")
            return

        x_col = df.columns[0]
        y_col = df.columns[1]

        ax.scatter(df[x_col], df[y_col], s=100, alpha=0.6,
                   color=self.theme_config['colors'][0], edgecolors='black', linewidth=1)
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_col)

    def _create_pie_chart(self, df, ax):
        """Create a pie chart."""
        if len(df.columns) < 2:
            print("Pie chart requires at least 2 columns (labels and values)")
            return

        labels = df[df.columns[0]]
        values = df[df.columns[1]]

        ax.pie(values, labels=labels, autopct='%1.1f%%', startangle=90,
               colors=self.theme_config['colors'])
        ax.axis('equal')

    def save_chart(self, fig, output_path, format='png', dpi=300):
        """Save the chart to a file."""
        try:
            fig.savefig(output_path, format=format, dpi=dpi, bbox_inches='tight')
            print(f"Chart saved to: {output_path}")
        except Exception as e:
            print(f"Error saving chart: {e}")

    def process_file(self, input_file, output_dir, chart_type='auto',
                     format='png', dpi=300, title=None):
        """Process an Excel file and generate chart(s)."""
        # Read the Excel file
        df = self.read_excel(input_file)

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

        # Generate a title if not provided
        if not title:
            title = Path(input_file).stem.replace('_', ' ').title()

        # Create the chart
        fig = self.create_chart(df, chart_type=chart_type, title=title)

        # Generate output filename
        output_filename = f"{Path(input_file).stem}_chart.{format}"
        output_path = Path(output_dir) / output_filename

        # Save the chart
        self.save_chart(fig, output_path, format=format, dpi=dpi)

        plt.close(fig)


def main():
    """Main entry point for the command-line interface."""
    parser = argparse.ArgumentParser(
        description='Generate publication-ready charts from Excel files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s -i data.xlsx
  %(prog)s -i sales.xlsx -t bar -f pdf --dpi 600
  %(prog)s -i data.xlsx -o charts/ --theme minimal
        """
    )

    parser.add_argument('-i', '--input', required=True,
                        help='Path to input Excel file')
    parser.add_argument('-o', '--output', default='./output',
                        help='Output directory for charts (default: ./output)')
    parser.add_argument('-t', '--type', default='auto',
                        choices=['auto', 'line', 'bar', 'scatter', 'pie'],
                        help='Chart type (default: auto)')
    parser.add_argument('-f', '--format', default='png',
                        choices=['png', 'pdf', 'svg'],
                        help='Output format (default: png)')
    parser.add_argument('--dpi', type=int, default=300,
                        help='Image resolution for PNG (default: 300)')
    parser.add_argument('--theme', default='professional',
                        choices=['professional', 'minimal', 'vibrant', 'academic'],
                        help='Color theme (default: professional)')
    parser.add_argument('--title', default=None,
                        help='Custom chart title')

    args = parser.parse_args()

    # Check if input file exists
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found")
        sys.exit(1)

    # Create chart maker and process file
    print(f"\n{'='*60}")
    print("Excel Chart Maker")
    print(f"{'='*60}\n")

    maker = ChartMaker(theme=args.theme)
    maker.process_file(
        input_file=args.input,
        output_dir=args.output,
        chart_type=args.type,
        format=args.format,
        dpi=args.dpi,
        title=args.title
    )

    print(f"\n{'='*60}")
    print("✓ Chart generation complete!")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
