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
from matplotlib.ticker import FuncFormatter


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

    def _apply_theme(self, font_overrides=None, grid_overrides=None):
        """Apply theme settings to matplotlib, with optional overrides."""
        tc = self.theme_config

        rcParams['figure.facecolor'] = tc['background']
        rcParams['axes.facecolor'] = tc['background']

        # Font settings (allow overrides)
        rcParams['font.family'] = (font_overrides.get('family') or tc['font_family']) if font_overrides else tc['font_family']
        rcParams['axes.titlesize'] = (font_overrides.get('title_size') or tc['title_size']) if font_overrides else tc['title_size']
        rcParams['axes.labelsize'] = (font_overrides.get('label_size') or tc['label_size']) if font_overrides else tc['label_size']
        tick_size = (font_overrides.get('tick_size') or tc['tick_size']) if font_overrides else tc['tick_size']
        rcParams['xtick.labelsize'] = tick_size
        rcParams['ytick.labelsize'] = tick_size

        # Grid settings (allow overrides)
        if grid_overrides:
            rcParams['axes.grid'] = grid_overrides.get('enabled', True)
            rcParams['grid.alpha'] = grid_overrides.get('alpha') or tc['grid_alpha']
            rcParams['grid.color'] = tc['grid_color']
            linestyle_map = {'solid': '-', 'dashed': '--', 'dotted': ':'}
            rcParams['grid.linestyle'] = linestyle_map.get(grid_overrides.get('linestyle', 'solid'), '-')
        else:
            rcParams['axes.grid'] = True
            rcParams['grid.alpha'] = tc['grid_alpha']
            rcParams['grid.color'] = tc['grid_color']

        # Set seaborn style
        sns.set_palette(tc['colors'])

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

    def _detect_excel_structure(self, file_path: str) -> Tuple[Optional[str], Optional[int]]:
        """
        Scan the raw Excel sheet to find leading title rows and the actual data header row.

        Returns:
            (extracted_title, header_row_index)
            header_row_index is None when the first multi-value row is already data
            (contains numbers), meaning there is no proper column-header row.
        """
        try:
            raw = pd.read_excel(file_path, header=None, sheet_name=0)
        except Exception:
            return None, 0

        extracted_title: Optional[str] = None

        for i in range(len(raw)):
            row = raw.iloc[i]
            non_null = row.dropna()

            if len(non_null) == 0:
                continue  # skip blank rows

            if len(non_null) == 1 and isinstance(non_null.iloc[0], str):
                # Single text cell — treat as a title/section-header row
                extracted_title = str(non_null.iloc[0]).strip()
            else:
                # First row with multiple values
                all_strings = all(isinstance(v, str) for v in non_null)
                if all_strings:
                    return extracted_title, i  # proper column-header row
                else:
                    return extracted_title, None  # data row — no header exists

        return extracted_title, 0

    def _detect_percentage_column(self, df: pd.DataFrame) -> Tuple[Optional[str], bool]:
        """
        Detect which column (if any) contains percentage data.

        Returns:
            (col_name, is_decimal) where is_decimal=True means values are stored
            as decimals in the range [0, 1] (Excel % format) and need ×100 for display.
            Returns (None, False) when no percentage column is detected.
        """
        for col in df.columns[1:]:  # skip the first (category label) column
            col_str = str(col).lower()
            if any(kw in col_str for kw in ['%', 'percent', 'pct']):
                numeric = pd.to_numeric(df[col], errors='coerce').dropna()
                is_decimal = (
                    len(numeric) > 0
                    and (numeric >= 0).all()
                    and (numeric <= 1).all()
                )
                return col, is_decimal

        # Fallback: check for columns whose values all fall in [0, 1] (decimal %)
        for col in df.columns[1:]:
            numeric = pd.to_numeric(df[col], errors='coerce').dropna()
            if (
                len(numeric) > 0
                and (numeric >= 0).all()
                and (numeric <= 1).all()
                and numeric.mean() < 0.5  # avoid columns that happen to have small integers
            ):
                return col, True

        return None, False

    def _detect_all_sections(self, file_path: str) -> List[Dict]:
        """
        Scan the raw Excel sheet and return metadata for every distinct data section.

        A section is a group of contiguous data rows preceded by an optional title row.
        Sections are separated by empty rows.

        Returns:
            List of dicts: {title, data_start, data_end, data_rows}
            Returns an empty list when the sheet has no recognisable sections.
        """
        try:
            raw = pd.read_excel(file_path, header=None, sheet_name=0)
        except Exception:
            return []

        def is_empty_row(row):
            return row.dropna().empty

        def is_title_row(row):
            non_null = row.dropna()
            return (
                1 <= len(non_null) <= 2
                and all(isinstance(v, str) for v in non_null)
            )

        def is_data_row(row):
            non_null = row.dropna()
            return len(non_null) >= 2

        sections: List[Dict] = []
        current_title: Optional[str] = None
        current_data_rows: List[int] = []

        for i in range(len(raw)):
            row = raw.iloc[i]

            if is_empty_row(row):
                # Gap: flush any open section
                if current_data_rows:
                    sections.append({
                        'title': current_title or f'Section {len(sections) + 1}',
                        'data_start': current_data_rows[0],
                        'data_end': current_data_rows[-1],
                        'data_rows': list(current_data_rows),
                    })
                    current_title = None
                    current_data_rows = []
                continue

            if is_title_row(row) and not current_data_rows:
                # Title before data begins — keep the nearest one
                non_null = row.dropna()
                current_title = str(non_null.iloc[0]).strip()
                continue

            if is_data_row(row):
                current_data_rows.append(i)

        # Flush last section (no trailing empty row at end of file)
        if current_data_rows:
            sections.append({
                'title': current_title or f'Section {len(sections) + 1}',
                'data_start': current_data_rows[0],
                'data_end': current_data_rows[-1],
                'data_rows': list(current_data_rows),
            })

        # Prune the first "section" when it looks like a sheet-level preamble:
        # a trivially small section (≤2 data rows) before other real sections.
        if len(sections) > 1 and len(sections[0]['data_rows']) <= 2:
            sections = sections[1:]

        return sections

    def read_excel_section(self, file_path: str, section_index: int = 0) -> pd.DataFrame:
        """
        Read a single section from a multi-section Excel file as a clean DataFrame.

        Falls back to read_excel() for files where no sections are detected.
        """
        self.extracted_title: Optional[str] = None
        sections = self._detect_all_sections(file_path)

        if not sections:
            return self.read_excel(file_path)

        # Clamp to valid range
        section_index = max(0, min(section_index, len(sections) - 1))
        section = sections[section_index]
        self.extracted_title = section['title']

        try:
            raw = pd.read_excel(file_path, header=None, sheet_name=0)
        except Exception as e:
            raise ValueError(f"Error reading Excel file: {e}")

        section_raw = raw.iloc[section['data_rows']].reset_index(drop=True)

        # Drop all-NaN columns (spacer columns like col A)
        section_raw = section_raw.dropna(how='all', axis=1).reset_index(drop=True)

        if len(section_raw) == 0:
            raise ValueError(f"Section '{section['title']}' has no data rows.")

        # Detect if the first row is a text header row
        first_row = section_raw.iloc[0].dropna()
        all_strings = all(isinstance(v, str) for v in first_row)

        if all_strings and len(section_raw) > 1:
            # Promote first row to column names
            section_raw.columns = [str(v) for v in section_raw.iloc[0]]
            section_raw = section_raw.iloc[1:].reset_index(drop=True)
        else:
            section_raw.columns = [f'Column_{i}' for i in range(len(section_raw.columns))]

        # Drop residual all-NaN rows
        section_raw = section_raw.dropna(how='all').reset_index(drop=True)

        return section_raw

    def read_excel(self, file_path: str, sheet_name: int = 0) -> pd.DataFrame:
        """Read data from Excel file, auto-detecting leading title rows and spacer columns."""
        self.extracted_title: Optional[str] = None
        try:
            extracted_title, header_row = self._detect_excel_structure(file_path)
            self.extracted_title = extracted_title

            if header_row is None:
                # No proper column-header row: read raw, strip title/empty rows and spacers
                df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
                # Keep only rows that have 2+ non-null values (drops title rows, empty rows)
                df = df[df.notna().sum(axis=1) >= 2].reset_index(drop=True)
                # Drop columns that are entirely NaN in the remaining data rows (spacer columns)
                df = df.dropna(how='all', axis=1).reset_index(drop=True)
                # Assign safe string column names
                df.columns = [f'Column_{i}' for i in range(len(df.columns))]
            else:
                df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row)

            return df
        except Exception as e:
            raise ValueError(f"Error reading Excel file: {e}")

    def get_data_preview(self, df: pd.DataFrame) -> Dict:
        """Get a preview of the dataframe for display."""
        all_rows = df.values.tolist()
        return {
            "columns": [str(c) for c in df.columns.tolist()],
            "rows": all_rows,
            "total_rows": len(df),
            "row_count": len(df)
        }

    def create_chart(self, df: pd.DataFrame, chart_type: str = 'auto',
                     title: Optional[str] = None, xlabel: Optional[str] = None,
                     ylabel: Optional[str] = None,
                     colors: Optional[List[str]] = None,
                     units: Optional[Dict] = None,
                     data_labels: Optional[Dict] = None):
        """Create a chart from the dataframe."""
        effective_colors = colors if colors else self.theme_config['colors']

        fig, ax = plt.subplots(figsize=(10, 6))

        # Auto-detect chart type if needed
        if chart_type == 'auto':
            chart_type = self._detect_chart_type(df)

        # Create the appropriate chart type (sets auto-detected labels from column names)
        if chart_type == 'line':
            self._create_line_chart(df, ax, colors=effective_colors)
        elif chart_type == 'bar':
            self._create_bar_chart(df, ax, colors=effective_colors, data_labels=data_labels)
        elif chart_type == 'horizontal_bar':
            self._create_horizontal_bar_chart(df, ax, colors=effective_colors, data_labels=data_labels)
        elif chart_type == 'scatter':
            self._create_scatter_chart(df, ax, colors=effective_colors, data_labels=data_labels)
        elif chart_type == 'pie':
            self._create_pie_chart(df, ax, colors=effective_colors, data_labels=data_labels)
        else:
            self._create_line_chart(df, ax, colors=effective_colors)

        # Set title and labels AFTER chart creation so user values override auto-detected ones
        if title:
            ax.set_title(title, fontweight='bold', pad=20)
        if xlabel:
            ax.set_xlabel(xlabel)
        if ylabel:
            ax.set_ylabel(ylabel)

        # Apply unit formatting to axes
        if units:
            x_pre = units.get('x_prefix', '')
            x_suf = units.get('x_suffix', '')
            if x_pre or x_suf:
                ax.xaxis.set_major_formatter(
                    FuncFormatter(lambda val, pos, p=x_pre, s=x_suf: f"{p}{val:g}{s}")
                )
            y_pre = units.get('y_prefix', '')
            y_suf = units.get('y_suffix', '')
            if y_pre or y_suf:
                ax.yaxis.set_major_formatter(
                    FuncFormatter(lambda val, pos, p=y_pre, s=y_suf: f"{p}{val:g}{s}")
                )

        plt.tight_layout()
        return fig

    def _detect_chart_type(self, df: pd.DataFrame) -> str:
        """Auto-detect appropriate chart type based on data."""
        if len(df.columns) >= 2:
            return 'line'
        return 'bar'

    def _create_line_chart(self, df: pd.DataFrame, ax, colors: Optional[List[str]] = None):
        """Create a line chart."""
        effective_colors = colors or self.theme_config['colors']
        x_col = df.columns[0]
        for i, col in enumerate(df.columns[1:]):
            color = effective_colors[i % len(effective_colors)]
            ax.plot(df[x_col], df[col], marker='o', linewidth=2, markersize=6,
                    label=col, color=color)

        ax.legend(frameon=True, fancybox=True, shadow=True)
        ax.set_xlabel(x_col)
        plt.xticks(rotation=45, ha='right')

    def _create_bar_chart(self, df: pd.DataFrame, ax,
                          colors: Optional[List[str]] = None,
                          data_labels: Optional[Dict] = None):
        """Create a bar chart."""
        effective_colors = colors or self.theme_config['colors']
        x_col = df.columns[0]

        if len(df.columns) == 2:
            bars = ax.bar(df[x_col], df[df.columns[1]], color=effective_colors[0])
            ax.set_xlabel(x_col)
            ax.set_ylabel(df.columns[1])
            if data_labels and data_labels.get('show'):
                fmt = data_labels.get('format')
                ax.bar_label(bars, fmt=f'{{:{fmt}}}' if fmt else None, padding=3)
        else:
            df_plot = df.set_index(x_col)
            df_plot.plot(kind='bar', ax=ax, color=effective_colors)
            ax.legend(frameon=True, fancybox=True, shadow=True)
            if data_labels and data_labels.get('show'):
                fmt = data_labels.get('format')
                for container in ax.containers:
                    ax.bar_label(container, fmt=f'{{:{fmt}}}' if fmt else None, padding=3)

        plt.xticks(rotation=45, ha='right')

    def _create_horizontal_bar_chart(self, df: pd.DataFrame, ax,
                                     colors: Optional[List[str]] = None,
                                     data_labels: Optional[Dict] = None):
        """Create a horizontal bar chart."""
        effective_colors = colors or self.theme_config['colors']
        x_col = df.columns[0]

        if len(df.columns) == 2:
            # Single series: categories on y-axis, values on x-axis
            values = df[df.columns[1]]
            bars = ax.barh(df[x_col], values, color=effective_colors[0])
            ax.set_ylabel(x_col)
            ax.set_xlabel(df.columns[1])
            if data_labels and data_labels.get('show'):
                fmt = data_labels.get('format')
                fmt_str = f'{{:{fmt}}}' if fmt else None
                ax.bar_label(bars, fmt=fmt_str, padding=3)
        else:
            # Multiple series: use pandas helper, which handles grouping
            df_plot = df.set_index(x_col)
            df_plot.plot(kind='barh', ax=ax, color=effective_colors)
            ax.legend(frameon=True, fancybox=True, shadow=True)
            if data_labels and data_labels.get('show'):
                fmt = data_labels.get('format')
                fmt_str = f'{{:{fmt}}}' if fmt else None
                for container in ax.containers:
                    ax.bar_label(container, fmt=fmt_str, padding=3)

        plt.xticks(rotation=0)

    def _create_scatter_chart(self, df: pd.DataFrame, ax,
                              colors: Optional[List[str]] = None,
                              data_labels: Optional[Dict] = None):
        """Create a scatter plot."""
        if len(df.columns) < 2:
            raise ValueError("Scatter plot requires at least 2 columns")

        effective_colors = colors or self.theme_config['colors']
        x_col = df.columns[0]
        y_col = df.columns[1]

        ax.scatter(df[x_col], df[y_col], s=100, alpha=0.6,
                   color=effective_colors[0], edgecolors='black', linewidth=1)
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_col)

        if data_labels and data_labels.get('show'):
            fmt_spec = data_labels.get('format') or 'g'
            for x_val, y_val in zip(df[x_col], df[y_col]):
                label_text = format(y_val, fmt_spec) if isinstance(y_val, (int, float)) else str(y_val)
                ax.annotate(label_text, (x_val, y_val),
                           textcoords="offset points", xytext=(5, 5),
                           fontsize=8, alpha=0.8)

    def _create_pie_chart(self, df: pd.DataFrame, ax,
                          colors: Optional[List[str]] = None,
                          data_labels: Optional[Dict] = None):
        """Create a pie chart."""
        if len(df.columns) < 2:
            raise ValueError("Pie chart requires at least 2 columns (labels and values)")

        effective_colors = colors or self.theme_config['colors']
        labels = df[df.columns[0]]
        values = df[df.columns[1]]

        if data_labels and data_labels.get('show') and data_labels.get('format'):
            fmt = data_labels['format']
            autopct = lambda pct: f'{pct:{fmt}}%'
        else:
            autopct = '%1.1f%%'

        ax.pie(values, labels=labels, autopct=autopct, startangle=90,
               colors=effective_colors)
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

    def build_plotly_data(self, file_path: str, options: Dict) -> Tuple[List, Dict, str, List[str]]:
        """
        Build Plotly-compatible traces and layout from an Excel file.

        Returns:
            (traces, layout, resolved_chart_type, columns)
        """
        sections = self._detect_all_sections(file_path)
        section_index = options.get('section_index', 0)
        if len(sections) > 1:
            df = self.read_excel_section(file_path, section_index)
        else:
            df = self.read_excel(file_path)
        columns = df.columns.tolist()

        # Detect percentage column before resolving chart type so auto-detection can use it
        pct_col, is_decimal = self._detect_percentage_column(df)

        chart_type = options.get('chart_type', 'auto')
        if chart_type == 'auto':
            if pct_col:
                chart_type = 'horizontal_bar'
            else:
                chart_type = self._detect_chart_type(df)

        theme = self._load_theme_by_name(options.get('theme', 'professional'))
        colors = options.get('colors') or theme['colors']
        # Use the extracted title from the Excel structure when no explicit title is given
        title = options.get('title') or self.extracted_title or ''
        xlabel = options.get('xlabel')
        ylabel = options.get('ylabel')

        traces = []

        if chart_type == 'line':
            x_col = df.columns[0]
            for i, col in enumerate(df.columns[1:]):
                traces.append({
                    'type': 'scatter',
                    'mode': 'lines+markers',
                    'x': df[x_col].tolist(),
                    'y': pd.to_numeric(df[col], errors='coerce').tolist(),
                    'name': col,
                    'line': {'color': colors[i % len(colors)], 'width': 2},
                    'marker': {'size': 6, 'color': colors[i % len(colors)]},
                })

        elif chart_type == 'bar':
            x_col = df.columns[0]
            for i, col in enumerate(df.columns[1:]):
                traces.append({
                    'type': 'bar',
                    'x': df[x_col].tolist(),
                    'y': pd.to_numeric(df[col], errors='coerce').tolist(),
                    'name': col,
                    'marker': {'color': colors[i % len(colors)]},
                })

        elif chart_type == 'horizontal_bar':
            x_col = df.columns[0]
            if pct_col:
                # Percentage chart: use only the percentage column, scaled to 0-100
                raw_vals = pd.to_numeric(df[pct_col], errors='coerce')
                x_vals = (raw_vals * 100).tolist() if is_decimal else raw_vals.tolist()
                show_data_labels = options.get('show_data_labels', False)
                if show_data_labels:
                    count_col = next((c for c in df.columns[1:] if c != pct_col), None)
                    if count_col is not None:
                        counts = pd.to_numeric(df[count_col], errors='coerce')
                        text_labels = [
                            f'{int(c):,} ({p:.1f}%)' for c, p in zip(counts, x_vals)
                        ]
                    else:
                        text_labels = [f'{v:.1f}%' for v in x_vals]
                    trace_extra = {'text': text_labels, 'textposition': 'outside'}
                else:
                    trace_extra = {}
                traces.append({
                    'type': 'bar',
                    'orientation': 'h',
                    'y': df[x_col].tolist(),
                    'x': x_vals,
                    'name': str(pct_col),
                    'marker': {'color': colors[0]},
                    **trace_extra,
                })
            else:
                for i, col in enumerate(df.columns[1:]):
                    traces.append({
                        'type': 'bar',
                        'orientation': 'h',
                        'y': df[x_col].tolist(),
                        'x': pd.to_numeric(df[col], errors='coerce').tolist(),
                        'name': col,
                        'marker': {'color': colors[i % len(colors)]},
                    })

        elif chart_type == 'scatter':
            x_col = df.columns[0]
            y_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]
            x_vals = pd.to_numeric(df[x_col], errors='coerce')
            y_vals = pd.to_numeric(df[y_col], errors='coerce')
            traces.append({
                'type': 'scatter',
                'mode': 'markers',
                'x': x_vals.tolist(),
                'y': y_vals.tolist(),
                'name': y_col,
                'marker': {
                    'size': 10,
                    'color': colors[0],
                    'opacity': 0.7,
                    'line': {'width': 1, 'color': '#333333'},
                },
            })

        elif chart_type == 'pie':
            label_col = df.columns[0]
            value_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]
            traces.append({
                'type': 'pie',
                'labels': df[label_col].tolist(),
                'values': pd.to_numeric(df[value_col], errors='coerce').tolist(),
                'marker': {'colors': colors},
                'textinfo': 'label+percent',
            })

        # Apply per-bar custom colors for single-series bar charts
        bar_colors_param = options.get('bar_colors')
        if bar_colors_param:
            for trace in traces:
                if trace.get('type') == 'bar' and not isinstance(trace.get('marker', {}).get('color'), list):
                    bar_vals = trace.get('y') if trace.get('orientation') == 'h' else trace.get('x')
                    bar_count = len(bar_vals) if bar_vals else 0
                    series_color = trace['marker']['color']
                    trace['marker']['color'] = [
                        bar_colors_param[i] if i < len(bar_colors_param) else series_color
                        for i in range(bar_count)
                    ]

        # Apply ratings mode: per-bar coloring and ensure data labels are shown
        ratings_mode = options.get('ratings_mode', False)
        if ratings_mode and chart_type == 'horizontal_bar':
            low_thresh = options.get('ratings_low_threshold', 3.15)
            high_thresh = options.get('ratings_high_threshold', 3.85)
            for trace in traces:
                if trace.get('type') == 'bar' and trace.get('orientation') == 'h':
                    x_vals = trace['x']
                    bar_colors = []
                    for val in x_vals:
                        try:
                            v = float(val)
                            if v <= low_thresh:
                                bar_colors.append('#E8483B')
                            elif v <= high_thresh:
                                bar_colors.append('#F5D033')
                            else:
                                bar_colors.append('#4CAF50')
                        except (TypeError, ValueError):
                            bar_colors.append('#CCCCCC')
                    trace['marker']['color'] = bar_colors
                    # Auto-add value labels if not already set
                    if 'text' not in trace:
                        trace['text'] = [
                            f'{float(v):.3g}' if v is not None else ''
                            for v in x_vals
                        ]
                        trace['textposition'] = 'inside'
                        trace['insidetextanchor'] = 'end'
                        trace['textfont'] = {'color': '#333333', 'size': 11}

        # Build layout
        if chart_type == 'horizontal_bar':
            # Categories on y-axis, values on x-axis
            default_x_title = str(pct_col) if pct_col else (df.columns[1] if len(df.columns) > 1 else '')
            default_y_title = df.columns[0]
        else:
            default_x_title = df.columns[0] if chart_type != 'pie' else ''
            default_y_title = ''

        xaxis_cfg: Dict[str, Any] = {
            'title': xlabel or default_x_title,
            'tickangle': -45 if chart_type != 'horizontal_bar' else 0,
            'gridcolor': theme.get('grid_color', '#E0E0E0'),
            'gridwidth': 1,
        }
        if chart_type == 'horizontal_bar' and pct_col:
            xaxis_cfg['range'] = [0, 100]
            xaxis_cfg['ticksuffix'] = '%'

        layout = {
            'title': {'text': title, 'font': {'size': theme.get('title_size', 16)}},
            'xaxis': xaxis_cfg,
            'yaxis': {
                'title': ylabel or default_y_title,
                'gridcolor': theme.get('grid_color', '#E0E0E0'),
                'gridwidth': 1,
            },
            'colorway': colors,
            'plot_bgcolor': theme.get('background', '#FFFFFF'),
            'paper_bgcolor': theme.get('background', '#FFFFFF'),
            'font': {'family': theme.get('font_family', 'Arial, sans-serif'),
                     'size': theme.get('label_size', 12)},
            'legend': {'x': 1, 'y': 1, 'xanchor': 'right'},
            'hovermode': 'closest',
            'margin': {'l': 60, 'r': 40, 't': 60, 'b': 80},
        }

        if chart_type == 'horizontal_bar':
            layout['bargap'] = 0.4
            layout['height'] = max(400, len(df) * 50 + 150)

        # Ratings mode: vertical threshold lines + annotations
        if ratings_mode and chart_type == 'horizontal_bar':
            layout['shapes'] = [
                {
                    'type': 'line',
                    'x0': low_thresh, 'x1': low_thresh,
                    'y0': 0, 'y1': 1, 'yref': 'paper',
                    'line': {'color': '#333333', 'width': 1.5, 'dash': 'solid'},
                },
                {
                    'type': 'line',
                    'x0': high_thresh, 'x1': high_thresh,
                    'y0': 0, 'y1': 1, 'yref': 'paper',
                    'line': {'color': '#333333', 'width': 1.5, 'dash': 'solid'},
                },
            ]
            layout['annotations'] = layout.get('annotations', []) + [
                {
                    'x': low_thresh, 'y': -0.06,
                    'yref': 'paper', 'xref': 'x',
                    'text': str(low_thresh), 'showarrow': False,
                    'font': {'size': 12, 'color': '#333333'},
                },
                {
                    'x': high_thresh, 'y': -0.06,
                    'yref': 'paper', 'xref': 'x',
                    'text': str(high_thresh), 'showarrow': False,
                    'font': {'size': 12, 'color': '#333333'},
                },
            ]
            # Ensure bottom margin is large enough for the threshold labels
            layout['margin'] = {**layout.get('margin', {}), 'b': 100}

        return traces, layout, chart_type, columns

    def _load_theme_by_name(self, theme_name: str) -> Dict:
        """Load a theme by name without reinitializing the service."""
        config_path = Path(__file__).parent.parent / 'config' / 'themes.json'
        try:
            with open(config_path, 'r') as f:
                themes = json.load(f)
                if theme_name in themes['themes']:
                    return themes['themes'][theme_name]
                default = themes['default_theme']
                return themes['themes'][default]
        except Exception:
            return self._get_default_theme()

    def generate_chart(self, file_path: str, chart_type: str = 'auto',
                       format: str = 'png', dpi: int = 300,
                       title: Optional[str] = None,
                       return_base64: bool = True,
                       xlabel: Optional[str] = None,
                       ylabel: Optional[str] = None,
                       colors: Optional[List[str]] = None,
                       grid: Optional[Dict] = None,
                       fonts: Optional[Dict] = None,
                       units: Optional[Dict] = None,
                       data_labels: Optional[Dict] = None) -> Tuple[Any, pd.DataFrame]:
        """
        Generate a chart from an Excel file.

        Returns:
            Tuple of (chart_data, dataframe) where chart_data is either base64 string or bytes
        """
        # Re-apply theme with any font/grid overrides
        if fonts or grid:
            self._apply_theme(font_overrides=fonts, grid_overrides=grid)

        df = self.read_excel(file_path)

        if not title:
            title = Path(file_path).stem.replace('_', ' ').title()

        fig = self.create_chart(
            df, chart_type=chart_type, title=title,
            xlabel=xlabel, ylabel=ylabel,
            colors=colors, units=units, data_labels=data_labels
        )

        if return_base64:
            chart_data = self.chart_to_base64(fig, format=format, dpi=dpi)
        else:
            chart_data = self.chart_to_bytes(fig, format=format, dpi=dpi)

        return chart_data, df
