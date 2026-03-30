import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X as CloseIcon, ChevronLeft, ChevronRight, MoreHorizontal, MessageCircle, Trash2, Heart, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../ui/Avatar';
import { createConversation, sendMessage } from '../../services/chatService';
import { viewStory, deleteStory, likeStory, getStoryViewers, getStoryLikes } from '../../services/storyService';
import StoryEngagementModal from './StoryEngagementModal';
import { useSocket } from '../../context/SocketContext';

const StoryViewer = ({ stories, initialIdx, onClose, onStoryDelete }) => {
  const [currentIdx, setCurrentIdx] = useState(initialIdx);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewersCount, setViewersCount] = useState(0);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // Track if story is paused
  const viewedRef = useRef(new Set());
  const STORY_DURATION = 5000; // 5 seconds

  const currentUser = useSelector((state) => state.auth.user);
  const currentStory = stories[currentIdx];
  const isOwnStory = currentUser && currentStory?.user?._id === currentUser._id;
  const socket = useSocket();

  // Initialize engagement data when story changes
  useEffect(() => {
    if (currentStory) {
      setIsLiked(currentStory.hasLiked || false);
      setLikesCount(currentStory.likesCount || 0);
      setViewersCount(currentStory.viewersCount || 0);
    }
  }, [currentIdx, currentStory]);

  // Real-time: listen for story like updates while viewing
  useEffect(() => {
    if (!socket || !currentStory) return;
    const likeHandler = ({ storyId, liked, likesCount: newCount }) => {
      if (storyId === currentStory._id) {
        setLikesCount(newCount);
      }
    };
    const viewHandler = ({ storyId, viewersCount: newCount }) => {
      if (storyId === currentStory._id) {
        setViewersCount(newCount);
      }
    };
    socket.on('storyLiked', likeHandler);
    socket.on('storyViewed', viewHandler);
    return () => {
      socket.off('storyLiked', likeHandler);
      socket.off('storyViewed', viewHandler);
    };
  }, [socket, currentStory?._id]);

  // Pause story when modals are open
  useEffect(() => {
    if (showViewersModal || showDeleteModal) {
      setIsPaused(true);
    } else {
      setIsPaused(false);
    }
  }, [showViewersModal, showDeleteModal]);

  const handleNext = () => {
    if (currentIdx < stories.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setProgress(0);
    }
  };

  // Reply to story via DM
  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || isSendingReply) return;
    setIsSendingReply(true);
    try {
      const conversation = await createConversation(currentStory.user._id);
      await sendMessage(conversation._id, replyText.trim());
      toast.success('Reply sent');
      setReplyText('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Delete own story
  const handleDeleteStory = async () => {
    try {
      await deleteStory(currentStory._id);
      toast.success('Story deleted');
      if(onStoryDelete) onStoryDelete(currentStory._id);
      // If this was the last story, close viewer; otherwise advance
      if (stories.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete story');
    }
  };

  // Like/Unlike story
  const handleLikeToggle = async () => {
    try {
      const response = await likeStory(currentStory._id);
      setIsLiked(response.liked);
      setLikesCount(response.likesCount);
    } catch (err) {
      toast.error('Failed to like story');
    }
  };

  // Mark story as viewed when displayed
  useEffect(() => {
    if (currentStory && !viewedRef.current.has(currentStory._id)) {
      viewedRef.current.add(currentStory._id);
      viewStory(currentStory._id).catch(() => {});
    }
  }, [currentIdx, currentStory]);

  // Progress timer - pauses when typing
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + (100 / (STORY_DURATION / 100)); // Update every 100ms
        });
      }
    }, 100);

    return () => clearInterval(timer);
  }, [currentIdx, isPaused]);

  // Handle input focus - pause story
  const handleInputFocus = () => {
    setIsPaused(true);
  };

  // Handle input blur - resume story
  const handleInputBlur = () => {
    setIsPaused(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center"
    >
      <div className="relative w-full max-w-sm h-full max-h-[90vh] sm:h-[80vh] sm:rounded-2xl overflow-hidden bg-(--bg-secondary) shadow-2xl flex flex-col">
        
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 p-3 z-20 flex space-x-1">
          {stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all ease-linear"
                style={{ 
                  width: i === currentIdx ? `${progress}%` : i < currentIdx ? '100%' : '0%',
                  transitionDuration: i === currentIdx ? '100ms' : '0ms'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 p-4 z-20 flex justify-between items-center text-white">
          <div className="flex items-center space-x-3">
            <Avatar src={currentStory.user.profilePic} alt={currentStory.user.name} size="sm" />
            <div className="flex flex-col drop-shadow-md shadow-black">
              <span className="font-semibold text-sm">{currentStory.user.username}</span>
              <span className="text-xs text-white/70">{currentStory.time}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            {isOwnStory && (
              <button 
                onClick={() => setShowDeleteModal(true)} 
                className="p-1 hover:bg-red-500/30 rounded-full transition-colors" 
                title="Delete story"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button className="p-1 hover:bg-white/20 rounded-full transition-colors"><MoreHorizontal size={20}/></button>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><CloseIcon size={20}/></button>
          </div>
        </div>

        {/* Media Content */}
        <div className="absolute inset-0 z-10 select-none bg-black flex justify-center items-center">
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentStory.id}
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              src={currentStory.media} 
              className="w-full h-full object-contain"
              alt="Story"
              onDragStart={e => e.preventDefault()}
            />
          </AnimatePresence>
        </div>

        {/* Tap Zones for Desktop/Mobile Navigation */}
        <div className="absolute inset-0 z-15 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
          <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} />
        </div>

        {/* Desktop Navigation Arrows */}
        <button onClick={handlePrev} className="hidden sm:flex absolute left-\[-60px\] top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center text-white transition-all backdrop-blur-md">
          <ChevronLeft size={24} />
        </button>
        <button onClick={handleNext} className="hidden sm:flex absolute right\-[-60px\] top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center text-white transition-all backdrop-blur-md">
          <ChevronRight size={24} />
        </button>

        {/* Footer (Reply & Engagement) */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent">
          {/* Engagement Counts (only for own stories) */}
          {isOwnStory && viewersCount > 0 && (
            <div className="flex items-center gap-4 px-4 py-2 text-white text-sm">
              <button
                onClick={() => setShowViewersModal(true)}
                className="flex items-center gap-1.5 hover:text-blue-400 transition-colors"
              >
                <Eye size={16} />
                <span>{viewersCount} {viewersCount === 1 ? 'view' : 'views'}</span>
                {likesCount > 0 && (
                  <span className="flex items-center gap-1 ml-2">
                    <Heart size={14} className="fill-red-500 text-red-500" />
                    <span className="text-zinc-300">{likesCount}</span>
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Reply & Like Actions */}
          <form onSubmit={handleReply} className="p-4 flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={`Reply to ${currentStory.user.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="w-full bg-white/10 border border-white/20 rounded-full py-2.5 px-4 text-sm text-white placeholder-white/60 focus:outline-none focus:bg-white/20 transition-all backdrop-blur-md"
              />
            </div>
            
            {/* Like Button */}
            {!isOwnStory && (
              <motion.button
                type="button"
                onClick={handleLikeToggle}
                whileTap={{ scale: 0.8 }}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"
              >
                <Heart
                  size={20}
                  className={isLiked ? 'fill-red-500 text-red-500' : ''}
                />
              </motion.button>
            )}

            <button
              type="submit"
              disabled={!replyText.trim() || isSendingReply}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle size={20} />
            </button>
          </form>
        </div>

        {/* Delete Confirmation Overlay */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl p-6 w-full max-w-xs"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-red-500/10 rounded-full">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                </div>

                {/* Title & Message */}
                <h3 className="text-white text-lg font-semibold text-center mb-2">
                  Delete Story?
                </h3>
                <p className="text-zinc-400 text-sm text-center mb-6 leading-relaxed">
                  Do you really want to delete? This story will be permanently deleted and can't be recovered.
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteStory}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Engagement Modal */}
        <StoryEngagementModal
          isOpen={showViewersModal}
          onClose={() => setShowViewersModal(false)}
          title="Story Views"
          fetchData={() => getStoryViewers(currentStory._id)}
          storyId={currentStory._id}
        />
      </div>
    </motion.div>
  );
};

export default StoryViewer;
