"use client";
import React from 'react';
import styles from './AuthLayout.module.css';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'with-button';
  onButtonClick?: () => void;
  buttonIcon?: React.ReactNode;
}

export const AuthInput: React.FC<AuthInputProps> = ({ 
  variant = 'default', 
  onButtonClick, 
  buttonIcon,
  className = '',
  ...props 
}) => {
  if (variant === 'with-button') {
    return (
      <div className={styles.inputWrapper}>
        <input 
          className={`${styles.inputField} ${className}`}
          {...props}
        />
        {onButtonClick && (
          <button 
            type="button"
            className={styles.submitBtn}
            onClick={onButtonClick}
          >
            {buttonIcon}
          </button>
        )}
      </div>
    );
  }

  return (
    <input 
      className={`${styles.inputField} ${className}`}
      {...props}
    />
  );
};