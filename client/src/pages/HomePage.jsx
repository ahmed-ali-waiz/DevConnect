import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MailWarning, X, Users, UserCheck, ChevronRight } from 'lucide-react';
import StoryBar from '../components/story/StoryBar';
import PostComposer from '../components/post/PostComposer';
import PostCard from '../components/post/PostCard';
import Skeleton from '../components/ui/Skeleton';
import Avatar from '../components/ui/Avatar';
import { getFeed, getExplorePosts, getCodeFeed } from '../services/postService';
import { resendVerification } from '../services/authService';
import { getFollowing } from '../services/userService';
import { setFeed } from '../store/slices/postSlice';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('For You');
  const tabs = ['For You', 'Following', 'Trending', 'Code'];
  const { feed } = useSelector(state => state.posts);
  const { user } = useSelector(state => state.auth);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [resending, setResending] = useState(false);
  const sentinelRef = useRef(null);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchFeed = async (pageNum = 1, currentFeed = [], type) => {
    if (!user) return;
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const data = await getFeed(pageNum, 10, type);
      const posts = data.posts || [];
      dispatch(setFeed(pageNum === 1 ? posts : [...currentFeed, ...posts]));
      setHasMore(data.hasMore ?? false);
      setPage(pageNum);
    } catch {
      if (pageNum === 1) dispatch(setFeed([]));
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchExplore = async (pageNum = 1, currentFeed = []) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const data = await getExplorePosts(pageNum);
      const posts = data.posts || [];
      dispatch(setFeed(pageNum === 1 ? posts : [...currentFeed, ...posts]));
      setHasMore(data.hasMore ?? false);
      setPage(pageNum);
    } catch {
      if (pageNum === 1) dispatch(setFeed([]));
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchCode = async (pageNum = 1, currentFeed = []) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const data = await getCodeFeed(pageNum);
      const posts = data.posts || [];
      dispatch(setFeed(pageNum === 1 ? posts : [...currentFeed, ...posts]));
      setHasMore(data.hasMore ?? false);
      setPage(pageNum);
    } catch {
      if (pageNum === 1) dispatch(setFeed([]));
      toast.error('Failed to load code posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Fetch following users when Following tab is active
  useEffect(() => {
    if (activeTab === 'Following' && user?._id) {
      setLoadingFollowing(true);
      getFollowing(user._id)
        .then(data => setFollowingUsers(data || []))
        .catch(() => setFollowingUsers([]))
        .finally(() => setLoadingFollowing(false));
    }
  }, [activeTab, user?._id]);

  useEffect(() => {
    if (activeTab === 'Trending') {
      fetchExplore(1);
    } else if (activeTab === 'Code') {
      fetchCode(1);
    } else if (user) {
      fetchFeed(1, [], activeTab === 'Following' ? 'following' : undefined);
    }
  }, [activeTab, user?._id]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    if (activeTab === 'Trending') {
      fetchExplore(page + 1, feed);
    } else if (activeTab === 'Code') {
      fetchCode(page + 1, feed);
    } else {
      fetchFeed(page + 1, feed, activeTab === 'Following' ? 'following' : undefined);
    }
  }, [loadingMore, hasMore, loading, activeTab, page, feed]);

  // Intersection Observer — auto-load when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await resendVerification();
      toast.success('Verification email sent! Check your inbox.');
    } catch {
      toast.error('Failed to send verification email');
    } finally {
      setResending(false);
    }
  };

  const displayPosts = feed;

  return (
    <div className="w-full flex-1 flex flex-col pt-\[56px] md:pt-0"> {/* offset for mobile topbar */}
      {/* Feed Layout header - Desktop visible, mobile sticky */}
      <div className="sticky top-14 md:top-0 z-20 bg-(--bg-primary)/80 backdrop-blur-md border-b border-(--border-glass)">
        <div className="hidden md:block px-4 py-4">
          <h2 className="text-xl font-display font-bold">Home</h2>
        </div>
        
        {/* Tab navigation */}
        <div className="flex w-full overflow-x-auto custom-scrollbar border-t border-(--border-glass) md:border-t-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 min-w-\[100px\] text-center py-4 text-sm font-semibold relative text-(--text-muted) hover:bg-(--bg-glass) transition-colors group"
            >
              <span className={activeTab === tab ? 'text-(--text-primary)' : 'group-hover:text-(--text-primary) transition-colors'}>
                {tab}
              </span>
              {activeTab === tab && (
                <motion.div
                  layoutId="feedTabIndicator"
                  className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-linear-to-r from-(--accent-primary) to-(--accent-secondary) rounded-t-full shadow-(--shadow-glow)"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-screen">
        {/* Email verification banner */}
        {user && user.isVerified === false && !dismissedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-3 mb-1 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl px-4 py-3 text-sm"
          >
            <MailWarning size={16} className="shrink-0" />
            <span className="flex-1">
              Please verify your email address to unlock all features.{' '}
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="underline font-semibold hover:text-amber-200 disabled:opacity-60"
              >
                {resending ? 'Sending...' : 'Resend email'}
              </button>
            </span>
            <button onClick={() => setDismissedBanner(true)} className="shrink-0 hover:text-amber-100">
              <X size={14} />
            </button>
          </motion.div>
        )}

        <StoryBar />
        
        <PostComposer />

        {/* Following Users Section */}
        <AnimatePresence>
          {activeTab === 'Following' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mx-4 md:mx-0 mt-3 mb-4">
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-(--accent-primary)" />
                      <h3 className="font-display font-bold text-base">People You Follow</h3>
                      {followingUsers.length > 0 && (
                        <span className="text-xs bg-(--accent-primary)/15 text-(--accent-primary) px-2 py-0.5 rounded-full font-semibold">
                          {followingUsers.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {loadingFollowing ? (
                    <div className="flex gap-3 overflow-hidden">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex-shrink-0 w-[140px] bg-(--bg-glass) rounded-xl p-3 animate-pulse">
                          <div className="w-12 h-12 rounded-full bg-(--border-glass) mx-auto mb-2" />
                          <div className="h-3 w-16 bg-(--border-glass) rounded mx-auto mb-1" />
                          <div className="h-2 w-12 bg-(--border-glass) rounded mx-auto" />
                        </div>
                      ))}
                    </div>
                  ) : followingUsers.length === 0 ? (
                    <div className="text-center py-6">
                      <UserCheck size={32} className="mx-auto mb-2 text-(--text-muted) opacity-50" />
                      <p className="text-sm text-(--text-muted)">You're not following anyone yet</p>
                      <button
                        onClick={() => setActiveTab('Trending')}
                        className="mt-2 text-sm text-(--accent-primary) hover:underline font-semibold"
                      >
                        Discover developers
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                      {followingUsers.map((u, idx) => (
                        <motion.div
                          key={u._id}
                          initial={{ opacity: 0, y: 20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                          onClick={() => navigate(`/profile/${u.username}`)}
                          className="flex-shrink-0 w-[140px] bg-(--bg-glass) hover:bg-[rgba(255,255,255,0.06)] border border-(--border-glass) hover:border-(--accent-primary)/30 rounded-xl p-3 cursor-pointer transition-all duration-300 group hover:shadow-[0_0_20px_rgba(110,231,247,0.08)]"
                        >
                          <div className="flex flex-col items-center text-center">
                            <Avatar src={u.profilePic} alt={u.name} size="lg" className="mb-2" />
                            <p className="font-semibold text-sm truncate w-full group-hover:text-(--accent-primary) transition-colors">
                              {u.name}
                            </p>
                            <p className="text-xs text-(--text-muted) truncate w-full">@{u.username}</p>
                            {u.bio && (
                              <p className="text-xs text-(--text-dim) mt-1 line-clamp-2 leading-relaxed">
                                {u.bio}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-1 text-xs text-(--accent-primary) opacity-0 group-hover:opacity-100 transition-opacity">
                              <span>View Profile</span>
                              <ChevronRight size={12} />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feed Posts */}
        <motion.div 
          className="pb-20 md:pb-8"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {loading ? (
            <div className="space-y-4 px-4 md:px-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-4 md:p-5 mx-4 md:mx-0 space-y-4">
                  <div className="flex space-x-3">
                    <Skeleton type="avatar" />
                    <div className="flex-1 space-y-2">
                      <Skeleton type="text" className="w-1/2" />
                      <Skeleton type="text" className="w-3/4" />
                      <Skeleton type="image" className="h-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="py-16 text-center text-(--text-muted)">
              <p className="text-lg mb-2">{activeTab === 'Code' ? 'No code snippets yet' : 'No posts yet'}</p>
              <p className="text-sm">{activeTab === 'Code' ? 'Be the first to share some code!' : 'Follow some developers or explore trending posts!'}</p>
              <button
                onClick={() => setActiveTab('Trending')}
                className="mt-4 text-(--accent-primary) hover:underline font-semibold"
              >
                Explore Trending
              </button>
            </div>
          ) : (
            <>
              {displayPosts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="py-4 flex justify-center">
                {loadingMore && (
                  <svg className="animate-spin h-5 w-5 text-(--accent-primary)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {!hasMore && displayPosts.length > 0 && (
                  <p className="text-xs text-(--text-dim)">You're all caught up</p>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
