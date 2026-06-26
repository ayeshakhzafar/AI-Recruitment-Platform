"use client";

import { motion } from "framer-motion";

export default function LandingQuote() {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        maxWidth: 300,
        padding: "20px 22px",
        borderRadius: 16,
        background: "rgba(15, 23, 42, 0.5)",
        border: "1px solid rgba(147, 197, 253, 0.22)",
        boxShadow: "0 0 40px rgba(30, 64, 175, 0.12)",
        backdropFilter: "blur(12px)",
        alignSelf: "center",
        justifySelf: "end",
      }}
    >
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
            color: "#93c5fd",
          fontWeight: 600,
        }}
      >
        Recruto
      </p>
      <blockquote
        style={{
          margin: 0,
          padding: 0,
          border: "none",
          fontSize: "clamp(0.95rem, 1.5vw, 1.05rem)",
          fontWeight: 400,
          fontStyle: "italic",
          color: "#e2e8f0",
          lineHeight: 1.65,
        }}
      >
        “Hiring doesn’t stop at borders—neither should your pipeline. One orbit, every stage.”
      </blockquote>
    </motion.aside>
  );
}
