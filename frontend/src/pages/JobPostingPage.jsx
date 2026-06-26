import { useState } from "react";
import { HR_THEME } from "../theme/hrProfessionalTheme";
import "../styles/hr-professional.css";

export default function JobPostingPage({ embedded = false } = {}) {
  const [jobTitle, setJobTitle] = useState("");
  const [timing, setTiming] = useState("Full-time");
  const [location, setLocation] = useState("On-site");
  const [salaryPackage, setSalaryPackage] = useState("");
  const [isCompetitiveSalary, setIsCompetitiveSalary] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [generatedPost, setGeneratedPost] = useState("");
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [postImage, setPostImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCopied, setShowCopied] = useState(false);
  const [publishStatus, setPublishStatus] = useState("");
  const t = HR_THEME;

  const generatePost = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description");
      return;
    }

    setError("");
    setIsLoading(true);
    setGeneratedPost("");
    setPostImage("");

    try {
      const response = await fetch(
        "http://localhost:8000/api/job-posting/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: jobDescription }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate post");
      }

      setGeneratedPost(data.result);
      setPostImage(data.image);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyPost = () => {
    navigator.clipboard.writeText(generatedPost).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  const publishToPortal = async () => {
    if (!jobTitle.trim()) {
      setError("Please enter a job title first");
      return;
    }

    setPublishStatus("publishing");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("recruto_token") : null;
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      let postedBy = "hr@recruto.local";
      const userRaw = typeof window !== "undefined" ? localStorage.getItem("recruto_user") : null;
      if (userRaw) {
        try { postedBy = JSON.parse(userRaw).email || postedBy; } catch {}
      }

      const finalDescription = generatedPost ? generatedPost : jobDescription;
      const detailedLocation = `${location} (${timing})`;
      const finalSalary = isCompetitiveSalary ? "Competitive Salary" : salaryPackage;

      const response = await fetch("http://localhost:8000/api/cv/job-posting", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: jobTitle.trim(),
          description: finalDescription || "Job Details.",
          required_skills: [],
          experience_level: "Entry Level",
          location: detailedLocation,
          salary_range: finalSalary,
          posted_by: postedBy,
          status: "active",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Could not publish job");
      }
      
      setPublishStatus("success");
      setTimeout(() => setPublishStatus(""), 3000);
    } catch (err) {
      setError(err.message);
      setPublishStatus("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generatePost();
    }
  };

  const cardPad = embedded ? 20 : 28;
  const mainGap = embedded ? 20 : 32;

  return (
    <div
      className="hr-professional-page"
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: embedded ? "0 0 24px" : "36px 28px 48px",
        minHeight: embedded ? "min-content" : "100vh",
        background: embedded ? "transparent" : t.bgPage,
        fontFamily: t.fontFamily,
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Standalone only: HR shell already shows title when embedded */}
        {!embedded && (
          <div style={{ marginBottom: 40, paddingBottom: 22, borderBottom: t.divider }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textHeading, marginBottom: 8, letterSpacing: "-0.03em" }}>
              Job posting
            </h1>
            <p style={{ fontSize: 15, color: t.textMuted, lineHeight: 1.55, maxWidth: 720 }}>
              Generate and publish job postings to LinkedIn and your candidate portal
            </p>
          </div>
        )}

        {/* Main Content — minmax prevents overflow; class for responsive */}
        <div
          className="job-posting-main-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: mainGap,
            alignItems: "start",
            width: "100%",
          }}
        >
          {/* Input Section */}
          <div
            style={{
              background: t.bgCard,
              borderRadius: t.radiusLg,
              padding: cardPad,
              border: t.borderSubtle,
              boxShadow: t.shadowCard,
              minWidth: 0,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: t.textHeading, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.primaryStrong} strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Job Details
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: t.textSecondary, fontSize: "14px" }}>Job Title</label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Python Developer"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: t.search.border,
                  borderRadius: t.radiusSm,
                  fontSize: "14px",
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 0.2s",
                  background: t.bgMuted,
                  color: t.textHeading,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: "16px",
                marginBottom: "20px",
                width: "100%",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: t.textSecondary, fontSize: "14px" }}>Timing</label>
                <select
                  value={timing}
                  onChange={(e) => setTiming(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: t.search.border,
                    borderRadius: t.radiusSm,
                    fontSize: "14px",
                    fontFamily: "inherit",
                    outline: "none",
                    background: t.bgMuted,
                    color: t.textHeading,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: t.textSecondary, fontSize: "14px" }}>Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: t.search.border,
                    borderRadius: t.radiusSm,
                    fontSize: "14px",
                    fontFamily: "inherit",
                    outline: "none",
                    background: t.bgMuted,
                    color: t.textHeading,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: t.textSecondary, fontSize: "14px" }}>Salary Package</label>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", minWidth: 0, width: "100%" }}>
                <input
                  type="text"
                  value={salaryPackage}
                  onChange={(e) => setSalaryPackage(e.target.value)}
                  placeholder="$80,000 - $100,000"
                  disabled={isCompetitiveSalary}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "12px 14px",
                    border: t.search.border,
                    borderRadius: t.radiusSm,
                    fontSize: "14px",
                    fontFamily: "inherit",
                    outline: "none",
                    background: isCompetitiveSalary ? t.bgMuted : t.bgMuted,
                    color: t.textHeading,
                    boxSizing: "border-box",
                  }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: t.textSecondary, fontWeight: "500", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={isCompetitiveSalary}
                    onChange={(e) => setIsCompetitiveSalary(e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Competitive
                </label>
              </div>
            </div>
            
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: t.textSecondary, fontSize: "14px" }}>Job Description / Prompt</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter your job description here...

