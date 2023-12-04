import axios from "axios";

const axiosInstance = axios.create({
  baseURL: '/api',
});

export const fetchQRCode = (email: string) => {
  return axiosInstance.get<{uri: string}>('/uri', {
    params: {
      email
    },
  });
}

export const verify = (code: string, email: string) => {
  return axiosInstance.post('/verify', {
    code,
    email,
  })
}