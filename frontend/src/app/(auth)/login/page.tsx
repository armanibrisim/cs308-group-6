"use client";
import React from 'react';
import Link from 'next/link';
import { AuthLayout, AuthCard, AuthInput, AuthButton } from '../../../components/auth';
import styles from '../../../components/auth/AuthLayout.module.css';

export default function LoginPage() {
  const handleEmailSubmit = () => {
    // Handle email login
    console.log('Email login submitted');
  };

  const ArrowIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );

  const GoogleIcon = <img src="https://www.google.com/favicon.ico" width="16" alt="google" />;
  
  const XIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.13l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );

  return (
    <AuthLayout variant="login">
      <AuthCard>
        <div className={styles.formContent}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Log in to your account</p>

          <AuthInput
            type="email"
            placeholder="username@gmail.com"
            variant="with-button"
            onButtonClick={handleEmailSubmit}
            buttonIcon={ArrowIcon}
          />

          <div className={styles.divider}>
            <div className={styles.dividerLine}></div>
            <span style={{padding: '0 12px'}}>OR</span>
            <div className={styles.dividerLine}></div>
          </div>

          <div className={styles.socialGroup}>
            <AuthButton variant="social" icon={GoogleIcon}>
              Continue with Google
            </AuthButton>

            <AuthButton variant="social" icon={XIcon}>
              Continue with X
            </AuthButton>
          </div>

          <div className={styles.footer}>
            Don't have an account? <Link href="/register" className={styles.signUpLink}>Sign up</Link>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}