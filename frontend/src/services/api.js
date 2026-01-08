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

export const invoiceService = {
  getAll: (params) => api.get('/invoices', { params }),
  getOne: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  addItem: (id, data) => api.post(`/invoices/${id}/items`, data),
  deleteItem: (id, itemId) => api.delete(`/invoices/${id}/items/${itemId}`),
  recordPayment: (id, data) => api.post(`/invoices/${id}/payments`, data),
  getPayments: (id) => api.get(`/invoices/${id}/payments`),
};

export const userService = {
  getAll: () => api.get('/users'),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  changePassword: (id, data) => api.put(`/users/${id}/password`, data),
  updateStatus: (id, data) => api.put(`/users/${id}/status`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const settingsService = {
  getAll: () => api.get('/settings'),
  getOne: (key) => api.get(`/settings/${key}`),
  update: (key, data) => api.put(`/settings/${key}`, data),
  create: (data) => api.post('/settings', data),
  bulkUpdate: (data) => api.post('/settings/bulk', data),
  delete: (key) => api.delete(`/settings/${key}`),
};

export default api;
