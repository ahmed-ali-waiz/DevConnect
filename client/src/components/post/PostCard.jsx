import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  Check, Trash2, Pencil, Pin, Flag, X as XIcon,
  ChevronLeft, ChevronRight, ExternalLink, Copy, Repeat2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import Avatar from '../ui/Avatar';
import CommentSection from './CommentSection';
import { likePost, bookmarkPost, repostPost, deletePost, updatePost } from '../../services/postService';
import { pinPost } from '../../services/userService';
import { createReport } from '../../services/reportService';
import { removePost, updatePost as updatePostRedux } from '../../store/slices/postSlice';

const parseText = (text) => {
  if (!text) return null;
  const parts = text.split(/(@\w+|#\w+|https?:\/\/[^\s]+)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('@')) {
      return <Link key={idx} to={`/profile/${part.substring(1)}`} className="text-[#0095f6] font-semibold hover:opacity-80">{part}</Link>;
    }
    if (part.startsWith('#')) {
      return <Link key={idx} to={`/search?q=${part.substring(1)}`} className="text-[#0095f6] font-semibold hover:opacity-80">{part}</Link>;
    }
    if (part.startsWith('http')) {
      return <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="text-[#0095f6] hover:underline break-all">{part}</a>;
    }
    return <span key={idx}>{part}</span>;
  });
};

