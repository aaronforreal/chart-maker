/**
 * ChartEditModal — full-screen popup for editing and previewing a single chart section.
 * Opens when the user clicks "Options" on a ChartCard.
 */

import { BarChart3, X } from 'lucide-react';
import ChartOptions from './ChartOptions';
import ChartPreview from './ChartPreview';

export default function ChartEditModal({
  isOpen,
  onClose,
  section,
  chartConfig,
  onConfigChange,
  chartData,
  plotlyOverrides,
  onRelayout,
  onOptionsChange,
  isLoading,
  error,
  themes,
  onGenerate,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex flex-col bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{section.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{section.row_count} data rows</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onGenerate}
              disabled={isLoading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  <span>Generate chart</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: editing options */}
          <div className="w-1/3 overflow-y-auto border-r border-gray-200">
            <ChartOptions
              options={chartConfig}
              onOptionsChange={onConfigChange}
              themes={themes}
              dataPreview={section ? { columns: section.columns } : null}
            />
          </div>

          {/* Right panel: chart preview */}
          <div className="flex-1 overflow-hidden">
            <ChartPreview
              chartData={chartData}
              isLoading={isLoading}
              error={error}
              options={chartConfig}
              plotlyOverrides={plotlyOverrides}
              onRelayout={onRelayout}
              onOptionsChange={onOptionsChange}
              themes={themes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
