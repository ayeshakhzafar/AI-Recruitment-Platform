"use client";

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export default function LandingHeroCenter() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      style={{
        textAlign: "center",
        maxWidth: 920,
        margin: "0 auto",
        padding: "0 20px",
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto", marginBottom: 22 }}>
        <Link
          to="/login"
          style={{
            display: "inline-flex",
            alignItems: "stretch",
            borderRadius: 999,
            overflow: "hidden",
            textDecoration: "none",
            boxShadow: "0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(147, 197, 253, 0.2)",
          }}
        >
          <span
            style={{
              background: "linear-gradient(180deg, #2563eb 0%, #1e3a8a 100%)",
              padding: "11px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#eff6ff",
            }}
          >
            <Sparkles size={18} strokeWidth={2} />
          </span>
          <span
            style={{
              padding: "11px 22px",
              display: "flex",
              alignItems: "center",
              background: "#f8fafc",
              color: "#020617",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "-0.02em",
            }}
          >
            Schedule Demo
          </span>
        </Link>
      </div>

      <p
        style={{
          margin: "0 0 12px",
          fontSize: "clamp(1.15rem, 2.5vw, 1.5rem)",
          fontWeight: 300,
          color: "rgba(226, 232, 240, 0.88)",
          letterSpacing: "0.02em",
          lineHeight: 1.35,
        }}
      >
        Organize. Collaborate.
      </p>
      <h1
        style={{
          margin: "0 0 20px",
          fontSize: "clamp(1.75rem, 4.2vw, 3rem)",
          fontWeight: 300,
          color: "rgba(203, 213, 225, 0.92)",
          lineHeight: 1.2,
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <span style={{ fontWeight: 700, color: "#f8fafc" }}>One platform.</span> Endless possibilities.
      </h1>
      <p
        style={{
          margin: "0 auto 28px",
          maxWidth: 560,
          fontSize: 15,
          fontWeight: 400,
          color: "#94a3b8",
          lineHeight: 1.65,
        }}
      >
        Map CV, assessment, coding, and AI interviews on one orbit—so global talent doesn’t get lost in the noise.
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "auto",
        }}
      >
        <Link
          to="/hr/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 26px",
            borderRadius: 999,
            background: "#f8fafc",
            color: "#030712",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
        >
          Get Started
        </Link>
        <Link
          to="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 26px",
            borderRadius: 999,
            border: "1px solid rgba(248, 250, 252, 0.4)",
            color: "#f8fafc",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
            background: "rgba(15, 23, 42, 0.35)",
            backdropFilter: "blur(8px)",
          }}
        >
          Book a Demo
        </Link>
      </div>

      {/* Neon chevron */}
      <div
        style={{
          marginTop: 36,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <svg width="100%" height="90" viewBox="0 0 720 90" style={{ maxWidth: 720 }}>
          <defs>
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="chevronGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <path
            d="M 40 12 L 360 78 L 680 12"
            fill="none"
            stroke="url(#chevronGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
            opacity="0.95"
          />
          <path
            d="M 40 12 L 360 78 L 680 12"
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        </svg>
      </div>
    </motion.section>
  );
}
