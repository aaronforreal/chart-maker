/**
 * ChartCard — self-contained card for one detected Excel section.
 * Displays a "Generate" button, a ChartPreview, and an Options button that
 * opens ChartEditModal for full-screen editing.
 */

import { useState } from 'react';
import { BarChart3, Settings } from 'lucide-react';
import ChartPreview from './ChartPreview';
import ChartEditModal from './ChartEditModal';

export default function ChartCard({
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        {/* Card header */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold text-gray-800">{section.title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{section.row_count} data rows</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Options</span>
          </button>
        </div>

        {/* Generate button */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
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
                <span>Generate this chart</span>
              </>
            )}
          </button>
        </div>

        {/* Chart preview — handles its own loading / error / empty states */}
        <div className="flex-1">
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

      {/* Full-screen edit modal */}
      <ChartEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        section={section}
        chartConfig={chartConfig}
        onConfigChange={onConfigChange}
        chartData={chartData}
        plotlyOverrides={plotlyOverrides}
        onRelayout={onRelayout}
        onOptionsChange={onOptionsChange}
        isLoading={isLoading}
        error={error}
        themes={themes}
        onGenerate={onGenerate}
      />
    </>
  );
}
