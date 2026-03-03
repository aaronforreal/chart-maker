/**
 * MultiChartManager — orchestrates state and layout for multi-section Excel files.
 * Renders a "Generate All Charts" button and a responsive grid of ChartCard components.
 */

import { useState } from 'react';
import { BarChart3, Loader } from 'lucide-react';
import ChartCard from './ChartCard';
import { getChartData } from '../services/api';
import { IGNORE_RELAYOUT, TITLE_KEYS } from '../utils/plotlyHelpers';

// Default options shape — mirrors chartOptions in App.jsx
function defaultConfig(title = '') {
  return {
    chart_type: 'auto',
    theme: 'professional',
    title,
    xlabel: '',
    ylabel: '',
    grid_enabled: true,
    grid_linestyle: 'solid',
    grid_alpha: '',
    font_family: '',
    font_title_size: '',
    font_label_size: '',
    font_tick_size: '',
    unit_x_prefix: '',
    unit_x_suffix: '',
    unit_y_prefix: '',
    unit_y_suffix: '',
    show_data_labels: false,
    data_label_position: 'auto',
    ratings_mode: false,
    show_linear_trend: false,
    linear_trend_color: '',
    linear_trend_linestyle: 'dash',
    linear_trend_label: '',
    show_mean_line: false,
    mean_line_color: '',
    mean_line_linestyle: 'dash',
    mean_line_label: '',
    legend_location: 'upper right',
    colors: [],
    bar_colors: [],
  };
}

function buildRequest(fileId, sectionIndex, config) {
  return {
    file_id: fileId,
    section_index: sectionIndex,
    chart_type: config.chart_type,
    theme: config.theme,
    title: config.title || null,
    xlabel: config.xlabel || null,
    ylabel: config.ylabel || null,
    colors: config.colors.length > 0 ? config.colors : null,
    bar_colors: config.bar_colors.length > 0 ? config.bar_colors : null,
    show_data_labels: config.show_data_labels,
    ratings_mode: config.ratings_mode ?? false,
    show_linear_trend: config.show_linear_trend,
    linear_trend_color: config.linear_trend_color || null,
    linear_trend_linestyle: config.linear_trend_linestyle,
    linear_trend_label: config.linear_trend_label || null,
    show_mean_line: config.show_mean_line,
    mean_line_color: config.mean_line_color || null,
    mean_line_linestyle: config.mean_line_linestyle,
    mean_line_label: config.mean_line_label || null,
  };
}


export default function MultiChartManager({ fileId, sections, themes }) {
  // One config object per section, keyed by section.index
  const [chartConfigs, setChartConfigs] = useState(() =>
    Object.fromEntries(sections.map(s => {
      const cfg = defaultConfig(s.title);
      if (s.title && s.title.toLowerCase().includes('ratings')) {
        cfg.chart_type = 'horizontal_bar';
        cfg.ratings_mode = true;
      }
      return [s.index, cfg];
    }))
  );

  // Generated chart data per section
  const [chartDataList, setChartDataList] = useState({});

  // Accumulated Plotly drag overrides per section
  const [plotlyOverridesList, setPlotlyOverridesList] = useState({});

  // Loading and error state per section
  const [loadingSet, setLoadingSet] = useState(new Set());
  const [errorMap, setErrorMap] = useState({});

  // Top-level "Generate All" loading flag
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Update one section's config
  const handleConfigChange = (idx, newOpts) => {
    setChartConfigs(prev => ({ ...prev, [idx]: newOpts }));
  };

  // Accumulate Plotly relayout events for one section (same filter logic as App.jsx)
  const handleRelayout = (idx, update) => {
    const significant = Object.keys(update).filter(k => !IGNORE_RELAYOUT.test(k));
    if (significant.length === 0) return;

    const overrideDelta = {};
    for (const k of significant) {
      if (!TITLE_KEYS.has(k)) overrideDelta[k] = update[k];
    }
    if (Object.keys(overrideDelta).length) {
      setPlotlyOverridesList(prev => ({
        ...prev,
        [idx]: { ...(prev[idx] || {}), ...overrideDelta },
      }));
    }
  };

  // Handle inline title/axis edits from ChartPreview back to config
  const handleOptionsChange = (idx, newOpts) => {
    setChartConfigs(prev => ({ ...prev, [idx]: newOpts }));
  };

  // Generate a single section's chart
  const handleGenerateOne = async (idx) => {
    setLoadingSet(prev => new Set([...prev, idx]));
    setErrorMap(prev => ({ ...prev, [idx]: null }));
    try {
      const response = await getChartData(buildRequest(fileId, idx, chartConfigs[idx]));
      setChartDataList(prev => ({ ...prev, [idx]: response }));
      setPlotlyOverridesList(prev => ({ ...prev, [idx]: {} }));
    } catch (err) {
      setErrorMap(prev => ({
        ...prev,
        [idx]: err.response?.data?.detail || 'Failed to generate chart.',
      }));
    } finally {
      setLoadingSet(prev => { const s = new Set(prev); s.delete(idx); return s; });
    }
  };

  // Generate all sections in parallel
  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    setErrorMap({});
    setLoadingSet(new Set(sections.map(s => s.index)));

    const results = await Promise.allSettled(
      sections.map(s => getChartData(buildRequest(fileId, s.index, chartConfigs[s.index])))
    );

    const newData = {};
    const newErrors = {};
    const newOverrides = {};
    results.forEach((result, i) => {
      const idx = sections[i].index;
      if (result.status === 'fulfilled') {
        newData[idx] = result.value;
        newOverrides[idx] = {};
      } else {
        newErrors[idx] = result.reason?.response?.data?.detail || 'Failed to generate.';
      }
    });

    setChartDataList(prev => ({ ...prev, ...newData }));
    setPlotlyOverridesList(prev => ({ ...prev, ...newOverrides }));
    setErrorMap(newErrors);
    setIsGeneratingAll(false);
    setLoadingSet(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {sections.length} sections detected
        </p>
        <button
          onClick={handleGenerateAll}
          disabled={isGeneratingAll}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all shadow-md ${
            isGeneratingAll
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
          }`}
        >
          {isGeneratingAll ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Generating All...</span>
            </>
          ) : (
            <>
              <BarChart3 className="h-5 w-5" />
              <span>Generate All Charts</span>
            </>
          )}
        </button>
      </div>

      {/* Responsive 2-up grid of chart cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {sections.map(section => (
          <ChartCard
            key={section.index}
            section={section}
            chartConfig={chartConfigs[section.index]}
            onConfigChange={newOpts => handleConfigChange(section.index, newOpts)}
            chartData={chartDataList[section.index] || null}
            plotlyOverrides={plotlyOverridesList[section.index] || {}}
            onRelayout={update => handleRelayout(section.index, update)}
            onOptionsChange={newOpts => handleOptionsChange(section.index, newOpts)}
            isLoading={loadingSet.has(section.index)}
            error={errorMap[section.index] || null}
            themes={themes}
            onGenerate={() => handleGenerateOne(section.index)}
          />
        ))}
      </div>
    </div>
  );
}
