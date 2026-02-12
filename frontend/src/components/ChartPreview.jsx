/**
 * ChartPreview component to display generated chart.
 */

import { Eye, Loader } from 'lucide-react';

export default function ChartPreview({ chartData, isLoading, error }) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Eye className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Chart Preview</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="flex justify-center">
          <img
            src={`data:image/${chartData.format};base64,${chartData.chart_base64}`}
            alt="Generated Chart"
            className="max-w-full h-auto rounded-lg shadow-md"
          />
        </div>
      </div>
    </div>
  );
}
