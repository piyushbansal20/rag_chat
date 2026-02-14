import apiClient from '../lib/axios.js';

export const authAPI = {
  login: (credentials) =>
    apiClient.post('/auth/login', credentials),

  register: (userData) =>
    apiClient.post('/auth/register', userData),

  logout: (refreshToken) =>
    apiClient.post('/auth/logout', { refreshToken }),

  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh', { refreshToken }),

  getCurrentUser: () =>
    apiClient.get('/auth/me'),
};
