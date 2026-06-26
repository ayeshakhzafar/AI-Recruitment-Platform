import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HR_THEME } from "../theme/hrProfessionalTheme";
import "../styles/hr-professional.css";

export default function HRPipelineDashboard() {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateDetail, setCandidateDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const t = HR_THEME;

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/api/hr/pipeline");
      const data = await res.json();
      if (data.success) {
        setPipeline(data.pipeline);
      }
    } catch (err) {
      console.error("Failed to fetch pipeline:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidateDetail = async (email) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`http://localhost:8000/api/hr/pipeline/${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success) {
        setCandidateDetail(data.candidate);
      }
    } catch (err) {
      console.error("Failed to fetch candidate detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCandidateClick = (candidate) => {
    setSelectedCandidate(candidate);
    fetchCandidateDetail(candidate.email);
  };

  const getStageColor = (stage) => {
    const colors = {
      cv: { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
      assessment: { bg: "#dbeafe", border: "#60a5fa", text: "#1e40af" },
      coding: { bg: "#e0f2fe", border: "#38bdf8", text: "#075985" },
      interview: { bg: "#eef2ff", border: "#a5b4fc", text: "#3730a3" },
      recommendation: { bg: "#f8fafc", border: "#cbd5e1", text: "#0f172a" },
    };
    return colors[stage] || colors.cv;
  };

  const getStageIcon = (stage) => {
    const icons = {
      cv: "📄",
      assessment: "📝",
      coding: "💻",
      interview: "🎤",
      recommendation: "⭐"
    };
    return icons[stage] || "📋";
  };

  const filteredCandidates = pipeline?.candidates?.filter(c => {
    const matchesStage = stageFilter === "all" || c.current_stage === stageFilter;
    const matchesSearch = !searchTerm || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStage && matchesSearch;
  }) || [];

  if (loading) {
    return (
      <div
        className="hr-professional-page"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: t.bgPage,
          fontFamily: t.fontFamily,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔄</div>
          <div style={{ fontSize: 18, color: t.textMuted, fontWeight: 600 }}>Loading pipeline…</div>
        </div>
      </div>
    );
  }

  const statCard = (extra = {}) => ({
    background: t.bgCard,
    padding: 24,
    borderRadius: t.radiusLg,
    boxShadow: t.shadowCard,
    border: t.borderSubtle,
    ...extra,
  });

  return (
    <div
      className="hr-professional-page"
      style={{ minHeight: "100vh", background: t.bgPage, padding: "28px 24px 48px", fontFamily: t.fontFamily }}
    >
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: t.textHeading, margin: "0 0 10px", letterSpacing: "-0.03em" }}>
              Candidate pipeline
            </h1>
            <p style={{ color: t.textMuted, fontSize: 16, margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
              Track everyone from CV through recommendation in one professional view.
            </p>
          </div>
          <Link
            to="/hr/dashboard"
            style={{
              ...t.buttonSecondary,
              padding: "12px 20px",
              borderRadius: t.radiusPill,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ← HR dashboard
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18, marginBottom: 28 }}>
          <div style={statCard({ background: `linear-gradient(145deg, ${t.primaryStrong} 0%, ${t.primary} 100%)`, color: "#fff", border: "1px solid rgba(167,243,208,0.35)" })}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Total candidates
            </div>
            <div style={{ fontSize: 38, fontWeight: 800 }}>{pipeline?.statistics?.total_candidates || 0}</div>
          </div>
          <div style={statCard()}>
            <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8, fontWeight: 600 }}>Pending</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#ca8a04" }}>{pipeline?.statistics?.pending || 0}</div>
          </div>
          <div style={statCard()}>
            <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8, fontWeight: 600 }}>In progress</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: t.primary }}>{pipeline?.statistics?.in_progress || 0}</div>
          </div>
          <div style={statCard()}>
            <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8, fontWeight: 600 }}>Completed</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: t.emerald }}>{pipeline?.statistics?.completed || 0}</div>
          </div>
        </div>

        <div
          style={{
            ...statCard({ padding: 28, marginBottom: 28 }),
          }}
        >
          <h3 style={{ margin: "0 0 22px", fontSize: 18, fontWeight: 700, color: t.textHeading }}>Pipeline flow</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            {pipeline?.stages?.map((stage, index) => {
              const count = pipeline.statistics?.by_stage?.[stage.id] || 0;
              const isActive = count > 0;
              return (
                <div key={stage.id} style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center",
                  flex: 1,
                  minWidth: 100
                }}>
                  <div style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: "50%", 
                    background: isActive ? getStageColor(stage.id).bg : t.bgMuted,
                    border: `3px solid ${isActive ? getStageColor(stage.id).border : "rgba(22,101,52,0.12)"}`,
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontSize: 24,
                    marginBottom: 8
                  }}>
                    {stage.icon}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: isActive ? t.textHeading : t.textMuted }}>{stage.name}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: isActive ? getStageColor(stage.id).text : t.textMuted }}>{count}</div>
                  {index < pipeline.stages.length - 1 && (
                    <div style={{ 
                      position: "absolute", 
                      width: 50, 
                      height: 2, 
                      background: "#e5e7eb",
                      marginTop: -45,
                      marginLeft: "60%"
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "12px 18px",
              border: t.search.border,
              borderRadius: t.radiusPill,
              fontSize: 14,
              width: 300,
              maxWidth: "100%",
              outline: "none",
              background: t.bgMuted,
              color: t.textHeading,
              fontFamily: t.fontFamily,
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setStageFilter("all")}
              style={{
                padding: "10px 18px",
                background: stageFilter === "all" ? t.primary : t.bgCard,
                color: stageFilter === "all" ? "#fff" : t.textSecondary,
                border: stageFilter === "all" ? "none" : t.buttonSecondary.border,
                borderRadius: t.radiusPill,
                cursor: "pointer",
                fontWeight: 700,
                fontFamily: t.fontFamily,
                boxShadow: stageFilter === "all" ? t.buttonPrimary.boxShadow : "none",
              }}
            >
              All stages
            </button>
            {pipeline?.stages?.map((stage) => (
              <button
                type="button"
                key={stage.id}
                onClick={() => setStageFilter(stage.id)}
                style={{
                  padding: "10px 16px",
                  background: stageFilter === stage.id ? getStageColor(stage.id).bg : t.bgCard,
                  color: stageFilter === stage.id ? getStageColor(stage.id).text : t.textSecondary,
                  border: `1px solid ${stageFilter === stage.id ? getStageColor(stage.id).border : "rgba(22,101,52,0.15)"}`,
                  borderRadius: t.radiusPill,
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: t.fontFamily,
                }}
              >
                {stage.icon} {stage.name}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", color: t.textMuted, fontSize: 14, fontWeight: 500 }}>
            Showing {filteredCandidates.length} of {pipeline?.candidates?.length || 0} candidates
          </div>
        </div>

        <div
          style={{
            background: t.bgCard,
            borderRadius: t.radiusLg,
            boxShadow: t.shadowCard,
            border: t.borderSubtle,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 22,
              borderBottom: t.divider,
              background: t.bgMuted,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: t.textHeading }}>Candidate list</h3>
          </div>
          
          {filteredCandidates.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: t.textMuted }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: t.textHeading }}>No candidates found</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>Upload CVs to start tracking candidates</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: t.bgMuted }}>
                  <th style={{ padding: 16, textAlign: "left", fontWeight: 700, color: t.textSecondary, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}>Candidate</th>
                  <th style={{ padding: 16, textAlign: "left", fontWeight: 700, color: t.textSecondary, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}>Current stage</th>
                  <th style={{ padding: 16, textAlign: "left", fontWeight: 700, color: t.textSecondary, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}>Stage details</th>
                  <th style={{ padding: 16, textAlign: "left", fontWeight: 700, color: t.textSecondary, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}>Timeline</th>
                  <th style={{ padding: 16, textAlign: "center", fontWeight: 700, color: t.textSecondary, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate, idx) => {
                  const stageColor = getStageColor(candidate.current_stage);
                  const stageInfo = pipeline?.stages?.find(s => s.id === candidate.current_stage);
                  
                  return (
                    <tr 
                      key={candidate.email} 
                      style={{ 
                        borderBottom: "1px solid rgba(22,101,52,0.08)",
                        background: selectedCandidate?.email === candidate.email ? "rgba(34,197,94,0.08)" : t.bgCard,
                      }}
                    >
                      <td style={{ padding: 16 }}>
                        <div style={{ fontWeight: 700, color: t.textHeading }}>{candidate.name}</div>
                        <div style={{ fontSize: 14, color: t.textMuted }}>{candidate.email}</div>
                      </td>
                      <td style={{ padding: 16 }}>
                        <span style={{
                          padding: "6px 14px",
                          background: stageColor.bg,
                          color: stageColor.text,
                          border: `1px solid ${stageColor.border}`,
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          {getStageIcon(candidate.current_stage)} {stageInfo?.name || candidate.current_stage}
                        </span>
                      </td>
                      <td style={{ padding: 16, fontSize: 14 }}>
                        {candidate.stage_details?.cv && (
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ color: t.textMuted }}>Match: </span>
                            <span style={{ fontWeight: 600, color: candidate.stage_details.cv.skill_match_percentage >= 70 ? "#10b981" : "#f59e0b" }}>
                              {candidate.stage_details.cv.skill_match_percentage || 0}%
                            </span>
                          </div>
                        )}
                        {candidate.stage_details?.interview && (
                          <div>
                            <span style={{ color: t.textMuted }}>Score: </span>
                            <span style={{ fontWeight: 600, color: t.primaryStrong }}>
                              {candidate.stage_details.interview.score || "N/A"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: 16, fontSize: 13 }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {candidate.timeline?.map((ev, i) => (
                            <span 
                              key={i}
                              style={{
                                padding: "2px 8px",
                                background: t.bgMuted,
                                borderRadius: 6,
                                fontSize: 11,
                                color: t.textMuted
                              }}
                              title={`${ev.stage} - ${ev.status}`}
                            >
                              {getStageIcon(ev.stage)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: 16, textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleCandidateClick(candidate)}
                          style={{
                            padding: "10px 18px",
                            ...t.buttonPrimary,
                            borderRadius: t.radiusPill,
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: t.fontFamily,
                          }}
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              background: t.bgCard,
              borderRadius: t.radiusXl,
              width: "90%",
              maxWidth: 800,
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: t.shadowCardHover,
              border: t.borderSubtle,
            }}>
              {detailLoading ? (
                <div style={{ padding: 60, textAlign: "center" }}>
                  <div style={{ fontSize: 24 }}>Loading...</div>
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div style={{
                    padding: 24,
                    borderBottom: t.divider,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "sticky",
                    top: 0,
                    background: t.bgMuted,
                  }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: t.textHeading }}>
                        {candidateDetail?.cv?.name || selectedCandidate.name}
                      </h2>
                      <div style={{ color: t.textMuted, marginTop: 4 }}>{selectedCandidate.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCandidate(null)}
                      style={{
                        padding: "8px 16px",
                        background: t.bgCard,
                        border: t.borderSubtle,
                        borderRadius: t.radiusSm,
                        cursor: "pointer",
                        fontSize: 16,
                        color: t.textHeading,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div style={{ padding: 24 }}>
                    {/* Current Stage */}
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Current Status</h3>
                      <div style={{
                        padding: 16,
                        background: getStageColor(candidateDetail?.current_stage || selectedCandidate.current_stage).bg,
                        border: `1px solid ${getStageColor(candidateDetail?.current_stage || selectedCandidate.current_stage).border}`,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 12
                      }}>
                        <span style={{ fontSize: 32 }}>
                          {getStageIcon(candidateDetail?.current_stage || selectedCandidate.current_stage)}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 18 }}>
                            {pipeline?.stages?.find(s => s.id === (candidateDetail?.current_stage || selectedCandidate.current_stage))?.name}
                          </div>
                          <div style={{ fontSize: 14, color: t.textMuted }}>
                            {candidateDetail?.current_stage === "recommendation" ? "Completed all stages" : "In progress"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CV Details */}
                    {candidateDetail?.cv && (
                      <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>📄 CV Profile</h3>
                        <div style={{ 
                          background: t.bgMuted, 
                          padding: 16, 
                          borderRadius: t.radiusMd,
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: 12,
                          border: t.borderSubtle,
                        }}>
                          <div>
                            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Skill Match</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: candidateDetail.cv.skill_match_percentage >= 70 ? "#10b981" : "#f59e0b" }}>
                              {candidateDetail.cv.skill_match_percentage}%
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Status</div>
                            <div style={{ fontSize: 16, fontWeight: 600, textTransform: "capitalize" }}>
                              {candidateDetail.cv.status || "pending"}
                            </div>
                          </div>
                          {candidateDetail.cv.skills?.length > 0 && (
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Skills</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {candidateDetail.cv.skills.slice(0, 10).map((skill, i) => (
                                  <span key={i} style={{
                                    padding: "4px 10px",
                                    background: "rgba(34,197,94,0.12)",
                                    color: t.primaryStrong,
                                    borderRadius: 12,
                                    fontSize: 12,
                                    fontWeight: 600
                                  }}>
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Interview History */}
                    {candidateDetail?.interviews?.length > 0 && (
                      <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>🎤 Interview History</h3>
                        {candidateDetail.interviews.map((interview, i) => (
                          <div key={i} style={{
                            background: t.bgMuted,
                            padding: 16,
                            borderRadius: t.radiusMd,
                            marginBottom: 12,
                            border: t.borderSubtle,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontWeight: 600 }}>{interview.job_role}</span>
                              <span style={{
                                padding: "2px 10px",
                                background: interview.status === "completed" ? "#dcfce7" : "#fef3c7",
                                color: interview.status === "completed" ? "#166534" : "#92400e",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                textTransform: "capitalize"
                              }}>
                                {interview.status}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 24, fontSize: 14, color: t.textMuted }}>
                              {interview.score && (
                                <div>Score: <span style={{ fontWeight: 600, color: t.primaryStrong }}>{interview.score}</span></div>
                              )}
                              {interview.start_time && (
                                <div>Date: {new Date(interview.start_time).toLocaleDateString()}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timeline */}
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>📅 Timeline</h3>
                      <div style={{ position: "relative", paddingLeft: 24 }}>
                        {selectedCandidate.timeline?.map((ev, i) => (
                          <div key={i} style={{ 
                            position: "relative",
                            paddingBottom: i < selectedCandidate.timeline.length - 1 ? 20 : 0
                          }}>
                            {i < selectedCandidate.timeline.length - 1 && (
                              <div style={{
                                position: "absolute",
                                left: 8,
                                top: 24,
                                bottom: 0,
                                width: 2,
                                background: "rgba(22,101,52,0.12)"
                              }} />
                            )}
                            <div style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: t.primary,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10
                            }}>
                              {getStageIcon(ev.stage)}
                            </div>
                            <div style={{ paddingLeft: 12 }}>
                              <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{ev.stage}</div>
                              <div style={{ fontSize: 13, color: t.textMuted, textTransform: "capitalize" }}>{ev.status}</div>
                              {ev.date && (
                                <div style={{ fontSize: 12, color: t.textMuted }}>{new Date(ev.date).toLocaleDateString()}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
