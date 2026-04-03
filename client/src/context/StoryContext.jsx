import { createContext, useContext, useState, useCallback } from 'react';
import { getUserStories } from '../services/storyService';
import toast from 'react-hot-toast';

const StoryContext = createContext(null);

export const StoryProvider = ({ children }) => {
  const [activeGroup, setActiveGroup] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const playStory = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getUserStories(userId);
      setActiveGroup(data);
      setIsOpen(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No active stories found');
    } finally {
      setLoading(false);
    }
  }, []);

  const closeStory = () => {
    setIsOpen(false);
    setActiveGroup(null);
  };

  return (
    <StoryContext.Provider value={{ playStory, closeStory, activeGroup, isOpen, loading }}>
      {children}
    </StoryContext.Provider>
  );
};

export const useStoryViewer = () => {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStoryViewer must be used within a StoryProvider');
  }
  return context;
};
