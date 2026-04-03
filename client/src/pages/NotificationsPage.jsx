import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, UserPlus, Repeat2, Bell, ArrowLeft } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../components/ui/Avatar';
import { useSocket } from '../context/SocketContext';
import { getNotifications, markAllRead, markAsRead } from '../services/notificationService';
import { setNotifications, setUnreadCount, markAllReadLocal, markReadLocal, setLoading } from '../store/slices/notificationSlice';
import { updateProfileOptimistic } from '../store/slices/authSlice';
import { toggleFollow } from '../services/userService';
import { createConversation } from '../services/chatService';

// Small colored icon badge that floats over avatar (like Instagram)
const TypeBadge = ({ type }) => {
  const cfg = {
    like:         { bg: 'bg-red-500',     icon: <Heart size={10} fill="white" className="text-white" /> },
    comment:      { bg: 'bg-[#0095f6]',   icon: <MessageCircle size={10} className="text-white" /> },
    reply:        { bg: 'bg-[#0095f6]',   icon: <MessageCircle size={10} className="text-white" /> },
    follow:       { bg: 'bg-[#0095f6]',   icon: <UserPlus size={10} className="text-white" /> },
    mention:      { bg: 'bg-[#a855f7]',   icon: <span className="text-white font-bold text-[9px] leading-none">@</span> },
    repost:       { bg: 'bg-green-500',   icon: <Repeat2 size={10} className="text-white" /> },
    comment_like: { bg: 'bg-red-500',     icon: <Heart size={10} fill="white" className="text-white" /> },
    reply_like:   { bg: 'bg-red-500',     icon: <Heart size={10} fill="white" className="text-white" /> },
  };
  const c = cfg[type] || { bg: 'bg-[#555]', icon: <Bell size={10} className="text-white" /> };
  return (
    <div className={`absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] ${c.bg} rounded-full flex items-center justify-center border-[2px] border-black`}>
      {c.icon}
    </div>
  );
};

const getNotificationText = (notif) => {
  const name = notif.sender?.username || notif.user?.username || 'Someone';
  const excerpt = notif.post?.text ? ` "${notif.post.text.slice(0, 40)}${notif.post.text.length > 40 ? '...' : ''}"` : '';
  switch (notif.type) {
    case 'like':         return <><span className="font-semibold text-white">{name}</span> <span className="text-[#a8a8a8]">liked your post.{excerpt}</span></>;
    case 'comment':      return <><span className="font-semibold text-white">{name}</span> <span className="text-[#a8a8a8]">commented:</span> <span className="text-white">{notif.comment?.text?.slice(0, 50) || ''}</span></>;
    case 'reply':        return <><span className="font-semibold text-white">{name}</span> <span className="text-[#a8a8a8]">replied to your comment.</span></>;
    case 'comment_like': return <><span className="font-semibold text-white">{name}</span> <span className="text-[#a8a8a8]">liked your comment.</span></>;
    case 'reply_like':   return <><span className="font-semibold text-white">{name}</span> <span className="text-[#a8a8a8]">liked your reply.</span></>;
    case 'follow':       return <><span className="font-semibold text-white">{name}</span> <span className="text-[#a8a8a8]">started following you.</span></>;
    case 'mention':      return <><span className="font-semibold text-white">{name}</span> <span className="text-[#a8a8a8]">mentioned you in a post.</span></>;
    case 'repost':       return <><span className="font-semibold text-white">{name}</span> <span className="text-[#a8a8a8]">reposted your post.</span></>;
    default:             return <><span className="font-semibold text-white">{name}</span> <span className="text-[#a8a8a8]">interacted with you.</span></>;
  }
};

