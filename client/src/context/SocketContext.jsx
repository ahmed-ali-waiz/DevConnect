import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { addMessage, incrementUnread, updateLastMessage, setConversations } from '../store/slices/chatSlice';
import { addNotification } from '../store/slices/notificationSlice';
import { getConversations } from '../services/chatService';

const SocketContext = createContext(null);

// Programmatic notification ping via Web Audio API
const playPing = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {}
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useSelector(state => state.auth);
  const activeChat = useSelector(state => state.chat.activeChat);
  const dispatch = useDispatch();
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Load conversations on app startup for unread badge tracking
  useEffect(() => {
    if (user && user._id) {
      getConversations()
        .then((convs) => {
          if (mountedRef.current) {
            dispatch(setConversations(convs));
          }
        })
        .catch(() => {});
    }
  }, [user?._id, dispatch]);

  useEffect(() => {
    if (user && user._id) {
      const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
        query: { userId: user._id },
        withCredentials: true,
      });
      newSocket.on('connect', () => newSocket.emit('join', user._id));
      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, [user?._id]);

  // Chat messages
  useEffect(() => {
    if (!socket) return;
    const handler = ({ message, conversationId }) => {
      dispatch(addMessage({ conversationId, message }));
      
      // Determine preview text for lastMessage
      let previewText = message.text;
      if (!previewText) {
        if (message.audio) previewText = '🎤 Voice note';
        else if (message.image) previewText = '📷 Image';
      }
      
      dispatch(updateLastMessage({
        conversationId,
        lastMessage: {
          text: previewText,
          sender: message.sender,
          createdAt: message.createdAt,
        },
      }));
      if (conversationId !== activeChat?._id) {
        dispatch(incrementUnread(conversationId));
        playPing();
      }
    };
    socket.on('newMessage', handler);
    return () => socket.off('newMessage', handler);
  }, [socket, dispatch, activeChat?._id]);

  // Real-time notifications (global — works on every page)
  useEffect(() => {
    if (!socket) return;
    const handler = (notification) => {
      dispatch(addNotification(notification));
      playPing();
    };
    socket.on('notification', handler);
    socket.on('newNotification', handler);
    return () => {
      socket.off('notification', handler);
      socket.off('newNotification', handler);
    };
  }, [socket, dispatch]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
