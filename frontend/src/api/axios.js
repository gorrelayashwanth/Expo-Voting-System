import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api', // Can be customized or left relative for proxy
});

let fingerprint = null;

// This will be called by the FingerprintContext once the fingerprint is generated
export const setGlobalFingerprint = (fp) => {
  fingerprint = fp;
};

// Add interceptor to attach fingerprint to every request
apiClient.interceptors.request.use((config) => {
  if (fingerprint) {
    config.headers['X-Device-Fingerprint'] = fingerprint;
  }
  return config;
});

export default apiClient;
