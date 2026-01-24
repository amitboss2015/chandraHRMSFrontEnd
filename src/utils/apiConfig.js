// Centralized API configuration
// This file provides the API base URL that works on both localhost and network access

export const getApiBase = () => {
  // Check for environment variable first
  if (import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }
  
  // Check localStorage override
  if (localStorage.getItem('baseUrl')) {
    return localStorage.getItem('baseUrl').replace(/\/+$/, '');
  }
  
  // Dynamic detection based on hostname
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080/api';
  }
  
  // For production (any domain or IP), use relative path
  // Nginx will proxy /api/* to the backend
  return '/api';
};

export const API_BASE = getApiBase();
export const DEFAULT_TENANT_ID = 'SASA001';
