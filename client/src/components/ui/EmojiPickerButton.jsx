import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

const EmojiPickerButton = ({ onEmoji }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleOpen = () => setOpen((v) => !v);

  return (
    <div ref={wrapperRef} className="relative flex-shrink-0" style={{ overflow: 'visible' }}>
      <button
        type="button"
        onClick={handleOpen}
        className="p-2 text-(--accent-green) hover:bg-(--accent-green)/10 rounded-full cursor-pointer transition-colors"
        aria-label="Insert emoji"
      >
        <Smile size={18} />
      </button>
      {open && (
        <div
          className="absolute right-0 z-[9999]"
          style={{ bottom: '44px' }}
        >
          <div className="glass-card overflow-hidden border border-(--border-glass) shadow-2xl">
            <EmojiPicker
              theme="dark"
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
              onEmojiClick={(emojiData) => {
                onEmoji?.(emojiData.emoji);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPickerButton;

