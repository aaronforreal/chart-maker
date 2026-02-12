/**
 * API service for communicating with the backend.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Upload an Excel file to the server.
 * @param {File} file - Excel file to upload
 * @returns {Promise} Response with file_id and data preview
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Generate a chart from uploaded file.
 * @param {Object} chartRequest - Chart generation parameters
 * @returns {Promise} Response with base64 encoded chart
 */
export const generateChart = async (chartRequest) => {
  const response = await api.post('/generate', chartRequest);
  return response.data;
};

/**
 * Get all available themes.
 * @returns {Promise} Response with themes object
 */
export const getThemes = async () => {
  const response = await api.get('/themes');
  return response.data;
};

/**
 * Download chart directly from server.
 * @param {string} fileId - File ID
 * @param {Object} options - Chart options
 * @returns {Promise} Blob response
 */
export const downloadChart = async (fileId, options) => {
  const params = new URLSearchParams(options);
  const response = await api.get(`/chart/${fileId}?${params}`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Delete uploaded file and generated charts.
 * @param {string} fileId - File ID to delete
 * @returns {Promise} Response with deletion confirmation
 */
export const cleanupFile = async (fileId) => {
  const response = await api.delete(`/cleanup/${fileId}`);
  return response.data;
};

export default api;
