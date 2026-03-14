"use client";
import React, { useState, useEffect } from "react";
import styles from "./register.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";

const slides = [
  { url: "/4.webp", slogan: "Seamless Power" },
  { url: "/3.jpg", slogan: "Elegant Design" },
  { url: "/2.webp", slogan: "Infinite Visuals" },
  { url: "/1.webp", slogan: "Beyond Imagination" },
];

export default function RegisterPage() {
  const [isRegister, setIsRegister] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
    <div className={styles.pageWrapper}>
      <div className={styles.mainCard}>
        {/* SOL PANEL - GÜÇLÜ IŞIKLI SLIDER */}
        <div className={styles.leftPanel}>
          <div className={styles.imageContainer}>
            <div 
              className={styles.sliderTrack}
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {slides.map((slide, index) => (
                <div className={styles.slide} key={index}>
                  <img src={slide.url} className={styles.bgImage} alt="visual" />
                </div>
              ))}
            </div>
            <div className={styles.leftOverlay}>
              <h1 className={styles.logo}>LUMEN</h1>
              <div>
                <p style={{ color: "#fff", fontSize: "1.1rem", fontWeight: "300", margin: 0 }}>
                  {slides[currentIndex].slogan}
                </p>
                <div className={styles.dots}>
                  {slides.map((_, index) => (
                    <div 
                      key={index}
                      className={index === currentIndex ? styles.dotActive : styles.dot}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ PANEL - GLASS FORM */}
        <div className={styles.rightPanel}>
          <div className={styles.glassForm}>
            <div className={styles.formContent}>
              <h1 className={styles.title}>{isRegister ? "Create account" : "Welcome back"}</h1>
              <p className={styles.subtitle}>{isRegister ? "Start your journey today." : "Sign in to continue."}</p>
              
              <form onSubmit={handleSubmit}>
                {isRegister && (
                  <div className={styles.nameRow}>
                    <input type="text" placeholder="First name" className={styles.inputField} />
                    <input type="text" placeholder="Last name" className={styles.inputField} />
                  </div>
                )}
                <input type="email" placeholder="Email address" className={styles.inputField} required />
                <input type="password" placeholder="Password" className={styles.inputField} required />
                {isRegister && <input type="password" placeholder="Confirm Password" className={styles.inputField} required />}
                
                <button type="submit" className={styles.submitBtn}>
                  {isRegister ? "Create account" : "Sign In"}
                </button>
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
    </div>
  );
}