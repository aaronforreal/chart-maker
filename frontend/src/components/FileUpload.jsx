/**
 * FileUpload component with drag & drop support.
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

export default function FileUpload({ onFileUpload, isUploading, error }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0]);
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-gray-600">Uploading...</p>
            </>
          ) : (
            <>
              <div className="p-4 bg-blue-100 rounded-full">
                {isDragActive ? (
                  <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                ) : (
                  <Upload className="h-8 w-8 text-blue-600" />
                )}
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive ? 'Drop your Excel file here' : 'Drag & drop your Excel file here'}
                </p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
              </div>
              <p className="text-xs text-gray-400">Supports .xlsx and .xls files</p>
            </>
          )}
        </div>
      </div>

      {/* Error messages */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Upload Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* File rejection errors */}
      {fileRejections.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800">Invalid file</p>
          <p className="text-sm text-yellow-700 mt-1">
            Please upload a valid Excel file (.xlsx or .xls)
          </p>
        </div>
      )}
    </div>
  );
}
