import api from './api';

export const getNotifications = async (page = 1, limit = 20) => {
  const { data } = await api.get('/notifications', { params: { page, limit } });
  return data;
};

export const markAllRead = async () => {
  const { data } = await api.put('/notifications/read-all');
  return data;
};

export const markAsRead = async (notificationId) => {
  const { data } = await api.put(`/notifications/${notificationId}/read`);
  return data;
};
