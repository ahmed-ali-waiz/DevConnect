import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageSquare, Repeat2, UserPlus, Bell } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { useSocket } from '../context/SocketContext';
import { getNotifications, markAllRead } from '../services/notificationService';
import { setNotifications, setUnreadCount, markAllReadLocal, setLoading } from '../store/slices/notificationSlice';
import { updateProfileOptimistic } from '../store/slices/authSlice';
import { toggleFollow } from '../services/userService';
import { createConversation } from '../services/chatService';
import { markAsRead } from '../services/notificationService';

const getIcon = (type) => {
  switch (type) {
    case 'like': return <Heart fill="currentColor" size={16} className="text-red-500" />;
    case 'comment': return <MessageSquare size={16} className="text-[#38bdf8]" />;
    case 'follow': return <UserPlus size={16} className="text-(--accent-secondary)" />;
    case 'mention': return <span className="text-(--accent-primary) font-bold text-lg leading-none">@</span>;
    case 'repost': return <Repeat2 size={16} className="text-(--accent-green)" />;
    default: return <Bell size={16} />;
  }
};

const getNotificationText = (type) => {
  switch (type) {
    case 'like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'reply': return 'replied to your comment';
    case 'comment_like': return 'liked your comment';
    case 'reply_like': return 'liked your reply';
    case 'follow': return 'started following you';
    case 'mention': return 'mentioned you in a post';
    case 'repost': return 'reposted your post';
    default: return 'interacted with you';
  }
};
const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState('All');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const socket = useSocket();
  const { notifications, unreadCount, loading } = useSelector(state => state.notifications);
  const currentUser = useSelector(state => state.auth.user);
  const tabs = ['All', 'Mentions', 'Follows'];

  useEffect(() => {
    dispatch(setLoading(true));
    getNotifications()
      .then(data => {
        const list = data.notifications || data;
        dispatch(setNotifications(list));
        dispatch(setUnreadCount(data.unreadCount ?? list.filter(n => !n.read).length));
      })
      .catch(() => {})
      .finally(() => dispatch(setLoading(false)));
  }, [dispatch]);

  const handleMarkAllRead = async () => {
    dispatch(markAllReadLocal());
    try {
      await markAllRead();
    } catch {}
  };

  const handleFollowBack = async (senderId) => {
    // Optimistic update
    const updatedFollowing = currentUser.following
      ? [...currentUser.following, senderId]
      : [senderId];
    dispatch(updateProfileOptimistic({ following: updatedFollowing }));
    
    try {
      const response = await toggleFollow(senderId);
      // Confirm with backend
      if (!response.following) {
        // Revert if backend says not following
        dispatch(updateProfileOptimistic({ 
          following: currentUser.following || [] 
        }));
      }
    } catch {
      // Revert on error
      dispatch(updateProfileOptimistic({ 
        following: currentUser.following || [] 
      }));
    }
  };

  const handleMessage = async (senderId) => {
    try {
      const conversation = await createConversation(senderId);
      navigate(`/chat?conversationId=${conversation._id}`);
    } catch {}
  };

  const filtered = notifications.filter(n => {
    if (activeTab === 'Mentions') return n.type === 'mention';
    if (activeTab === 'Follows') return n.type === 'follow';
    return true;
  });

  const handleOpen = async (notif) => {
    if (notif._id && !notif.read) {
      try { await markAsRead(notif._id); } catch {}
    }
    if (notif.post?._id) {
      const commentId = notif.comment?._id;
      navigate(`/post/${notif.post._id}${commentId ? `?commentId=${commentId}` : ''}`);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col pt-14 md:pt-0">

      <div className="sticky top-14 md:top-0 z-30 bg-(--bg-primary)/80 backdrop-blur-md border-b border-(--border-glass) py-4 px-4 sm:px-6 flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-(--accent-primary) hover:text-white transition-colors bg-(--bg-glass) px-3 py-1.5 rounded-full border border-(--border-glass)"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex border-b border-(--border-glass) px-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-4 text-sm font-semibold relative transition-colors group"
          >
            <span className={activeTab === tab ? 'text-(--text-primary)' : 'text-(--text-muted) group-hover:text-(--text-primary)'}>
              {tab}
            </span>
            {activeTab === tab && (
              <motion.div
                layoutId="notifTabIndicator"
                className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-linear-to-r from-(--accent-primary) to-(--accent-secondary) rounded-t-full shadow-(--shadow-glow)"
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden pb-20 sm:pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-(--text-muted)">
            <div className="w-6 h-6 border-2 border-(--accent-primary) border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-(--text-muted)">
            <Bell size={48} className="opacity-20 mb-4" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="h-full flex">
            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-(--border-glass)">
              <AnimatePresence>
                {filtered.map((notif, i) => (
                  <motion.div
                    key={notif._id || notif.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => handleOpen(notif)}
                    className={`flex px-4 sm:px-6 py-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors relative ${
                      !notif.read ? 'bg-[rgba(110,231,247,0.03)]' : ''
                    }`}
                  >
                  {!notif.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-(--accent-primary) to-(--accent-secondary) shadow-[1px_0_10px_rgba(110,231,247,0.5)]" />
                  )}

                  <div className="w-8 flex justify-end mr-3 mt-1">
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1">
                    <Avatar
                      src={notif.sender?.profilePic || notif.user?.profilePic}
                      alt={notif.sender?.name || notif.user?.name || 'User'}
                      size="md"
                      className="mb-2"
                    />
                    <p className="text-[15px] leading-snug">
                      <span className="font-bold">{notif.sender?.name || notif.user?.name}</span>{' '}
                      <span className="text-(--text-muted)">{getNotificationText(notif.type)}</span>
                    </p>
                    <p className="text-xs text-(--text-muted) mt-1">
                      {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ''}
                    </p>

                    {notif.type === 'follow' && (() => {
                      const senderId = notif.sender?._id || notif.user?._id;
                      const didFollowBack = currentUser?.following?.some(
                        id => String(id) === String(senderId)
                      );
                      return (
                        <div className="mt-3 flex items-center gap-2">
                          {didFollowBack ? (
                            <>
                              <Button size="sm" variant="secondary" className="px-4 py-1.5 text-xs opacity-60 cursor-default" disabled>
                                Following
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                className="px-4 py-1.5 text-xs"
                                onClick={(e) => { e.stopPropagation(); handleMessage(senderId); }}
                              >
                                Message
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="px-4 py-1.5 text-xs"
                              onClick={(e) => { e.stopPropagation(); handleFollowBack(senderId); }}
                            >
                              Follow Back
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
