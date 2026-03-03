/**
 * ChartPreview component — renders interactive Plotly charts.
 * Replaces the old base64-image renderer.
 */

import { useRef } from 'react';
import Plot from 'react-plotly.js';
import { Eye, Loader } from 'lucide-react';

// Convert a hex color + alpha float (0-1) to an rgba() string
function hexToRgba(hex, alpha) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}

// Convert flat dot-notation keys (e.g. {'legend.x': 0.5}) to a nested object ({legend: {x: 0.5}})
function flatToNested(flat) {
  const result = {};
  for (const [key, value] of Object.entries(flat || {})) {
    const parts = key.split('.');
    let obj = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] == null || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
  }
  return result;
}

// Re-apply colors from the selected theme/custom palette to server-baked traces
function recolorTraces(traces, colors) {
  if (!colors || colors.length === 0) return traces;
  let idx = 0;
  return traces.map((trace) => {
    // Trend lines (mode === 'lines' only, no markers) keep their explicit color
    if (trace.type === 'scatter' && trace.mode === 'lines') return trace;

    const color = colors[idx % colors.length];
    idx++;

    if (trace.type === 'pie') {
      return { ...trace, marker: { ...trace.marker, colors } };
    }
    if (trace.type === 'bar') {
      // Preserve per-bar color arrays set by the backend (e.g. ratings mode)
      if (Array.isArray(trace.marker?.color)) return trace;
      return { ...trace, marker: { ...trace.marker, color } };
    }
    if (trace.type === 'scatter') {
      return { ...trace, line: { ...trace.line, color }, marker: { ...trace.marker, color } };
    }
    return trace;
  });
}

// Maps the legend_location option string to Plotly legend anchor config
const LEGEND_LOCATION_MAP = {
  'upper right': { x: 1, y: 1, xanchor: 'right', yanchor: 'top' },
  'upper left': { x: 0, y: 1, xanchor: 'left', yanchor: 'top' },
  'lower right': { x: 1, y: 0, xanchor: 'right', yanchor: 'bottom' },
  'lower left': { x: 0, y: 0, xanchor: 'left', yanchor: 'bottom' },
  'right': { x: 1.02, y: 0.5, xanchor: 'left', yanchor: 'middle' },
  'center': { x: 0.5, y: 0.5, xanchor: 'center', yanchor: 'middle' },
};

// Maps data_label_position to Plotly textposition
const TEXT_POSITION_MAP = {
  'auto': 'auto',
  'above': 'top center',
  'below': 'bottom center',
  'center': 'middle center',
};

