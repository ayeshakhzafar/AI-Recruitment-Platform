"use client";

import { Link, useLocation } from "react-router-dom";
import RecrutoLogoMark from "./RecrutoLogoMark";

const linkStyle = (active) => ({
  color: active ? "#f8fafc" : "#94a3b8",
  fontSize: 14,
  fontWeight: 500,
  textDecoration: "none",
  padding: "8px 4px",
  borderBottom: active ? "2px solid rgba(248, 250, 252, 0.85)" : "2px solid transparent",
  transition: "color 0.2s, border-color 0.2s",
});

export default function LandingNav() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        pointerEvents: "auto",
        padding: "18px 28px",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        columnGap: 16,
        background: "linear-gradient(to bottom, rgba(3, 7, 18, 0.92) 0%, rgba(3, 7, 18, 0.55) 70%, transparent 100%)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ justifySelf: "start" }}>
        <RecrutoLogoMark />
      </div>

      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Link to="/" style={linkStyle(isHome)}>
          Home
        </Link>
        <Link to="/hr/pipeline" style={linkStyle(pathname.startsWith("/hr/pipeline"))}>
          Pipeline
        </Link>
        <Link to="/assessments" style={linkStyle(pathname.startsWith("/assessments"))}>
          Assessments
        </Link>
        <a href="#landing-modules" style={linkStyle(false)}>
          Modules
        </a>
        <Link to="/candidate" style={linkStyle(pathname.startsWith("/candidate"))}>
          Candidates
        </Link>
        <Link
          to="/hr/signup"
          style={{
            marginLeft: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#f472b6",
            textDecoration: "none",
            padding: "9px 8px",
          }}
        >
          HR sign up
        </Link>
        <Link
          to="/login"
          style={{
            marginLeft: 4,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "9px 18px",
            borderRadius: 999,
            border: "1px solid rgba(248, 250, 252, 0.35)",
            color: "#f8fafc",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "background 0.2s, border-color 0.2s",
          }}
        >
          Login
        </Link>
      </nav>
    </header>
  );
}
