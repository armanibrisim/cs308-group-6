"use client";
import React from 'react';
import styles from './AuthLayout.module.css';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`${styles.glassCard} ${className}`}>
      {children}
    </div>
  );
};