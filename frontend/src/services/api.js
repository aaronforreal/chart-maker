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
 * Get Plotly-compatible chart data for client-side rendering.
 * @param {Object} chartRequest - Chart data request parameters
 * @returns {Promise} Response with Plotly traces and layout
 */
export const getChartData = async (chartRequest) => {
  const response = await api.post('/chart-data', chartRequest);
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

export default api;
