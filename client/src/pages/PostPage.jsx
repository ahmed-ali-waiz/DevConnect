import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PostCard from '../components/post/PostCard';
import Skeleton from '../components/ui/Skeleton';
import { getPost } from '../services/postService';

const PostPage = () => {
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const commentId = searchParams.get('commentId');
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const highlightCommentId = useMemo(() => (commentId ? String(commentId) : null), [commentId]);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    getPost(postId)
      .then(setPost)
      .catch(() => {
        setPost(null);
        toast.error('Post not found');
      })
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <Skeleton type="card" className="h-64 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-8 text-center text-(--text-muted)">
        Post not found
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col pt-14 md:pt-0">
      <div className="p-4 sm:p-6">
        <PostCard post={post} defaultShowComments highlightCommentId={highlightCommentId} />
      </div>
    </div>
  );
};

export default PostPage;

