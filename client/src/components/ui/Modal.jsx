import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  // Keep a stable reference to onClose to avoid event listener issues
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    
    // Save original styles
    const originalOverflow = document.body.style.overflow;
    
    // Use overflow: hidden to prevent background scrolling
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Close on Escape key - only listen when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-root"
          className="fixed inset-0"
          style={{ zIndex: 9999 }}
        >
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Mobile bottom sheet */}
          <motion.div
            key="modal-mobile"
            variants={mobileVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="md:hidden absolute inset-x-0 bottom-0 glass-card rounded-t-2xl rounded-b-none w-full max-h-[92dvh] flex flex-col shadow-2xl"
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
          <motion.div
            key="modal-desktop"
            variants={desktopVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="hidden md:flex absolute inset-0 items-center justify-center p-4 sm:p-6 pointer-events-none"
          >
            <div
              className={`glass-card relative w-full ${maxWidth} max-h-[90dvh] flex flex-col shadow-2xl pointer-events-auto`}
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render modal outside parent DOM hierarchy
  return createPortal(modalContent, document.body);
};

export default Modal;
