import React from 'react';
import { motion } from 'framer-motion';

export default function EpicButton({ children, className, ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
      whileTap={{ scale: 0.95 }}
      className={`
        px-10 py-3 bg-lol-blue-medium text-lol-gold-light font-display font-bold uppercase tracking-wider
        border-2 border-lol-gold hover:border-lol-blue-accent
        transition-all duration-300
        relative group ${className}
      `}
      {...props}
    >
      <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-lol-gold group-hover:border-lol-blue-accent transition-all duration-300"></span>
      <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-lol-gold group-hover:border-lol-blue-accent transition-all duration-300"></span>
      <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-lol-gold group-hover:border-lol-blue-accent transition-all duration-300"></span>
      <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-lol-gold group-hover:border-lol-blue-accent transition-all duration-300"></span>
      {children}
    </motion.button>
  );
};