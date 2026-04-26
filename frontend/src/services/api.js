/**
 * services/api.js
 * Centralized Axios instance for all API calls
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Response interceptor
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.message ?? err.message ?? 'Network error';
    return Promise.reject(new Error(message));
  },
);

// ─── RFQ Endpoints ──────────────────────────────────────────────
export const rfqApi = {
  getAll: () => api.get('/rfqs'),
  getById: (id) => api.get(`/rfqs/${id}`),
  create: (payload) => api.post('/rfqs', payload),
};

// ─── Bid Endpoints ──────────────────────────────────────────────
export const bidApi = {
  getByRFQ: (rfqId) => api.get(`/rfqs/${rfqId}/bids`),
  submit: (rfqId, payload) => api.post(`/rfqs/${rfqId}/bids`, payload),
};

// ─── Supplier Endpoints ──────────────────────────────────────────────
export const supplierApi = {
  getAll: () => api.get('/suppliers'),
  create: (payload) => api.post('/suppliers', payload),
};

export default api;
