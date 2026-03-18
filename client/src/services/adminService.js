import api from './api';

export const getAdminStats = async () => {
  const { data } = await api.get('/admin/stats');
  return data;
};

export const getAdminUsers = async (page = 1, limit = 20) => {
  const { data } = await api.get('/admin/users', { params: { page, limit } });
  return data;
};

export const toggleBan = async (userId) => {
  const { data } = await api.put(`/admin/users/${userId}/ban`);
  return data;
};

export const adminDeletePost = async (postId) => {
  const { data } = await api.delete(`/admin/posts/${postId}`);
  return data;
};

export const getAdminPosts = async (page = 1, limit = 20) => {
  const { data } = await api.get('/admin/posts', { params: { page, limit } });
  return data;
};

export const getReports = async (page = 1, limit = 20, status = 'pending') => {
  const { data } = await api.get('/admin/reports', { params: { page, limit, status } });
  return data;
};

export const updateReport = async (reportId, status) => {
  const { data } = await api.put(`/admin/reports/${reportId}`, { status });
  return data;
};
