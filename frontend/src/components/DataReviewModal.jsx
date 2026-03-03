/**
 * Modal for full data review with tabs per Excel section.
 */

import { useState } from 'react';
import { X } from 'lucide-react';

export default function DataReviewModal({ isOpen, onClose, sections, dataPreview }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!isOpen) return null;

  // For multi-section files use sections[]; for single-section fall back to dataPreview
  const tabs = sections.length > 0
    ? sections.map(s => ({ title: s.title, columns: s.columns, rows: s.rows, row_count: s.row_count }))
    : [{ title: 'All Data', columns: dataPreview?.columns || [], rows: dataPreview?.rows || [], row_count: dataPreview?.total_rows || 0 }];

  const tab = tabs[activeTab];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">Full Data Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section tabs (only shown for multi-section files) */}
        {tabs.length > 1 && (
          <div className="flex border-b border-gray-200 shrink-0">
            {tabs.map((t, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 text-center transition-colors ${
                  activeTab === i
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t.title}
                <span className="ml-2 text-xs text-gray-400">({t.row_count} rows)</span>
              </button>
            ))}
          </div>
        )}

        {/* Scrollable data table */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {tab.columns.map((col, i) => (
                  <th
                    key={i}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tab.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {cell !== null && cell !== undefined ? cell.toString() : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <span className="text-sm text-gray-500">
            {tab.row_count} rows{tabs.length > 1 ? ` in "${tab.title}"` : ''}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
