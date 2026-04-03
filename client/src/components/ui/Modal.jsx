import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { X as CloseIcon } from 'lucide-react';

/* Mobile = slide-up bottom sheet, Desktop = centered modal */
const mobileVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit: { y: '100%', transition: { duration: 0.22 } }
};

const desktopVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Mobile bottom sheet */}
          <motion.div
            variants={mobileVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`md:hidden fixed inset-x-0 bottom-0 z-50 glass-card rounded-t-2xl rounded-b-none w-full max-h-[92dvh] flex flex-col shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-(--border-glass) rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-(--border-glass) shrink-0">
              <h2 className="text-lg font-display font-bold text-(--text-primary)">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-glass) transition-colors touch-target"
                aria-label="Close modal"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            {/* Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar scroll-touch" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
              {children}
            </div>
          </motion.div>

          {/* Desktop centered modal */}
          <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4 sm:p-6">
            <motion.div
              variants={desktopVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`glass-card relative w-full ${maxWidth} max-h-[90dvh] flex flex-col z-10 shadow-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-(--border-glass) shrink-0">
                <h2 className="text-xl font-display font-bold text-(--text-primary)">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-glass) transition-colors"
                  aria-label="Close modal"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
              {/* Body */}
              <div className="p-5 overflow-y-auto custom-scrollbar">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
