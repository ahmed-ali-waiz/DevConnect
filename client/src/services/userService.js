import api from './api';

export const getUserProfile = async (username) => {
  const { data } = await api.get(`/users/${encodeURIComponent(username)}`);
  return data;
};

export const updateProfile = async (profileData) => {
  const formData = new FormData();
  Object.entries(profileData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'profilePic' && key !== 'coverImage') {
      formData.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
    }
  });
  if (profileData.profilePic instanceof File) formData.append('profilePic', profileData.profilePic);
  if (profileData.coverImage instanceof File) formData.append('coverImage', profileData.coverImage);
  const { data } = await api.put('/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const toggleFollow = async (userId) => {
  const { data } = await api.post(`/users/${userId}/follow`);
  return data;
};

export const getFollowers = async (userId) => {
  const { data } = await api.get(`/users/${userId}/followers`);
  return data;
};

export const getFollowing = async (userId) => {
  const { data } = await api.get(`/users/${userId}/following`);
  return data;
};

export const getSuggestedUsers = async () => {
  const { data } = await api.get('/users/suggested');
  return data;
};

export const pinPost = async (postId) => {
  const { data } = await api.post(`/users/pin-post/${postId}`);
  return data;
};

export const blockUser = async (userId) => {
  const { data } = await api.post(`/users/${userId}/block`);
  return data;
};

export const muteUser = async (userId) => {
  const { data } = await api.post(`/users/${userId}/mute`);
  return data;
};

export const updateNotificationPreferences = async (prefs) => {
  const { data } = await api.put('/users/notification-preferences', prefs);
  return data;
};

export const updatePrivacySettings = async (settings) => {
  const { data } = await api.put('/users/privacy-settings', settings);
  return data;
};
