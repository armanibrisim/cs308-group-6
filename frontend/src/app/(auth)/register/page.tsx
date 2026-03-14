"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout, AuthInput, AuthButton, ImageSlider } from '../../../components/auth';
import styles from '../../../components/auth/AuthLayout.module.css';

const slides = [
  { url: "/4.webp", slogan: "Seamless Power" },
  { url: "/3.jpg", slogan: "Elegant Design" },
  { url: "/2.webp", slogan: "Infinite Visuals" },
  { url: "/1.webp", slogan: "Beyond Imagination" },
];

export default function RegisterPage() {
  const [isRegister, setIsRegister] = useState(true);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log("Form submitted");
  };

  const handleToggle = () => {
    if (isRegister) {
      // Switch to login - redirect to login page
      router.push("/login");
    } else {
      setIsRegister(true);
    }
  };

  return (
    <AuthLayout variant="register">
      <div className={styles.mainCard}>
        <ImageSlider slides={slides} logo="AMU" />

        {/* Right Panel - Form */}
        <div className={styles.rightPanel}>
          <div className={styles.glassForm}>
            <div className={styles.formContent}>
              <h1 className={styles.title}>{isRegister ? "Create account" : "Welcome back"}</h1>
              <p className={styles.subtitle}>{isRegister ? "Start your journey today." : "Sign in to continue."}</p>
              
              <form onSubmit={handleSubmit}>
                {isRegister && (
                  <div className={styles.nameRow}>
                    <AuthInput type="text" placeholder="First name" />
                    <AuthInput type="text" placeholder="Last name" />
                  </div>
                )}
                <div className={styles.singleFieldRow}>
                  <AuthInput type="email" placeholder="Email address" required />
                </div>
                <div className={styles.singleFieldRow}>
                  <AuthInput type="password" placeholder="Password" required />
                </div>
                {isRegister && (
                  <div className={styles.singleFieldRow}>
                    <AuthInput type="password" placeholder="Confirm Password" required />
                  </div>
                )}
                
                <AuthButton type="submit">
                  {isRegister ? "Create account" : "Sign In"}
                </AuthButton>
              </form>
              
              <div className={styles.toggleText}>
                {isRegister ? "Already have an account?" : "Don't have an account?"}
                <button type="button" onClick={handleToggle}>
                  {isRegister ? "Log In" : "Register"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}