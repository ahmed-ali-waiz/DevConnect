import api from './api';

export const search = async (query, type = 'all') => {
  const { data } = await api.get('/search', { params: { q: query, type } });
  return data;
};

export const getTrendingHashtags = async () => {
  const { data } = await api.get('/search/hashtags/trending');
  return data;
};I 
