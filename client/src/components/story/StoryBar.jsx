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
      <div className="w-full bg-(--bg-primary) border-b border-(--border-glass) py-4 relative z-10">
        <div
          className="flex space-x-4 overflow-x-auto px-4 custom-scrollbar pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Add Story Button */}
          <div
            className="flex flex-col items-center shrink-0 cursor-pointer group space-y-2"
            onClick={() => addStoryInputRef.current?.click()}
          >
            <div className="relative w-16 h-16 rounded-full border-2 border-(--border-glass) p-0.5 group-hover:border-(--text-muted) transition-colors">
              <Avatar src={user?.profilePic} alt={user?.name || 'You'} size="lg" className="opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-(--accent-primary) rounded-full border-2 border-(--bg-primary) flex items-center justify-center shadow-(--shadow-glow)">
                <Plus size={12} className="text-[#050810] font-bold" />
              </div>
            </div>
            <span className="text-xs text-(--text-muted) font-medium">Add Story</span>
            <input ref={addStoryInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddStory} />
          </div>

          {/* Stories List - One per user */}
          {storyGroups.map((group, groupIdx) => {
            const storyUser = group.user;
            const firstStory = group.stories[0];
            const hasSeen = group.hasSeen;
            return (
              <motion.div
                key={storyUser._id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center shrink-0 cursor-pointer space-y-2"
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
                <div className={`relative w-16 h-16 rounded-full p-0.5 ${!hasSeen ? 'bg-linear-to-tr from-(--accent-primary) to-(--accent-secondary)' : 'bg-(--border-glass)'}`}>
                  <div className="w-full h-full rounded-full border-[3px] border-(--bg-primary) overflow-hidden">
                    <img
                      src={storyUser.profilePic || `https://ui-avatars.com/api/?name=${storyUser.name || 'U'}&background=0D1117&color=A78BFA`}
                      alt={storyUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Story count indicator */}
                  {group.stories.length > 1 && (
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-zinc-900 border-2 border-(--bg-primary) rounded-full flex items-center justify-center">
                      <span className="text-[10px] text-white font-semibold">{group.stories.length}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-(--text-primary) font-medium max-w-16 truncate">{storyUser.username}</span>
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
