import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setUser, setToken } from '../store/slices/authSlice';
import { setNotifications, setUnreadCount } from '../store/slices/notificationSlice';
import { getCurrentUser } from '../services/authService';
import { getNotifications } from '../services/notificationService';

const AuthInit = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getCurrentUser()
        .then((user) => {
          dispatch(setToken(token));
          dispatch(setUser(user));
          // Fetch notifications so the badge shows immediately
          return getNotifications();
        })
        .then((data) => {
          if (data) {
            const list = data.notifications || data;
            dispatch(setNotifications(list));
            dispatch(setUnreadCount(data.unreadCount ?? list.filter(n => !n.read).length));
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, [dispatch]);

  return children;
};

export default AuthInit;
