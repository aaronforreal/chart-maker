/**
 * ChartOptions component for selecting chart type, theme, and format.
 */

import { useState } from 'react';
import { Settings, Palette, Plus, X, ChevronDown } from 'lucide-react';

function CollapsibleSection({ id, title, isOpen, onToggle, children }) {
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1">{children}</div>
      )}
    </div>
  );
}

export default function ChartOptions({ options, onOptionsChange, themes, dataPreview }) {
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (field, value) => {
    onOptionsChange({ ...options, [field]: value });
  };

  const chartTypes = [
    { value: 'auto', label: 'Auto Detect' },
    { value: 'line', label: 'Line Chart' },
    { value: 'bar', label: 'Bar Chart' },
    { value: 'horizontal_bar', label: 'Horizontal Bar Chart' },
    { value: 'scatter', label: 'Scatter Plot' },
    { value: 'pie', label: 'Pie Chart' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-800">Chart Options</h3>
      </div>

      <div className="space-y-6">
        {/* Chart Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chart Type
          </label>
          <select
            value={options.chart_type}
            onChange={(e) => handleChange('chart_type', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {chartTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Theme</span>
            </div>
          </label>
          {themes ? (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(themes.themes).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => handleChange('theme', key)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    options.theme === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-800">{theme.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{theme.description}</div>
                  <div className="flex space-x-1 mt-2">
                    {theme.colors.slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Loading themes...</div>
          )}
        </div>

        {/* Custom Title */}
        <CollapsibleSection id="title" title="Custom Title" isOpen={openSections.title} onToggle={toggleSection}>
          <input
            type="text"
            value={options.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Leave empty for auto-generated title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </CollapsibleSection>

        {/* Axis Labels */}
        <CollapsibleSection id="axes" title="Axis Labels" isOpen={openSections.axes} onToggle={toggleSection}>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={options.xlabel || ''}
              onChange={(e) => handleChange('xlabel', e.target.value)}
              placeholder="X-axis label"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={options.ylabel || ''}
              onChange={(e) => handleChange('ylabel', e.target.value)}
              placeholder="Y-axis label"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </CollapsibleSection>

        {/* Unit Formatting */}
        <CollapsibleSection id="units" title="Axis Unit Formatting" isOpen={openSections.units} onToggle={toggleSection}>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={options.unit_x_prefix}
              onChange={(e) => handleChange('unit_x_prefix', e.target.value)}
              placeholder="X prefix (e.g. $)"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={options.unit_x_suffix}
              onChange={(e) => handleChange('unit_x_suffix', e.target.value)}
              placeholder="X suffix (e.g. %)"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={options.unit_y_prefix}
              onChange={(e) => handleChange('unit_y_prefix', e.target.value)}
              placeholder="Y prefix (e.g. $)"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={options.unit_y_suffix}
              onChange={(e) => handleChange('unit_y_suffix', e.target.value)}
              placeholder="Y suffix (e.g. kg)"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </CollapsibleSection>

        {/* Data Labels */}
        <CollapsibleSection id="dataLabels" title="Data Labels" isOpen={openSections.dataLabels} onToggle={toggleSection}>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.show_data_labels}
                onChange={(e) => handleChange('show_data_labels', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Show values on chart</span>
            </label>
          </div>
          {options.show_data_labels && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Position</label>
                <select
                  value={options.data_label_position}
                  onChange={(e) => handleChange('data_label_position', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="auto">Auto (smart)</option>
                  <option value="above">Above point</option>
                  <option value="below">Below point</option>
                  <option value="center">Center (bars only)</option>
                </select>
              </div>
              <p className="text-xs text-gray-400">
                Tip: drag individual labels on the chart to fine-tune positions.
              </p>
            </div>
          )}
        </CollapsibleSection>

        {/* Ratings Mode — horizontal bar only */}
        {options.chart_type === 'horizontal_bar' && (
          <CollapsibleSection id="ratingsMode" title="Ratings Mode" isOpen={openSections.ratingsMode} onToggle={toggleSection}>
            <div className="space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.ratings_mode}
                  onChange={(e) => handleChange('ratings_mode', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable Ratings Mode</span>
              </label>
              {options.ratings_mode && (
                <p className="ml-6 text-xs text-gray-500">
                  Bars are colored <span className="font-medium text-red-600">red</span> (≤3.15),{' '}
                  <span className="font-medium text-yellow-600">yellow</span> (3.15–3.85),{' '}
                  <span className="font-medium text-green-600">green</span> (&gt;3.85).
                  Vertical reference lines are drawn at 3.15 and 3.85.
                </p>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Trend Lines */}
        <CollapsibleSection id="trendLine" title="Trend Lines" isOpen={openSections.trendLine} onToggle={toggleSection}>
          <div className="space-y-4">
            {/* Linear Trend */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={options.show_linear_trend}
                  onChange={(e) => handleChange('show_linear_trend', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Linear trend (regression)</span>
              </label>
              {options.show_linear_trend && (
                <div className="ml-6 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Line style</label>
                    <select
                      value={options.linear_trend_linestyle}
                      onChange={(e) => handleChange('linear_trend_linestyle', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="dash">Dashed</option>
                      <option value="solid">Solid</option>
                      <option value="dot">Dotted</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Color</label>
                      <input
                        type="color"
                        value={options.linear_trend_color || '#E74C3C'}
                        onChange={(e) => handleChange('linear_trend_color', e.target.value)}
                        className="w-full h-9 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Legend label</label>
                      <input
                        type="text"
                        value={options.linear_trend_label}
                        onChange={(e) => handleChange('linear_trend_label', e.target.value)}
                        placeholder="Auto"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Mean Line */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={options.show_mean_line}
                  onChange={(e) => handleChange('show_mean_line', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Mean line (average)</span>
              </label>
              {options.show_mean_line && (
                <div className="ml-6 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Line style</label>
                    <select
                      value={options.mean_line_linestyle}
                      onChange={(e) => handleChange('mean_line_linestyle', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="dash">Dashed</option>
                      <option value="solid">Solid</option>
                      <option value="dot">Dotted</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Color</label>
                      <input
                        type="color"
                        value={options.mean_line_color || '#F39C12'}
                        onChange={(e) => handleChange('mean_line_color', e.target.value)}
                        className="w-full h-9 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Legend label</label>
                      <input
                        type="text"
                        value={options.mean_line_label}
                        onChange={(e) => handleChange('mean_line_label', e.target.value)}
                        placeholder="Auto"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400">Applies to line, bar, and scatter charts. Both can be shown at once.</p>
          </div>
        </CollapsibleSection>

        {/* Grid Controls */}
        <CollapsibleSection id="grid" title="Grid Lines" isOpen={openSections.grid} onToggle={toggleSection}>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.grid_enabled}
                onChange={(e) => handleChange('grid_enabled', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Show grid</span>
            </label>
          </div>
          {options.grid_enabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Style</label>
                <select
                  value={options.grid_linestyle}
                  onChange={(e) => handleChange('grid_linestyle', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Opacity: {options.grid_alpha || 'Theme default'}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={options.grid_alpha || 0.3}
                  onChange={(e) => handleChange('grid_alpha', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* Font Controls */}
        <CollapsibleSection id="fonts" title="Fonts" isOpen={openSections.fonts} onToggle={toggleSection}>
          <select
            value={options.font_family}
            onChange={(e) => handleChange('font_family', e.target.value)}
            className="w-full px-4 py-2 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Theme Default</option>
            <option value="sans-serif">Sans-serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
          </select>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Title size</label>
              <input
                type="number"
                value={options.font_title_size}
                onChange={(e) => handleChange('font_title_size', e.target.value)}
                placeholder="16"
                min="8"
                max="48"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Label size</label>
              <input
                type="number"
                value={options.font_label_size}
                onChange={(e) => handleChange('font_label_size', e.target.value)}
                placeholder="12"
                min="6"
                max="36"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tick size</label>
              <input
                type="number"
                value={options.font_tick_size}
                onChange={(e) => handleChange('font_tick_size', e.target.value)}
                placeholder="10"
                min="6"
                max="36"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Custom Colors */}
        <CollapsibleSection id="colors" title="Custom Colors" isOpen={openSections.colors} onToggle={toggleSection}>
          {(() => {
            const seriesNames = dataPreview?.columns?.slice(1) ?? [];
            const themeColors = themes?.themes?.[options.theme]?.colors ?? [];
            const getThemeColor = (i) => themeColors[i % Math.max(themeColors.length, 1)] || '#888888';

            // Per-bar mode: single data series on a bar-type chart — color each bar individually
            const isBarType = ['bar', 'horizontal_bar', 'auto'].includes(options.chart_type);
            const barNames = seriesNames.length === 1 && isBarType
              ? (dataPreview?.rows ?? []).map(r => String(r[0]))
              : [];
            const usePerBar = barNames.length > 0;

            // Per-series mode: multiple data series
            const usePerSeries = !usePerBar && seriesNames.length > 1 && options.chart_type !== 'pie';

            // --- Per-bar handlers ---
            const seriesThemeColor = getThemeColor(0);
            const handleBarColor = (idx, newColor) => {
              const newBarColors = barNames.map((_, i) =>
                i === idx ? newColor : (options.bar_colors[i] || seriesThemeColor)
              );
              handleChange('bar_colors', newBarColors);
            };
            const handleResetBar = (idx) => {
              const newBarColors = barNames.map((_, i) =>
                i === idx ? seriesThemeColor : (options.bar_colors[i] || seriesThemeColor)
              );
              const allMatchTheme = newBarColors.every(c => c === seriesThemeColor);
              handleChange('bar_colors', allMatchTheme ? [] : newBarColors);
            };

            // --- Per-series handlers ---
            const handleSeriesColor = (idx, newColor) => {
              const newColors = seriesNames.map((_, i) =>
                i === idx ? newColor : (options.colors[i] || getThemeColor(i))
              );
              handleChange('colors', newColors);
            };
            const handleResetSeries = (idx) => {
              const newColors = seriesNames.map((_, i) =>
                i === idx ? getThemeColor(i) : (options.colors[i] || getThemeColor(i))
              );
              const allMatchTheme = newColors.every((c, i) => c === getThemeColor(i));
              handleChange('colors', allMatchTheme ? [] : newColors);
            };

            // --- Render per-bar ---
            if (usePerBar) {
              const hasCustomBarColors = options.bar_colors.length > 0;
              return (
                <>
                  {hasCustomBarColors && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => handleChange('bar_colors', [])}
                        className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                      >
                        Reset all to theme
                      </button>
                    </div>
                  )}
                  {!hasCustomBarColors && (
                    <p className="text-xs text-gray-500 mb-2">Click a swatch to set a custom color per bar.</p>
                  )}
                  <div className="space-y-2">
                    {barNames.map((name, idx) => {
                      const currentColor = options.bar_colors[idx] || seriesThemeColor;
                      const isCustom = !!options.bar_colors[idx] && options.bar_colors[idx] !== seriesThemeColor;
                      return (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={currentColor}
                            onChange={(e) => handleBarColor(idx, e.target.value)}
                            className="w-8 h-8 rounded border border-gray-300 cursor-pointer flex-shrink-0"
                          />
                          <span className="text-sm text-gray-700 flex-1 truncate" title={name}>{name}</span>
                          <span className="text-xs text-gray-400 font-mono flex-shrink-0">{currentColor}</span>
                          {isCustom && (
                            <button
                              onClick={() => handleResetBar(idx)}
                              title="Reset to theme color"
                              className="p-1 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Click Generate to apply color changes.</p>
                </>
              );
            }

            // --- Render per-series ---
            if (usePerSeries) {
              const hasCustomColors = options.colors.length > 0;
              return (
                <>
                  {hasCustomColors && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => handleChange('colors', [])}
                        className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                      >
                        Reset all to theme
                      </button>
                    </div>
                  )}
                  {!hasCustomColors && (
                    <p className="text-xs text-gray-500 mb-2">Using theme colors. Click a swatch to override.</p>
                  )}
                  <div className="space-y-2">
                    {seriesNames.map((name, idx) => {
                      const currentColor = options.colors[idx] || getThemeColor(idx);
                      const isCustom = !!options.colors[idx] && options.colors[idx] !== getThemeColor(idx);
                      return (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={currentColor}
                            onChange={(e) => handleSeriesColor(idx, e.target.value)}
                            className="w-8 h-8 rounded border border-gray-300 cursor-pointer flex-shrink-0"
                          />
                          <span className="text-sm text-gray-700 flex-1 truncate" title={name}>{name}</span>
                          <span className="text-xs text-gray-400 font-mono flex-shrink-0">{currentColor}</span>
                          {isCustom && (
                            <button
                              onClick={() => handleResetSeries(idx)}
                              title="Reset to theme color"
                              className="p-1 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            }

            // --- Generic fallback: pie chart or no data ---
            return (
              <>
                {options.colors.length === 0 && (
                  <p className="text-xs text-gray-500 mb-2">Using theme colors. Add colors to override.</p>
                )}
                <div className="space-y-2">
                  {options.colors.map((color, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                          const newColors = [...options.colors];
                          newColors[idx] = e.target.value;
                          handleChange('colors', newColors);
                        }}
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <span className="text-sm text-gray-600 font-mono">{color}</span>
                      <button
                        onClick={() => {
                          const newColors = options.colors.filter((_, i) => i !== idx);
                          handleChange('colors', newColors);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleChange('colors', [...options.colors, '#2E86AB'])}
                  className="mt-2 flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Color</span>
                </button>
              </>
            );
          })()}
        </CollapsibleSection>

        {/* Legend Location */}
        <CollapsibleSection id="legend" title="Legend" isOpen={openSections.legend} onToggle={toggleSection}>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Position</label>
            <select
              value={options.legend_location}
              onChange={(e) => handleChange('legend_location', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="upper right">Upper right</option>
              <option value="upper left">Upper left</option>
              <option value="lower right">Lower right</option>
              <option value="lower left">Lower left</option>
              <option value="right">Right (outside)</option>
              <option value="center">Center</option>
              <option value="none">Hidden</option>
            </select>
            <p className="text-xs text-gray-400 mt-2">
              You can also drag the legend directly on the chart to reposition it.
            </p>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
