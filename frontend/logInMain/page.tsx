import React from 'react';
import styles from './logInMain.module.css';

const LoginPage = () => {
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.glassCard}>
        <header className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Log in to your account</p>
        </header>

        <div className={styles.inputGroup}>
          <div className={styles.inputWrapper}>
            <input 
              type="email" 
              placeholder="username@gmail.com" 
              className={styles.inputField} 
            />
            <button className={styles.submitBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.divider}>
          <div className={styles.dividerLine}></div>
          <span style={{padding: '0 15px'}}>OR</span>
          <div className={styles.dividerLine}></div>
        </div>

        <div className={styles.socialGroup}>
          <button className={styles.socialBtn}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <img src="https://www.google.com/favicon.ico" width="18" alt="google" />
              <span>Continue with Google</span>
            </div>
            <span style={{color: '#444'}}>→</span>
          </button>

          <button className={styles.socialBtn}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.13l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>Continue with X</span>
            </div>
            <span style={{color: '#444'}}>→</span>
          </button>
        </div>

        <footer className={styles.footer}>
          Don't have an account? <a href="#" className={styles.signUpLink}>Sign up</a>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;