import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X as CloseIcon, ChevronLeft, ChevronRight, MoreHorizontal, MessageCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../ui/Avatar';
import { createConversation, sendMessage } from '../../services/chatService';
import { viewStory, deleteStory } from '../../services/storyService';

const StoryViewer = ({ stories, initialIdx, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(initialIdx);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const viewedRef = useRef(new Set());
  const STORY_DURATION = 5000; // 5 seconds

  const currentUser = useSelector((state) => state.auth.user);
  const currentStory = stories[currentIdx];
  const isOwnStory = currentUser && currentStory?.user?._id === currentUser._id;

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

  // Mark story as viewed when displayed
  useEffect(() => {
    if (currentStory && !viewedRef.current.has(currentStory._id)) {
      viewedRef.current.add(currentStory._id);
      viewStory(currentStory._id).catch(() => {});
    }
  }, [currentIdx, currentStory]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (100 / (STORY_DURATION / 100)); // Update every 100ms
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentIdx]);

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
              <button onClick={handleDeleteStory} className="p-1 hover:bg-red-500/30 rounded-full transition-colors" title="Delete story">
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
        <button onClick={handlePrev} className="hidden sm:flex absolute left-[-60px] top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center text-white transition-all backdrop-blur-md">
          <ChevronLeft size={24} />
        </button>
        <button onClick={handleNext} className="hidden sm:flex absolute right-[-60px] top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center text-white transition-all backdrop-blur-md">
          <ChevronRight size={24} />
        </button>

        {/* Footer (Reply) */}
        <form onSubmit={handleReply} className="absolute bottom-0 left-0 right-0 p-4 z-20 bg-linear-to-t from-black/80 to-transparent flex items-center space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={`Reply to ${currentStory.user.username}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-full py-2.5 px-4 text-sm text-white placeholder-white/60 focus:outline-none focus:bg-white/20 transition-all backdrop-blur-md"
            />
          </div>
          <button type="submit" disabled={!replyText.trim() || isSendingReply} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <MessageCircle size={20} />
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default StoryViewer;
