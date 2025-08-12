import axios from 'axios';

// Configure base URL for API calls
// In production, use relative path to work with same-domain deployment
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for file processing
});

// Add request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;