// Simple least-squares linear regression y = m*x + b
function computeLinearRegression(xVals, yVals) {
  const n = xVals.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = xVals[i];
    const y = yVals[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (!isFinite(denom) || denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// Build dynamic trend line traces on the client so they respond instantly
// to sidebar changes (color, style, label, show/hide) without another
// round-trip to the backend.
function buildTrendTraces(chartType, baseTrace, options) {
  // Horizontal bar charts don't currently support trend/mean overlays
  if (chartType === 'horizontal_bar') return [];

  const trendTraces = [];
  if (!baseTrace) return trendTraces;

  const linestyleMap = { solid: 'solid', dash: 'dash', dot: 'dot' };

  const rawX = baseTrace.x || [];
  const rawY = (baseTrace.y || []).map((v) => (v == null ? NaN : Number(v)));

  // Scatter charts use numeric x-values directly
  if (chartType === 'scatter') {
    const xVals = [];
    const yVals = [];
    for (let i = 0; i < rawX.length; i++) {
      const xNum = Number(rawX[i]);
      const yNum = rawY[i];
      if (Number.isFinite(xNum) && Number.isFinite(yNum)) {
        xVals.push(xNum);
        yVals.push(yNum);
      }
    }
    if (xVals.length < 2) return trendTraces;

    // Mean line
    if (options.show_mean_line) {
      const meanY = yVals.reduce((a, b) => a + b, 0) / yVals.length;
      const color = options.mean_line_color || '#F39C12';
      const dash = linestyleMap[options.mean_line_linestyle] || 'dash';
      const label = options.mean_line_label || `Mean: ${meanY.toFixed(2)}`;
      const xMin = Math.min(...xVals);
      const xMax = Math.max(...xVals);

      trendTraces.push({
        type: 'scatter',
        mode: 'lines',
        x: [xMin, xMax],
        y: [meanY, meanY],
        name: label,
        line: { color, dash, width: 2 },
        showlegend: true,
      });
    }

    // Linear regression line
    if (options.show_linear_trend) {
      const lr = computeLinearRegression(xVals, yVals);
      if (lr) {
        const { slope, intercept } = lr;
        const xMin = Math.min(...xVals);
        const xMax = Math.max(...xVals);
        const segments = 100;
        const xRange = [];
        const yRange = [];
        for (let i = 0; i <= segments; i++) {
          const x = xMin + ((xMax - xMin) * i) / segments;
          xRange.push(x);
          yRange.push(slope * x + intercept);
        }
        const color = options.linear_trend_color || '#E74C3C';
        const dash = linestyleMap[options.linear_trend_linestyle] || 'dash';
        const label = options.linear_trend_label || 'Linear Trend';

        trendTraces.push({
          type: 'scatter',
          mode: 'lines',
          x: xRange,
          y: yRange,
          name: label,
          line: { color, dash, width: 2 },
          showlegend: true,
        });
      }
    }

    return trendTraces;
  }

  // Line/bar charts: treat x as categorical; regression works over index positions
  const labels = rawX;
  const idxVals = [];
  const yVals = [];
  for (let i = 0; i < labels.length; i++) {
    const yNum = rawY[i];
    if (Number.isFinite(yNum)) {
      idxVals.push(i);
      yVals.push(yNum);
    }
  }
  if (idxVals.length < 2) return trendTraces;

  const firstIdx = idxVals[0];
  const lastIdx = idxVals[idxVals.length - 1];

  // Mean line
  if (options.show_mean_line) {
    const meanY = yVals.reduce((a, b) => a + b, 0) / yVals.length;
    const color = options.mean_line_color || '#F39C12';
    const dash = linestyleMap[options.mean_line_linestyle] || 'dash';
    const label = options.mean_line_label || `Mean: ${meanY.toFixed(2)}`;
    const xStart = labels[firstIdx];
    const xEnd = labels[lastIdx];

    trendTraces.push({
      type: 'scatter',
      mode: 'lines',
      x: [xStart, xEnd],
      y: [meanY, meanY],
      name: label,
      line: { color, dash, width: 2 },
      showlegend: true,
    });
  }

  // Linear regression line over integer indices, mapped back to labels
  if (options.show_linear_trend) {
    const xNumeric = idxVals.map((i) => Number(i));
    const lr = computeLinearRegression(xNumeric, yVals);
    if (lr) {
      const { slope, intercept } = lr;
      const segments = 100;
      const xIdxRange = [];
      for (let i = 0; i <= segments; i++) {
        const t = firstIdx + ((lastIdx - firstIdx) * i) / segments;
        xIdxRange.push(t);
      }
      const yRange = xIdxRange.map((t) => slope * t + intercept);
      const xOut = xIdxRange.map((t) => {
        const rounded = Math.round(t);
        const clamped = Math.max(firstIdx, Math.min(lastIdx, rounded));
        return labels[clamped];
      });

      const color = options.linear_trend_color || '#E74C3C';
      const dash = linestyleMap[options.linear_trend_linestyle] || 'dash';
      const label = options.linear_trend_label || 'Linear Trend';

      trendTraces.push({
        type: 'scatter',
        mode: 'lines',
        x: xOut,
        y: yRange,
        name: label,
        line: { color, dash, width: 2 },
        showlegend: true,
      });
    }
  }

  return trendTraces;
}

export default function ChartPreview({
  chartData, isLoading, error,
  options = {},
  plotlyOverrides = {},
  onRelayout,
  onOptionsChange,
  themes,
}) {
  const plotRef = useRef(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader className="h-12 w-12 text-blue-500 animate-spin" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">Generating your chart...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Generation Failed</h3>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="flex flex-col items-center justify-center space-y-4 text-gray-400">
          <Eye className="h-16 w-16" />
          <div className="text-center">
            <p className="text-lg font-medium">No chart yet</p>
            <p className="text-sm mt-1">Configure options and click "Generate Chart"</p>
          </div>
        </div>
      </div>
    );
  }

  // Resolve effective theme config and color palette for live preview
  const themeConfig = themes?.themes?.[options.theme] || null;
  const effectiveColors = options.colors?.length > 0
    ? options.colors
    : (themeConfig?.colors || []);

  const serverTraces = chartData.traces || [];

  // Use the first non-pie, non-trend trace as the basis for trend lines
  const baseTraceForTrends = serverTraces.find((trace) => {
    if (trace.type === 'pie') return false;
    if (trace.type === 'scatter' && trace.mode === 'lines') return false;
    return true;
  });

  // Build traces — apply data label options on top of server-supplied traces
  const textPosition = TEXT_POSITION_MAP[options.data_label_position] || 'auto';
  const tracesWithLabels = serverTraces.map((trace) => {
    if (!options.show_data_labels || trace.type === 'pie') return trace;

    // For bar traces, use texttemplate directly
    if (trace.type === 'bar') {
      const isHorizontal = trace.orientation === 'h';
      const fallbackValues = isHorizontal ? trace.x : trace.y;
      const labelText = trace.text ?? fallbackValues?.map((v) => (v != null ? String(v) : ''));
      return {
        ...trace,
        text: labelText,
        textposition: options.data_label_position === 'center' ? 'inside' : 'outside',
        textangle: options.data_label_rotation ?? 0,
        cliponaxis: false,
      };
    }

    // For scatter/line traces, add text mode
    const currentMode = trace.mode || 'lines';
    const newMode = currentMode.includes('text') ? currentMode : `${currentMode}+text`;
    return {
      ...trace,
      mode: newMode,
      text: trace.y?.map((v) => (v != null ? String(v) : '')),
      textposition: textPosition,
    };
  });

  // Build dynamic trend line traces from the base series
  const trendTraces = buildTrendTraces(chartData.chart_type, baseTraceForTrends, options);

  const traces = recolorTraces([...tracesWithLabels, ...trendTraces], effectiveColors);

  // Build layout — apply all client-side options on top of server-supplied layout
  const legendLocation = options.legend_location || 'upper right';
  const showLegend = legendLocation !== 'none';
  const legendConfig = showLegend
    ? (LEGEND_LOCATION_MAP[legendLocation] || LEGEND_LOCATION_MAP['upper right'])
    : undefined;

  const gridLinestyleMap = { solid: 'solid', dashed: 'dash', dotted: 'dot' };
  const baseGridColor = themeConfig?.grid_color || chartData.layout?.xaxis?.gridcolor || '#E0E0E0';
  const gridColor = options.grid_alpha
    ? hexToRgba(baseGridColor, parseFloat(options.grid_alpha))
    : baseGridColor;

  // Convert flat plotlyOverrides keys to nested so they can be spread into layout
  const overrideNested = flatToNested(plotlyOverrides);

  const layout = {
    ...(chartData.layout || {}),

    title: {
      ...(chartData.layout?.title || {}),
      text: options.title ?? (chartData.layout?.title?.text || ''),
      font: {
        ...(chartData.layout?.title?.font || {}),
        ...(options.font_family ? { family: options.font_family } : {}),
        ...(options.font_title_size ? { size: Number(options.font_title_size) } : {}),
      },
    },

    xaxis: {
      ...(chartData.layout?.xaxis || {}),
      title: { text: options.xlabel || chartData.layout?.xaxis?.title?.text || '' },
      showgrid: options.grid_enabled,
      griddash: gridLinestyleMap[options.grid_linestyle] || 'solid',
      gridcolor: gridColor,
      tickprefix: options.unit_x_prefix || '',
      ticksuffix: options.unit_x_suffix || '',
      automargin: true,
      ...(options.font_tick_size
        ? { tickfont: { size: Number(options.font_tick_size) } }
        : {}),
    },

    yaxis: {
      ...(chartData.layout?.yaxis || {}),
      title: { text: options.ylabel || chartData.layout?.yaxis?.title?.text || '' },
      showgrid: options.grid_enabled,
      griddash: gridLinestyleMap[options.grid_linestyle] || 'solid',
      gridcolor: gridColor,
      tickprefix: options.unit_y_prefix || '',
      ticksuffix: options.unit_y_suffix || '',
      automargin: true,
      ...(options.font_tick_size
        ? { tickfont: { size: Number(options.font_tick_size) } }
        : {}),
    },

    font: {
      ...(chartData.layout?.font || {}),
      ...(options.font_family ? { family: options.font_family } : {}),
      ...(options.font_label_size ? { size: Number(options.font_label_size) } : {}),
    },

    showlegend: showLegend,
    legend: legendConfig,
    autosize: true,

    // Apply theme background + colorway for live theme switching
    plot_bgcolor: themeConfig?.background || chartData.layout?.plot_bgcolor || '#FFFFFF',
    paper_bgcolor: themeConfig?.background || chartData.layout?.paper_bgcolor || '#FFFFFF',
    ...(effectiveColors.length > 0 ? { colorway: effectiveColors } : {}),

    // Drag overrides applied LAST — legend position from drag beats sidebar setting
    ...overrideNested,
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Chart Preview</h3>
          </div>
          <span className="text-xs text-gray-500 italic">
            Drag labels, legend &amp; title to reposition
          </span>
        </div>
      </div>

      <div className="p-4">
        <Plot
          ref={plotRef}
          data={traces}
          layout={layout}
          onRelayout={(update) => {
            // Sync axis/title text edits made directly on the chart back to the input boxes
            if (onOptionsChange) {
              const delta = {};
              if (update['title.text']       !== undefined) delta.title  = update['title.text'];
              if (update['xaxis.title.text'] !== undefined) delta.xlabel = update['xaxis.title.text'];
              if (update['yaxis.title.text'] !== undefined) delta.ylabel = update['yaxis.title.text'];
              if (Object.keys(delta).length) onOptionsChange({ ...options, ...delta });
            }
            // Forward to App for history tracking + plotlyOverrides accumulation
            if (onRelayout) onRelayout(update);
          }}
          config={{
            editable: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            toImageButtonOptions: {
              format: 'png',
              filename: 'chart',
              height: 600,
              width: 1000,
              scale: 2,
            },
            responsive: true,
          }}
          style={{ width: '100%', minHeight: '480px' }}
          useResizeHandler
        />
      </div>

      <div className="px-6 pb-4">
        <p className="text-xs text-gray-400 text-center">
          Use the camera icon in the toolbar to download as PNG · Tip: drag to reposition labels and legend
        </p>
      </div>
    </div>
  );
}
