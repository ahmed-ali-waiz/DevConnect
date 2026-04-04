import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Code as CodeIcon,
  Hash as HashIcon,
  Smile as EmojiIcon,
  X as CloseIcon,
  Upload as UploadIcon,
  Crop as CropIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useSelector, useDispatch } from 'react-redux';
import { addPost } from '../../store/slices/postSlice';
import { createPost } from '../../services/postService';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

// -- Constants --
const MAX_CHARS = 1000;
const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

// -- Animation variants --
const fadeSlide = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: 0.3 } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } },
};

// -- Helper: validate a file --
const validateFile = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    return `"${file.name}" exceeds 10MB limit`;
  }
  if (![...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.type)) {
    return `"${file.name}" is not a supported format`;
  }
  return null;
};

// -- Helper: generate cropped image blob --
const getCroppedBlob = (image, crop) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
};

const PostComposer = ({ onPostCreated, codeOnly = false }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // -- Core state --
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(codeOnly);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -- Media state: supports multiple images + one video --
  const [mediaItems, setMediaItems] = useState([]); // [{ id, file, previewUrl, type }]
  const [videoItem, setVideoItem] = useState(null);  // { file, previewUrl }

  // -- Code snippet state --
  const [showCode, setShowCode] = useState(codeOnly);
  const [codeData, setCodeData] = useState({ language: 'javascript', code: '' });

  // -- Emoji picker state --
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef(null);
  const textareaRef = useRef(null);

  // -- Drag and drop state --
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);

  // -- Image crop state --
  const [cropTarget, setCropTarget] = useState(null); // { idx, previewUrl }
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const cropImgRef = useRef(null);

  const charsRemaining = MAX_CHARS - text.length;
  const isNearLimit = charsRemaining <= 50;
  const hasContent = codeOnly
    ? !!codeData.code.trim()
    : text.trim() || mediaItems.length > 0 || videoItem || (showCode && codeData.code.trim());

  // -- Close emoji picker on outside click --
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmoji]);

  // -- Cleanup blob URLs on unmount --
  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      if (videoItem) URL.revokeObjectURL(videoItem.previewUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Text handler --
  const handleTextChange = (e) => {
    if (e.target.value.length <= MAX_CHARS) setText(e.target.value);
  };

  // -- Emoji insert at cursor position --
  const handleEmojiClick = (emojiData) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emojiData.emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.slice(0, start) + emojiData.emoji + text.slice(end);
    if (newText.length <= MAX_CHARS) {
      setText(newText);
      // Restore cursor position after emoji
      requestAnimationFrame(() => {
        const pos = start + emojiData.emoji.length;
        textarea.setSelectionRange(pos, pos);
        textarea.focus();
      });
    }
  };

  // -- Process files from input or drop --
  const processFiles = useCallback(
    (files) => {
      const fileList = Array.from(files);
      const errors = [];

      for (const file of fileList) {
        const err = validateFile(file);
        if (err) {
          errors.push(err);
          continue;
        }

        if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
          if (videoItem) {
            errors.push('Only one video per post allowed');
            continue;
          }
          if (mediaItems.length > 0) {
            errors.push('Cannot mix images and video');
            continue;
          }
          setVideoItem({ file, previewUrl: URL.createObjectURL(file) });
          setIsExpanded(true);
        } else {
          if (videoItem) {
            errors.push('Cannot mix images and video');
            continue;
          }
          if (mediaItems.length >= MAX_IMAGES) {
            errors.push(`Maximum ${MAX_IMAGES} images allowed`);
            continue;
          }
          setMediaItems((prev) => {
            if (prev.length >= MAX_IMAGES) return prev;
            return [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                previewUrl: URL.createObjectURL(file),
                type: 'image',
              },
            ];
          });
          setIsExpanded(true);
        }
      }

      if (errors.length > 0) toast.error(errors[0]);
    },
    [mediaItems, videoItem]
  );

  // -- File input handler --
  const handleFileInput = (e, accept) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
      e.target.value = ''; // reset so same file can be re-selected
    }
  };

  // -- Remove a media item --
  const removeMedia = (id) => {
    setMediaItems((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((m) => m.id !== id);
    });
  };

  const removeVideo = () => {
    if (videoItem) URL.revokeObjectURL(videoItem.previewUrl);
    setVideoItem(null);
  };

  // -- Drag and drop zone handlers --
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  };

  // -- Reorder images via drag --
  const handleImageDragStart = (idx) => setDraggedIdx(idx);

  const handleImageDragOver = (e, idx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    setMediaItems((prev) => {
      const copy = [...prev];
      const [dragged] = copy.splice(draggedIdx, 1);
      copy.splice(idx, 0, dragged);
      return copy;
    });
    setDraggedIdx(idx);
  };

  const handleImageDragEnd = () => setDraggedIdx(null);

  // -- Crop handlers --
  const openCrop = (idx) => {
    setCropTarget({ idx, previewUrl: mediaItems[idx].previewUrl });
    setCrop({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
    setCompletedCrop(null);
  };

  const applyCrop = async () => {
    if (!completedCrop || !cropImgRef.current || !cropTarget) return;
    const croppedBlob = await getCroppedBlob(cropImgRef.current, completedCrop);
    if (!croppedBlob) return;
    const croppedFile = new File([croppedBlob], mediaItems[cropTarget.idx].file.name, {
      type: 'image/jpeg',
    });
    const newUrl = URL.createObjectURL(croppedBlob);
    setMediaItems((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[cropTarget.idx].previewUrl);
      copy[cropTarget.idx] = { ...copy[cropTarget.idx], file: croppedFile, previewUrl: newUrl };
      return copy;
    });
    setCropTarget(null);
  };

  // -- Submit handler --
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasContent) {
      toast.error('Add some text, an image, or code to post');
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
      const mediaFiles = videoItem
        ? [videoItem.file]
        : mediaItems.map((m) => m.file);

      const newPost = await createPost({
        text: text.trim(),
        mediaFiles,
        codeSnippet: (codeOnly || (showCode && codeData.code)) ? codeData : undefined,
      });
      dispatch(addPost(newPost));
      onPostCreated?.();
      toast.success('Post created!');

      // Reset all state
      setText('');
      mediaItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setMediaItems([]);
      if (videoItem) URL.revokeObjectURL(videoItem.previewUrl);
      setVideoItem(null);
      setShowCode(codeOnly);
      setCodeData({ language: 'javascript', code: '' });
      setShowEmoji(false);
      setIsExpanded(codeOnly);
    } catch {
      toast.error('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-0 sm:p-2 mb-6 transition-all duration-300 relative">
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-3">
          <Avatar
            src={user?.profilePic}
            alt={user?.name || 'User'}
            size="md"
            className="flex-shrink-0 hidden sm:block"
          />

          <div
            className="flex-1 min-w-0 bg-[#121212]/80 border border-[#2d2d2d] rounded-2xl p-3 sm:p-4 shadow-xl focus-within:border-(--accent-primary)/40 focus-within:shadow-[0_0_20px_rgba(56,189,248,0.08)] transition-all duration-300"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            <AnimatePresence>
              {isDragOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 rounded-2xl border-2 border-dashed border-(--accent-primary) bg-(--accent-primary)/10 backdrop-blur-sm flex items-center justify-center"
                >
                  <div className="text-center">
                    <UploadIcon size={40} className="mx-auto mb-2 text-(--accent-primary)" />
                    <p className="text-(--accent-primary) font-medium">Drop images here</p>
                    <p className="text-(--text-muted) text-sm mt-1">Up to {MAX_IMAGES} images, max 10MB each</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Text area / Caption */}
            {codeOnly ? (
              <input
                type="text"
                placeholder="Add a caption (optional)..."
                value={text}
                onChange={handleTextChange}
                className="w-full bg-transparent text-(--text-primary) placeholder-(--text-muted) focus:outline-none text-sm mb-3 pb-3 border-b border-[#2d2d2d]"
              />
            ) : (
              <textarea
                ref={textareaRef}
                placeholder="What's on your mind, developer?"
                value={text}
                onChange={handleTextChange}
                onFocus={() => setIsExpanded(true)}
                className={`w-full bg-transparent text-(--text-primary) placeholder-(--text-muted) focus:outline-none resize-none transition-all duration-300 text-base ${
                  isExpanded ? 'min-h-[120px]' : 'h-10'
                }`}
              />
            )}

            {/* Media Previews */}
            <AnimatePresence mode="popLayout">
              {/* Multiple image grid */}
              {mediaItems.length > 0 && (
                <motion.div {...fadeSlide} className="mt-2 mb-4">
                  <div
                    className={`grid gap-2 rounded-xl overflow-hidden ${
                      mediaItems.length === 1
                        ? 'grid-cols-1'
                        : mediaItems.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-2 sm:grid-cols-3'
                    }`}
                  >
                    {mediaItems.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        layout
                        {...scaleIn}
                        draggable
                        onDragStart={() => handleImageDragStart(idx)}
                        onDragOver={(e) => handleImageDragOver(e, idx)}
                        onDragEnd={handleImageDragEnd}
                        className={`relative group rounded-xl overflow-hidden border border-(--border-glass) bg-(--bg-primary) cursor-grab active:cursor-grabbing ${
                          idx === 0 && mediaItems.length === 3 ? 'row-span-2' : ''
                        } ${draggedIdx === idx ? 'opacity-50 ring-2 ring-(--accent-primary)' : ''}`}
                      >
                        <img
                          src={item.previewUrl}
                          alt={`Upload ${idx + 1}`}
                          className={`w-full object-cover ${
                            mediaItems.length === 1 ? 'max-h-80' : idx === 0 && mediaItems.length === 3 ? 'h-full' : 'h-48'
                          }`}
                        />
                        {/* Image overlay controls */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openCrop(idx)}
                              className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors"
                              title="Crop image"
                            >
                              <CropIcon size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMedia(item.id)}
                              className="p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full text-white backdrop-blur-sm transition-colors"
                              title="Remove"
                            >
                              <CloseIcon size={14} />
                            </button>
                          </div>
                          {/* Drag handle */}
                          {mediaItems.length > 1 && (
                            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="p-1 bg-black/60 rounded text-white/70 backdrop-blur-sm">
                                <GripVertical size={14} />
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {/* Image counter */}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-(--text-muted)">
                      {mediaItems.length}/{MAX_IMAGES} images
                    </p>
                    {mediaItems.length < MAX_IMAGES && (
                      <label className="text-xs text-(--accent-primary) hover:underline cursor-pointer">
                        + Add more
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileInput(e, 'image/*')}
                        />
                      </label>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Video preview */}
              {videoItem && (
                <motion.div {...fadeSlide} className="relative mt-2 mb-4 rounded-xl overflow-hidden bg-(--bg-primary) border border-(--border-glass)">
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 rounded-full text-white backdrop-blur-sm transition-colors z-10"
                  >
                    <CloseIcon size={16} />
                  </button>
                  <video src={videoItem.previewUrl} controls className="w-full max-h-80 bg-black" />
                </motion.div>
              )}

              {/* Code snippet editor */}
              {showCode && (
                <motion.div {...fadeSlide} className="mt-2 mb-4 rounded-xl overflow-hidden border border-(--border-glass)">
                  <div className="flex items-center justify-between bg-[#1e1e1e] p-2 border-b border-[#333]">
                    <select
                      value={codeData.language}
                      onChange={(e) => setCodeData({ ...codeData, language: e.target.value })}
                      className="bg-[#2d2d2d] text-white/80 text-xs rounded px-2 py-1 outline-none border border-[#444]"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="typescript">TypeScript</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="rust">Rust</option>
                      <option value="go">Go</option>
                    </select>
                    <button
                      type="button"
                      onChange={(e) => setCodeData({ ...codeData, language: e.target.value })}
                    />
                    {!codeOnly && (
                    <button
                      type="button"
                      onClick={() => setShowCode(false)}
                      className="text-white/50 hover:text-white transition-colors"
                    >
                      <CloseIcon size={16} />
                    </button>
                    )}
                  </div>
                  <textarea
                    placeholder="Paste your code here..."
                    value={codeData.code}
                    onChange={(e) => setCodeData({ ...codeData, code: e.target.value })}
                    className="w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4 min-h-[150px] outline-none resize-y"
                    spellCheck="false"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toolbar */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between pt-2 mt-2 flex-nowrap gap-0.5"
                >
                  <div className="flex items-center gap-0 sm:gap-2">
                    {/* Photo upload — supports multiple */}
                    <label
                      className={`p-2 rounded-full cursor-pointer transition-colors group relative touch-target ${
                        videoItem
                          ? 'text-(--text-dim) cursor-not-allowed'
                          : 'text-(--accent-primary) hover:bg-(--accent-primary)/10'
                      }`}
                    >
                      <ImageIcon size={18} />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileInput(e, 'image/*')}
                        disabled={!!videoItem}
                      />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-(--bg-secondary) text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                        Photos
                      </span>
                    </label>

                    {/* Video upload */}
                    <label
                      className={`p-2 rounded-full cursor-pointer transition-colors group relative hidden min-[340px]:flex touch-target ${
                        mediaItems.length > 0
                          ? 'text-(--text-dim) cursor-not-allowed'
                          : 'text-(--accent-primary) hover:bg-(--accent-primary)/10'
                      }`}
                    >
                      <VideoIcon size={18} />
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleFileInput(e, 'video/*')}
                        disabled={mediaItems.length > 0}
                      />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-(--bg-secondary) text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                        Video
                      </span>
                    </label>

                    {/* Code snippet toggle */}
                    <button
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className={`p-2 rounded-full cursor-pointer transition-colors group relative touch-target ${
                        showCode
                          ? 'bg-(--accent-secondary)/20 text-(--accent-secondary)'
                          : 'text-(--accent-secondary) hover:bg-(--accent-secondary)/10'
                      }`}
                    >
                      <CodeIcon size={18} />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-(--bg-secondary) text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                        Code
                      </span>
                    </button>

                    {/* Emoji picker toggle */}
                    <div className="relative hidden sm:block" ref={emojiRef}>
                      <button
                        type="button"
                        onClick={() => setShowEmoji(!showEmoji)}
                        className={`p-2 rounded-full cursor-pointer transition-colors group relative touch-target ${
                          showEmoji
                            ? 'bg-(--accent-green)/20 text-(--accent-green)'
                            : 'text-(--accent-green) hover:bg-(--accent-green)/10'
                        }`}
                      >
                        <EmojiIcon size={18} />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-(--bg-secondary) text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                          Emoji
                        </span>
                      </button>

                      {/* Emoji picker dropdown */}
                      <AnimatePresence>
                        {showEmoji && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className="absolute bottom-full left-0 mb-2 z-50"
                          >
                            <EmojiPicker
                              onEmojiClick={handleEmojiClick}
                              theme="dark"
                              width={320}
                              height={400}
                              searchPlaceholder="Search emoji..."
                              lazyLoadEmojis
                              skinTonesDisabled
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Hashtag button */}
                    <button
                      type="button"
                      onClick={() => {
                        setText((prev) => prev + '#');
                        textareaRef.current?.focus();
                      }}
                      className="p-2 text-(--text-muted) hover:text-white hover:bg-(--bg-glass) rounded-full cursor-pointer transition-colors hidden sm:block"
                    >
                      <HashIcon size={20} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                    {/* Character counter */}
                    {text.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative"
                      >
                        <svg width="24" height="24" viewBox="0 0 28 28" className="rotate-[-90deg] sm:w-7 sm:h-7">
                          <circle
                            cx="14"
                            cy="14"
                            r="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-(--border-glass)"
                          />
                          <circle
                            cx="14"
                            cy="14"
                            r="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray={`${(2 * Math.PI * 11 * text.length) / MAX_CHARS} ${2 * Math.PI * 11}`}
                            className={
                              charsRemaining <= 0
                                ? 'text-red-500'
                                : isNearLimit
                                ? 'text-(--accent-orange)'
                                : 'text-(--accent-primary)'
                            }
                            strokeLinecap="round"
                          />
                        </svg>
                        {isNearLimit && (
                          <span
                            className={`absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold ${
                              charsRemaining <= 0 ? 'text-red-500' : 'text-(--accent-orange)'
                            }`}
                          >
                            {charsRemaining}
                          </span>
                        )}
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      size="sm"
                      disabled={!hasContent || charsRemaining < 0}
                      isLoading={isSubmitting}
                      className="px-3 sm:px-6"
                    >
                      Post
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </form>

      {/* Image Crop Modal */}
      <AnimatePresence>
        {cropTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setCropTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-card w-full max-w-lg max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Crop header */}
              <div className="flex items-center justify-between p-4 border-b border-(--border-glass)">
                <h3 className="font-display font-bold text-(--text-primary)">Crop Image</h3>
                <button
                  type="button"
                  onClick={() => setCropTarget(null)}
                  className="p-2 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-glass) transition-colors"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              {/* Crop area */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                >
                  <img
                    ref={cropImgRef}
                    src={cropTarget.previewUrl}
                    alt="Crop preview"
                    className="max-h-[60vh] max-w-full"
                  />
                </ReactCrop>
              </div>

              {/* Crop actions */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-(--border-glass)">
                <Button variant="ghost" size="sm" onClick={() => setCropTarget(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={applyCrop}
                  disabled={!completedCrop?.width || !completedCrop?.height}
                  className="px-6"
                >
                  Apply Crop
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostComposer;
