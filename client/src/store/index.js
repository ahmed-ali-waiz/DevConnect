import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import postReducer from './slices/postSlice';
import chatReducer from './slices/chatSlice';
import notificationReducer from './slices/notificationSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    posts: postReducer,
    chat: chatReducer,
    notifications: notificationReducer,
  },
});

export default store;
