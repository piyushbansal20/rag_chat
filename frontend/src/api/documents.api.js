import apiClient from '../lib/axios.js';

export const documentsAPI = {
  list: (params) =>
    apiClient.get('/documents', { params }),

  get: (id) =>
    apiClient.get(`/documents/${id}`),

  upload: (files, onProgress) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return apiClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress?.(percent);
      },
    });
  },

  update: (id, data) =>
    apiClient.patch(`/documents/${id}`, data),

  delete: (id) =>
    apiClient.delete(`/documents/${id}`),

  getStatus: (id) =>
    apiClient.get(`/documents/${id}/status`),

  getDownloadUrl: (id) =>
    `${import.meta.env.VITE_API_BASE_URL}/documents/${id}/download`,
};
