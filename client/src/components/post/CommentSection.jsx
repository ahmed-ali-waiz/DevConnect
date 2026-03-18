import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart,
  Reply,
  Trash2,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import EmojiPickerButton from '../ui/EmojiPickerButton';
import {
  getComments,
  addComment,
  deleteComment,
  likeComment,
  editComment,
} from '../../services/commentService';

// Single comment row (used for top-level and replies)
const CommentItem = ({ comment, onReply, onDelete, onLike, onEdit, currentUserId, isReply = false, highlightCommentId = null }) => {
  const isLikedByMe = Array.isArray(comment.likes) && comment.likes.some((id) => String(id) === String(currentUserId));
  const [liked, setLiked] = useState(isLikedByMe);
  const [likeCount, setLikeCount] = useState(comment.likes?.length ?? 0);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [editSaving, setEditSaving] = useState(false);

  const handleLike = async () => {
    if (!currentUserId) return;
    try {
      const res = await onLike(comment._id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      toast.error('Failed to like comment');
    }
  };

  const handleEditSave = async () => {
    if (!editText.trim() || editText.trim() === comment.text) { setEditing(false); return; }
    setEditSaving(true);
    try {
      await onEdit(comment._id, editText.trim());
      setEditing(false);
    } catch {
      toast.error('Failed to edit comment');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex gap-2.5 ${isReply ? 'ml-10 mt-2' : 'mt-3'}`}
      id={`comment-${comment._id}`}
    >
      <Link to={`/profile/${comment.author?.username}`} className="flex-shrink-0">
        <Avatar src={comment.author?.profilePic} alt={comment.author?.name} size={isReply ? 'xs' : 'sm'} />
      </Link>

      <div className="flex-1 min-w-0">
        {/* Comment bubble */}
        <div className="bg-(--bg-glass) rounded-2xl rounded-tl-sm px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/profile/${comment.author?.username}`}
              className="text-sm font-semibold text-(--text-primary) hover:underline"
            >
              {comment.author?.name}
            </Link>
            <span className="text-xs text-(--text-dim)">
              @{comment.author?.username}
            </span>
            {comment.isEdited && <span className="text-[10px] text-(--text-dim) italic">(edited)</span>}
          </div>
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="flex-1 bg-(--bg-secondary) border border-(--border-glass) rounded-lg px-3 py-1.5 text-sm text-(--text-primary) outline-none focus:border-(--accent-primary)/40"
                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
              />
              <button onClick={handleEditSave} disabled={editSaving} className="p-1 text-(--accent-primary) hover:bg-(--accent-primary)/10 rounded-full disabled:opacity-50">
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
              <button onClick={() => { setEditing(false); setEditText(comment.text); }} className="p-1 text-(--text-muted) hover:text-red-400 rounded-full">
                <X size={14} />
              </button>
            </div>
          ) : (
            <p className="text-sm text-(--text-primary) mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
              {comment.text}
            </p>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-4 mt-1 ml-1">
          <span className="text-[11px] text-(--text-dim)">
            {formatDistanceToNow(new Date(comment.createdAt || Date.now()), { addSuffix: true })}
          </span>

          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
              liked ? 'text-red-500' : 'text-(--text-muted) hover:text-red-400'
            }`}
          >
            <Heart size={12} className={liked ? 'fill-red-500' : ''} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          {!isReply && (
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 text-[11px] font-medium text-(--text-muted) hover:text-(--accent-primary) transition-colors"
            >
              <Reply size={12} />
              Reply
            </button>
          )}

          {String(comment.author?._id) === String(currentUserId) && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-[11px] font-medium text-(--text-muted) hover:text-(--accent-primary) transition-colors"
            >
              <Pencil size={12} />
            </button>
          )}

          {String(comment.author?._id) === String(currentUserId) && (
            <button
              onClick={() => onDelete(comment._id)}
              className="flex items-center gap-1 text-[11px] font-medium text-(--text-muted) hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const CommentSection = ({ postId, commentCount: initialCount = 0, highlightCommentId = null }) => {
  const { user } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { _id, author }
  const [commentCount, setCommentCount] = useState(initialCount);
  const inputRef = useRef(null);
  const insertEmoji = (emoji) => {
    const el = inputRef.current;
    if (!el) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  // Fetch comments when section is opened
  useEffect(() => {
    if (isOpen && comments.length === 0) {
      fetchComments();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open when we need to highlight a comment (from notifications deep-link)
  useEffect(() => {
    if (highlightCommentId) setIsOpen(true);
  }, [highlightCommentId]);

  // Scroll + highlight (best-effort) after comments load
  useEffect(() => {
    if (!highlightCommentId || comments.length === 0) return;
    const el = document.getElementById(`comment-${highlightCommentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-(--accent-primary)', 'bg-(--accent-primary)/5');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-(--accent-primary)', 'bg-(--accent-primary)/5');
      }, 2500);
    }
  }, [highlightCommentId, comments]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await getComments(postId);
      setComments(data);
    } catch {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    setSubmitting(true);
    try {
      const payload = replyingTo
        ? { text: text.trim(), parentCommentId: replyingTo._id }
        : { text: text.trim() };
      const newComment = await addComment(postId, payload);

      if (replyingTo) {
        // Add reply under parent comment
        setComments((prev) =>
          prev.map((c) =>
            c._id === replyingTo._id
              ? { ...c, replies: [...(c.replies || []), newComment] }
              : c
          )
        );
      } else {
        // Add top-level comment at the top
        setComments((prev) => [{ ...newComment, replies: [] }, ...prev]);
      }

      setCommentCount((prev) => prev + 1);
      setText('');
      setReplyingTo(null);
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      // Remove from top-level or from replies
      setComments((prev) => {
        // Check if it's a top-level comment
        const isTopLevel = prev.some((c) => c._id === commentId);
        if (isTopLevel) {
          const deleted = prev.find((c) => c._id === commentId);
          const replyCount = deleted?.replies?.length ?? 0;
          setCommentCount((cnt) => Math.max(0, cnt - 1 - replyCount));
          return prev.filter((c) => c._id !== commentId);
        }
        // It's a reply — remove from parent
        setCommentCount((cnt) => Math.max(0, cnt - 1));
        return prev.map((c) => ({
          ...c,
          replies: (c.replies || []).filter((r) => r._id !== commentId),
        }));
      });
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleLike = async (commentId) => {
    const res = await likeComment(commentId);
    return res;
  };

  const handleEdit = async (commentId, newText) => {
    const updated = await editComment(commentId, { text: newText });
    setComments(prev => prev.map(c => {
      if (c._id === commentId) return { ...c, text: newText, isEdited: true };
      return {
        ...c,
        replies: (c.replies || []).map(r => r._id === commentId ? { ...r, text: newText, isEdited: true } : r),
      };
    }));
    return updated;
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
    setText(`@${comment.author?.username} `);
    inputRef.current?.focus();
  };

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="mt-1">
      {/* Toggle button */}
      <button
        onClick={toggleOpen}
        className="flex items-center gap-1.5 text-xs font-medium text-(--text-muted) hover:text-(--accent-primary) transition-colors ml-1 py-1"
      >
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {commentCount > 0
          ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}`
          : 'Add a comment'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {/* Comment input */}
            {user && (
              <form onSubmit={handleSubmit} className="flex items-start gap-2.5 mt-2">
                <Avatar src={user.profilePic} alt={user.name} size="sm" className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {replyingTo && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[11px] text-(--text-muted)">
                        Replying to <span className="text-(--accent-primary) font-medium">@{replyingTo.author?.username}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => { setReplyingTo(null); setText(''); }}
                        className="text-[11px] text-(--text-dim) hover:text-red-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-(--bg-glass) rounded-full border border-(--border-glass) focus-within:border-(--accent-primary)/40 transition-colors pr-1.5">
                    <input
                      ref={inputRef}
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
                      maxLength={500}
                      className="flex-1 bg-transparent text-sm text-(--text-primary) placeholder-(--text-muted) px-4 py-2.5 outline-none"
                    />
                    <EmojiPickerButton onEmoji={insertEmoji} />
                    <button
                      type="submit"
                      disabled={!text.trim() || submitting}
                      className="p-1.5 rounded-full text-(--accent-primary) hover:bg-(--accent-primary)/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex-shrink-0"
                    >
                      {submitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Comments list */}
            <div className="mt-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-(--text-muted)" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-sm text-(--text-dim) py-4">
                  No comments yet. Be the first!
                </p>
              ) : (
                <AnimatePresence>
                  {comments.map((comment) => (
                    <div key={comment._id}>
                      <CommentItem
                        comment={comment}
                        onReply={handleReply}
                        onDelete={handleDelete}
                        onLike={handleLike}
                        onEdit={handleEdit}
                        currentUserId={user?._id}
                        highlightCommentId={highlightCommentId}
                      />
                      {/* Replies */}
                      {comment.replies?.length > 0 && (
                        <AnimatePresence>
                          {comment.replies.map((reply) => (
                            <CommentItem
                              key={reply._id}
                              comment={reply}
                              onReply={handleReply}
                              onDelete={handleDelete}
                              onLike={handleLike}
                              onEdit={handleEdit}
                              currentUserId={user?._id}
                              isReply
                              highlightCommentId={highlightCommentId}
                            />
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommentSection;
