/**
 * DataTable component to display Excel data preview (first 10 rows).
 */

import { Table2 } from 'lucide-react';

export default function DataTable({ dataPreview }) {
  if (!dataPreview) return null;

  const { columns, rows, total_rows } = dataPreview;
  const previewRows = rows.slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Table2 className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Data Preview</h3>
          <span className="text-sm text-gray-500">
            (showing {previewRows.length} of {total_rows} rows)
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewRows.map((row, rowIndex) => (
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
    </div>
  );
}
