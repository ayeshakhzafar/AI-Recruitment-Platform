"use client";

import { motion } from "framer-motion";

const cards = [
  {
    title: "Pipeline coverage",
    value: "CV → Offer",
    detail: "All stages on one surface",
  },
  {
    title: "AI interviews",
    value: "Structured",
    detail: "Consistent scoring every time",
  },
  {
    title: "Time to insight",
    value: "Faster",
    detail: "Less noise, clearer next steps",
  },
];

export default function LandingStatsCards() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.7 }}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16,
        maxWidth: 1040,
        margin: "0 auto",
        padding: "8px 20px 0",
        pointerEvents: "auto",
      }}
    >
      {cards.map((c) => (
        <div
          key={c.title}
          style={{
            borderRadius: 14,
            padding: "18px 20px",
            background: "rgba(15, 23, 42, 0.45)",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            backdropFilter: "blur(14px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 40px rgba(0,0,0,0.25)",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            {c.title}
          </p>
          <p style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#e2e8f0" }}>{c.value}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.45 }}>{c.detail}</p>
        </div>
      ))}
    </motion.div>
  );
}
