"use client";

import { Link } from "react-router-dom";

/**
 * Header logo: globe-inspired mark + short "RT" lockup + full Recruto name.
 */
export default function RecrutoLogoMark({ compact = false }) {
  return (
    <Link
      to="/"
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 10 : 12,
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      {/* Globe + monogram mark */}
      <div
        style={{
          width: compact ? 40 : 46,
          height: compact ? 40 : 46,
          flexShrink: 0,
          borderRadius: "50%",
          background: "linear-gradient(145deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
          border: "1.5px solid rgba(99, 102, 241, 0.45)",
          boxShadow:
            "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(79, 70, 229, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 48 48" aria-hidden style={{ display: "block" }}>
          <defs>
            <linearGradient id="rtGlobeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
          {/* Meridian arcs (globe) */}
          <ellipse cx="24" cy="24" rx="14" ry="14" fill="none" stroke="url(#rtGlobeGrad)" strokeWidth="1.2" opacity="0.5" />
          <path
            d="M10 24 Q24 14 38 24 Q24 34 10 24"
            fill="none"
            stroke="url(#rtGlobeGrad)"
            strokeWidth="1"
            opacity="0.35"
          />
          <path
            d="M24 10 Q34 24 24 38 Q14 24 24 10"
            fill="none"
            stroke="url(#rtGlobeGrad)"
            strokeWidth="1"
            opacity="0.35"
          />
          {/* RT monogram */}
          <text
            x="24"
            y="29"
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="15"
            fontWeight="800"
            fontFamily="system-ui, Segoe UI, sans-serif"
            letterSpacing="-0.5px"
          >
            RT
          </text>
        </svg>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.1 }}>
        <span
          style={{
            fontSize: compact ? 20 : 22,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "#f8fafc",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          RT
        </span>
        <span
          style={{
            fontSize: compact ? 10 : 11,
            fontWeight: 600,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          Recruto
        </span>
      </div>
    </Link>
  );
}
