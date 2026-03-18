import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Tooltip = ({ children, content, position = 'top', delay = 0.3 }) => {
  const [isVisible, setIsVisible] = useState(false);
  let timeout;

  const showTip = () => {
    timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay * 1000);
  };

  const hideTip = () => {
    clearTimeout(timeout);
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-(--border-glass) border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-(--border-glass) border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-(--border-glass) border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-(--border-glass) border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div 
      className="relative flex items-center" 
      onMouseEnter={showTip} 
      onMouseLeave={hideTip}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${positionClasses[position]} px-2.5 py-1.5 text-xs text-white bg-(--bg-secondary) border border-(--border-glass) shadow-(--shadow-card) rounded whitespace-nowrap`}
          >
            {content}
            {/* Optional CSS Triangle Arrow - comment out if prefer clean floating drop */}
            {/* <div className={`absolute border-[5px] ${arrowClasses[position]}`} /> */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
