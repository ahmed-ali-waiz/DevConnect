import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart,
  Trash2,
  Send,
  Loader2,
  Pencil,
  X,
  ChevronDown,
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

// ── Single comment row (Instagram-style, flat — no bubble) ──────────────
const CommentItem = ({
  comment,
  onReply,
  onDelete,
  onLike,
  onEdit,
  currentUserId,
  isReply = false,
  highlightCommentId = null,
}) => {
  const isLikedByMe =
    Array.isArray(comment.likes) &&
    comment.likes.some((id) => String(id) === String(currentUserId));
  const [liked, setLiked] = useState(isLikedByMe);
  const [likeCount, setLikeCount] = useState(comment.likes?.length ?? 0);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [editSaving, setEditSaving] = useState(false);
  const isOwner = String(comment.author?._id) === String(currentUserId);

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
    if (!editText.trim() || editText.trim() === comment.text) {
      setEditing(false);
      return;
    }
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      id={`comment-${comment._id}`}
      className={`flex items-start gap-2.5 w-full ${isReply ? 'pl-10 pt-2' : 'py-1.5'}`}
    >
      {/* Avatar */}
      <Link
        to={`/profile/${comment.author?.username}`}
        className="shrink-0 mt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`rounded-full overflow-hidden shrink-0 ${isReply ? 'w-7 h-7' : 'w-8 h-8'}`}>
          <img
            src={
              comment.author?.profilePic ||
              `https://ui-avatars.com/api/?name=${comment.author?.name || 'U'}&background=262626&color=fff`
            }
            alt={comment.author?.name}
            className="w-full h-full object-cover"
          />
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 min-w-0 bg-[#262626] border border-[#363636] rounded-lg px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#0095f6]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSave();
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
            />
            <button
              onClick={handleEditSave}
              disabled={editSaving}
              className="shrink-0 text-[#0095f6] hover:opacity-70 disabled:opacity-40"
            >
              {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
            <button
              onClick={() => { setEditing(false); setEditText(comment.text); }}
              className="shrink-0 text-[#a8a8a8] hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="text-[13px] text-white leading-snug break-words">
            <Link
              to={`/profile/${comment.author?.username}`}
              className="font-semibold mr-1 hover:opacity-70"
              onClick={(e) => e.stopPropagation()}
            >
              {comment.author?.username}
            </Link>
            {comment.text}
            {comment.isEdited && (
              <span className="text-[11px] text-[#a8a8a8] ml-1 italic">(edited)</span>
            )}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px] text-[#a8a8a8]">
            {formatDistanceToNow(new Date(comment.createdAt || Date.now()), { addSuffix: false })}
          </span>
          {likeCount > 0 && (
            <span className="text-[11px] font-semibold text-[#a8a8a8]">
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </span>
          )}
          {!isReply && (
            <button
              onClick={() => onReply(comment)}
              className="text-[11px] font-semibold text-[#a8a8a8] hover:text-white transition-colors"
            >
              Reply
            </button>
          )}
          {isOwner && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-[11px] text-[#a8a8a8] hover:text-white transition-colors"
            >
              <Pencil size={11} />
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => onDelete(comment._id)}
              className="text-[11px] text-[#a8a8a8] hover:text-red-400 transition-colors"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Like button (heart, right side like IG) */}
      <button
        onClick={handleLike}
        className="shrink-0 self-start mt-1 p-1 transition-transform active:scale-90"
      >
        <Heart
          size={12}
          className={liked ? 'fill-red-500 text-red-500' : 'text-[#a8a8a8] hover:text-white'}
        />
      </button>
    </motion.div>
  );
};

// ── Main CommentSection ──────────────────────────────────────────────────
const CommentSection = ({
  postId,
  commentCount: initialCount = 0,
  highlightCommentId = null,
}) => {
  const { user } = useSelector((state) => state.auth);
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentCount, setCommentCount] = useState(initialCount);
  const [expandedReplies, setExpandedReplies] = useState({});
  const inputRef = useRef(null);

  const insertEmoji = (emoji) => {
    const el = inputRef.current;
    if (!el) { setText((p) => p + emoji); return; }
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

  // Fetch on mount (section is already visible when this renders)
  useEffect(() => {
    if (!loaded) fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-highlight a comment from deep-link
  useEffect(() => {
    if (!highlightCommentId || comments.length === 0) return;
    const el = document.getElementById(`comment-${highlightCommentId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.background = 'rgba(0,149,246,0.08)';
      setTimeout(() => { el.style.background = ''; }, 2500);
    }
  }, [highlightCommentId, comments]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await getComments(postId);
      setComments(data);
      setLoaded(true);
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
        setComments((prev) =>
          prev.map((c) =>
            c._id === replyingTo._id
              ? { ...c, replies: [...(c.replies || []), newComment] }
              : c
          )
        );
        // Auto-expand replies for this parent
        setExpandedReplies((prev) => ({ ...prev, [replyingTo._id]: true }));
      } else {
        setComments((prev) => [{ ...newComment, replies: [] }, ...prev]);
      }
      setCommentCount((p) => p + 1);
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
      setComments((prev) => {
        const isTopLevel = prev.some((c) => c._id === commentId);
        if (isTopLevel) {
          const deleted = prev.find((c) => c._id === commentId);
          const replyCount = deleted?.replies?.length ?? 0;
          setCommentCount((cnt) => Math.max(0, cnt - 1 - replyCount));
          return prev.filter((c) => c._id !== commentId);
        }
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
    return await likeComment(commentId);
  };

  const handleEdit = async (commentId, newText) => {
    const updated = await editComment(commentId, { text: newText });
    setComments((prev) =>
      prev.map((c) => {
        if (c._id === commentId) return { ...c, text: newText, isEdited: true };
        return {
          ...c,
          replies: (c.replies || []).map((r) =>
            r._id === commentId ? { ...r, text: newText, isEdited: true } : r
          ),
        };
      })
    );
    return updated;
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
    setText(`@${comment.author?.username} `);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full" onClick={(e) => e.stopPropagation()}>
      {/* ── Input bar ─────────────────────────────── */}
      {user && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2.5 py-2 border-t border-[#262626]">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <img
              src={user.profilePic || `https://ui-avatars.com/api/?name=${user.name || 'U'}&background=262626&color=fff`}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            {replyingTo && (
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] text-[#a8a8a8]">
                  Replying to{' '}
                  <span className="text-[#0095f6] font-semibold">@{replyingTo.author?.username}</span>
                </span>
                <button
                  type="button"
                  onClick={() => { setReplyingTo(null); setText(''); }}
                  className="text-[11px] text-[#a8a8a8] hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={replyingTo ? 'Add a reply...' : 'Add a comment...'}
                maxLength={500}
                className="flex-1 min-w-0 bg-transparent text-[13px] text-white placeholder-[#a8a8a8] outline-none"
              />
              <EmojiPickerButton onEmoji={insertEmoji} />
              {text.trim() && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="shrink-0 text-[13px] font-semibold text-[#0095f6] hover:text-white disabled:opacity-50 transition-colors"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Post'}
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* ── Comments list ──────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin text-[#a8a8a8]" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-[13px] text-[#a8a8a8] py-4">
          No comments yet. Be the first!
        </p>
      ) : (
        <AnimatePresence>
          {comments.map((comment) => {
            const replyCount = comment.replies?.length ?? 0;
            const repliesExpanded = expandedReplies[comment._id];
            return (
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

                {/* View/hide replies toggle */}
                {replyCount > 0 && (
                  <button
                    onClick={() =>
                      setExpandedReplies((prev) => ({
                        ...prev,
                        [comment._id]: !prev[comment._id],
                      }))
                    }
                    className="flex items-center gap-2 pl-[52px] mb-1 text-[12px] font-semibold text-[#a8a8a8] hover:text-white transition-colors"
                  >
                    <span className="inline-block w-6 h-px bg-[#a8a8a8]" />
                    {repliesExpanded
                      ? 'Hide replies'
                      : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${repliesExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}

                {/* Replies */}
                <AnimatePresence>
                  {repliesExpanded &&
                    comment.replies?.map((reply) => (
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
              </div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};

export default CommentSection;
