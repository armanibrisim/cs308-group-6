"use client";

import React, { useState, useEffect } from "react";
import styles from "./login.module.css";
import { useRouter } from "next/navigation";

const slides = [
  { url: "/4.webp", slogan: "Seamless Power" },
  { url: "/3.jpg", slogan: "Elegant Design" },
  { url: "/2.webp", slogan: "Infinite Visuals" },
  { url: "/1.webp", slogan: "Beyond Imagination" },
];

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      if (isRegister) {
        const firstName = (form.elements.namedItem("firstName") as HTMLInputElement).value;
        const lastName = (form.elements.namedItem("lastName") as HTMLInputElement).value;
        const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

        if (password !== confirmPassword) {
          setError("Şifreler eşleşmiyor.");
          return;
        }

        const res = await fetch("http://localhost:8000/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Kayıt yapılamadı.");
          return;
        }
      } else {
        const res = await fetch("http://localhost:8000/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || "Giriş yapılamadı.");
          return;
        }
      }

      router.push("/logInMain");
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
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
              <h1 className={styles.logo}>AMU</h1>
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
                    <input name="firstName" type="text" placeholder="First name" className={styles.inputField} required />
                    <input name="lastName" type="text" placeholder="Last name" className={styles.inputField} required />
                  </div>
                )}
                <input name="email" type="email" placeholder="Email address" className={styles.inputField} required />
                <input name="password" type="password" placeholder="Password" className={styles.inputField} required />
                {isRegister && <input name="confirmPassword" type="password" placeholder="Confirm Password" className={styles.inputField} required />}

                {error && (
                  <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "8px" }}>{error}</p>
                )}

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? "..." : isRegister ? "Create account" : "Sign In"}
                </button>
              </form>

              <div className={styles.toggleText}>
                {isRegister ? "Already have an account?" : "Don't have an account?"}
                <button type="button" onClick={() => { setIsRegister(!isRegister); setError(""); }}>
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