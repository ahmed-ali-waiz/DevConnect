import api from './api';

export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

export const register = async (userData) => {
  const { data } = await api.post('/auth/register', userData);
  return data;
};

export const logout = async () => {
  await api.post('/auth/logout');
};

export const getCurrentUser = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const checkUsername = async (username) => {
  const { data } = await api.get(`/auth/check-username/${encodeURIComponent(username)}`);
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
};

export const resetPassword = async (token, newPassword) => {
  const { data } = await api.post('/auth/reset-password', { token, newPassword });
  return data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
  return data;
};

export const verifyEmail = async (token) => {
  const { data } = await api.get(`/auth/verify-email?token=${token}`);
  return data;
};

export const resendVerification = async () => {
  const { data } = await api.post('/auth/resend-verification');
  return data;
};

export const deleteAccount = async (password) => {
  const { data } = await api.delete('/auth/account', { data: { password } });
  return data;
};

export const deactivateAccount = async (password) => {
  const { data } = await api.put('/auth/deactivate', { password });
  return data;
};
