import api from './api';

export const getConversations = async () => {
  const { data } = await api.get('/chat/conversations');
  return data;
};

export const createConversation = async (participantId) => {
  const { data } = await api.post('/chat/conversations', { participantId });
  return data;
};

export const getMessages = async (conversationId, page = 1, limit = 50) => {
  const { data } = await api.get(`/chat/${conversationId}/messages`, { params: { page, limit } });
  return data;
};

export const sendMessage = async (conversationId, text, image) => {
  const formData = new FormData();
  formData.append('text', text);
  if (image) formData.append('image', image);
  const { data } = await api.post(`/chat/${conversationId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteMessage = async (conversationId, messageId) => {
  const { data } = await api.delete(`/chat/${conversationId}/messages/${messageId}`);
  return data;
};

export const deleteConversation = async (conversationId) => {
  const { data } = await api.delete(`/chat/conversations/${conversationId}`);
  return data;
};
