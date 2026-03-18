import api from './api';

export const createReport = async (reportData) => {
  const { data } = await api.post('/reports', reportData);
  return data;
};
