import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useSelector } from 'react-redux';
import Avatar from '../ui/Avatar';
import StoryViewer from './StoryViewer';
import { getStoryFeed, createStory } from '../../services/storyService';
import { useSocket } from '../../context/SocketContext';

const StoryBar = () => {
  const { user } = useSelector(state => state.auth);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [storyGroups, setStoryGroups] = useState([]);
  const addStoryInputRef = useRef(null);
  const socket = useSocket();

  useEffect(() => {
    getStoryFeed()
      .then(data => {
        // Keep stories grouped by user as returned from backend
        setStoryGroups(data);
      })
      .catch(() => {});
  }, []);

  // Real-time: listen for new stories from friends
  useEffect(() => {
    if (!socket) return;
    const newStoryHandler = ({ storyGroup, story }) => {
      setStoryGroups(prev => {
        const userId = story.user._id;
        const existingIdx = prev.findIndex(g => g.user._id === userId);
        if (existingIdx > -1) {
          // Add story to existing group (immutable update)
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            stories: [story, ...updated[existingIdx].stories],
            hasSeen: false,
          };
          // Move to front (unseen)
          const [moved] = updated.splice(existingIdx, 1);
          return [moved, ...updated];
        }
        // New group — add at the front
        return [storyGroup, ...prev];
      });
    };

    // Keep storyGroups data in sync when views/likes happen
    const likeHandler = ({ storyId, liked, likesCount }) => {
      setStoryGroups(prev =>
        prev.map(group => ({
          ...group,
          stories: group.stories.map(s =>
            s._id === storyId ? { ...s, likesCount, hasLiked: liked } : s
          ),
        }))
      );
    };

    const viewHandler = ({ storyId, viewersCount }) => {
      setStoryGroups(prev =>
        prev.map(group => ({
          ...group,
          stories: group.stories.map(s =>
            s._id === storyId ? { ...s, viewersCount } : s
          ),
        }))
      );
    };

    socket.on('newStory', newStoryHandler);
    socket.on('storyLiked', likeHandler);
    socket.on('storyViewed', viewHandler);
    return () => {
      socket.off('newStory', newStoryHandler);
      socket.off('storyLiked', likeHandler);
      socket.off('storyViewed', viewHandler);
    };
  }, [socket]);

  const handleAddStory = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const newStory = await createStory(file);
      // Add new story to current user's group or create new group
      setStoryGroups(prev => {
        const userGroupIdx = prev.findIndex(g => g.user._id === user._id);
        if (userGroupIdx > -1) {
          // Add to existing group (immutable update)
          const updated = [...prev];
          updated[userGroupIdx] = {
            ...updated[userGroupIdx],
            stories: [newStory, ...updated[userGroupIdx].stories],
          };
          return updated;
        } else {
          // Create new group for current user
          return [{ user, stories: [newStory], hasSeen: false }, ...prev];
        }
      });
    } catch {}
    e.target.value = '';
  };

  const handleStoryDelete = (storyId) => {
    setStoryGroups(prev => 
      prev.map(group => ({
        ...group,
        stories: group.stories.filter(s => s._id !== storyId)
      })).filter(group => group.stories.length > 0) // Remove empty groups
    );
  };

  return (
    <>
      <div className="w-full bg-[#000000] border-b border-[#262626] py-3 relative z-10">
        <div
          className="flex space-x-4 overflow-x-auto px-4 scrollbar-none pb-1 scroll-touch snap-x snap-mandatory"
          style={{ touchAction: 'pan-x' }}
        >
          {/* Add Story Button */}
          <div
            className="flex flex-col items-center shrink-0 cursor-pointer group space-y-1.5"
            onClick={() => addStoryInputRef.current?.click()}
          >
            <div className="relative w-16 h-16 rounded-full p-[2px]">
              <Avatar src={user?.profilePic} alt={user?.name || 'You'} size="lg" className="w-full h-full" />
              <div className="absolute bottom-0 right-0 w-[22px] h-[22px] bg-[#0095f6] rounded-full border-[3px] border-black flex items-center justify-center">
                <Plus size={14} className="text-white font-bold" strokeWidth={3} />
              </div>
            </div>
            <span className="text-[11px] text-[#f5f5f5] font-medium tracking-wide">Your story</span>
            <input ref={addStoryInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddStory} />
          </div>

          {/* Stories List - One per user */}
          {storyGroups.map((group, groupIdx) => {
            const storyUser = group.user;
            const hasSeen = group.hasSeen;
            return (
              <motion.div
                key={storyUser._id}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center shrink-0 cursor-pointer space-y-1.5"
                onClick={() => {
                  setActiveStoryGroup(groupIdx);
                  // Immediately mark as seen — remove the gradient border
                  setStoryGroups(prev =>
                    prev.map((g, i) =>
                      i === groupIdx ? { ...g, hasSeen: true } : g
                    )
                  );
                }}
              >
                <div className={`relative w-16 h-16 rounded-full p-[2px] ${!hasSeen ? 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]' : 'bg-[#262626]'}`}>
                  <div className="w-full h-full rounded-full border-[2px] border-black overflow-hidden object-cover bg-black">
                    <img
                      src={storyUser.profilePic || `https://ui-avatars.com/api/?name=${storyUser.name || 'U'}&background=0D1117&color=A78BFA`}
                      alt={storyUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Story count indicator */}
                  {group.stories.length > 1 && (
                    <div className="absolute top-0 right-0 w-4 h-4 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-black/20">
                      <span className="text-[9px] text-white font-bold">{group.stories.length}</span>
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-[#f5f5f5] font-medium max-w-[68px] truncate tracking-wide">{storyUser.username}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {activeStoryGroup !== null && storyGroups.length > 0 && (
          <StoryViewer
            stories={storyGroups[activeStoryGroup].stories}
            initialIdx={0}
            onClose={() => setActiveStoryGroup(null)}
            onStoryDelete={handleStoryDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default StoryBar;
