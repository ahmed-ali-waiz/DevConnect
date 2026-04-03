import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    unreadCount: 0,
    loading: false,
  },
  reducers: {
    setNotifications: (state, action) => {
      state.notifications = action.payload;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
    markAllReadLocal: (state) => {
      state.notifications = state.notifications.map(n => ({ ...n, read: true }));
      state.unreadCount = 0;
    },
    markReadLocal: (state, action) => {
      const notif = state.notifications.find(n => (n._id || n.id) === action.payload);
      if (notif && !notif.read) {
        notif.read = true;
        state.unreadCount = Math.max(0, Math.floor(state.unreadCount - 1));
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setNotifications, setUnreadCount, addNotification, markAllReadLocal, markReadLocal, setLoading } = notificationSlice.actions;
export default notificationSlice.reducer;
