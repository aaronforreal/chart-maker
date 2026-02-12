/**
 * DownloadButton component for downloading generated charts.
 */

import { Download } from 'lucide-react';

export default function DownloadButton({ chartData, disabled }) {
  const handleDownload = () => {
    if (!chartData) return;

    // Convert base64 to blob
    const byteCharacters = atob(chartData.chart_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Determine MIME type
    const mimeTypes = {
      png: 'image/png',
      pdf: 'application/pdf',
      svg: 'image/svg+xml',
    };
    const mimeType = mimeTypes[chartData.format] || 'application/octet-stream';

    // Create blob and download
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = chartData.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={disabled || !chartData}
      className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
        disabled || !chartData
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
      }`}
    >
      <Download className="h-5 w-5" />
      <span>Download Chart</span>
    </button>
  );
}