// Group notifications by relative time bucket
const groupByTime = (notifications) => {
  const now = Date.now();
  const groups = {};
  const order = [];

  const getGroup = (createdAt) => {
    const diff = now - new Date(createdAt).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 1) return 'Just now';
    if (hours < 24) return 'Today';
    if (hours < 48) return 'Yesterday';
    if (hours < 24 * 7) return 'Last 7 days';
    if (hours < 24 * 30) return 'Last 30 days';
    return 'Older';
  };

  notifications.forEach(n => {
    const label = getGroup(n.createdAt);
    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(n);
  });

  return order.map(label => ({ label, items: groups[label] }));
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { notifications, unreadCount, loading } = useSelector(state => state.notifications);
  const currentUser = useSelector(state => state.auth.user);

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
    try { await markAllRead(); } catch {}
  };

  const handleFollowBack = async (senderId, e) => {
    e.stopPropagation();
    const updatedFollowing = currentUser.following
      ? [...currentUser.following, senderId]
      : [senderId];
    dispatch(updateProfileOptimistic({ following: updatedFollowing }));
    try {
      const response = await toggleFollow(senderId);
      if (!response.following) {
        dispatch(updateProfileOptimistic({ following: currentUser.following || [] }));
      }
    } catch {
      dispatch(updateProfileOptimistic({ following: currentUser.following || [] }));
    }
  };

  const handleOpen = async (notif) => {
    if (notif._id && !notif.read) {
      dispatch(markReadLocal(notif._id));
      try { await markAsRead(notif._id); } catch {}
    }
    if (notif.post?._id) {
      const commentId = notif.comment?._id;
      navigate(`/post/${notif.post._id}${commentId ? `?commentId=${commentId}` : ''}`);
    } else if (notif.sender?.username) {
      navigate(`/profile/${notif.sender.username}`);
    }
  };

  const grouped = groupByTime(notifications);

  return (
    <div className="w-full flex-1 flex flex-col bg-black min-h-dvh">

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-30 bg-black border-b border-[#262626]">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="md:hidden text-white hover:opacity-70 transition-opacity">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[17px] font-semibold text-white md:text-xl">Notifications</h1>
          {unreadCount > 0 ? (
            <button
              onClick={handleMarkAllRead}
              className="text-[13px] font-semibold text-[#0095f6] hover:opacity-70 transition-opacity"
            >
              Mark all read
            </button>
          ) : <div className="w-16" />}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          // Skeleton
          <div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-[#262626] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 w-48 bg-[#262626] rounded" />
                  <div className="h-2 w-24 bg-[#262626] rounded" />
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#262626] shrink-0" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-[#363636] flex items-center justify-center">
              <Bell size={28} className="text-[#a8a8a8]" />
            </div>
            <p className="text-white font-semibold text-base">Activity On Your Posts</p>
            <p className="text-[#a8a8a8] text-sm max-w-[220px] leading-relaxed">
              When someone likes or comments on one of your posts, you'll see it here.
            </p>
          </div>
        ) : (
          <div className="pb-28 md:pb-6">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                {/* Group label */}
                <p className="px-4 pt-5 pb-2 text-[15px] font-semibold text-white">{label}</p>

                {/* Items */}
                <AnimatePresence>
                  {items.map((notif, i) => {
                    const senderId = notif.sender?._id || notif.user?._id;
                    const isFollowType = notif.type === 'follow';
                    const didFollowBack = currentUser?.following?.some(
                      id => String(id) === String(senderId)
                    );
                    const postThumb = notif.post?.image || notif.post?.images?.[0];
                    const timeAgo = notif.createdAt
                      ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: false })
                      : '';

                    return (
                      <motion.div
                        key={notif._id || `${notif.type}-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => handleOpen(notif)}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors active:bg-[#1a1a1a] ${
                          !notif.read ? 'bg-[#0a1628]' : 'hover:bg-[#0a0a0a]'
                        }`}
                      >
                        {/* Avatar + badge */}
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full overflow-hidden">
                            <img
                              src={
                                notif.sender?.profilePic ||
                                notif.user?.profilePic ||
                                `https://ui-avatars.com/api/?name=${notif.sender?.name || 'U'}&background=262626&color=fff`
                              }
                              alt={notif.sender?.name || 'User'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <TypeBadge type={notif.type} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] leading-snug line-clamp-2">
                            {getNotificationText(notif)}
                          </p>
                          <p className="text-[12px] text-[#a8a8a8] mt-0.5">{timeAgo}</p>

                          {/* Follow-back button */}
                          {isFollowType && !didFollowBack && (
                            <button
                              onClick={(e) => handleFollowBack(senderId, e)}
                              className="mt-2 px-4 py-1.5 text-[13px] font-semibold bg-[#0095f6] text-white rounded-lg hover:bg-[#1aa1f7] transition-colors active:opacity-80"
                            >
                              Follow
                            </button>
                          )}
                          {isFollowType && didFollowBack && (
                            <button
                              disabled
                              className="mt-2 px-4 py-1.5 text-[13px] font-semibold bg-[#262626] text-white rounded-lg border border-[#363636] opacity-60 cursor-default"
                            >
                              Following
                            </button>
                          )}
                        </div>

                        {/* Post thumbnail (right side like IG) */}
                        {postThumb ? (
                          <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-[#262626]">
                            <img src={postThumb} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          /* Unread dot indicator if no thumbnail */
                          !notif.read && (
                            <div className="w-2 h-2 rounded-full bg-[#0095f6] shrink-0" />
                          )
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
