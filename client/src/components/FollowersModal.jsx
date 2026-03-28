import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import Modal from './ui/Modal';
import Avatar from './ui/Avatar';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';

import { getFollowers, getFollowing, toggleFollow } from '../services/userService';

const tabContentVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  exit: (direction) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
    transition: { duration: 0.15 },
  }),
};

const UserRow = ({ user, isSelf, isFollowed, onToggleFollow, onNavigate, loadingId }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-3 p-3 rounded-xl hover:bg-(--bg-glass) transition-colors cursor-pointer group"
    onClick={() => onNavigate(user.username)}
  >
    <Avatar
      src={user.profilePic}
      alt={user.name || user.username}
      size="md"
    />

    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-(--text-primary) truncate group-hover:text-(--accent-primary) transition-colors">
        {user.name}
      </p>
      <p className="text-xs text-(--text-muted) truncate">
        @{user.username}
      </p>
      {user.bio && (
        <p className="text-xs text-(--text-secondary) mt-0.5 line-clamp-1">
          {user.bio}
        </p>
      )}
    </div>

    {!isSelf && (
      <Button
        variant={isFollowed ? 'secondary' : 'primary'}
        size="sm"
        isLoading={loadingId === user._id}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFollow(user._id);
        }}
      >
        {isFollowed ? 'Following' : 'Follow'}
      </Button>
    )}
  </motion.div>
);

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3">
        <Skeleton type="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton type="text" className="w-1/3" />
          <Skeleton type="text" className="w-1/4 h-3" />
        </div>
        <Skeleton type="button" className="w-20" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ tab }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 rounded-full bg-(--bg-glass) flex items-center justify-center mb-4">
      <svg
        className="w-8 h-8 text-(--text-muted)"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    </div>
    <p className="text-(--text-secondary) text-sm font-medium">
      {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
    </p>
    <p className="text-(--text-muted) text-xs mt-1">
      {tab === 'followers'
        ? 'When people follow this account, they\'ll show up here.'
        : 'When this account follows people, they\'ll show up here.'}
    </p>
  </div>
);

const FollowersModal = ({ isOpen, onClose, userId, initialTab = 'followers' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followLoadingId, setFollowLoadingId] = useState(null);
  const [direction, setDirection] = useState(0);

  const { user: currentUser } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Reset tab when initialTab prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Fetch data when modal opens or tab changes
  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'followers') {
          const data = await getFollowers(userId);
          setFollowers(data);
        } else {
          const data = await getFollowing(userId);
          setFollowing(data);
        }
      } catch (err) {
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, userId, activeTab]);

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setDirection(tab === 'following' ? 1 : -1);
    setActiveTab(tab);
  };

  const handleToggleFollow = async (targetUserId) => {
    setFollowLoadingId(targetUserId);
    
    // Determine current follow state
    const isCurrentlyFollowed = currentUser.following?.includes(targetUserId);
    
    // Optimistic update - update UI immediately
    const updateList = (list) =>
      list.map((u) => {
        if (u._id === targetUserId) {
          return { ...u, _followed: !isCurrentlyFollowed };
        }
        return u;
      });

    setFollowers((prev) => updateList(prev));
    setFollowing((prev) => updateList(prev));
    
    try {
      const response = await toggleFollow(targetUserId);
      
      // Confirm with backend response
      const finalUpdateList = (list) =>
        list.map((u) => {
          if (u._id === targetUserId) {
            return { ...u, _followed: response.following };
          }
          return u;
        });

      setFollowers((prev) => finalUpdateList(prev));
      setFollowing((prev) => finalUpdateList(prev));
    } catch (err) {
      // Revert optimistic update on error
      const revertList = (list) =>
        list.map((u) => {
          if (u._id === targetUserId) {
            return { ...u, _followed: isCurrentlyFollowed };
          }
          return u;
        });

      setFollowers((prev) => revertList(prev));
      setFollowing((prev) => revertList(prev));
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoadingId(null);
    }
  };

  const handleNavigate = (username) => {
    onClose();
    navigate(`/profile/${username}`);
  };

  const isFollowed = (user) => {
    if (user._followed !== undefined) return user._followed;
    return currentUser?.following?.includes(user._id);
  };

  const users = activeTab === 'followers' ? followers : following;

  const tabs = [
    { key: 'followers', label: 'Followers' },
    { key: 'following', label: 'Following' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connections" maxWidth="max-w-md">
      {/* Tabs */}
      <div className="flex border-b border-(--border-glass) -mx-5 -mt-5 mb-4 px-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`relative flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-(--accent-primary)'
                : 'text-(--text-muted) hover:text-(--text-secondary)'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="followers-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--accent-primary)"
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={tabContentVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {loading ? (
              <LoadingSkeleton />
            ) : users.length === 0 ? (
              <EmptyState tab={activeTab} />
            ) : (
              <div className="space-y-1">
                {users.map((user) => (
                  <UserRow
                    key={user._id}
                    user={user}
                    isSelf={currentUser?._id === user._id}
                    isFollowed={isFollowed(user)}
                    onToggleFollow={handleToggleFollow}
                    onNavigate={handleNavigate}
                    loadingId={followLoadingId}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  );
};

export default FollowersModal;
