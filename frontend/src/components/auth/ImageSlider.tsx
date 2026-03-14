"use client";
import React, { useState, useEffect } from 'react';
import styles from './AuthLayout.module.css';

interface Slide {
  url: string;
  slogan: string;
}

interface ImageSliderProps {
  slides: Slide[];
  logo?: string;
  interval?: number;
}

export const ImageSlider: React.FC<ImageSliderProps> = ({ 
  slides, 
  logo = "AMU",
  interval = 4000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, interval);
    return () => clearInterval(slideInterval);
  }, [slides.length, interval]);

  return (
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
          <h1 className={styles.logo}>{logo}</h1>
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
  );
};