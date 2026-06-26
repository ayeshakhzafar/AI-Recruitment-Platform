"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { API_BASE } from "../config/apiBase";
import { HR_THEME } from "../theme/hrProfessionalTheme";
import "../styles/hr-professional.css";

const STATUS_HINT = {
  applied: "Submitted — HR has received your application.",
  screening: "Under review — your profile is being evaluated.",
  interview: "Interview stage — check email for scheduling.",
  offer: "Offer stage — decision or paperwork in progress.",
  hired: "Hired — congratulations!",
  rejected: "Not moving forward for this role.",
};

function authHeaders() {
  const token = localStorage.getItem("recruto_token");
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export default function CandidateDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("recruto_user") || "null");
    } catch {
      return null;
    }
  });
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [applyMsg, setApplyMsg] = useState({});
  const [profileName, setProfileName] = useState(user?.full_name || "");
  const [profileMsg, setProfileMsg] = useState("");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState({ ok: false, text: "" });
  const [pwLoading, setPwLoading] = useState(false);

  // Apply Modal state
  const [applyingJob, setApplyingJob] = useState(null); // holds job_id
  const [selectedJobId, setSelectedJobId] = useState(null); // holds job_id for full page view
  const [applyFile, setApplyFile] = useState(null);
  const [applyName, setApplyName] = useState(user?.full_name || "");
  const [applyEmail, setApplyEmail] = useState(user?.email || "");

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        setUser(data.user);
        localStorage.setItem(
          "recruto_user",
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.name,
            role: data.user.role,
          })
        );
        setProfileName(data.user.name || "");
        setApplyName(data.user.name || "");
        setApplyEmail(data.user.email || "");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE}/api/cv/job-postings?status=active`);
      const data = await res.json().catch(() => ({}));
      setJobs(data.job_postings || []);
    } catch {
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const res = await fetch(`${API_BASE}/api/candidate/applications`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setApplications(data.applications || []);
      else setApplications([]);
    } catch {
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("recruto_token");
    let u = null;
    try {
      u = JSON.parse(localStorage.getItem("recruto_user") || "null");
    } catch {
      u = null;
    }
    if (!token || !u || String(u.role || "").toLowerCase() !== "candidate") {
      navigate("/candidate", { replace: true });
      return;
    }
    refreshMe();
    loadJobs();
    loadApplications();
  }, [navigate, refreshMe, loadJobs, loadApplications]);

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!applyingJob) return;
    const jobId = applyingJob;
    
    setApplyMsg((m) => ({ ...m, [jobId]: "Submitting..." }));

    try {
      let formData = new FormData();
      formData.append("job_id", jobId);
      formData.append("name", applyName);
      formData.append("email", applyEmail);
      if (applyFile) {
        formData.append("cv_file", applyFile);
      }

      const token = localStorage.getItem("recruto_token");
      const res = await fetch(`${API_BASE}/api/candidate/apply-with-cv`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
          // Do NOT set Content-Type header manually when using FormData
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApplyMsg((m) => ({ ...m, [jobId]: data.detail || "Could not apply" }));
        return;
      }
      setApplyMsg((m) => ({ ...m, [jobId]: "Applied successfully." }));
      setApplyingJob(null);
      setApplyFile(null);
      loadApplications();
    } catch {
      setApplyMsg((m) => ({ ...m, [jobId]: "Network error" }));
    }
  };

  const requestInterviewLink = async (app) => {
    try {
      const res = await fetch(`${API_BASE}/api/hr/send-interview-invitation`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          candidate_emails: [user.email],
          role: app.job_title || "Software Engineer",
          questions: 8
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        alert("Interview link has been sent to your email!");
      } else {
        alert("Could not send interview link: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error. Please try again.");
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg("");
    const name = profileName.trim();
    if (!name) {
      setProfileMsg("Name is required.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ full_name: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileMsg(data.detail || "Update failed");
        return;
      }
      setProfileMsg("Saved.");
      await refreshMe();
    } catch {
      setProfileMsg("Could not reach API.");
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ ok: false, text: "" });
    if (pwNew.length < 8) {
      setPwMsg({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ current_password: pwCurrent, new_password: pwNew }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwMsg({ ok: false, text: data.detail || "Failed" });
        return;
      }
      setPwMsg({ ok: true, text: data.message || "Password updated." });
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch {
      setPwMsg({ ok: false, text: "Network error." });
    } finally {
      setPwLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("recruto_token");
    localStorage.removeItem("recruto_user");
    navigate("/candidate", { replace: true });
  };

  const appliedIds = new Set(applications.map((a) => a.job_id));

  const theme = HR_THEME;
  const d = HR_THEME.density;

  const goTab = (id) => {
    setTab(id);
    if (id !== "jobs") setSelectedJobId(null);
  };

  const navButton = (id, label) => {
    const isActive = tab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => goTab(id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: d.navItemPadding,
          background: isActive ? theme.navActive.bg : "transparent",
          border: isActive ? theme.navActive.border : "1px solid transparent",
          borderRadius: theme.radiusMd,
          boxShadow: isActive ? `inset 3px 0 0 ${theme.navActive.accentBar}` : "none",
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: d.navFontSize,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "#fff" : "rgba(255,255,255,0.78)",
            }}
          >
            {label}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      className="hr-professional-app"
      style={{ display: "flex", minHeight: "100vh", background: theme.bgPage, fontFamily: theme.fontFamily, color: theme.text }}
    >
      <aside
        style={{
          width: d.sidebarWidth,
          background: theme.sidebar.bg,
          padding: d.sidebarPadding,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
          boxShadow: theme.sidebar.shadow,
          borderRight: theme.sidebar.border,
        }}
      >
        <div style={{ marginBottom: 20, padding: "0 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: d.brandMarkSize,
                height: d.brandMarkSize,
                background: theme.brandMark.bg,
                borderRadius: theme.radiusMd,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: theme.brandMark.shadow,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Recruto</h2>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2, marginBottom: 0, fontWeight: 500 }}>
                Candidate portal
              </p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: "auto" }}>
          <div
            style={{
              marginBottom: 10,
              padding: "0 12px",
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.38)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            Menu
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {navButton("overview", "Overview")}
            {navButton("jobs", "Browse jobs")}
            {navButton("applications", "My applications")}
            {navButton("account", "Account & security")}
            <Link
              to="/my-results"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: d.navItemPadding,
                borderRadius: theme.radiusMd,
                textDecoration: "none",
                color: "rgba(255,255,255,0.78)",
                fontSize: d.navFontSize,
                fontWeight: 500,
                border: "1px solid transparent",
              }}
            >
              Assessment scores
            </Link>
          </div>
        </nav>

        <div
          style={{
            padding: d.snapshotPadding,
            background: "linear-gradient(160deg, rgba(0,0,0,0.35) 0%, rgba(15, 23, 42, 0.55) 100%)",
            borderRadius: theme.radiusLg,
            marginTop: 10,
            border: "1px solid rgba(147, 197, 253, 0.12)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.42)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            At a glance
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", fontWeight: 600 }}>
            {loadingJobs ? "…" : jobs.length} open roles
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", fontWeight: 600, marginTop: 6 }}>
            {loadingApps ? "…" : applications.length} applications
          </div>
        </div>

        <div style={{ marginTop: 12, padding: "0 8px" }}>
          <Link to="/" style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>
            ← Site home
          </Link>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            padding: d.headerPadding,
            background: theme.header.bg,
            backdropFilter: theme.header.backdrop,
            WebkitBackdropFilter: theme.header.backdrop,
            borderBottom: theme.header.borderBottom,
            boxShadow: theme.header.shadow,
            display: "flex",
            alignItems: "center",
            gap: d.headerGap,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Signed in
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: theme.textHeading, marginTop: 2 }}>
              {user?.full_name || user?.email || "Candidate"}
            </div>
            <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{user?.email}</div>
          </div>
          <button
            type="button"
            onClick={logout}
            style={{
              ...theme.buttonSecondary,
              padding: "8px 14px",
              borderRadius: theme.radiusMd,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </header>

        <main className="hr-professional-page" style={{ flex: 1, overflow: "auto", padding: d.mainPadding }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {tab === "overview" && (
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: d.moduleTitleSize, fontWeight: 800, color: theme.textHeading, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
            </h1>
            <p style={{ fontSize: d.moduleDescSize, color: theme.textSecondary, margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
              Browse open roles, submit applications with your CV, and track status here. Use the sidebar to move between sections.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 14,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => goTab("jobs")}
                style={{
                  textAlign: "left",
                  padding: 18,
                  borderRadius: theme.radiusLg,
                  border: theme.borderLight,
                  background: theme.bgCard,
                  boxShadow: theme.shadowCard,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Open roles</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: theme.primaryStrong, marginTop: 6 }}>{loadingJobs ? "—" : jobs.length}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>Browse &amp; apply</div>
              </button>
              <button
                type="button"
                onClick={() => goTab("applications")}
                style={{
                  textAlign: "left",
                  padding: 18,
                  borderRadius: theme.radiusLg,
                  border: theme.borderLight,
                  background: theme.bgCard,
                  boxShadow: theme.shadowCard,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Applications</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: theme.primaryStrong, marginTop: 6 }}>{loadingApps ? "—" : applications.length}</div>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>Status &amp; history</div>
              </button>
              <button
                type="button"
                onClick={() => goTab("account")}
                style={{
                  textAlign: "left",
                  padding: 18,
                  borderRadius: theme.radiusLg,
                  border: theme.borderLight,
                  background: theme.bgCard,
                  boxShadow: theme.shadowCard,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Profile</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: theme.textHeading, marginTop: 10 }}>Account &amp; security</div>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>Name &amp; password</div>
              </button>
            </div>
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button type="button" onClick={() => goTab("jobs")} style={{ ...theme.buttonPrimary, padding: "10px 18px", borderRadius: theme.radiusMd, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Go to jobs
              </button>
              <button type="button" onClick={() => goTab("applications")} style={{ ...theme.buttonSecondary, padding: "10px 18px", borderRadius: theme.radiusMd, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                View applications
              </button>
              <Link to="/my-results" style={{ ...theme.buttonSecondary, padding: "10px 18px", borderRadius: theme.radiusMd, fontWeight: 600, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Assessment scores
              </Link>
            </div>
          </div>
        )}

        {tab === "jobs" && selectedJobId && (
          <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "40px", position: "relative" }}>
            <button
              onClick={() => setSelectedJobId(null)}
              style={{ background: "#f1f5f9", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 8, marginBottom: 30 }}
            >
              <span>←</span> Back to Search
            </button>
            
            {jobs.filter(j => j.job_id === selectedJobId).map(j => (
              <div key={j.job_id}>
                <div style={{ borderBottom: "2px solid #f1f5f9", paddingBottom: 30, marginBottom: 30, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
                  <div>
                    <h1 style={{ margin: "0 0 8px", fontSize: 28, color: "#111", fontWeight: 800 }}>{j.title}</h1>
                    <div style={{ color: "#64748b", fontSize: 14 }}>Req ID: {j.job_id}</div>
                  </div>
                  
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {appliedIds.has(j.job_id) ? (
                      <span style={{ fontSize: 16, color: "#10b981", fontWeight: 700, padding: "12px 24px", background: "#dcfce7", borderRadius: 30 }}>
                        Application Submitted ✅
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setApplyingJob(j.job_id)}
                        style={{
                          padding: "14px 32px",
                          borderRadius: 30,
                          border: "none",
                          background: "#111",
                          color: "#fff",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontSize: 16,
                          boxShadow: "0 4px 12px rgba(17,17,17,0.2)"
                        }}
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40 }}>
                  <div>
                    <h2 style={{ fontSize: 20, color: "#111", margin: "0 0 16px" }}>Detailed Description</h2>
                    <div style={{ fontSize: 15, color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                      {j.description || "No full description provided by HR for this role."}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: 24, border: "1px solid #e2e8f0" }}>
                      <h3 style={{ fontSize: 16, margin: "0 0 20px", color: "#111" }}>Role Highlights</h3>
                      
                      <div style={{ marginBottom: 16 }}>
                        <span style={{ display: "block", color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Location</span>
                        <span style={{ color: "#0f172a", fontWeight: 600, fontSize: 15 }}>{j.location || "Remote"}</span>
                      </div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <span style={{ display: "block", color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Department</span>
                        <span style={{ color: "#0f172a", fontWeight: 600, fontSize: 15 }}>Information Technology</span>
                      </div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <span style={{ display: "block", color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Posted</span>
                        <span style={{ color: "#0f172a", fontWeight: 600, fontSize: 15 }}>{j.posted_at ? new Date(j.posted_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                      </div>
                      
                      <div style={{ height: 1, background: "#e2e8f0", margin: "20px 0" }}></div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <span style={{ display: "block", color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Key Skills</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {j.skills_to_evaluate ? j.skills_to_evaluate.split(',').map((skill, i) => (
                            <span key={i} style={{ background: "#e2e8f0", padding: "4px 8px", borderRadius: 4, fontSize: 12, color: "#334155", fontWeight: 600 }}>{skill.trim()}</span>
                          )) : (
                            <span style={{ background: "#e2e8f0", padding: "4px 8px", borderRadius: 4, fontSize: 12, color: "#334155", fontWeight: 600 }}>General Tech</span>
                          )}
                        </div>
                      </div>

                      {j.questions_to_generate > 0 && (
                        <div>
                          <span style={{ display: "block", color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Evaluation</span>
                          <span style={{ color: "#0f172a", fontWeight: 600, fontSize: 15 }}>{j.questions_to_generate} technical stages</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "jobs" && !selectedJobId && (
          <div>
            {/* Search Bar Row */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <div style={{
                flex: "0 1 400px",
                background: "#fff",
                borderRadius: 30,
                border: "1px solid #d1d5db",
                padding: "10px 20px",
              }}>
                <input 
                  type="text" 
                  placeholder="Search Keyword" 
                  style={{ width: "100%", border: "none", outline: "none", fontSize: 15, color: "#333" }}
                />
              </div>
              <div style={{
                flex: "0 1 400px",
                background: "#fff",
                borderRadius: 30,
                border: "1px solid #111", // Red highlight on location block like image
                padding: "0",
                display: "flex",
                alignItems: "center"
              }}>
                <div style={{ background: "#111", color: "#fff", padding: "10px 16px", borderRadius: "30px 0 0 30px", display: "flex", gap: 6, alignItems: "center" }}>
                  <span>📍</span>
                  <span>🕒</span>
                </div>
                <input 
                  type="text" 
                  placeholder="Search Location" 
                  style={{ flex: 1, border: "none", outline: "none", padding: "10px", fontSize: 15 }}
                />
                <select style={{ border: "none", outline: "none", padding: "10px 16px", borderLeft: "1px solid #e5e7eb", borderRadius: "0 30px 30px 0", background: "transparent", color: "#666", cursor: "pointer" }}>
                  <option>10 Miles</option>
                  <option>25 Miles</option>
                  <option>50 Miles</option>
                </select>
              </div>
              <button style={{
                background: "#111",
                color: "#fff",
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 18
              }}>
                🔍
              </button>
            </div>

            {/* Filters Row */}
            <div style={{ display: "flex", gap: 30, alignItems: "center", justifyContent: "center", paddingBottom: 20, borderBottom: "1px solid #e5e7eb", marginBottom: 15, fontSize: 14 }}>
              <button style={{ background: "none", border: "none", fontWeight: 600, color: "#333", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <span style={{ color: "#000000" }}>⚡</span> Filters
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#444" }}>
                Divisions <span>▼</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#444" }}>
                Locations <span>▼</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#444" }}>
                Categories 
                <span style={{ display: "flex", flexDirection: "column", fontSize: 10, lineHeight: 1 }}>
                  <span>▼</span>
                  <span>(+1 selected)</span>
                </span>
              </div>
            </div>

            {/* Results Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#666", marginBottom: 6 }}>
                  {jobs.length} Results
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e5e7eb", padding: "6px 12px", borderRadius: 20, fontSize: 13, color: "#444" }}>
                    Information Technology
                    <button style={{ border: "none", background: "#111", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer" }}>X</button>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#e5e7eb", padding: "6px 12px", borderRadius: 20, fontSize: 13, color: "#444" }}>
                    Clear All
                    <button style={{ border: "none", background: "#111", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer" }}>X</button>
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#666", display: "flex", gap: 4 }}>
                Sort By <strong style={{ color: "#333", cursor: "pointer" }}>Relevance ▼</strong>
              </div>
            </div>

            {/* Job List Container */}
            <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "10px 0" }}>
              {loadingJobs && <p style={{ padding: "30px", color: "#666", textAlign: "center" }}>Loading jobs…</p>}
              {!loadingJobs && jobs.length === 0 && (
                <p style={{ padding: "30px", color: "#666", textAlign: "center" }}>
                  No active listings yet. HR can publish a role from the dashboard.
                </p>
              )}
              {jobs.map((j, index) => (
                <div
                  key={j.job_id}
                  style={{
                    borderBottom: index < jobs.length - 1 ? "1px solid #f3f4f6" : "none",
                  }}
                >
                  <div
                    style={{
                      padding: "24px 30px",
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onClick={() => setSelectedJobId(j.job_id)}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.paddingLeft = "36px"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.paddingLeft = "30px"; }}
                  >
                    
                    <div style={{ flex: 2 }}>
                      <div style={{ fontWeight: 600, fontSize: 18, color: "#111", marginBottom: 6 }}>{j.title}</div>
                      <div style={{ fontSize: 13, color: "#9ca3af" }}>Req ID: {j.job_id || "N/A"}</div>
                    </div>
                  
                  <div style={{ flex: 1.5 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Location</div>
                    <div style={{ fontSize: 14, color: "#333", fontWeight: 500 }}>{j.location || "Remote"}</div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Categories</div>
                    <div style={{ fontSize: 14, color: "#333", fontWeight: 500 }}>Information Technology</div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Posted On</div>
                    <div style={{ fontSize: 14, color: "#333", fontWeight: 500 }}>
                      {j.posted_at ? new Date(j.posted_at).toLocaleDateString() : new Date().toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ flex: "0 0 120px", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    {appliedIds.has(j.job_id) ? (
                      <span style={{ fontSize: 14, color: "#10b981", fontWeight: 600 }}>Applied ✅</span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setApplyingJob(j.job_id); }}
                        style={{
                          padding: "10px 24px",
                          borderRadius: 30,
                          border: "none",
                          background: "#111",
                          color: "#fff",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: 14,
                          boxShadow: "0 2px 10px rgba(17,17,17,0.2)",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#3b82f6"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#111"}
                      >
                        Apply Now
                      </button>
                    )}
                    {applyMsg[j.job_id] && (
                      <span style={{ marginTop: 8, fontSize: 12, color: applyMsg[j.job_id].startsWith("Applied") ? "#10b981" : "#ef4444" }}>
                        {applyMsg[j.job_id]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              ))}
            </div>
          </div>
        )}

        {tab === "applications" && (
          <div>
            {loadingApps && <p style={{ color: "#666" }}>Loading…</p>}
            {!loadingApps && applications.length === 0 && (
              <p style={{ color: "#666", padding: 40, background: "#fff", borderRadius: 16, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                You have not applied yet. Open <strong>Browse jobs</strong> from the sidebar.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {applications.map((a) => (
                <div
                  key={a.application_id}
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 18, color: "#111" }}>{a.job_title}</div>
                      <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Req ID: {a.job_id}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "8px 16px",
                        borderRadius: 20,
                        background: "rgba(17, 17, 17, 0.1)",
                        color: "#111",
                      }}
                    >
                      {a.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 15, color: "#4b5563", margin: "14px 0 0", lineHeight: 1.5 }}>
                    {STATUS_HINT[a.status] || "Status updated by recruitment team."}
                  </p>
                  {a.applied_at && (
                    <p style={{ fontSize: 13, color: "#9ca3af", margin: "12px 0 0" }}>Applied {new Date(a.applied_at).toLocaleString()}</p>
                  )}
                  <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        goTab("jobs");
                        setSelectedJobId(a.job_id);
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(37, 99, 235, 0.35)",
                        background: "#fff",
                        color: theme.primaryStrong,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      View job posting
                    </button>
                    {a.status === "interview" && (
                      <button
                        type="button"
                        onClick={() => requestInterviewLink(a)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 10,
                          border: "none",
                          background: theme.primaryStrong,
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        Get Interview Link
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "account" && (
          <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 1fr" }}>
            <section style={{ padding: 24, borderRadius: 16, border: "1px solid #e5e7eb", background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 18, color: "#111" }}>Display Name</h2>
              <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    color: "#111",
                    fontSize: 15
                  }}
                />
                <button
                  type="submit"
                  style={{
                    alignSelf: "flex-start",
                    padding: "12px 24px",
                    borderRadius: 30,
                    border: "none",
                    background: "#111",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save Changes
                </button>
              </form>
              {profileMsg && <p style={{ margin: "12px 0 0", fontSize: 14, color: profileMsg === "Saved." ? "#10b981" : "#ef4444" }}>{profileMsg}</p>}
            </section>
            
            <section style={{ padding: 24, borderRadius: 16, border: "1px solid #e5e7eb", background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 18, color: "#111" }}>Change Password</h2>
              <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="password"
                  placeholder="Current password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  required
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    color: "#111",
                    fontSize: 15
                  }}
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  required
                  minLength={8}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    color: "#111",
                    fontSize: 15
                  }}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  required
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    color: "#111",
                    fontSize: 15
                  }}
                />
                <button
                  type="submit"
                  disabled={pwLoading}
                  style={{
                    alignSelf: "flex-start",
                    padding: "12px 24px",
                    borderRadius: 30,
                    border: "none",
                    background: "#111",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: pwLoading ? "wait" : "pointer",
                    marginTop: 4
                  }}
                >
                  {pwLoading ? "Updating…" : "Update Password"}
                </button>
              </form>
              {pwMsg.text && (
                <p style={{ margin: "12px 0 0", fontSize: 14, color: pwMsg.ok ? "#10b981" : "#ef4444" }}>{pwMsg.text}</p>
              )}
            </section>
          </div>
        )}
          </div>
        </main>
      </div>

      {/* Application Modal */}
      {applyingJob && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", padding: 30, borderRadius: 16, width: "100%", maxWidth: 450, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20 }}>Apply for Role</h2>
            <form onSubmit={submitApplication} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={applyName}
                  onChange={(e) => setApplyName(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={applyEmail}
                  onChange={(e) => setApplyEmail(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Upload CV (PDF)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  required
                  onChange={(e) => setApplyFile(e.target.files[0])}
                  style={{ width: "100%", padding: "8px", border: "1px dashed #d1d5db", borderRadius: 8, fontSize: 14 }}
                />
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#666" }}>Your CV will be automatically parsed by the HR system.</p>
              </div>
              
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setApplyingJob(null)}
                  style={{ flex: 1, padding: "12px", background: "#f3f4f6", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#333" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: "12px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
