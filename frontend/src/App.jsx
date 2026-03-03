/**
 * Main App component for Excel Chart Maker.
 */

import { useState, useRef, useEffect } from 'react';
import { BarChart3, Undo2, Maximize2 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import DataTable from './components/DataTable';
import DataReviewModal from './components/DataReviewModal';
import ChartOptions from './components/ChartOptions';
import ChartPreview from './components/ChartPreview';
import MultiChartManager from './components/MultiChartManager';
import { uploadFile, getChartData, getThemes } from './services/api';
import { IGNORE_RELAYOUT, TITLE_KEYS } from './utils/plotlyHelpers';

function App() {
  // State management
  const [fileId, setFileId] = useState(null);
  const [filename, setFilename] = useState(null);
  const [dataPreview, setDataPreview] = useState(null);
  const [history, setHistory] = useState([]);           // [{chartData, chartOptions, plotlyOverrides}]
  const [plotlyOverrides, setPlotlyOverrides] = useState({}); // accumulated flat relayout keys
  const stateRef = useRef({});  // always-fresh snapshot of current state for use in callbacks
  const burstRef = useRef(null); // timeout handle for sidebar change burst deduplication

  const [chartOptions, setChartOptions] = useState({
    chart_type: 'auto',
    theme: 'professional',
    title: '',
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
    // Trend lines (independent)
    show_linear_trend: false,
    linear_trend_color: '',
    linear_trend_linestyle: 'dash',
    linear_trend_label: '',
    show_mean_line: false,
    mean_line_color: '',
    mean_line_linestyle: 'dash',
    mean_line_label: '',
    // Legend
    legend_location: 'upper right',
    colors: [],
    bar_colors: [],
  });
  const [chartData, setChartData] = useState(null);
  const [themes, setThemes] = useState(null);
  const [sections, setSections] = useState([]);  // SectionPreview[] from upload
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  useEffect(() => {
    getThemes().then(setThemes).catch(console.error);
  }, []);

  // Keep stateRef in sync every render so callbacks always see fresh values
  stateRef.current = { chartData, chartOptions, plotlyOverrides };

  const [autoOpenPicker, setAutoOpenPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [generateError, setGenerateError] = useState(null);

  // Push a before-change snapshot to history (reads fresh values from stateRef)
  const pushToHistory = () => {
    const { chartData, chartOptions, plotlyOverrides } = stateRef.current;
    setHistory(prev => [...prev.slice(-19), { chartData, chartOptions, plotlyOverrides }]);
  };

  // Handle sidebar option changes — tracks history with burst deduplication
  const handleOptionsChange = (newOptions) => {
    // If legend_location changed, clear any legend drag overrides so sidebar wins
    if (newOptions.legend_location !== stateRef.current.chartOptions.legend_location) {
      setPlotlyOverrides(prev => {
        const next = { ...prev };
        ['legend.x', 'legend.y', 'legend.xanchor', 'legend.yanchor'].forEach(k => delete next[k]);
        return next;
      });
    }
    // Push "before" state on the FIRST change in a burst; ignore rapid successive changes
    if (!burstRef.current) pushToHistory();
    clearTimeout(burstRef.current);
    burstRef.current = setTimeout(() => { burstRef.current = null; }, 800);
    setChartOptions(newOptions);
  };

  // Handle Plotly relayout events (legend drag, annotation drag, etc.)
  const handleRelayout = (update) => {
    const significant = Object.keys(update).filter(k => !IGNORE_RELAYOUT.test(k));
    if (significant.length === 0) return;

    // Cancel any pending sidebar burst and push to history immediately
    clearTimeout(burstRef.current);
    burstRef.current = null;
    pushToHistory();

    // Accumulate non-title layout changes (legend, annotations, etc.) as plotlyOverrides
    // Title/axis-label text edits are handled by ChartPreview's local onRelayout → onOptionsChange
    const overrideDelta = {};
    for (const k of significant) {
      if (!TITLE_KEYS.has(k)) overrideDelta[k] = update[k];
    }
    if (Object.keys(overrideDelta).length) {
      setPlotlyOverrides(prev => ({ ...prev, ...overrideDelta }));
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    setIsUploading(true);
    setUploadError(null);
    setChartData(null);
    setSections([]);

    try {
      const response = await uploadFile(file);
      setFileId(response.file_id);
      setFilename(response.filename);
      setDataPreview(response.data_preview);
      setSections(response.sections || []);
      if (response.extracted_title) {
        const isRatings = response.extracted_title.toLowerCase().includes('ratings');
        setChartOptions(prev => ({
          ...prev,
          title: response.extracted_title,
          chart_type: 'horizontal_bar',
          ratings_mode: isRatings,
        }));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(
        error.response?.data?.detail || 'Failed to upload file. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Handle chart generation
  const handleGenerateChart = async () => {
    if (!fileId) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const request = {
        file_id: fileId,
        chart_type: chartOptions.chart_type,
        theme: chartOptions.theme,
        colors: chartOptions.colors.length > 0 ? chartOptions.colors : null,
        bar_colors: chartOptions.bar_colors.length > 0 ? chartOptions.bar_colors : null,
        show_data_labels: chartOptions.show_data_labels,
        ratings_mode: chartOptions.ratings_mode,
        show_linear_trend: chartOptions.show_linear_trend,
        linear_trend_color: chartOptions.linear_trend_color || null,
        linear_trend_linestyle: chartOptions.linear_trend_linestyle,
        linear_trend_label: chartOptions.linear_trend_label || null,
        show_mean_line: chartOptions.show_mean_line,
        mean_line_color: chartOptions.mean_line_color || null,
        mean_line_linestyle: chartOptions.mean_line_linestyle,
        mean_line_label: chartOptions.mean_line_label || null,
      };

      const response = await getChartData(request);
      // Push current state to history, then clear plotly overrides for the fresh chart
      pushToHistory();
      setPlotlyOverrides({});
      setChartData(response);
    } catch (error) {
      console.error('Generation error:', error);
      setGenerateError(
        error.response?.data?.detail || 'Failed to generate chart. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Undo: restore previous chartData, chartOptions, and plotlyOverrides
  const handleUndo = () => {
    if (history.length === 0) return;
    const snap = history[history.length - 1];
    setChartData(snap.chartData);
    setChartOptions(snap.chartOptions);
    setPlotlyOverrides(snap.plotlyOverrides);
    setHistory(h => h.slice(0, -1));
  };

  // Reset state for new upload
  const handleReset = () => {
    setFileId(null);
    setFilename(null);
    setDataPreview(null);
    setChartData(null);
    setUploadError(null);
    setGenerateError(null);
    setHistory([]);
    setPlotlyOverrides({});
    setSections([]);
    setAutoOpenPicker(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Excel Chart Maker</h1>
              <p className="text-sm text-gray-600 mt-1">
                Create publication-ready charts from Excel files
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Step 1: File Upload */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                  1
                </span>
                <span>Upload Excel File</span>
              </h2>
            </div>
            <FileUpload
              onFileUpload={handleFileUpload}
              isUploading={isUploading}
              error={uploadError}
              autoOpen={autoOpenPicker}
              onPickerOpened={() => setAutoOpenPicker(false)}
            />
            {filename && (
              <div className="mt-4 flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-sm font-medium text-green-800">
                    Uploaded: {filename}
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Upload Different File
                </button>
              </div>
            )}
          </section>

          {/* Step 2: Data Preview */}
          {dataPreview && (
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                    2
                  </span>
                  <span>Review Data</span>
                </h2>
              </div>
              <DataTable dataPreview={dataPreview} />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setIsDataModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span>
                    {sections.length > 1
                      ? `View all ${sections.length} sections`
                      : `View all ${dataPreview.total_rows} rows`}
                  </span>
                </button>
              </div>
            </section>
          )}

          <DataReviewModal
            isOpen={isDataModalOpen}
            onClose={() => setIsDataModalOpen(false)}
            sections={sections}
            dataPreview={dataPreview}
          />

          {/* Step 3: Chart Options & Generation */}
          {dataPreview && (
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                    3
                  </span>
                  <span>Configure & Generate</span>
                </h2>
              </div>

              {sections.length > 1 ? (
                /* Multi-section mode: one card per detected section */
                <MultiChartManager
                  fileId={fileId}
                  sections={sections}
                  themes={themes}
                />
              ) : (
                /* Single-section mode: existing layout unchanged */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Options */}
                  <div className="lg:col-span-1">
                    <ChartOptions options={chartOptions} onOptionsChange={handleOptionsChange} themes={themes} dataPreview={dataPreview} />
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleGenerateChart}
                        disabled={isGenerating || !fileId}
                        className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                          isGenerating || !fileId
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        {isGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <BarChart3 className="h-5 w-5" />
                            <span>Generate Chart</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleUndo}
                        disabled={history.length === 0}
                        title="Undo last generate"
                        className={`px-4 py-3 rounded-lg font-medium transition-all ${
                          history.length === 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300'
                        }`}
                      >
                        <Undo2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="lg:col-span-2">
                    <ChartPreview
                      chartData={chartData}
                      isLoading={isGenerating}
                      error={generateError}
                      options={chartOptions}
                      plotlyOverrides={plotlyOverrides}
                      onRelayout={handleRelayout}
                      onOptionsChange={handleOptionsChange}
                      themes={themes}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Step 4: Download — use the camera icon in the chart toolbar above */}
          {chartData && sections.length <= 1 && (
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                    4
                  </span>
                  <span>Download</span>
                </h2>
              </div>
              <div className="max-w-md p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Use the <strong>camera icon</strong> in the chart toolbar to download as PNG, or right-click the chart for more options. You can also drag labels and the legend to reposition them before downloading.
                </p>
              </div>
            </section>
          )}
        </div>
      </main>


    </div>
  );
}

export default App;
