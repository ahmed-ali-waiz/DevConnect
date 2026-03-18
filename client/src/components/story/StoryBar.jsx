import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useSelector } from 'react-redux';
import Avatar from '../ui/Avatar';
import StoryViewer from './StoryViewer';
import { getStoryFeed, createStory } from '../../services/storyService';

const StoryBar = () => {
  const { user } = useSelector(state => state.auth);
  const [activeStoryIdx, setActiveStoryIdx] = useState(null);
  const [stories, setStories] = useState([]);
  const addStoryInputRef = useRef(null);

  useEffect(() => {
    getStoryFeed()
      .then(data => setStories(data))
      .catch(() => {});
  }, []);

  const handleAddStory = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const newStory = await createStory(file);
      setStories(prev => [newStory, ...prev]);
    } catch {}
    e.target.value = '';
  };

  return (
    <>
      <div className="w-full bg-(--bg-glass) border-b border-(--border-glass) py-4 backdrop-blur-md sticky top-0 md:top-0 z-30">
        <div
          className="flex space-x-4 overflow-x-auto px-4 custom-scrollbar pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Add Story Button */}
          <div
            className="flex flex-col items-center flex-shrink-0 cursor-pointer group space-y-2"
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

          {/* Stories List */}
          {stories.map((story, idx) => {
            const storyUser = story.user || story.author || {};
            const hasSeen = Array.isArray(story.viewers) && user && story.viewers.includes(user._id);
            return (
              <motion.div
                key={story._id || idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer space-y-2"
                onClick={() => setActiveStoryIdx(idx)}
              >
                <div className={`relative w-16 h-16 rounded-full p-0.5 ${!hasSeen ? 'bg-linear-to-tr from-(--accent-primary) to-(--accent-secondary)' : 'bg-(--border-glass)'}`}>
                  <div className="w-full h-full rounded-full border-[3px] border-(--bg-primary) overflow-hidden">
                    <img
                      src={storyUser.profilePic || `https://ui-avatars.com/api/?name=${storyUser.name || 'U'}&background=0D1117&color=A78BFA`}
                      alt={storyUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <span className="text-xs text-(--text-primary) font-medium max-w-[64px] truncate">{storyUser.username}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {activeStoryIdx !== null && stories.length > 0 && (
          <StoryViewer
            stories={stories}
            initialIdx={activeStoryIdx}
            onClose={() => setActiveStoryIdx(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default StoryBar;
