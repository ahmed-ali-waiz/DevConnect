import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart, MessageSquare, Repeat2, Bookmark, Share, MoreHorizontal, Check, Trash2, Pencil, Pin, Flag, X as XIcon, ChevronLeft, ChevronRight, ExternalLink, Copy } from 'lucide-react';
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
      return <Link key={idx} to={`/profile/${part.substring(1)}`} className="text-(--accent-secondary) hover:underline font-medium">{part}</Link>;
    }
    if (part.startsWith('#')) {
      return <Link key={idx} to={`/search?q=${part.substring(1)}`} className="text-(--accent-primary) hover:underline font-medium">{part}</Link>;
    }
    if (part.startsWith('http')) {
      return <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{part}</a>;
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
  const [lightboxIdx, setLightboxIdx] = useState(null); // null = closed, number = open
  const menuRef = useRef(null);

  const isOwner = user && (String(post.author?._id) === String(user._id));

  // Close menu on outside click
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

  const likeVariants = {
    initial: { scale: 1 },
    liked: { scale: [1, 1.4, 0.9, 1.1, 1], transition: { duration: 0.4 } }
  };

  // Don't render if deleted
  if (isDeleted) return null;

  // Build images array — filter out empty strings
  const images = (post.images?.length > 0 ? post.images : post.image ? [post.image] : []).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`glass-card p-4 md:p-5 mx-4 md:mx-0 mb-4 hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-300 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            style={{ backdropFilter: 'blur(2px)' }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-xs z-50 shadow-2xl border border-(--border-glass)"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4 text-center">Delete Post?</h3>
              <p className="text-sm text-(--text-muted) mb-6 text-center">Are you sure you want to delete this post? This action cannot be undone.</p>
              <div className="flex space-x-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-3 py-2 text-sm rounded-xl bg-(--bg-glass) text-(--text-muted) hover:bg-(--bg-secondary) transition-colors">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 px-3 py-2 text-sm rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {post.isRepost && (
        <div className="flex items-center text-(--text-muted) text-xs mb-3 ml-12 font-semibold">
          <Repeat2 size={14} className="mr-2" />
          <span>{post.repostedBy} reposted</span>
        </div>
      )}

      <div className="flex space-x-3">
        <Link to={`/profile/${post.author.username}`} className="shrink-0 z-10">
          <Avatar src={post.author.profilePic} alt={post.author.name} size="md" />
        </Link>

        <div className="flex-1 min-w-0">
          {/* Post Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-1.5 flex-wrap">
              <Link to={`/profile/${post.author.username}`} className="font-bold text-(--text-primary) hover:underline truncate max-w-\[150px\] sm:max-w-xs text-sm sm:text-base">
                {post.author.name}
              </Link>
              {post.author.isVerified && (
                <span className="text-(--accent-primary) text-sm">✓</span>
              )}
              <span className="text-(--text-muted) text-sm">@{post.author.username}</span>
              <span className="text-(--text-muted) text-sm">·</span>
              <span className="text-(--text-muted) text-sm hover:underline cursor-pointer">
                {formatDistanceToNow(new Date(post.createdAt || Date.now()), { addSuffix: true })}
              </span>
            </div>

            {/* More menu with delete option */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-(--text-muted) hover:text-(--accent-primary) p-1 rounded-full hover:bg-(--bg-glass) transition-colors"
              >
                <MoreHorizontal size={18} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 z-20 w-48 py-1 glass-card border border-(--border-glass) shadow-xl"
                  >
                    <button
                      onClick={handleShare}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-(--text-primary) hover:bg-(--bg-glass) transition-colors"
                    >
                      <Share size={15} />
                      Copy link
                    </button>
                    {isOwner && (
                      <button
                        onClick={handleEdit}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-(--text-primary) hover:bg-(--bg-glass) transition-colors"
                      >
                        <Pencil size={15} />
                        Edit post
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={handlePin}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-(--text-primary) hover:bg-(--bg-glass) transition-colors"
                      >
                        <Pin size={15} />
                        Pin to profile
                      </button>
                    )}
                    {!isOwner && (
                      <button
                        onClick={() => { setShowMenu(false); setReportOpen(true); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-orange-400 hover:bg-orange-500/10 transition-colors"
                      >
                        <Flag size={15} />
                        Report
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={15} />
                        Delete post
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Post Content */}
          {editMode ? (
            <div className="mt-2">
              <textarea
                className="input-field w-full h-24 resize-none text-[15px]"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                maxLength={1000}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button onClick={() => setEditMode(false)} className="px-3 py-1 text-sm text-(--text-muted) hover:text-white rounded-lg hover:bg-(--bg-glass) transition-colors">Cancel</button>
                <button onClick={handleEditSave} disabled={editSaving} className="px-3 py-1 text-sm bg-(--accent-primary) text-black rounded-lg font-semibold disabled:opacity-50">
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-(--text-primary) whitespace-pre-wrap word-break text-[15px] leading-relaxed">
              {parseText(post.text)}
            </div>
          )}

          {/* Media — supports single image (legacy) and multi-image grid */}
          {images.length === 1 && (
            <div
              className="mt-3 rounded-2xl overflow-hidden border border-(--border-glass) cursor-zoom-in"
              onClick={() => setLightboxIdx(0)}
            >
              <img src={images[0]} alt="Post attachment" className="w-full object-cover max-h-\[500px\]" loading="lazy" />
            </div>
          )}
          {images.length > 1 && (
            <div className={`mt-3 grid gap-0.5 rounded-2xl overflow-hidden border border-(--border-glass) grid-cols-2`}>
              {images.slice(0, 4).map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxIdx(idx)}
                  className={`relative overflow-hidden cursor-zoom-in ${
                    idx === 0 && images.length === 3 ? 'row-span-2' : ''
                  }`}
                >
                  <img
                    src={img}
                    alt={`Post image ${idx + 1}`}
                    className={`w-full object-cover ${
                      images.length === 2 ? 'h-64' : idx === 0 && images.length === 3 ? 'h-full' : 'h-40'
                    }`}
                    loading="lazy"
                  />
                  {idx === 3 && images.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">+{images.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {post.video && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-(--border-glass)">
              <video src={post.video} controls className="w-full max-h-\[500px\] bg-black" />
            </div>
          )}

          {/* Code Snippet — only render when there's actual code */}
          {post.codeSnippet?.code && (() => {
            const codeLines = post.codeSnippet.code.split('\n');
            const totalLines = codeLines.length;
            const initialLines = 6;
            const hasMoreLines = totalLines > codeVisibleLines;
            const isExpanded = codeVisibleLines > initialLines;
            const displayCode = codeLines.slice(0, codeVisibleLines).join('\n');
            const remainingLines = totalLines - codeVisibleLines;

            const handleShowMore = () => {
              setCodeVisibleLines(prev => Math.min(prev + 30, totalLines));
            };

            const handleShowLess = () => {
              setCodeVisibleLines(initialLines);
            };

            return (
              <div className="mt-3 rounded-xl overflow-hidden border border-[#333] bg-[#1e1e1e]">
                <div className="flex justify-between items-center px-4 py-2 bg-[#252526] border-b border-[#333]">
                  <span className="text-xs text-[#cccccc] font-mono">{post.codeSnippet.language}</span>
                  <button
                    onClick={() => copyToClipboard(post.codeSnippet.code)}
                    className="text-[#cccccc] hover:text-white transition-colors"
                    aria-label="Copy code"
                  >
                    {copiedCode ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="p-4 overflow-x-auto text-[13px] sm:text-sm font-mono leading-tight custom-scrollbar">
                  <pre>
                    <code
                      dangerouslySetInnerHTML={{
                        __html: hljs.highlight(displayCode, { language: post.codeSnippet.language || 'javascript' }).value
                      }}
                    />
                  </pre>
                </div>
                {(hasMoreLines || isExpanded) && (
                  <div className="flex bg-[#252526] border-t border-[#333]">
                    {hasMoreLines && (
                      <button
                        onClick={handleShowMore}
                        className="flex-1 py-2 text-xs font-medium text-(--accent-primary) hover:text-(--accent-secondary) transition-colors"
                      >
                        Show more ({remainingLines} lines remaining)
                      </button>
                    )}
                    {isExpanded && (
                      <button
                        onClick={handleShowLess}
                        className="flex-1 py-2 text-xs font-medium text-(--text-muted) hover:text-(--text-primary) transition-colors border-l border-[#333]"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Link Preview Card */}
          {post.linkPreview?.url && (
            <a
              href={post.linkPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block rounded-2xl overflow-hidden border border-(--border-glass) bg-(--bg-glass) hover:bg-(--bg-glass)/80 transition-colors group"
              onClick={e => e.stopPropagation()}
            >
              {post.linkPreview.image && (
                <img src={post.linkPreview.image} alt="" className="w-full object-cover max-h-36" loading="lazy" />
              )}
              <div className="px-4 py-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {post.linkPreview.title && (
                    <p className="text-sm font-semibold text-(--text-primary) truncate">{post.linkPreview.title}</p>
                  )}
                  {post.linkPreview.description && (
                    <p className="text-xs text-(--text-muted) mt-0.5 line-clamp-2">{post.linkPreview.description}</p>
                  )}
                  <p className="text-[11px] text-(--accent-primary) mt-1 truncate">{post.linkPreview.url}</p>
                </div>
                <ExternalLink size={14} className="text-(--text-muted) group-hover:text-(--accent-primary) shrink-0 mt-0.5 transition-colors" />
              </div>
            </a>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between mt-4 text-(--text-muted) max-w-md pr-4">
            <button onClick={() => setShowComments(!showComments)} className={`group flex items-center space-x-2 transition-colors hover:text-(--accent-primary) ${showComments ? 'text-(--accent-primary)' : ''}`}>
              <div className={`p-2 rounded-full transition-colors ${showComments ? 'bg-(--accent-primary)/10' : 'group-hover:bg-(--accent-primary)/10'}`}>
                <MessageSquare size={18} />
              </div>
              <span className="text-xs font-semibold">{post.commentCount ?? post.comments?.length ?? 0}</span>
            </button>

            <button onClick={handleRepost} className="group flex items-center space-x-2 transition-colors hover:text-(--accent-green)">
              <div className="p-2 rounded-full group-hover:bg-(--accent-green)/10 transition-colors">
                <Repeat2 size={18} className="group-hover:text-(--accent-green) transition-colors" />
              </div>
              <span className="text-xs font-semibold">{repostCount}</span>
            </button>

            <button
              onClick={handleLike}
              className={`group flex items-center space-x-2 transition-colors ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
            >
              <div className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-red-500/10' : 'group-hover:bg-red-500/10'}`}>
                <motion.div variants={likeVariants} initial="initial" animate={isLiked ? 'liked' : 'initial'}>
                  <Heart size={18} className={isLiked ? 'fill-red-500 stroke-red-500' : 'group-hover:text-red-500 transition-colors'} />
                </motion.div>
              </div>
              <span className={`text-xs font-semibold ${isLiked ? 'text-red-500' : ''}`}>{likeCount}</span>
            </button>

            <button onClick={handleBookmark} className={`group flex items-center space-x-2 transition-colors hover:text-(--accent-secondary) ${isBookmarked ? 'text-(--accent-secondary)' : ''}`}>
              <div className="p-2 rounded-full group-hover:bg-(--accent-secondary)/10 transition-colors">
                <Bookmark size={18} className={isBookmarked ? 'fill-(--accent-secondary) stroke-(--accent-secondary)' : 'group-hover:text-(--accent-secondary) transition-colors'} />
              </div>
            </button>
          </div>

          {/* Comment Section */}
          {showComments && (
            <CommentSection
              postId={post._id}
              commentCount={post.commentCount ?? post.comments?.length ?? 0}
              highlightCommentId={highlightCommentId}
            />
          )}
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {reportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setReportOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-display font-bold mb-4">Report Post</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-(--text-muted) mb-1">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="spam">Spam</option>
                    <option value="harassment">Harassment</option>
                    <option value="hate_speech">Hate Speech</option>
                    <option value="misinformation">Misinformation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--text-muted) mb-1">Description (optional)</label>
                  <textarea className="input-field w-full h-20 resize-none" value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Add details..." maxLength={500} />
                </div>
                <div className="flex space-x-2 pt-2">
                  <button onClick={() => setReportOpen(false)} className="flex-1 px-3 py-2 text-sm rounded-xl bg-(--bg-glass) text-(--text-muted) hover:bg-(--bg-secondary) transition-colors">Cancel</button>
                  <button onClick={handleReport} className="flex-1 px-3 py-2 text-sm rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">Submit Report</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-\[9999\] bg-black/90 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setLightboxIdx(null)}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full z-10"
            >
              <XIcon size={20} />
            </button>
            {/* Prev */}
            {images.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + images.length) % images.length); }}
                className="absolute left-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full z-10"
              >
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
            {/* Next */}
            {images.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % images.length); }}
                className="absolute right-4 p-2 text-white/70 hover:text-white bg-white/10 rounded-full z-10"
              >
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
