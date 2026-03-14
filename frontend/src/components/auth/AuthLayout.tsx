import React from 'react';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: React.ReactNode;
  variant?: 'login' | 'register';
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, variant = 'login' }) => {
  return (
    <div className={`${styles.pageWrapper} ${styles[variant]}`}>
      {children}
    </div>
  );
};