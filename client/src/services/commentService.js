import api from './api';

export const getComments = async (postId) => {
  const { data } = await api.get(`/comments/post/${postId}`);
  return data;
};

// payload can be: string (text) or { text, parentCommentId }
export const addComment = async (postId, payload) => {
  const body = typeof payload === 'string' ? { text: payload } : payload;
  const { data } = await api.post(`/comments/post/${postId}`, body);
  return data;
};

export const deleteComment = async (commentId) => {
  const { data } = await api.delete(`/comments/${commentId}`);
  return data;
};

export const likeComment = async (commentId) => {
  const { data } = await api.post(`/comments/${commentId}/like`);
  return data;
};

export const editComment = async (commentId, text) => {
  const { data } = await api.put(`/comments/${commentId}`, { text });
  return data;
};
