import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [],
    activeChat: null,
    messages: {},
    onlineUsers: [],
    totalUnreadMessages: 0
  },
  reducers: {
    setActiveChat: (state, action) => {
      state.activeChat = action.payload;
    },
    setConversations: (state, action) => {
      state.conversations = action.payload;
      // Recalculate totalUnreadMessages from conversations
      state.totalUnreadMessages = action.payload.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    },
    setMessages: (state, action) => {
      const { conversationId, messages } = action.payload;
      state.messages[conversationId] = messages;
    },
    addMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(message);
    },
    incrementUnread: (state, action) => {
      const conv = state.conversations.find(c => c._id === action.payload);
      if (conv) conv.unreadCount = (conv.unreadCount || 0) + 1;
      // Always increment totalUnreadMessages
      state.totalUnreadMessages = (state.totalUnreadMessages || 0) + 1;
    },
    clearUnread: (state, action) => {
      const conv = state.conversations.find(c => c._id === action.payload);
      if (conv) {
        // Subtract the conversation's unread count from total before clearing
        state.totalUnreadMessages = Math.max(0, (state.totalUnreadMessages || 0) - (conv.unreadCount || 0));
        conv.unreadCount = 0;
      }
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    clearAllUnread: (state) => {
      state.conversations.forEach(c => { c.unreadCount = 0; });
      state.totalUnreadMessages = 0;
    },
    updateLastMessage: (state, action) => {
      const { conversationId, lastMessage } = action.payload;
      const idx = state.conversations.findIndex(c => c._id === conversationId);
      if (idx === -1) return;
      state.conversations[idx].lastMessage = lastMessage;
      // Bubble conversation to top of list
      const [conv] = state.conversations.splice(idx, 1);
      state.conversations.unshift(conv);
    },
  }
});

export const { setActiveChat, setConversations, setMessages, addMessage, incrementUnread, clearUnread, setOnlineUsers, clearAllUnread, updateLastMessage } = chatSlice.actions;
export default chatSlice.reducer;
