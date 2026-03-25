import React from 'react';
import styles from './AuthLayout.module.css';

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'social';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ 
  variant = 'primary', 
  icon,
  children,
  className = '',
  ...props 
}) => {
  const buttonClass = variant === 'social' ? styles.socialBtn : styles.primaryBtn;
  
  return (
    <button 
      className={`${buttonClass} ${className}`}
      {...props}
    >
      {variant === 'social' ? (
        <>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            {icon}
            <span>{children}</span>
          </div>
          <span style={{color: '#666'}}>→</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};