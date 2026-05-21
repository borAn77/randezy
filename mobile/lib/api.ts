import axios from 'axios';
import { API_URL } from '../config';

export const api = axios.create({ baseURL: API_URL });

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};
