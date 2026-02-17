'use client';

import { useState, useEffect } from 'react';

/**
 * HeroSimple - Focused first-time user experience
 *
 * Goal: Get user to first check-in in under 10 seconds
 * - Clear value prop
 * - Single CTA
 * - No distractions
 */
export function HeroSimple() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div className={`hero-simple ${isVisible ? 'visible' : ''}`}>
      {/* Ambient background */}
      <div className="hero-bg">
        <div className="glow glow-1" />
        <div className="glow glow-2" />
      </div>

      {/* Content */}
      <div className="hero-content">
        {/* Tiny trust signal */}
        <div className="trust-badge">
          <span className="pulse" />
          <span>Free — no signup required</span>
        </div>

        {/* Main headline - benefit focused */}
        <h1>
          <span className="line-1">Know your energy</span>
          <span className="line-2">Plan your day</span>
        </h1>

        {/* Sub-headline - removes objections */}
        <p className="subtitle">
          A 1-minute check-in reveals when you'll feel most focused,
          creative, and connected today.
        </p>

        {/* Single, clear CTA */}
        <a href="/sol/checkin" className="cta-main">
          <span className="cta-text">Start your free reading</span>
          <span className="cta-badge">1 min</span>
          <span className="cta-arrow">→</span>
        </a>

        {/* Micro-copy that removes friction */}
        <p className="micro-copy">
          No signup required • Works offline • Your data stays private
        </p>

        {/* Social proof */}
        <div className="testimonial">
          <p>"Finally, a tool that actually helps me understand my energy patterns."</p>
          <span className="author">— Sarah, designer</span>
        </div>
      </div>

      {/* Scroll indicator for curious users */}
      <div className="scroll-hint">
        <span>or learn more</span>
        <span className="arrow">↓</span>
      </div>

      <style>{`
        .hero-simple {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #0a0908;
          overflow: hidden;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .hero-simple.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Background */
        .hero-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
        }

        .glow-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(212, 168, 84, 0.3) 0%, transparent 70%);
          top: 10%;
          left: 20%;
          animation: float 8s ease-in-out infinite;
        }

        .glow-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%);
          bottom: 20%;
          right: 20%;
          animation: float 10s ease-in-out infinite reverse;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -20px); }
        }

        /* Content */
        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 600px;
          text-align: center;
        }

        /* Trust badge */
        .trust-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(212, 168, 84, 0.1);
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 100px;
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.7);
          margin-bottom: 2rem;
        }

        .pulse {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        /* Headline */
        h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 400;
          line-height: 1.1;
          margin: 0 0 1.5rem;
        }

        .line-1 {
          display: block;
          font-size: clamp(2.5rem, 8vw, 4rem);
          color: #f0e8d8;
        }

        .line-2 {
          display: block;
          font-size: clamp(2rem, 6vw, 3rem);
          color: #d4a854;
        }

        /* Subtitle */
        .subtitle {
          font-size: 1.1rem;
          color: rgba(240, 232, 216, 0.7);
          line-height: 1.6;
          margin-bottom: 2.5rem;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        /* CTA */
        .cta-main {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #d4a854 0%, #c49a4a 100%);
          color: #0a0908;
          font-size: 1.1rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(212, 168, 84, 0.3);
          transition: all 0.3s ease;
        }

        .cta-main:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(212, 168, 84, 0.4);
        }

        .cta-badge {
          padding: 0.25rem 0.5rem;
          background: rgba(10, 9, 8, 0.2);
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .cta-arrow {
          font-size: 1.25rem;
          transition: transform 0.3s ease;
        }

        .cta-main:hover .cta-arrow {
          transform: translateX(4px);
        }

        /* Micro-copy */
        .micro-copy {
          margin-top: 1rem;
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.5);
        }

        /* Testimonial */
        .testimonial {
          margin-top: 3rem;
          padding: 1.5rem;
          background: rgba(26, 24, 20, 0.5);
          border: 1px solid rgba(212, 168, 84, 0.1);
          border-radius: 12px;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        .testimonial p {
          font-style: italic;
          color: rgba(240, 232, 216, 0.8);
          font-size: 0.95rem;
          margin-bottom: 0.5rem;
        }

        .testimonial .author {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.5);
        }

        /* Scroll hint */
        .scroll-hint {
          position: absolute;
          bottom: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.4);
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .scroll-hint:hover {
          color: rgba(240, 232, 216, 0.7);
        }

        .scroll-hint .arrow {
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(6px); }
          60% { transform: translateY(3px); }
        }

        @media (max-width: 640px) {
          .hero-simple {
            padding: 1.5rem;
          }

          .cta-main {
            width: 100%;
            justify-content: center;
          }

          .testimonial {
            margin-top: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
