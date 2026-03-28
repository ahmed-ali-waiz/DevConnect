import api from './api';

export const getFeed = async (page = 1, limit = 10, type) => {
  const params = { page, limit };
  if (type) params.type = type;
  const { data } = await api.get('/posts/feed', { params });
  return data;
};

export const getExplorePosts = async (page = 1, limit = 10) => {
  const { data } = await api.get('/posts/explore', { params: { page, limit } });
  return data;
};

export const getCodeFeed = async (page = 1, limit = 10) => {
  const { data } = await api.get('/posts/code', { params: { page, limit } });
  return data;
};

export const getBookmarks = async (page = 1, limit = 10) => {
  const { data } = await api.get('/posts/bookmarks', { params: { page, limit } });
  return data;
};

export const getUserPosts = async (userId, page = 1, limit = 10) => {
  const { data } = await api.get(`/posts/user/${userId}`, { params: { page, limit } });
  return data;
};

export const getPost = async (postId) => {
  const { data } = await api.get(`/posts/${postId}`);
  return data;
};

export const createPost = async (postData) => {
  const formData = new FormData();
  formData.append('text', postData.text || '');
  // Support multiple media files
  if (postData.mediaFiles && postData.mediaFiles.length > 0) {
    postData.mediaFiles.forEach((file) => formData.append('media', file));
  } else if (postData.media) {
    formData.append('media', postData.media);
  }
  if (postData.codeSnippet) formData.append('codeSnippet', JSON.stringify(postData.codeSnippet));
  const { data } = await api.post('/posts', formData);
  return data;
};

export const deletePost = async (postId) => {
  const { data } = await api.delete(`/posts/${postId}`);
  return data;
};

export const likePost = async (postId) => {
  const { data } = await api.post(`/posts/${postId}/like`);
  return data;
};

export const repostPost = async (postId) => {
  const { data } = await api.post(`/posts/${postId}/repost`);
  return data;
};

export const bookmarkPost = async (postId) => {
  const { data } = await api.post(`/posts/${postId}/bookmark`);
  return data;
};

export const updatePost = async (postId, postData) => {
  const { data } = await api.put(`/posts/${postId}`, postData);
  return data;
};

export const getUserReplies = async (userId, page = 1, limit = 10) => {
  const { data } = await api.get(`/posts/user/${userId}/replies`, { params: { page, limit } });
  return data;
};

export const getUserLikedPosts = async (userId, page = 1, limit = 10) => {
  const { data } = await api.get(`/posts/user/${userId}/liked`, { params: { page, limit } });
  return data;
};

export const getUserMediaPosts = async (userId, page = 1, limit = 10) => {
  const { data } = await api.get(`/posts/user/${userId}/media`, { params: { page, limit } });
  return data;
};

export const getUserCodePosts = async (userId, page = 1, limit = 10) => {
  const { data } = await api.get(`/posts/user/${userId}/code`, { params: { page, limit } });
  return data;
};
