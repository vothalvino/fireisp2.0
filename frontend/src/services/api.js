import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const setupService = {
  checkStatus: () => api.get('/setup/status'),
  createRootUser: (data) => api.post('/setup/root-user', data),
  configureSSL: (data) => api.post('/setup/ssl', data),
  complete: (data) => api.post('/setup/complete', data),
};

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const clientService = {
  getAll: (params) => api.get('/clients', { params }),
  getOne: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  getServices: (id) => api.get(`/clients/${id}/services`),
};

export const serviceService = {
  getTypes: () => api.get('/services/types'),
  getPlans: (params) => api.get('/services/plans', { params }),
  createPlan: (data) => api.post('/services/plans', data),
  getClientServices: (params) => api.get('/services/client-services', { params }),
  createClientService: (data) => api.post('/services/client-services', data),
  updateClientService: (id, data) => api.put(`/services/client-services/${id}`, data),
  deleteClientService: (id) => api.delete(`/services/client-services/${id}`),
};

export const radiusService = {
  getNAS: () => api.get('/radius/nas'),
  addNAS: (data) => api.post('/radius/nas', data),
  updateNAS: (id, data) => api.put(`/radius/nas/${id}`, data),
  deleteNAS: (id) => api.delete(`/radius/nas/${id}`),
  getSessions: () => api.get('/radius/sessions'),
  getAccounting: (username) => api.get(`/radius/accounting/${username}`),
  getStats: () => api.get('/radius/stats'),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;
