import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Image as ImageIcon, Send, MoreVertical, Phone, Video, ArrowLeft, Trash2, Check, CheckCheck, Camera, ChevronDown, SquarePen, Mic, Smile, Plus, Info, Play, Pause } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Avatar from '../components/ui/Avatar';
import EmojiPickerButton from '../components/ui/EmojiPickerButton';
import { useSocket } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import { getConversations, getMessages, sendMessage, deleteMessage, deleteConversation } from '../services/chatService';
import { setConversations, setActiveChat, setMessages, addMessage, clearUnread, setOnlineUsers } from '../store/slices/chatSlice';
import { formatDistanceToNow } from 'date-fns';

// Audio Message Bubble Component
const AudioMessageBubble = ({ src, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    const newTime = (newProgress / 100) * duration;
    
    audio.currentTime = newTime;
    setProgress(newProgress);
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-[22px] min-w-[200px] ${
      isMe
        ? 'bg-gradient-to-tr from-[#3797f0] to-[#6a35ff] rounded-br-[4px]'
        : 'bg-[#262626] rounded-bl-[4px]'
    }`}>
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0 hover:bg-white/30 transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-white" fill="white" />
        ) : (
          <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Progress bar */}
        <div 
          className="h-1 bg-white/30 rounded-full relative cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-white rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Duration */}
        <div className="flex justify-between">
          <span className="text-[10px] text-white/70">
            {formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}
          </span>
          <span className="text-[10px] text-white/70">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

const ChatPage = () => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { startCall } = useCall();
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
  const [contextMenu, setContextMenu] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

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

  useEffect(() => {
    setLoadingConvos(true);
    getConversations()
      .then(data => dispatch(setConversations(data)))
      .catch(() => toast.error('Failed to load conversations'))
      .finally(() => setLoadingConvos(false));
  }, [dispatch]);

  useEffect(() => {
    const convId = searchParams.get('conversationId');
    if (!convId || conversations.length === 0) return;
    const conv = conversations.find(c => c._id === convId);
    if (conv && activeChat?._id !== conv._id) {
      dispatch(setActiveChat(conv));
      dispatch(clearUnread(conv._id));
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    if (!activeChat) return;
    setLoadingMessages(true);
    setIsTyping(false);
    getMessages(activeChat._id)
      .then(data => dispatch(setMessages({ conversationId: activeChat._id, messages: data.messages || [] })))
      .catch(() => { })
      .finally(() => setLoadingMessages(false));
  }, [activeChat?._id]);

  useEffect(() => {
    if (!socket) return;
    const handler = (userIds) => dispatch(setOnlineUsers(userIds));
    socket.on('onlineUsers', handler);
    return () => socket.off('onlineUsers', handler);
  }, [socket, dispatch]);

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

  // Voice recording functions
  const startRecording = async () => {
    if (!activeChat) return;
    
    try {
      // Request microphone with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Verify audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        toast.error('No microphone found');
        return;
      }
      console.log('Using microphone:', audioTracks[0].label);
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onerror = () => {
        toast.error('Recording error');
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      toast.error('Microphone access denied');
    }
  };

  const stopAndSendRecording = async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;
    
    // Stop timer
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    
    // Cleanup audio context
    if (mediaRecorder.audioContext) {
      mediaRecorder.audioContext.close().catch(() => {});
    }
    
    // Set up onstop handler BEFORE calling stop
    const sendAudio = async () => {
      // Stop audio tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      if (audioChunksRef.current.length > 0) {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        
        if (audioBlob.size < 100) {
          toast.error('Recording too short');
          return;
        }
        
        setSending(true);
        try {
          const msg = await sendMessage(activeChat._id, '', null, audioBlob);
          dispatch(addMessage({ conversationId: activeChat._id, message: msg }));
        } catch (err) {
          console.error('Send failed:', err);
          toast.error('Failed to send voice note');
        } finally {
          setSending(false);
        }
      } else {
        mediaRecorderRef.current = null;
        toast.error('No audio recorded');
      }
    };
    
    // Replace the onstop handler
    mediaRecorder.onstop = sendAudio;
    
    // Stop recording
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    } else {
      sendAudio();
    }
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    clearInterval(recordingTimerRef.current);
    
    const mediaRecorder = mediaRecorderRef.current;
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    mediaRecorder.stop();
    
    // Reset state
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    toast('Recording cancelled', { icon: '🎤' });
  };

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      }
      clearInterval(recordingTimerRef.current);
    };
  }, []);

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
    <div className={`w-full justify-center flex bg-black text-white overflow-hidden ${activeChat ? 'h-[100dvh] md:h-dvh' : 'flex-1'}`}>

      {/* Left Panel */}
      <div className={`w-full md:w-80 lg:w-90 shrink-0 border-r border-[#262626] flex flex-col bg-[#000000] ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 sm:px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1">
              <h2 className="text-xl font-bold tracking-tight text-accent-primary">{user?.username || 'Messages'}</h2>
              <ChevronDown className="w-5 h-5 stroke-[3px] text-accent-primary" />
            </div>
            <button className="hover:opacity-70 transition-opacity p-1">
              <SquarePen className="w-6 h-6 stroke-[2px]" />
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute inset-y-0 left-3 my-auto text-[#8e8e8e] font-semibold" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#262626] border-none rounded-xl py-2 pl-10 pr-4 text-[15px] font-medium text-white focus:outline-none placeholder-[#8e8e8e] transition-all"
            />
          </div>
        </div>

        <div className="flex items-center px-4 sm:px-5 py-2">
          <div className="font-semibold text-white">Messages</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar mt-1 pb-20">
          {loadingConvos ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-(--accent-primary) border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[#8e8e8e] px-4 text-center">
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
                className={`flex items-center px-4 sm:px-5 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.05)] ${isActive ? 'bg-[rgba(255,255,255,0.05)]' : ''}`}
              >
                <div 
                  className="relative mr-3 shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); other.username && navigate(`/profile/${other.username}`); }}
                >
                  <Avatar src={other.profilePic} alt={other.name} size="md" className="w-[54px] h-[54px]" isOnline={false} />
                  {onlineUsers.includes(other._id) && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-(--accent-green) rounded-full border-[3px] border-[#000]" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <h3 
                    className={`truncate text-[15px] ${hasUnread && !isActive ? 'font-bold' : 'font-medium text-[rgba(255,255,255,0.95)]'}`}
                  >
                    {other.name}
                  </h3>
                  <div className="flex items-center text-[13px] mt-0.5">
                    <p className={`truncate max-w-[80%] ${hasUnread && !isActive ? 'font-bold' : 'text-[#8e8e8e]'}`}>
                      {conv.lastMessage?.text || 'Start a conversation'}
                    </p>
                    {conv.lastMessage?.createdAt && (
                      <>
                        <span className={`shrink-0 mx-1 ${hasUnread && !isActive ? 'font-bold' : 'text-[#8e8e8e]'}`}>·</span>
                        <span className={`shrink-0 ${hasUnread && !isActive ? 'font-bold' : 'text-[#8e8e8e]'}`}>
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false }).replace('about ', '')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-2 shrink-0">
                  {hasUnread && !isActive && (
                    <div className="w-[8px] h-[8px] bg-[#0095f6] rounded-full"></div>
                  )}
                  <button className="text-[#8e8e8e] hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); }}>
                    <Camera className="w-[26px] h-[26px] stroke-[1.5]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel - Chat Window */}
      <div className={`flex-1 flex flex-col bg-[#000000] ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* ── Header ── */}
            <div className="h-[56px] px-3 border-b border-[#262626] flex items-center justify-between bg-[#000000] z-10 shrink-0">

              {/* Left: back + avatar + name */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Back button — moved slightly right with ml-2, smaller icon */}
                <button
                  onClick={() => { dispatch(setActiveChat(null)); navigate('/chat', { replace: true }); }}
                  className="md:hidden ml-2 p-1 hover:opacity-70 transition-opacity shrink-0"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2]" />
                </button>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => otherParticipant?.username && navigate(`/profile/${otherParticipant.username}`)}
                  >
                    <Avatar
                      src={otherParticipant?.profilePic}
                      alt={otherParticipant?.name}
                      size="sm"
                      className="w-8 h-8 shrink-0"
                      isOnline={false}
                    />
                  </div>
                  <div className="flex flex-col -space-y-0.5 min-w-0">
                    <h3 className="font-semibold text-[14px] truncate leading-tight">
                      {otherParticipant?.name}
                    </h3>
                    <p className="text-[11px] text-[#8e8e8e] truncate">
                      {otherParticipant?.username}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: action buttons — smaller & tighter */}
              <div className="flex items-center gap-3 shrink-0 pr-1">
                <button
                  onClick={() => startCall(otherParticipant, 'audio')}
                  className="hover:opacity-70 transition-opacity p-1"
                  aria-label="Voice call"
                >
                  <Phone className="w-[18px] h-[18px] stroke-[1.75]" />
                </button>
                <button
                  onClick={() => startCall(otherParticipant, 'video')}
                  className="hover:opacity-70 transition-opacity p-1"
                  aria-label="Video call"
                >
                  <Video className="w-[18px] h-[18px] stroke-[1.75]" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowConvoMenu(v => !v)}
                    className="hover:opacity-70 transition-opacity p-1"
                    aria-label="Info"
                  >
                    <Info className="w-[18px] h-[18px] stroke-[1.75]" />
                  </button>
                  {showConvoMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#262626] border border-[#333] rounded-xl shadow-2xl z-50 overflow-hidden">
                      <button
                        onClick={handleDeleteConversation}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 font-semibold hover:bg-white/5 transition-colors"
                      >
                        <Trash2 size={16} /> Delete conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1 custom-scrollbar bg-[#000000]"
              onClick={() => { setContextMenu(null); setShowConvoMenu(false); }}
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-(--accent-primary) border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeMessages.map((msg, idx) => {
                const isMe = (msg.sender?._id ?? msg.sender) === user?._id;
                const prevMsg = idx > 0 ? activeMessages[idx - 1] : null;
                const showAvatar = !isMe && (!prevMsg || (prevMsg.sender?._id ?? prevMsg.sender) !== (msg.sender?._id ?? msg.sender));

                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start mb-0.5'}`}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                  >
                    <div className="max-w-[85%] sm:max-w-[75%] flex items-end gap-2 shrink-0 min-w-0">
                      {!isMe && (
                        <div 
                          className="w-[28px] h-[28px] shrink-0 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => otherParticipant?.username && navigate(`/profile/${otherParticipant.username}`)}
                        >
                          {showAvatar && <Avatar src={otherParticipant?.profilePic} alt={otherParticipant?.name} className="w-full h-full" />}
                        </div>
                      )}
                      <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                        {msg.isDeleted ? (
                          <div className="px-4 py-[10px] rounded-[22px] min-h-[44px] flex items-center bg-transparent border border-[#333] text-[#8e8e8e] text-[15px]">
                            This message was deleted
                          </div>
                        ) : (
                          <>
                            {msg.audio && (
                              <AudioMessageBubble src={msg.audio} isMe={isMe} />
                            )}
                            {msg.image && (
                              <img 
                                src={msg.image} 
                                alt="Message attachment" 
                                className={`max-w-full max-h-72 object-cover border border-[#333] ${
                                  msg.text ? 'mb-1 rounded-[20px]' : (isMe ? 'rounded-[20px] rounded-br-[4px]' : 'rounded-[20px] rounded-bl-[4px]')
                                }`} 
                                style={{ width: 'auto' }}
                              />
                            )}
                            {msg.text && (
                              <div className={`px-4 py-[10px] min-h-[44px] flex flex-col justify-center ${isMe
                                  ? 'bg-linear-to-tr from-[#3797f0] to-[#6a35ff] text-white rounded-[22px] rounded-br-[4px]'
                                  : 'bg-[#262626] text-white rounded-[22px] rounded-bl-[4px]'
                                }`}>
                                <p className="text-[15px] leading-[1.3] break-words">{msg.text}</p>
                              </div>
                            )}
                          </>
                        )}
                        <span className={`text-[10px] text-[#555] mt-1 font-medium ${isMe ? 'mr-1' : 'ml-1'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              <AnimatePresence>
                {isTyping && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex justify-start pl-[36px]">
                    <div className="bg-[#262626] rounded-[22px] rounded-bl-[4px] px-4 py-3.5 flex items-center gap-1.5 h-[44px]">
                      <span className="w-1.5 h-1.5 bg-[#8e8e8e] rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-[#8e8e8e] rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-[#8e8e8e] rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Context Menu */}
            {contextMenu && (
              <div
                className="fixed z-50 bg-[#262626] border border-[#333] rounded-xl shadow-2xl overflow-hidden"
                style={{ top: contextMenu.y, left: contextMenu.x }}
              >
                <button
                  onClick={() => handleDeleteMessage(contextMenu.messageId)}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-red-500 font-semibold hover:bg-white/5 transition-colors w-full"
                >
                  <Trash2 size={16} /> Delete message
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="px-4 pb-3 pt-2 bg-black border-t border-[#262626] shrink-0">
              <div className="flex items-end gap-3 max-w-full">
                <button className="w-10 h-10 rounded-full bg-[#0095f6] flex items-center justify-center shrink-0 mb-0.5 hover:bg-[#1877f2] transition-colors shadow-sm">
                  <Camera className="w-[22px] h-[22px] stroke-[2]" fill="white" />
                </button>

                <div className="flex-1 bg-[#262626] rounded-[24px] relative flex flex-col min-h-11 border border-[#333]">
                  {/* Recording UI */}
                  {isRecording ? (
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      {/* Cancel button */}
                      <button 
                        type="button"
                        onClick={cancelRecording}
                        className="w-8 h-8 rounded-full bg-[#363636] hover:bg-[#454545] flex items-center justify-center shrink-0 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                      
                      {/* Red pulsing dot */}
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                      
                      {/* Timer */}
                      <span className="text-white font-mono text-sm shrink-0">
                        {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:
                        {String(recordingTime % 60).padStart(2, '0')}
                      </span>
                      
                      {/* Recording label */}
                      <span className="flex-1 text-[#8e8e8e] text-sm">
                        Recording...
                      </span>
                      
                      {/* Send button */}
                      <button 
                        type="button"
                        onClick={stopAndSendRecording}
                        disabled={sending}
                        className="w-8 h-8 rounded-full bg-[#0095f6] hover:bg-[#1877f2] flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {imageFile && (
                        <div className="flex items-center gap-2 text-xs text-[#8e8e8e] bg-black/40 rounded-t-xl px-4 py-2 mx-2 mt-2">
                          <ImageIcon size={14} />
                          <span className="truncate flex-1">{imageFile.name}</span>
                          <button type="button" onClick={() => setImageFile(null)} className="ml-auto text-red-400 hover:text-red-300 shrink-0">✕</button>
                        </div>
                      )}

                      <form onSubmit={handleSend} className="flex items-center w-full relative pl-4 pr-1">
                        <textarea
                          ref={messageInputRef}
                          value={messageText}
                          onChange={(e) => { setMessageText(e.target.value); emitTyping(); }}
                          placeholder="Message..."
                          className="flex-1 bg-transparent border-none text-[15px] pt-[11px] pb-[11px] focus:outline-none resize-none max-h-32 custom-scrollbar pr-2 placeholder-[#8e8e8e]"
                          rows="1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSend(e);
                            }
                          }}
                        />

                        <div className="flex items-center gap-0.5 shrink-0 py-1">
                          {(!messageText.trim() && !imageFile) ? (
                            <>
                              <button 
                                type="button" 
                                className="p-2 hover:opacity-70 transition-opacity"
                                onClick={startRecording}
                              >
                                <Mic className="w-[22px] h-[22px] stroke-[2]" />
                              </button>
                              <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 hover:opacity-70 transition-opacity">
                                <ImageIcon className="w-[22px] h-[22px] stroke-[2]" />
                              </button>
                              <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                              <div className="relative flex items-center justify-center p-2 hover:opacity-70 transition-opacity cursor-pointer">
                                <EmojiPickerButton buttonClassName="p-0 text-white rounded-full transition-colors" onEmoji={insertEmoji} customIcon={<Smile className="w-[22px] h-[22px] stroke-[2]" />} />
                              </div>
                              <button type="button" className="p-2 hover:opacity-70 transition-opacity">
                                <Plus className="w-[24px] h-[24px] stroke-[2] bg-[rgba(255,255,255,0.15)] rounded-full p-0.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="submit"
                              disabled={sending}
                              className="mr-3 ml-1 font-semibold text-[15px] text-[#0095f6] hover:text-white transition-colors"
                            >
                              {sending ? 'Sending' : 'Send'}
                            </button>
                          )}
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#8e8e8e] p-6 text-center">
            <div className="w-24 h-24 rounded-full border-2 border-white flex items-center justify-center mb-4">
              <Send className="w-10 h-10 text-white translate-x-1" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Your Messages</h3>
            <p className="text-[14px] text-[#a8a8a8] max-w-sm mb-6">Send private photos and messages to a friend or group.</p>
            <button className="bg-[#0095f6] text-white px-4 py-[7px] text-[15px] font-semibold rounded-lg hover:bg-[#1877f2] transition-colors">
              Send message
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;