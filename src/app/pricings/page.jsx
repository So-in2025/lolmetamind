'use client';
import React from 'react';
import { motion } from 'framer-motion';
import PricingPlans from '@/components/pricing/PricingPlans';

export default function PricingsPage() {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="h-screen w-screen flex flex-col items-center justify-center bg-lol-blue-dark text-lol-gold-light font-body"
      style={{ backgroundImage: "url('/img/background.webp')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      <PricingPlans />
    </motion.div>
  );
}