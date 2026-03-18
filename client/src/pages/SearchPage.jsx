import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Flame, Hash } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Avatar from '../components/ui/Avatar';
import PostCard from '../components/post/PostCard';
import { search as searchApi, getTrendingHashtags } from '../services/searchService';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
};

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState({ users: [], posts: [] });
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef(null);
  const debouncedQuery = useDebounce(query.trim(), 300);

  useEffect(() => {
    getTrendingHashtags().then(setTrendingTags).catch(() => {});
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== query) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults({ users: [], posts: [] });
      return;
    }
    setLoading(true);
    searchApi(debouncedQuery, 'all')
      .then(setResults)
      .catch(() => setResults({ users: [], posts: [] }))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useGSAP(() => {
    if (!searchInputRef.current) return;
    gsap.from(searchInputRef.current, {
      scaleX: 0.95,
      opacity: 0,
      duration: 0.5,
      ease: 'back.out(1.5)'
    });
  }, []);

  const clearSearch = () => setQuery('');
  const hasResults = (results.users?.length > 0) || (results.posts?.length > 0);

  return (
    <div className="w-full flex-1 flex flex-col pt-14 md:pt-0">
      
      {/* Sticky Header with Search */}
      <div className="sticky top-14 md:top-0 z-30 bg-(--bg-primary)/80 backdrop-blur-md border-b border-(--border-glass) py-4 px-4 sm:px-6">
        <div ref={searchInputRef} className="relative group max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-(--text-muted) group-focus-within:text-(--accent-primary) transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search posts, tags, or developers..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-(--bg-glass) border border-(--border-glass) rounded-full py-3.5 pl-12 pr-12 text-sm sm:text-base focus:outline-none focus:border-(--accent-primary) focus:bg-[rgba(255,255,255,0.06)] focus:shadow-[0_0_0_1px_rgba(110,231,247,0.3)] transition-all placeholder-(--text-muted) shadow-inner"
            autoFocus
          />
          <AnimatePresence>
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                onClick={clearSearch}
                className="absolute inset-y-0 right-4 flex items-center text-(--text-muted) hover:text-white transition-colors"
                type="button"
              >
                <div className="w-5 h-5 rounded-full bg-(--border-glass) flex items-center justify-center text-[10px] font-bold">X</div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">
        {!query || query.length < 2 ? (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="glass-card p-6 overflow-hidden relative">
              <div className="absolute right-0 top-0 w-32 h-32 bg-(--accent-primary) rounded-full mix-blend-screen filter blur-[80px] opacity-20 pointer-events-none" />
              <h2 className="text-xl font-display font-bold flex items-center mb-6">
                <Flame className="text-(--accent-orange) mr-2" /> 
                Trending Hashtags
              </h2>
              <div className="space-y-4">
                {trendingTags.length > 0 ? (
                  trendingTags.map((item, i) => (
                    <Link key={i} to={`/search?q=%23${item.tag}`}>
                      <div className="flex justify-between items-center group p-2 -mx-2 rounded-xl hover:bg-(--bg-glass) transition-colors">
                        <div className="flex items-center gap-2">
                          <Hash size={18} className="text-(--accent-primary)" />
                          <p className="font-semibold text-(--text-primary) group-hover:text-(--accent-primary) transition-colors">#{item.tag}</p>
                        </div>
                        <p className="text-sm text-(--text-muted)">{item.count} posts</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-(--text-muted) text-sm">No trending tags yet</p>
                )}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-center pt-20 text-(--text-muted)">
            <Search size={48} className="opacity-20 mb-4 animate-pulse" />
            <p className="text-lg">Searching...</p>
          </div>
        ) : hasResults ? (
          <div className="max-w-2xl mx-auto space-y-8">
            {results.users?.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4">People</h3>
                <div className="space-y-2">
                  {results.users.map((u) => (
                    <Link key={u._id} to={`/profile/${u.username}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-(--bg-glass) transition-colors">
                      <Avatar src={u.profilePic} alt={u.name} size="md" />
                      <div>
                        <p className="font-semibold text-(--text-primary)">{u.name}</p>
                        <p className="text-sm text-(--text-muted)">@{u.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {results.posts?.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4">Posts</h3>
                <div className="space-y-4">
                  {results.posts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-center pt-20 text-(--text-muted)">
            <Search size={48} className="opacity-20 mb-4" />
            <p className="text-lg">No results for "{query}"</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default SearchPage;
