import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import InterviewReportModal, { normalizeDbRowToSession } from '../components/InterviewReportModal';

const API_BASE = 'http://localhost:8000';

export default function InterviewsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const clearSessionQuery = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('session');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchCompletedSessions();
  }, []);

  /** Deep link: /interviews?session=<uuid> opens the report modal */
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (!sessionId || loading) return;

    const fromList = sessions.find((s) => s.session_id === sessionId);
    if (fromList) {
      setSelectedSession(fromList);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/interview/session/${encodeURIComponent(sessionId)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.success && data.session && !cancelled) {
          setSelectedSession(normalizeDbRowToSession(data.session));
        }
      } catch (err) {
        console.error('Failed to load session by id:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, sessions, loading]);

  const fetchCompletedSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/interview/completed-sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Satisfactory';
    return 'Needs Improvement';
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        padding: "40px",
        borderRadius: "24px",
        color: "white",
        textAlign: "center",
        marginBottom: "40px"
      }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>🎤</div>
        <h1 style={{ fontSize: "40px", margin: "0 0 16px 0" }}>AI Interview Results</h1>
        <p style={{ fontSize: "18px", opacity: 0.9 }}>View completed interview reports and candidate performance</p>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
          <p>Loading interview results...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div style={{
          background: "#f9fafb",
          padding: "60px",
          borderRadius: "16px",
          textAlign: "center",
          border: "2px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>No Interview Results Yet</h2>
          <p style={{ color: "#6b7280" }}>
            Completed interview results will appear here once candidates finish their AI interviews.
          </p>
          <button
            onClick={() => window.location.href = '/hr/dashboard'}
            style={{
              marginTop: "20px",
              padding: "12px 24px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            ← Back to HR Dashboard
          </button>
        </div>
      ) : (
        <div>
          {/* Summary Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            marginBottom: "30px"
          }}>
            <div style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#3b82f6" }}>{sessions.length}</div>
              <div style={{ color: "#6b7280", fontSize: "14px" }}>Total Interviews</div>
            </div>
            <div style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#10b981" }}>
                {sessions.filter(s => s.overall_score >= 60).length}
              </div>
              <div style={{ color: "#6b7280", fontSize: "14px" }}>Passed</div>
            </div>
            <div style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#f59e0b" }}>
                {sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + s.overall_score, 0) / sessions.length) : 0}%
              </div>
              <div style={{ color: "#6b7280", fontSize: "14px" }}>Avg Score</div>
            </div>
          </div>

          {/* Sessions Table */}
          <div style={{
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "20px 24px",
              borderBottom: "2px solid #e5e7eb",
              background: "#f9fafb"
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Interview Reports</h2>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Candidate</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Email</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Role</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Score</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Performance</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Date</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "16px", fontSize: "14px", fontWeight: "500" }}>
                        {session.candidate_name || 'N/A'}
                      </td>
                      <td style={{ padding: "16px", fontSize: "14px", color: "#6b7280" }}>
                        {session.candidate_email}
                      </td>
                      <td style={{ padding: "16px", fontSize: "14px", color: "#6b7280" }}>
                        {session.job_role || 'N/A'}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span style={{
                          padding: "6px 14px",
                          background: getScoreColor(session.overall_score),
                          color: "#fff",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "700"
                        }}>
                          {session.overall_score.toFixed(0)}%
                        </span>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span style={{
                          padding: "4px 12px",
                          background: session.overall_score >= 60 ? "#dcfce7" : "#fef3c7",
                          color: session.overall_score >= 60 ? "#166534" : "#92400e",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {getScoreLabel(session.overall_score)}
                        </span>
                      </td>
                      <td style={{ padding: "16px", fontSize: "13px", color: "#6b7280" }}>
                        {session.end_time ? new Date(session.end_time).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <button
                          onClick={() => setSelectedSession(session)}
                          style={{
                            padding: "8px 16px",
                            background: "#3b82f6",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500"
                          }}
                        >
                          📄 View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedSession && (
        <InterviewReportModal
          session={selectedSession}
          onClose={() => {
            setSelectedSession(null);
            clearSessionQuery();
          }}
          showStartNewInterviewButton
        />
      )}
    </div>
  );
}