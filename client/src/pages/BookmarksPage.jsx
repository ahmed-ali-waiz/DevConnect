import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, BookmarkX, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PostCard from '../components/post/PostCard';
import Skeleton from '../components/ui/Skeleton';
import { getBookmarks } from '../services/postService';

const BookmarksPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('list');
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBookmarks()
      .then((data) => setBookmarkedPosts(Array.isArray(data) ? data : data.posts || []))
      .catch(() => {
        toast.error('Failed to load bookmarks');
        setBookmarkedPosts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col md:pt-0">
      
      {/* Header */}
      <div className="sticky top-0 md:top-0 z-30 bg-black md:bg-(--bg-primary)/80 backdrop-blur-md border-b border-[#262626] md:border-(--border-glass) py-0 h-14 md:py-4 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="md:hidden text-white hover:opacity-70 transition-opacity">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[17px] md:text-xl font-bold font-display text-white transition-colors">Bookmarks</h1>
            <p className="hidden md:block text-xs text-(--text-muted) mt-0.5">Private to you</p>
          </div>
        </div>
        
        <div className="flex bg-(--bg-glass) p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-(--border-glass) text-white' : 'text-(--text-muted) hover:text-white'}`}
          >
            <List size={18} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-(--border-glass) text-white' : 'text-(--text-muted) hover:text-white'}`}
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 pb-24 sm:p-6 min-h-[50vh]" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} type="card" className="h-40" />
            ))}
          </div>
        ) : (
        <AnimatePresence mode="wait">
          {bookmarkedPosts.length > 0 ? (
            <motion.div 
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}
            >
              {bookmarkedPosts.map((post) => (
                <div key={post._id} className={viewMode === 'grid' ? 'transform scale-95 origin-top' : ''}>
                  <PostCard post={post} />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-full flex flex-col items-center justify-center pt-20 text-(--text-muted) space-y-4"
            >
              <div className="w-24 h-24 rounded-full bg-(--bg-glass) flex items-center justify-center border border-(--border-glass) shadow-inner">
                <BookmarkX size={40} className="text-(--accent-secondary) opacity-80" />
              </div>
              <h3 className="text-2xl font-display font-bold text-white">Save posts for later</h3>
              <p className="text-center max-w-sm">
                Don't let good posts get buried in the feed. Bookmark them to easily find them again in the future.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>

    </div>
  );
};

export default BookmarksPage;