Example:
We're looking for a Senior Python Developer to join our Company. You'll work with Django, AWS, and PostgreSQL to build our core product. Must have 5+ years experience.`}
              style={{
                width: "100%",
                minHeight: "200px",
                padding: "14px",
                border: t.search.border,
                borderRadius: t.radiusSm,
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                background: t.bgMuted,
                color: t.textHeading,
                lineHeight: "1.5",
                boxSizing: "border-box",
              }}
            />
            
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                onClick={generatePost}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  ...t.buttonPrimary,
                  borderRadius: t.radiusMd,
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.65 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isLoading ? (
                  <>
                    <div style={{ width: "16px", height: "16px", border: "2px solid #ffffff33", borderTopColor: "#ffffff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    Generate
                  </>
                )}
              </button>
              <button
                onClick={publishToPortal}
                disabled={publishStatus === "publishing"}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  background: publishStatus === "success" ? t.emerald : t.bgCard,
                  color: publishStatus === "success" ? "#fff" : t.textHeading,
                  border: publishStatus === "success" ? "none" : t.buttonSecondary.border,
                  borderRadius: t.radiusMd,
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: publishStatus === "publishing" ? "not-allowed" : "pointer",
                  opacity: publishStatus === "publishing" ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: publishStatus === "success" ? t.buttonPrimary.boxShadow : "none",
                }}
              >
                {publishStatus === "publishing" ? (
                  "Publishing..."
                ) : publishStatus === "success" ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Published
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Publish
                  </>
                )}
              </button>
            </div>
            
            {error && (
              <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", marginTop: "16px", fontSize: "14px" }}>
                {error}
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div
            style={{
              background: t.bgCard,
              borderRadius: t.radiusLg,
              padding: cardPad,
              border: t.borderSubtle,
              boxShadow: t.shadowCard,
              position: "relative",
              minWidth: 0,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: t.textHeading, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.primaryStrong} strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Preview
            </h2>
            
            {generatedPost && (
              <button
                onClick={copyPost}
                style={{
                  position: "absolute",
                  top: "24px",
                  right: "24px",
                  padding: "8px 16px",
                  ...t.buttonPrimary,
                  borderRadius: t.radiusSm,
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {showCopied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy
                  </>
                )}
              </button>
            )}

            {/* Placeholder */}
            {!isLoading && !generatedPost && (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "#9ca3af" }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 16px", opacity: 0.4 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <p style={{ fontSize: "14px", color: "#6b7280" }}>Your generated post will appear here</p>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div style={{ textAlign: "center", padding: "60px" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid #e5e7eb", borderTopColor: "#111827", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
                <p style={{ fontSize: "14px", color: "#6b7280" }}>Generating your job post...</p>
              </div>
            )}

            {/* LinkedIn Post Preview */}
            {generatedPost && (
              <div style={{ background: "#ffffff", borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: t.brandMark.bg, boxShadow: t.brandMark.shadow, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontWeight: "600", fontSize: "16px" }}>
                    AI
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", color: "#111827", fontSize: "14px" }}>Your Company</div>
                    <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px" }}>Just now</div>
                  </div>
                </div>

                {postImage && (
                  <div style={{ width: "100%", maxHeight: "350px", overflow: "hidden", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={postImage} alt="Job post" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}

                <div style={{ padding: "20px", maxHeight: "350px", overflowY: "auto", lineHeight: "1.6", color: "#111827", fontSize: "14px" }}>
                  <button onClick={() => setIsEditingPost(!isEditingPost)} style={{ position: "absolute", top: "20px", right: "20px", background: "#f3f4f6", border: "1px solid #e5e7eb", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500", color: "#374151" }}>
                    {isEditingPost ? "Save" : "Edit"}
                  </button>
                  
                  {isEditingPost ? (
                    <textarea value={generatedPost} onChange={(e) => setGeneratedPost(e.target.value)} style={{ width: "100%", minHeight: "250px", padding: "12px", marginTop: "30px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", resize: "vertical", fontFamily: "inherit" }} />
                  ) : (
                    <div style={{ whiteSpace: "pre-wrap" }}>{generatedPost}</div>
                  )}
                </div>

                <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-around" }}>
                  {["Like", "Comment", "Repost", "Send"].map((action) => (
                    <button key={action} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "none", background: "none", color: "#6b7280", cursor: "pointer", fontSize: "13px", fontWeight: "500", borderRadius: "4px" }}>
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 1024px) {
          .job-posting-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}