import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Dropdown = ({ trigger, children, align = 'right', width = 'w-48' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 mt-2 ${width} ${alignmentClasses[align]} origin-top-right`}
          >
            <div className="glass-card py-1 overflow-hidden">
              {/* Pass setIsOpen to children so they can close the dropdown on click */}
              {typeof children === 'function' ? children({ close: () => setIsOpen(false) }) : children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DropdownItem = ({ children, onClick, icon, destructive = false }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm flex items-center space-x-3 transition-colors ${
        destructive 
          ? 'text-red-400 hover:bg-red-400/10 hover:text-red-300' 
          : 'text-(--text-primary) hover:bg-(--bg-glass) hover:text-white'
      }`}
    >
      {icon && <span className="opacity-70">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export const DropdownDivider = () => (
  <div className="h-px w-full bg-(--border-glass) my-1" />
);

export default Dropdown;
