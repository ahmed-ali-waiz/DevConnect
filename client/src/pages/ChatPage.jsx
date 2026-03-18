import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Image as ImageIcon, Send, MoreVertical, Phone, Video, ArrowLeft, Trash2, Check, CheckCheck } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Avatar from '../components/ui/Avatar';
import EmojiPickerButton from '../components/ui/EmojiPickerButton';
import { useSocket } from '../context/SocketContext';
import { getConversations, getMessages, sendMessage, deleteMessage, deleteConversation } from '../services/chatService';
import { setConversations, setActiveChat, setMessages, addMessage, clearUnread, setOnlineUsers } from '../store/slices/chatSlice';
import { formatDistanceToNow } from 'date-fns';

const ChatPage = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { conversations, activeChat, messages, onlineUsers } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);

  const [messageText, setMessageText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showConvoMenu, setShowConvoMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { messageId, x, y }
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const insertEmoji = (emoji) => {
    const el = messageInputRef.current;
    if (!el) {
      setMessageText((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? messageText.length;
    const end = el.selectionEnd ?? messageText.length;
    const next = messageText.slice(0, start) + emoji + messageText.slice(end);
    setMessageText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  // Load conversations on mount
  useEffect(() => {
    setLoadingConvos(true);
    getConversations()
      .then(data => dispatch(setConversations(data)))
      .catch(() => toast.error('Failed to load conversations'))
      .finally(() => setLoadingConvos(false));
  }, [dispatch]);

  // Open conversation from URL param
  useEffect(() => {
    const convId = searchParams.get('conversationId');
    if (!convId || conversations.length === 0) return;
    const conv = conversations.find(c => c._id === convId);
    if (conv && activeChat?._id !== conv._id) {
      dispatch(setActiveChat(conv));
      dispatch(clearUnread(conv._id));
    }
  }, [searchParams, conversations]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat) return;
    setLoadingMessages(true);
    setIsTyping(false);
    getMessages(activeChat._id)
      .then(data => dispatch(setMessages({ conversationId: activeChat._id, messages: data.messages || [] })))
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
  }, [activeChat?._id]);

  // Socket: track online users
  useEffect(() => {
    if (!socket) return;
    const handler = (userIds) => dispatch(setOnlineUsers(userIds));
    socket.on('onlineUsers', handler);
    return () => socket.off('onlineUsers', handler);
  }, [socket, dispatch]);

  // Socket: typing indicators
  useEffect(() => {
    if (!socket) return;
    const onTyping = ({ conversationId }) => {
      if (conversationId === activeChat?._id) setIsTyping(true);
    };
    const onStopTyping = ({ conversationId }) => {
      if (conversationId === activeChat?._id) setIsTyping(false);
    };
    socket.on('userTyping', onTyping);
    socket.on('userStopTyping', onStopTyping);
    return () => {
      socket.off('userTyping', onTyping);
      socket.off('userStopTyping', onStopTyping);
    };
  }, [socket, activeChat?._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat?._id]);

  const getOtherParticipant = (conv) =>
    conv.participants?.find(p => p._id !== user?._id) || conv.participants?.[0] || {};

  const emitTyping = useCallback(() => {
    if (!socket || !activeChat) return;
    const other = getOtherParticipant(activeChat);
    socket.emit('typing', { conversationId: activeChat._id, recipientId: other._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { conversationId: activeChat._id, recipientId: other._id });
    }, 2000);
  }, [socket, activeChat]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !imageFile) return;
    if (!activeChat) return;
    // Stop typing indicator on send
    if (socket) {
      const other = getOtherParticipant(activeChat);
      socket.emit('stopTyping', { conversationId: activeChat._id, recipientId: other._id });
      clearTimeout(typingTimeoutRef.current);
    }
    setSending(true);
    try {
      const msg = await sendMessage(activeChat._id, messageText.trim(), imageFile);
      dispatch(addMessage({ conversationId: activeChat._id, message: msg }));
      setMessageText('');
      setImageFile(null);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeChat) return;
    try {
      await deleteMessage(activeChat._id, messageId);
      dispatch(setMessages({
        conversationId: activeChat._id,
        messages: activeMessages.map(m => m._id === messageId ? { ...m, isDeleted: true, text: '', image: '' } : m)
      }));
      setContextMenu(null);
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeChat) return;
    try {
      await deleteConversation(activeChat._id);
      dispatch(setConversations(conversations.filter(c => c._id !== activeChat._id)));
      dispatch(setActiveChat(null));
      setShowConvoMenu(false);
      navigate('/chat', { replace: true });
      toast.success('Conversation deleted');
    } catch {
      toast.error('Failed to delete conversation');
    }
  };

  const handleContextMenu = (e, msg) => {
    const isMe = (msg.sender?._id ?? msg.sender) === user?._id;
    if (!isMe || msg.isDeleted) return;
    e.preventDefault();
    setContextMenu({ messageId: msg._id, x: e.clientX, y: e.clientY });
  };

  const handleSelectConversation = (conv) => {
    dispatch(setActiveChat(conv));
    dispatch(clearUnread(conv._id));
    navigate(`/chat?conversationId=${conv._id}`, { replace: true });
  };

  const activeMessages = activeChat ? (messages[activeChat._id] || []) : [];
  const otherParticipant = activeChat ? getOtherParticipant(activeChat) : null;
  const isOnline = otherParticipant && onlineUsers.includes(otherParticipant._id);

  const filteredConvos = conversations.filter(conv => {
    if (!searchQuery) return true;
    const other = getOtherParticipant(conv);
    return (other.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (other.username || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full flex-1 flex h-[calc(100vh-56px)] md:h-screen overflow-hidden pt-14 md:pt-0 pb-14 md:pb-0">

      {/* Left Panel - Conversation List */}
      <div className={`w-full md:w-80 lg:w-90 shrink-0 border-r border-(--border-glass) flex flex-col bg-(--bg-primary) ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-(--border-glass)">
          <h2 className="text-xl font-display font-bold mb-4">Messages</h2>
          <div className="relative">
            <Search size={16} className="absolute inset-y-0 left-3 my-auto text-(--text-muted)" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-(--bg-glass) border border-(--border-glass) rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-(--accent-primary) transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingConvos ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-(--accent-primary) border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-(--text-muted) px-4 text-center">
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : filteredConvos.map(conv => {
            const other = getOtherParticipant(conv);
            const isActive = activeChat?._id === conv._id;
            const hasUnread = conv.unreadCount > 0;
            return (
              <div
                key={conv._id}
                onClick={() => handleSelectConversation(conv)}
                className={`flex items-center p-4 cursor-pointer transition-colors border-b border-(--border-glass) hover:bg-[rgba(255,255,255,0.03)] border-l-4 ${isActive ? 'bg-[rgba(255,255,255,0.05)] border-l-(--accent-primary)' : 'border-l-transparent'}`}
              >
                <div className="relative mr-3">
                  <Avatar src={other.profilePic} alt={other.name} size="md" isOnline={onlineUsers.includes(other._id)} />
                  {hasUnread && !isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-(--bg-primary)" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`truncate text-sm ${hasUnread && !isActive ? 'font-bold text-white' : 'font-semibold text-(--text-primary)'}`}>{other.name}</h3>
                    <span className="text-xs ml-1 shrink-0 text-(--text-muted)">
                      {conv.lastMessage?.createdAt
                        ? formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })
                        : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-xs truncate ${hasUnread && !isActive ? 'text-white font-semibold' : 'text-(--text-muted)'}`}>
                      {conv.lastMessage?.text || 'Start a conversation'}
                    </p>
                    {hasUnread && !isActive && (
                      <span className="min-w-4.5 h-4.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold ml-2 shrink-0 px-1">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel - Chat Window */}
      <div className={`flex-1 flex flex-col bg-(--bg-primary)/50 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 sm:px-6 border-b border-(--border-glass) flex items-center justify-between bg-(--bg-primary)/80 backdrop-blur-md z-10">
              <div className="flex items-center space-x-3">
                <button onClick={() => dispatch(setActiveChat(null))} className="md:hidden mr-2 p-2 rounded-full hover:bg-(--bg-glass) text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar src={otherParticipant?.profilePic} alt={otherParticipant?.name} size="sm" isOnline={isOnline} />
                <div>
                  <h3 className="font-semibold text-sm leading-tight">{otherParticipant?.name}</h3>
                  <p className={`text-xs ${isOnline ? 'text-(--accent-green)' : 'text-(--text-muted)'}`}>
                    {isOnline ? 'Online' : `@${otherParticipant?.username}`}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 text-(--text-muted)">
                <button className="p-2 hover:text-white hover:bg-(--bg-glass) rounded-full transition-colors"><Phone size={18} /></button>
                <button className="p-2 hover:text-white hover:bg-(--bg-glass) rounded-full transition-colors"><Video size={18} /></button>
                <div className="relative">
                  <button onClick={() => setShowConvoMenu(v => !v)} className="p-2 hover:text-white hover:bg-(--bg-glass) rounded-full transition-colors"><MoreVertical size={18} /></button>
                  {showConvoMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-(--bg-secondary) border border-(--border-glass) rounded-xl shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={handleDeleteConversation}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} /> Delete conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar" onClick={() => { setContextMenu(null); setShowConvoMenu(false); }}>
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-(--accent-primary) border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeMessages.map((msg) => {
                const isMe = (msg.sender?._id ?? msg.sender) === user?._id;
                const isRead = msg.readBy && msg.readBy.length > 1;
                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                  >
                    <div className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {msg.isDeleted ? (
                        <div className="px-4 py-2.5 rounded-2xl bg-(--bg-glass)/50 border border-(--border-glass) italic text-(--text-muted) text-sm">
                          This message was deleted
                        </div>
                      ) : (
                        <>
                          {msg.image && (
                            <img src={msg.image} alt="Message attachment" className="rounded-2xl max-w-full max-h-60 object-cover mb-1" />
                          )}
                          {msg.text && (
                            <div className={`px-4 py-2.5 rounded-2xl ${
                              isMe
                                ? 'bg-linear-to-br from-(--accent-primary) to-[#38bdf8] text-[#050810] rounded-br-sm'
                                : 'bg-(--bg-glass) border border-(--border-glass) text-white rounded-bl-sm'
                            }`}>
                              <p className="text-[14px] leading-relaxed wrap-break-word font-medium">{msg.text}</p>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex items-center gap-1 mt-1 px-1">
                        <span className="text-[10px] text-(--text-muted)">
                          {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ''}
                        </span>
                        {isMe && !msg.isDeleted && (
                          isRead
                            ? <CheckCheck size={12} className="text-(--accent-primary)" />
                            : <Check size={12} className="text-(--text-muted)" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex justify-start">
                    <div className="bg-(--bg-glass) border border-(--border-glass) rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-(--text-muted) rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 bg-(--text-muted) rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-(--text-muted) rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Context menu for delete */}
            {contextMenu && (
              <div
                className="fixed z-50 bg-(--bg-secondary) border border-(--border-glass) rounded-xl shadow-xl overflow-hidden"
                style={{ top: contextMenu.y, left: contextMenu.x }}
              >
                <button
                  onClick={() => handleDeleteMessage(contextMenu.messageId)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full"
                >
                  <Trash2 size={14} /> Delete message
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-(--bg-primary) border-t border-(--border-glass)">
              {imageFile && (
                <div className="mb-2 flex items-center gap-2 text-xs text-(--text-muted) bg-(--bg-glass) rounded-lg px-3 py-2">
                  <ImageIcon size={14} />
                  <span className="truncate">{imageFile.name}</span>
                  <button type="button" onClick={() => setImageFile(null)} className="ml-auto text-red-400 hover:text-red-300 shrink-0">✕</button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex items-end space-x-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-3 text-(--text-muted) hover:text-(--accent-primary) hover:bg-(--bg-glass) rounded-full transition-colors shrink-0"
                >
                  <ImageIcon size={20} />
                </button>
                <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                <div className="flex-1 bg-(--bg-glass) border border-(--border-glass) rounded-2xl relative flex items-center min-h-12">
                  <textarea
                    ref={messageInputRef}
                    value={messageText}
                    onChange={(e) => { setMessageText(e.target.value); emitTyping(); }}
                    placeholder="Message..."
                    className="w-full bg-transparent border-none text-white px-4 py-3 focus:outline-none resize-none max-h-32 custom-scrollbar text-sm"
                    rows="1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                  <div className="absolute right-2 bottom-1.5">
                    <EmojiPickerButton onEmoji={insertEmoji} />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={(!messageText.trim() && !imageFile) || sending}
                  className={`p-3 rounded-full shrink-0 transition-all ${
                    (messageText.trim() || imageFile) && !sending
                      ? 'bg-linear-to-tr from-(--accent-primary) to-(--accent-secondary) text-[#050810] shadow-(--shadow-glow) scale-100'
                      : 'bg-(--bg-glass) text-(--text-muted) scale-95 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} className={(messageText.trim() || imageFile) ? 'translate-x-0.5' : ''} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-(--text-muted) p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-(--bg-glass) flex items-center justify-center mb-4 border border-(--border-glass)">
              <svg className="w-10 h-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <h3 className="text-xl font-display font-medium text-white">Your Messages</h3>
            <p className="text-sm max-w-62.5 mt-2">Select a conversation to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
