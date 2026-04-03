import api from './api';

export const getStoryFeed = async () => {
  const { data } = await api.get('/stories/feed');
  return data;
};

export const getUserStories = async (userId) => {
  const { data } = await api.get(`/stories/user/${userId}`);
  return data;
};

export const createStory = async (mediaFile) => {
  const formData = new FormData();
  formData.append('media', mediaFile);
  const { data } = await api.post('/stories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const viewStory = async (storyId) => {
  const { data } = await api.post(`/stories/${storyId}/view`);
  return data;
};

export const likeStory = async (storyId) => {
  const { data } = await api.post(`/stories/${storyId}/like`);
  return data;
};

export const getStoryViewers = async (storyId) => {
  const { data } = await api.get(`/stories/${storyId}/viewers`);
  return data;
};

export const getStoryLikes = async (storyId) => {
  const { data } = await api.get(`/stories/${storyId}/likes`);
  return data;
};

export const deleteStory = async (storyId) => {
  const { data } = await api.delete(`/stories/${storyId}`);
  return data;
};