const PostCard = ({ post, defaultShowComments = false, highlightCommentId = null }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const isLikedByMe = Array.isArray(post.likes) && user && post.likes.some((id) => String(id) === String(user._id));
  const isBookmarkedByMe = Array.isArray(user?.bookmarks) && post._id && user.bookmarks.some(id => String(id) === String(post._id));
  const [isLiked, setIsLiked] = useState(isLikedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? post.likes?.length ?? 0);
  const [isBookmarked, setIsBookmarked] = useState(isBookmarkedByMe);
  const [repostCount, setRepostCount] = useState(post.repostCount ?? post.reposts?.length ?? 0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeVisibleLines, setCodeVisibleLines] = useState(6);
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(post.text || '');
  const [editSaving, setEditSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDesc, setReportDesc] = useState('');
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const menuRef = useRef(null);
  const lastTapRef = useRef(0);

  const isOwner = user && (String(post.author?._id) === String(user._id));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await likePost(post._id);
      setIsLiked(res.liked);
      setLikeCount(res.likeCount ?? (res.liked ? likeCount + 1 : likeCount - 1));
    } catch {
      toast.error('Failed to like post');
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      if (!isLiked) handleLike();
      setDoubleTapLike(true);
      setTimeout(() => setDoubleTapLike(false), 1000);
    }
    lastTapRef.current = now;
  };

  const handleRepost = async () => {
    if (!user) return;
    try {
      const res = await repostPost(post._id);
      setRepostCount(prev => res.reposted ? prev + 1 : Math.max(0, prev - 1));
      toast.success(res.reposted ? 'Reposted!' : 'Repost removed');
    } catch {
      toast.error('Failed to repost');
    }
  };

  const handleBookmark = async () => {
    if (!user) return;
    try {
      const res = await bookmarkPost(post._id);
      setIsBookmarked(res.bookmarked);
      toast.success(res.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch {
      toast.error('Failed to bookmark');
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/posts/${post._id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const handleDelete = async () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePost(post._id);
      dispatch(removePost(post._id));
      setIsDeleted(true);
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    setEditText(post.text || '');
    setEditMode(true);
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      const updated = await updatePost(post._id, { text: editText });
      dispatch(updatePostRedux(updated));
      post.text = editText;
      setEditMode(false);
      toast.success('Post updated');
    } catch {
      toast.error('Failed to update post');
    } finally {
      setEditSaving(false);
    }
  };

  const handlePin = async () => {
    setShowMenu(false);
    try {
      await pinPost(post._id);
      toast.success('Post pin toggled');
    } catch {
      toast.error('Failed to pin post');
    }
  };

  const handleReport = async () => {
    try {
      await createReport({ reportedPost: post._id, reason: reportReason, description: reportDesc });
      setReportOpen(false);
      setReportDesc('');
      toast.success('Report submitted');
    } catch {
      toast.error('Failed to submit report');
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (isDeleted) return null;

  const images = (post.images?.length > 0 ? post.images : post.image ? [post.image] : []).filter(Boolean);
  const hasMedia = images.length > 0 || !!post.video;
  const captionText = post.text || '';
  const CAPTION_LIMIT = 100;
  const isCaptionLong = captionText.length > CAPTION_LIMIT;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`bg-black border-b border-[#262626] mb-0 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#262626] rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 text-center border-b border-[#363636]">
                <h3 className="text-base font-semibold text-white mb-1">Delete Post?</h3>
                <p className="text-sm text-[#a8a8a8]">Are you sure? This can't be undone.</p>
              </div>
              <div className="flex">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 text-sm font-semibold text-white border-r border-[#363636] hover:bg-[#363636] transition-colors">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-3 text-sm font-semibold text-red-500 hover:bg-[#363636] transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Repost indicator */}
      {post.isRepost && (
        <div className="flex items-center text-[#a8a8a8] text-xs px-4 pt-2 gap-1.5 font-semibold">
          <Repeat2 size={13} />
          <span>{post.repostedBy} reposted</span>
        </div>
      )}

      {/* ── POST HEADER ── */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          {/* Avatar with story ring */}
          <Link to={`/profile/${post.author.username}`} className="shrink-0">
            <Avatar 
              src={post.author?.profilePic} 
              alt={post.author?.name} 
              size="md" 
              hasStory={post.author?.hasStory}
              userId={post.author?._id}
            />
          </Link>

          {/* Name + subtitle */}
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1">
              <Link to={`/profile/${post.author.username}`} className="text-[13px] font-semibold text-white leading-none">
                {post.author.username}
              </Link>
              {post.author.isVerified && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#0095f6" className="shrink-0">
                  <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="none" />
                  <circle cx="12" cy="12" r="10" fill="#0095f6" />
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-[11px] text-[#a8a8a8] leading-none mt-0.5">
              {formatDistanceToNow(new Date(post.createdAt || Date.now()), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Three-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-white hover:opacity-70 transition-opacity"
          >
            <MoreHorizontal size={20} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 z-30 w-52 py-1 bg-[#262626] border border-[#363636] rounded-2xl shadow-2xl overflow-hidden"
              >
                <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#363636] transition-colors">
                  <Send size={15} />Copy link
                </button>
                {isOwner && (
                  <button onClick={handleEdit} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#363636] transition-colors">
                    <Pencil size={15} />Edit post
                  </button>
                )}
                {isOwner && (
                  <button onClick={handlePin} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#363636] transition-colors">
                    <Pin size={15} />Pin to profile
                  </button>
                )}
                {!isOwner && (
                  <button onClick={() => { setShowMenu(false); setReportOpen(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-orange-400 hover:bg-orange-500/10 transition-colors">
                    <Flag size={15} />Report
                  </button>
                )}
                {isOwner && (
                  <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors border-t border-[#363636]">
                    <Trash2 size={15} />Delete post
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MEDIA ── */}
      {images.length === 1 && (
        <div
          className="relative w-full bg-[#111] overflow-hidden cursor-pointer select-none"
          onClick={handleDoubleTap}
        >
          <img
            src={images[0]}
            alt="Post"
            className="w-full object-cover max-h-[600px]"
            loading="lazy"
            onClick={() => setLightboxIdx(0)}
            style={{ cursor: 'zoom-in' }}
          />
          <AnimatePresence>
            {doubleTapLike && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 1.3, opacity: 1 }}
                exit={{ scale: 1.4, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Heart size={90} className="fill-white text-white drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {images.length > 1 && (
        <div className="relative w-full bg-[#111] overflow-hidden select-none">
          <div
            className="relative w-full"
            style={{ paddingBottom: '100%' }}
          >
            <img
              src={images[currentImageIdx]}
              alt={`Post image ${currentImageIdx + 1}`}
              className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
              loading="lazy"
              onClick={() => setLightboxIdx(currentImageIdx)}
            />
          </div>
          {/* Prev/Next buttons */}
          {currentImageIdx > 0 && (
            <button
              onClick={() => setCurrentImageIdx(i => i - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white z-10"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {currentImageIdx < images.length - 1 && (
            <button
              onClick={() => setCurrentImageIdx(i => i + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white z-10"
            >
              <ChevronRight size={16} />
            </button>
          )}
          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${i === currentImageIdx ? 'w-1.5 h-1.5 bg-[#0095f6]' : 'w-1.5 h-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      )}

      {post.video && (
        <div className="w-full bg-black overflow-hidden">
          <video src={post.video} controls className="w-full max-h-[600px] bg-black" />
        </div>
      )}

      {/* ── ACTION BAR ── */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center justify-between">
          {/* Left: Heart, Comment, Share */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className="p-1 transition-transform active:scale-90"
            >
              <motion.div
                animate={isLiked ? { scale: [1, 1.3, 0.9, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Heart
                  size={24}
                  strokeWidth={isLiked ? 0 : 2}
                  className={isLiked ? 'fill-red-500 text-red-500' : 'text-white'}
                />
              </motion.div>
            </button>
            <button
              onClick={() => setShowComments(s => !s)}
              className="p-1 transition-transform active:scale-90"
            >
              <MessageCircle
                size={24}
                strokeWidth={showComments ? 0 : 2}
                className={showComments ? 'fill-white text-white' : 'text-white'}
              />
            </button>
            <button onClick={handleShare} className="p-1 transition-transform active:scale-90">
              <Send size={22} className="text-white -rotate-12" strokeWidth={2} />
            </button>
          </div>

          {/* Right: Bookmark */}
          <button onClick={handleBookmark} className="p-1 transition-transform active:scale-90">
            <Bookmark
              size={24}
              strokeWidth={isBookmarked ? 0 : 2}
              className={isBookmarked ? 'fill-white text-white' : 'text-white'}
            />
          </button>
        </div>
      </div>

      {/* ── LIKES COUNT ── */}
      <div className="px-4 pb-1">
        {likeCount > 0 && (
          <p className="text-[13px] font-semibold text-white">
            {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}
      </div>

      {/* ── CAPTION ── */}
      <div className="px-4 pb-2">
        {editMode ? (
          <div>
            <textarea
              className="w-full bg-[#262626] text-white rounded-xl px-3 py-2 text-[14px] resize-none border border-[#363636] focus:outline-none focus:border-[#0095f6]"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            <div className="flex justify-end gap-2 mt-1.5">
              <button onClick={() => setEditMode(false)} className="px-3 py-1 text-sm text-[#a8a8a8] hover:text-white transition-colors">Cancel</button>
              <button onClick={handleEditSave} disabled={editSaving} className="px-3 py-1 text-sm bg-[#0095f6] text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-[#1aa1f7] transition-colors">
                {editSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : captionText ? (
          <p className="text-[13px] text-white leading-relaxed">
            <Link to={`/profile/${post.author.username}`} className="font-semibold mr-1.5 hover:opacity-70">
              {post.author.username}
            </Link>
            {captionExpanded || !isCaptionLong
              ? parseText(captionText)
              : <>{parseText(captionText.slice(0, CAPTION_LIMIT))}</>}
            {isCaptionLong && !captionExpanded && (
              <button onClick={() => setCaptionExpanded(true)} className="text-[#a8a8a8] ml-1 hover:text-white">
                ... more
              </button>
            )}
          </p>
        ) : null}
      </div>

      {/* ── Code Snippet ── */}
      {post.codeSnippet?.code && (() => {
        const codeLines = post.codeSnippet.code.split('\n');
        const totalLines = codeLines.length;
        const initialLines = 6;
        const hasMoreLines = totalLines > codeVisibleLines;
        const isExpanded = codeVisibleLines > initialLines;
        const displayCode = codeLines.slice(0, codeVisibleLines).join('\n');
        const remainingLines = totalLines - codeVisibleLines;

        return (
          <div className="mx-3 mb-3 rounded-xl overflow-hidden border border-[#333] bg-[#1e1e1e]">
            <div className="flex justify-between items-center px-4 py-2 bg-[#252526] border-b border-[#333]">
              <span className="text-xs text-[#cccccc] font-mono">{post.codeSnippet.language}</span>
              <button onClick={() => copyToClipboard(post.codeSnippet.code)} className="text-[#cccccc] hover:text-white transition-colors" aria-label="Copy code">
                {copiedCode ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
            <div className="p-4 overflow-x-auto text-[13px] font-mono leading-tight">
              <pre><code dangerouslySetInnerHTML={{ __html: hljs.highlight(displayCode, { language: post.codeSnippet.language || 'javascript' }).value }} /></pre>
            </div>
            {(hasMoreLines || isExpanded) && (
              <div className="flex bg-[#252526] border-t border-[#333]">
                {hasMoreLines && (
                  <button onClick={() => setCodeVisibleLines(prev => Math.min(prev + 30, totalLines))} className="flex-1 py-2 text-xs font-medium text-[#0095f6] hover:opacity-80 transition-opacity">
                    Show more ({remainingLines} lines)
                  </button>
                )}
                {isExpanded && (
                  <button onClick={() => setCodeVisibleLines(initialLines)} className="flex-1 py-2 text-xs font-medium text-[#a8a8a8] hover:text-white transition-colors border-l border-[#333]">
                    Show less
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Link Preview ── */}
      {post.linkPreview?.url && (
        <a
          href={post.linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-3 mb-3 block rounded-2xl overflow-hidden border border-[#363636] bg-[#1a1a1a] hover:bg-[#262626] transition-colors group"
          onClick={e => e.stopPropagation()}
        >
          {post.linkPreview.image && (
            <img src={post.linkPreview.image} alt="" className="w-full object-cover max-h-36" loading="lazy" />
          )}
          <div className="px-4 py-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              {post.linkPreview.title && <p className="text-sm font-semibold text-white truncate">{post.linkPreview.title}</p>}
              {post.linkPreview.description && <p className="text-xs text-[#a8a8a8] mt-0.5 line-clamp-2">{post.linkPreview.description}</p>}
              <p className="text-[11px] text-[#0095f6] mt-1 truncate">{post.linkPreview.url}</p>
            </div>
            <ExternalLink size={14} className="text-[#a8a8a8] group-hover:text-[#0095f6] shrink-0 mt-0.5 transition-colors" />
          </div>
        </a>
      )}

      {/* ── View all comments link (Instagram style) ── */}
      {!showComments && (post.commentCount ?? post.comments?.length ?? 0) > 0 && (
        <button
          onClick={() => setShowComments(true)}
          className="px-4 pb-1 text-[13px] text-[#a8a8a8] hover:text-white transition-colors block"
        >
          View all {post.commentCount ?? post.comments?.length ?? 0} comments
        </button>
      )}

      {/* ── Comment Section ── */}
      {showComments && (
        <div className="px-4 pb-4 w-full overflow-hidden">
          <CommentSection
            postId={post._id}
            commentCount={post.commentCount ?? post.comments?.length ?? 0}
            highlightCommentId={highlightCommentId}
          />
        </div>
      )}

      {/* ── Report Modal ── */}
      <AnimatePresence>
        {reportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setReportOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#262626] rounded-2xl p-6 w-full max-w-sm border border-[#363636]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-white mb-4 text-center">Report Post</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#a8a8a8] mb-1">Reason</label>
                  <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full bg-[#363636] text-white rounded-xl px-3 py-2 text-sm border border-[#484848] focus:outline-none focus:border-[#0095f6]">
                    <option value="spam">Spam</option>
                    <option value="harassment">Harassment</option>
                    <option value="hate_speech">Hate Speech</option>
                    <option value="misinformation">Misinformation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#a8a8a8] mb-1">Description (optional)</label>
                  <textarea className="w-full bg-[#363636] text-white rounded-xl px-3 py-2 h-20 resize-none text-sm border border-[#484848] focus:outline-none focus:border-[#0095f6]" value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Add details..." maxLength={500} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setReportOpen(false)} className="flex-1 py-2.5 text-sm font-semibold bg-[#363636] text-white rounded-xl hover:bg-[#484848] transition-colors">Cancel</button>
                  <button onClick={handleReport} className="flex-1 py-2.5 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">Submit</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxIdx !== null && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxIdx(null)}
          >
            <button onClick={() => setLightboxIdx(null)} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full z-10">
              <XIcon size={20} />
            </button>
            {images.length > 1 && (
              <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + images.length) % images.length); }} className="absolute left-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full z-10">
                <ChevronLeft size={24} />
              </button>
            )}
            <motion.img
              key={lightboxIdx}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              src={images[lightboxIdx]}
              alt="Full size"
              className="max-w-[92vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            {images.length > 1 && (
              <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % images.length); }} className="absolute right-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full z-10">
                <ChevronRight size={24} />
              </button>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-4 flex gap-1.5">
                {images.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === lightboxIdx ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PostCard;
