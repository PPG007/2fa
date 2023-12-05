import axios from "axios";

const axiosInstance = axios.create({
  baseURL: '/api',
});

export const fetchQRCode = (email: string, type: string = 'totp') => {
  return axiosInstance.get<{url: string}>('/uri', {
    params: {
      email,
      type,
    },
  });
}

export const verify = (code: string, email: string, type: string = 'totp') => {
  return axiosInstance.post('/verify', {
    code,
    email,
    type,
  })
}