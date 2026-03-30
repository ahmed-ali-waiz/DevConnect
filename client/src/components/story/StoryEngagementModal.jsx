import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Heart } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const StoryEngagementModal = ({ isOpen, onClose, title, fetchData, storyId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);
  const socket = useSocket();

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  // Real-time: refresh list when new views/likes arrive
  useEffect(() => {
    if (!socket || !isOpen || !storyId) return;
    const handler = (data) => {
      if (data.storyId === storyId) {
        loadUsers(); // Re-fetch the full list
      }
    };
    socket.on('storyViewed', handler);
    socket.on('storyLiked', handler);
    return () => {
      socket.off('storyViewed', handler);
      socket.off('storyLiked', handler);
    };
  }, [socket, isOpen, storyId]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchData();
      setUsers(data.viewers || []);
      setLikesCount(data.likesCount || 0);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
      setLikesCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (username) => {
    onClose();
    navigate(`/profile/${username}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative w-full max-w-md mx-4 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              {likesCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-zinc-400">
                  <Heart size={14} className="fill-red-500 text-red-500" />
                  {likesCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-zinc-400 text-sm">
                  No one has viewed this story yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    onClick={() => handleUserClick(user.username)}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={user.profilePic || '/default-avatar.png'}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium truncate">
                          {user.name}
                        </h3>
                        {user.hasLiked && (
                          <Heart size={14} className="flex-shrink-0 fill-red-500 text-red-500" />
                        )}
                      </div>
                      <p className="text-zinc-400 text-sm truncate">
                        @{user.username}
                      </p>
                      {user.bio && (
                        <p className="text-zinc-500 text-xs truncate mt-0.5">
                          {user.bio}
                        </p>
                      )}
                    </div>

                    {/* View Profile Button */}
                    {user._id !== currentUser?._id && (
                      <button className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors">
                        View
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryEngagementModal;