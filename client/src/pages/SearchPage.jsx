import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Heart, MessageCircle, Play, Image as ImageIcon, Loader2, Bookmark } from 'lucide-react';
import { search as searchApi } from '../services/searchService';
import { getExplorePosts } from '../services/postService';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
};

// Format large numbers like Instagram (1.2K, 3.4M)
const formatCount = (n) => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

// ── Explore Grid Tile ────────────────────────────────────────────
const ExploreTile = ({ post, size = 'normal' }) => {
  const [hovered, setHovered] = useState(false);
  const thumb = post.images?.[0] || post.image || null;
  const hasVideo = !!post.video;
  const hasMultiple = (post.images?.length || 0) > 1;
  const likeCount = post.likes?.length ?? post.likesCount ?? 0;
  const commentCount = post.commentCount ?? post.comments?.length ?? 0;

  return (
    <Link
      to={`/post/${post._id}`}
      className={`relative block overflow-hidden bg-[#1a1a1a] ${size === 'large' ? 'row-span-2 col-span-2' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ aspectRatio: size === 'large' ? '1' : '1' }}
    >
      {/* Thumbnail */}
      {thumb ? (
        <img
          src={thumb}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : hasVideo ? (
        <video src={post.video} className="w-full h-full object-cover" muted preload="metadata" />
      ) : (
        // Text-only post fallback
        <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-[#1a1a1a] to-[#262626]">
          <p className="text-[11px] text-[#a8a8a8] line-clamp-4 text-center leading-relaxed">
            {post.text || 'No preview'}
          </p>
        </div>
      )}

      {/* Type indicators (top-right) */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {hasMultiple && (
          <div className="bg-black/50 rounded p-0.5">
            <ImageIcon size={14} className="text-white" />
          </div>
        )}
        {hasVideo && (
          <div className="bg-black/50 rounded p-0.5">
            <Play size={14} className="text-white fill-white" />
          </div>
        )}
      </div>

      {/* Hover overlay with stats */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center gap-6"
          >
            <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
              <Heart size={18} className="fill-white" />
              {formatCount(likeCount)}
            </div>
            <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
              <MessageCircle size={18} className="fill-white" />
              {formatCount(commentCount)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Link>
  );
};

// ── Search Result - User Row ─────────────────────────────────────
const UserRow = ({ user }) => (
  <Link
    to={`/profile/${user.username}`}
    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1a1a1a] active:bg-[#262626] transition-colors"
  >
    <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-[#363636]">
      <img
        src={user.profilePic || `https://ui-avatars.com/api/?name=${user.name || 'U'}&background=262626&color=fff`}
        alt={user.name}
        className="w-full h-full object-cover"
      />
    </div>
    <div className="min-w-0">
      <p className="text-[14px] font-semibold text-white truncate">{user.username}</p>
      <p className="text-[13px] text-[#a8a8a8] truncate">{user.name}</p>
    </div>
  </Link>
);

// ── Main SearchPage ──────────────────────────────────────────────
const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState({ users: [], posts: [] });
  const [explorePosts, setExplorePosts] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [explorePage, setExplorePage] = useState(1);
  const [exploreHasMore, setExploreHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const inputRef = useRef(null);
  const observerRef = useRef(null);
  const debouncedQuery = useDebounce(query.trim(), 300);

  // Sync query with URL params
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== query) setQuery(q);
  }, [searchParams]);

  // Fetch explore posts (most liked)
  const fetchExplore = useCallback(async (page = 1) => {
    if (page === 1) setExploreLoading(true);
    else setLoadingMore(true);
    try {
      const data = await getExplorePosts(page, 21);
      if (page === 1) {
        setExplorePosts(data.posts);
      } else {
        setExplorePosts(prev => [...prev, ...data.posts]);
      }
      setExploreHasMore(data.hasMore);
      setExplorePage(page);
    } catch {
      // silent
    } finally {
      setExploreLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchExplore(1);
  }, [fetchExplore]);

  // Search when query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults({ users: [], posts: [] });
      return;
    }
    setSearchLoading(true);
    searchApi(debouncedQuery, 'all')
      .then(setResults)
      .catch(() => setResults({ users: [], posts: [] }))
      .finally(() => setSearchLoading(false));
  }, [debouncedQuery]);

  // Infinite scroll observer
  const lastTileRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && exploreHasMore && !debouncedQuery) {
          fetchExplore(explorePage + 1);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loadingMore, exploreHasMore, explorePage, debouncedQuery, fetchExplore]
  );

  const isSearching = debouncedQuery.length >= 2;
  const hasSearchResults = (results.users?.length > 0) || (results.posts?.length > 0);

  // Build the grid pattern: every 3rd group has a "large" tile
  // Pattern: [small, small, small] [small, small, small] [large, small, small, small] repeat
  const buildGrid = (posts) => {
    const tiles = [];
    let idx = 0;
    let groupIndex = 0;

    while (idx < posts.length) {
      if (groupIndex % 3 === 2 && idx + 4 < posts.length) {
        // Large tile group: 1 large (2x2) + 2 small stacked
        tiles.push({ post: posts[idx], size: 'large', key: posts[idx]._id });
        idx++;
        tiles.push({ post: posts[idx], size: 'normal', key: posts[idx]._id });
        idx++;
        tiles.push({ post: posts[idx], size: 'normal', key: posts[idx]._id });
        idx++;
      } else {
        // Normal row of 3
        for (let j = 0; j < 3 && idx < posts.length; j++) {
          tiles.push({ post: posts[idx], size: 'normal', key: posts[idx]._id });
          idx++;
        }
      }
      groupIndex++;
    }
    return tiles;
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-black min-h-dvh">

      {/* ── SEARCH BAR ── */}
      <div className="sticky top-0 z-30 bg-black px-4 pt-3 pb-2 flex items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={16} className="text-[#a8a8a8]" />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            className="w-full bg-[#262626] rounded-xl py-2.5 pl-10 pr-10 text-[14px] text-white placeholder-[#a8a8a8] outline-none border border-transparent focus:border-[#363636] transition-colors"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute inset-y-0 right-3 flex items-center"
            >
              <div className="w-[18px] h-[18px] rounded-full bg-[#a8a8a8] flex items-center justify-center">
                <X size={12} className="text-black" strokeWidth={3} />
              </div>
            </button>
          )}
        </div>
        <button onClick={() => navigate('/bookmarks')} className="text-white hover:opacity-70 transition-opacity p-1">
          <Bookmark size={24} />
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 pb-20 md:pb-4">

        {/* Search results mode */}
        {isSearching ? (
          searchLoading ? (
            <div className="flex justify-center pt-16">
              <Loader2 size={24} className="animate-spin text-[#a8a8a8]" />
            </div>
          ) : hasSearchResults ? (
            <div>
              {/* Users */}
              {results.users?.length > 0 && (
                <div>
                  {results.users.map((u) => (
                    <UserRow key={u._id} user={u} />
                  ))}
                </div>
              )}

              {/* Posts as grid */}
              {results.posts?.length > 0 && (
                <div className="mt-2">
                  <p className="px-4 py-2 text-[14px] font-semibold text-white">Posts</p>
                  <div className="grid grid-cols-3 gap-0.5">
                    {results.posts.map((post) => (
                      <ExploreTile key={post._id} post={post} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-20 text-center px-8">
              <Search size={44} className="text-[#363636] mb-4" />
              <p className="text-[14px] text-[#a8a8a8]">No results found for "{query}"</p>
            </div>
          )
        ) : (
          /* ── Explore Grid (default view) ── */
          exploreLoading ? (
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-[#1a1a1a] animate-pulse" />
              ))}
            </div>
          ) : explorePosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center px-8">
              <Search size={44} className="text-[#363636] mb-4" />
              <p className="text-[14px] text-[#a8a8a8]">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-0.5">
                {explorePosts.map((post, i) => (
                  <div
                    key={post._id}
                    ref={i === explorePosts.length - 1 ? lastTileRef : null}
                  >
                    <ExploreTile post={post} />
                  </div>
                ))}
              </div>
              {loadingMore && (
                <div className="flex justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-[#a8a8a8]" />
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
};

export default SearchPage;
