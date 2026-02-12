/**
 * ChartOptions component for selecting chart type, theme, and format.
 */

import { useState, useEffect } from 'react';
import { Settings, Palette } from 'lucide-react';
import { getThemes } from '../services/api';

export default function ChartOptions({ options, onOptionsChange }) {
  const [themes, setThemes] = useState(null);

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    try {
      const themesData = await getThemes();
      setThemes(themesData);
    } catch (error) {
      console.error('Failed to load themes:', error);
    }
  };

  const handleChange = (field, value) => {
    onOptionsChange({ ...options, [field]: value });
  };

  const chartTypes = [
    { value: 'auto', label: 'Auto Detect' },
    { value: 'line', label: 'Line Chart' },
    { value: 'bar', label: 'Bar Chart' },
    { value: 'scatter', label: 'Scatter Plot' },
    { value: 'pie', label: 'Pie Chart' },
  ];

  const formats = [
    { value: 'png', label: 'PNG' },
    { value: 'pdf', label: 'PDF' },
    { value: 'svg', label: 'SVG' },
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

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div className="flex space-x-2">
            {formats.map((format) => (
              <button
                key={format.value}
                onClick={() => handleChange('format', format.value)}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  options.format === format.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {format.label}
              </button>
            ))}
          </div>
        </div>

        {/* DPI (for PNG) */}
        {options.format === 'png' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality (DPI): {options.dpi}
            </label>
            <input
              type="range"
              min="150"
              max="600"
              step="50"
              value={options.dpi}
              onChange={(e) => handleChange('dpi', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
        )}

        {/* Custom Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Title (Optional)
          </label>
          <input
            type="text"
            value={options.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Leave empty for auto-generated title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
