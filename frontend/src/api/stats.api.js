import apiClient from '../lib/axios.js';

export const statsAPI = {
  // Get dashboard stats
  getDashboard: () => apiClient.get('/stats/dashboard'),

  // Get usage over time
  getUsage: (days = 30) => apiClient.get('/stats/usage', { params: { days } }),
};
