import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PostCard from '../components/post/PostCard';
import Skeleton from '../components/ui/Skeleton';
import { getPost } from '../services/postService';
import { markAsRead } from '../services/notificationService';
import { markReadLocal } from '../store/slices/notificationSlice';

const PostPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const commentId = searchParams.get('commentId');
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { notifications } = useSelector(state => state.notifications);

  const highlightCommentId = useMemo(() => (commentId ? String(commentId) : null), [commentId]);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    // Fetch the post
    getPost(postId)
      .then(setPost)
      .catch(() => {
        setPost(null);
        toast.error('Post not found');
      })
      .finally(() => setLoading(false));

    // Handle notification marking as read if navigated here from notification
    const relevantNotif = notifications.find(n => n.post?._id === postId && !n.read);
    if (relevantNotif) {
      dispatch(markReadLocal(relevantNotif._id));
      markAsRead(relevantNotif._id).catch(() => {});
    }
  }, [postId, notifications, dispatch]);

  if (loading) {
    return (
      <div className="w-full flex-1 bg-black min-h-dvh">
        <div className="sticky top-0 z-30 bg-black border-b border-[#262626] h-14 flex items-center px-4">
          <ArrowLeft size={24} className="text-white opacity-50" />
          <span className="ml-8 font-semibold text-white">Post</span>
        </div>
        <div className="animate-pulse">
           <div className="flex items-center gap-3 px-3 py-3">
             <div className="w-9 h-9 rounded-full bg-[#262626]" />
             <div className="h-3 w-32 bg-[#262626] rounded" />
           </div>
           <div className="w-full aspect-square bg-[#1a1a1a]" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-(--text-muted) bg-black min-h-dvh">
        <p className="text-lg mb-4">Post not found</p>
        <button onClick={() => navigate(-1)} className="text-(--accent-primary) font-semibold hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col bg-black md:bg-transparent min-h-dvh">
      {/* Instagram Header (Mobile Only) */}
      <div className="md:hidden sticky top-0 z-30 bg-black border-b border-[#262626] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-8">
          <button onClick={() => navigate(-1)} className="text-white hover:opacity-70 transition-opacity">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-bold text-white">Post</h1>
        </div>
        <div className="w-6" /> {/* Placeholder for balance */}
      </div>

      <div className="flex-1 flex flex-col md:py-6 max-w-2xl mx-auto w-full">
        <PostCard post={post} defaultShowComments highlightCommentId={highlightCommentId} />
        
        {/* Fill remaining space to keep bottom nav correctly positioned on mobile */}
        <div className="flex-1 pb-32 md:pb-0" />
      </div>
    </div>
  );
};

export default PostPage;

