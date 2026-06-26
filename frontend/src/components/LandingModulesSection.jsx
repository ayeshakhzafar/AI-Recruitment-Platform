"use client";

import { motion } from "framer-motion";
import { ExternalLink, Database, Cpu, ShieldCheck } from "lucide-react";
import { MODULES } from "./3d/module-data";

const mint = "#5eead4";
const mintDim = "rgba(94, 234, 212, 0.15)";
const mintGlow = "rgba(52, 211, 153, 0.45)";

function ConnectorBetween({ className }) {
  return (
    <div
      className={className}
      style={{
        flex: "0 0 48px",
        width: 48,
        height: 2,
        alignSelf: "center",
        marginTop: -56,
        background: `linear-gradient(90deg, transparent, ${mint}, transparent)`,
        opacity: 0.6,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%) rotate(45deg)",
          width: 8,
          height: 8,
          border: `1px solid ${mint}`,
          background: "#020617",
          boxShadow: `0 0 12px ${mintGlow}`,
        }}
        aria-hidden
      />
    </div>
  );
}

export default function LandingModulesSection() {
  const flowSteps = [
    {
      Icon: Database,
      label: "What enters your funnel",
      sub: "CVs, roles, and structured intake in one place",
    },
    {
      Icon: Cpu,
      label: "How candidates are evaluated",
      sub: "Assessments, coding, and AI interviews on one orbit",
    },
    {
      Icon: ShieldCheck,
      label: "Outputs you can stand behind",
      sub: "Results, reports, and audit-friendly signals for HR",
    },
  ];

  return (
    <section
      id="landing-modules"
      style={{
        position: "relative",
        zIndex: 10,
        overflow: "hidden",
        padding: "104px 20px 100px",
        marginTop: 48,
        background: `
          radial-gradient(ellipse 120% 70% at 50% -15%, rgba(15, 23, 42, 0.5) 0%, transparent 52%),
          radial-gradient(ellipse 90% 55% at 50% 115%, rgba(3, 7, 18, 0.55) 0%, transparent 48%),
          linear-gradient(180deg, #030712 0%, #000000 40%, #000000 60%, #030712 100%)
        `,
      }}
    >
      {/* subtle depth — black / slate only */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 45% at 25% 25%, rgba(30, 41, 59, 0.2) 0%, transparent 50%), radial-gradient(ellipse 55% 50% at 75% 75%, rgba(15, 23, 42, 0.18) 0%, transparent 45%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1120, margin: "0 auto", position: "relative" }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            textAlign: "center",
            margin: "0 0 28px",
            fontSize: 12,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(248, 250, 252, 0.75)",
            fontWeight: 600,
          }}
        >
          Platform modules · ship-ready pipeline 2025
        </motion.p>

        {/* Module cards — EQTY-style row / grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
            marginBottom: 80,
          }}
        >
          {MODULES.map((m) => (
            <div
              key={m.name}
              style={{
                borderRadius: 14,
                padding: "22px 20px 24px",
                textAlign: "center",
                background: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(94, 234, 212, 0.12)",
                boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 20px 50px rgba(0,0,0,0.35), 0 0 40px ${mintDim}`,
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  color: mint,
                  opacity: 0.9,
                }}
              >
                <ExternalLink size={22} strokeWidth={1.75} />
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#f8fafc",
                  lineHeight: 1.35,
                  letterSpacing: "-0.02em",
                }}
              >
                {m.title}
              </p>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 12,
                  color: "rgba(148, 163, 184, 0.95)",
                  lineHeight: 1.45,
                }}
              >
                {m.desc}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Verifiable-style headline + flow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.05 }}
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
              fontWeight: 700,
              color: "#f8fafc",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}
          >
            End-to-end hiring{" "}
            <span style={{ color: mint, textShadow: `0 0 40px ${mintDim}` }}>intelligence</span>
          </h2>
          <p style={{ margin: "14px auto 0", maxWidth: 520, fontSize: 15, color: "rgba(148, 163, 184, 0.95)", lineHeight: 1.55 }}>
            One globe, every stage—from intake to interview—aligned with how your team actually hires.
          </p>
        </motion.div>

        <motion.div
          className="landing-flow-row"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 8,
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          {flowSteps.map((step, i) => (
            <div key={step.label} style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", flexWrap: "nowrap" }}>
              {i > 0 && <ConnectorBetween className="landing-flow-connector" />}
              <div
                style={{
                  width: 220,
                  maxWidth: "100%",
                  textAlign: "center",
                  padding: "0 4px",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    margin: "0 auto 16px",
                    borderRadius: 16,
                    border: `1px solid rgba(94, 234, 212, 0.35)`,
                    boxShadow: `0 0 24px ${mintDim}, inset 0 0 20px rgba(6, 78, 59, 0.35)`,
                    background: "linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: mint,
                  }}
                >
                  <step.Icon size={32} strokeWidth={1.5} />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4 }}>{step.label}</p>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{step.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .landing-flow-connector { display: none !important; }
          .landing-flow-row { flex-direction: column !important; align-items: center !important; }
        }
      `}</style>
    </section>
  );
}
