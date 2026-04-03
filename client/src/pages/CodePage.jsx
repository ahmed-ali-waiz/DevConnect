import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Code2, ArrowLeft, Loader2, Plus } from 'lucide-react';
import PostCard from '../components/post/PostCard';
import { getCodeFeed } from '../services/postService';

const CodePage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);

  const fetchCode = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      
      const data = await getCodeFeed(pageNum);
      const newPosts = data.posts || [];
      
      setPosts(prev => (pageNum === 1 ? newPosts : [...prev, ...newPosts]));
      setHasMore(data.hasMore ?? false);
      setPage(pageNum);
    } catch {
      toast.error('Failed to load code snippets');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchCode(1);
  }, [fetchCode]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    fetchCode(page + 1);
  }, [loadingMore, hasMore, loading, page, fetchCode]);

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

  return (
    <div className="w-full flex-1 flex flex-col bg-black min-h-dvh">
      {/* ── HEADER ── */}
      <div className="sticky top-0 z-30 bg-black border-b border-[#262626] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate(-1)} className="text-white hover:opacity-70 transition-opacity">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2">
            <Code2 size={20} className="text-[#0095f6]" />
            <h1 className="text-[17px] font-bold text-white">Code Explorer</h1>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="text-white hover:opacity-70 transition-opacity"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-6">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-black border-b border-[#262626] animate-pulse">
                <div className="flex items-center gap-2.5 px-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#262626]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-28 bg-[#262626] rounded" />
                    <div className="h-2 w-16 bg-[#262626] rounded" />
                  </div>
                </div>
                <div className="w-full aspect-video bg-[#1a1a1a]" />
                <div className="px-3 py-4 space-y-2">
                  <div className="h-2.5 w-full bg-[#262626] rounded" />
                  <div className="h-2.5 w-3/4 bg-[#262626] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <div className="w-20 h-20 rounded-full border-2 border-[#363636] flex items-center justify-center mb-6">
              <Code2 size={40} className="text-[#a8a8a8]" />
            </div>
            <p className="text-white font-bold text-lg mb-2">No code snippets available</p>
            <p className="text-[#a8a8a8] text-sm max-w-[240px]">
              Be the first to share a code snippet with the DevConnect community!
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
            
            {/* Sentinel */}
            <div ref={sentinelRef} className="py-8 flex justify-center">
              {loadingMore ? (
                <Loader2 size={24} className="animate-spin text-[#0095f6]" />
              ) : hasMore ? null : (
                <p className="text-[#a8a8a8] text-xs">You've reached the end of the code feed</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodePage;
