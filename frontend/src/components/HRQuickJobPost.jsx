"use client";

import { useState } from "react";

const API_BASE = "http://localhost:8000";

/** Minimal HR form: publish a job so candidates can apply (portal). */
export default function HRQuickJobPost() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const userRaw = typeof window !== "undefined" ? localStorage.getItem("recruto_user") : null;
  let postedBy = "hr@recruto.local";
  try {
    if (userRaw) postedBy = JSON.parse(userRaw).email || postedBy;
  } catch {
    /* ignore */
  }
  const token = typeof window !== "undefined" ? localStorage.getItem("recruto_token") : null;

  const submit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    const t = title.trim();
    if (!t) {
      setMessage({ type: "err", text: "Job title is required." });
      return;
    }
    setLoading(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const parsedSkills = skillsInput
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      const res = await fetch(`${API_BASE}/api/cv/job-posting`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: t,
          description: description.trim() || `Open role: ${t}`,
          required_skills: parsedSkills,
          posted_by: postedBy,
          status: "active",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.detail || "Could not create posting." });
        return;
      }
      setMessage({ type: "ok", text: `Published. Job ID: ${data.job_id}` });
      setTitle("");
      setDescription("");
      setSkillsInput("");
    } catch {
      setMessage({ type: "err", text: "Network error — is the API running?" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(30, 27, 75, 0.06)",
        padding: 20,
        border: "1px solid rgba(20, 184, 166, 0.25)",
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        Candidate portal · Job posting
      </div>
      <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
        Post a job (quick)
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
        Creates an active listing in <code>job_postings</code>. Candidates sign up at <strong>/candidate</strong> and apply from their dashboard.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          placeholder="Job title (required)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            fontSize: 14,
          }}
        />
        <input
          placeholder="Required Skills (comma separated e.g. React, Node, Python)"
          value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            fontSize: 14,
          }}
        />
        <textarea
          placeholder="Short description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            fontSize: 14,
            resize: "vertical",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            alignSelf: "flex-start",
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: loading ? "#94a3b8" : "linear-gradient(135deg, #14b8a6, #0d9488)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Publishing…" : "Publish job"}
        </button>
      </form>
      {message.text && (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: message.type === "ok" ? "#047857" : "#b91c1c" }}>{message.text}</p>
      )}
    </div>
  );
}
