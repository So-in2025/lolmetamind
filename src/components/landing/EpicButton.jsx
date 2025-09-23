import React from 'react';
import { motion } from 'framer-motion';

const EpicButton = ({ children, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="bg-lol-gold hover:bg-lol-gold-dark text-lol-blue-dark font-bold py-3 px-8 rounded-lg shadow-lg uppercase tracking-wider text-lg transition-colors duration-300"
      style={{ fontFamily: "'BeaufortforLOL-Bold', serif" }}
    >
      {children}
    </motion.button>
  );
};

export default EpicButton;