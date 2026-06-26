import { useState, useEffect } from "react";
import { API_BASE } from "../config/apiBase";
import { HR_THEME } from "../theme/hrProfessionalTheme";
import "../styles/hr-professional.css";

export default function CandidateResultsPage() {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  

  // FR-PRO-07: Display assessment scores and feedback to candidates
  const handleSearch = async (e) => {
  e.preventDefault();
  
  if (!email.trim()) {
    alert("Please enter your email address");
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    alert("❌ Invalid email format");
    return;
  }

  try {
    setLoading(true);
    setSearched(true);
    
    const res = await fetch(`${API_BASE}/api/results/candidate/${encodeURIComponent(email.trim())}`);
    const data = await res.json();
    
    setResults(data.results || []);
  } catch (err) {
    console.error("Failed to fetch results:", err);
    alert("Failed to load results. Please try again.");
  } finally {
    setLoading(false);
  }
};

  // FR-RES-08: Detailed performance report
  const handleViewDetails = async (resultId) => {
    try {
      const res = await fetch(`${API_BASE}/api/results/${resultId}`);
      const data = await res.json();
      setSelectedResult(data);
    } catch (err) {
      console.error("Failed to fetch result details:", err);
      alert("Failed to load result details");
    }
  };

  // FR-PRO-08: Download performance reports
  const handleDownloadReport = (result) => {
    const reportContent = `
ASSESSMENT RESULT REPORT
========================

Candidate: ${result.candidate_email}
Role: ${result.role}
Difficulty: ${result.difficulty}

SCORE SUMMARY
-------------
Total Questions: ${result.total_questions}
Correct Answers: ${result.correct_answers}
Wrong Answers: ${result.wrong_answers}
Unanswered: ${result.unanswered}

Final Score: ${result.score_percentage.toFixed(1)}%
Grade: ${result.grade}

TIME INFORMATION
----------------
Start Time: ${new Date(result.start_time).toLocaleString()}
End Time: ${new Date(result.end_time).toLocaleString()}
Total Time: ${Math.floor(result.total_time_taken / 60)}m ${result.total_time_taken % 60}s

STATUS
------
${result.score_percentage >= 60 ? "✓ PASSED" : "✗ FAILED"}

Generated on: ${new Date().toLocaleString()}
`;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-result-${result.result_id}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getGradeColor = (grade) => {
    const colors = {
      "A+": "#10b981",
      "A": "#10b981",
      "B+": "#3b82f6",
      "B": "#3b82f6",
      "C+": "#f59e0b",
      "C": "#f59e0b",
      "D": "#ef4444",
      "F": "#ef4444"
    };
    return colors[grade] || "#6b7280";
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const theme = HR_THEME;

  return (
    <div
      className="hr-professional-app"
      style={{ minHeight: "100vh", background: theme.bgPage, fontFamily: theme.fontFamily, color: theme.text, padding: "28px 20px 40px" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#111", marginBottom: 8 }}>
            View Your Assessment Results
          </h1>
          <p style={{ color: "#666", fontSize: 16 }}>
            Enter your email to access your test scores and performance reports
          </p>
        </div>

        {/* Search Form */}
        <div style={{
          background: "#fff",
          padding: 32,
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          marginBottom: 32
        }}>
          <form onSubmit={handleSearch}>
            <div style={{ display: "flex", gap: 12, maxWidth: 600, margin: "0 auto" }}>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 16,
                  fontFamily: "inherit"
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "14px 32px",
                  background: loading ? "#9ca3af" : "#4f46e5",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 16,
                  fontWeight: 600
                }}
              >
                {loading ? "Searching..." : "🔍 View Results"}
              </button>
            </div>
          </form>
        </div>

        {/* Results List */}
        {searched && !loading && (
          <div>
            {results.length === 0 ? (
              <div style={{
                background: "#fff",
                padding: 60,
                borderRadius: 12,
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                <h3 style={{ fontSize: 20, color: "#666", marginBottom: 8 }}>
                  No Results Found
                </h3>
                <p style={{ color: "#999", fontSize: 14 }}>
                  We couldn't find any assessment results for this email address.
                  <br />
                  Please check your email or contact support if you believe this is an error.
                </p>
              </div>
            ) : (
              <div>
                <div style={{
                  background: "#fff",
                  padding: 20,
                  borderRadius: 12,
                  marginBottom: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#111" }}>
                    Your Assessment Results ({results.length})
                  </h2>
                </div>

                <div style={{ display: "grid", gap: 20 }}>
                  {results.map((result) => (
                    <div
                      key={result.result_id}
                      style={{
                        background: "#fff",
                        padding: 24,
                        borderRadius: 12,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        border: result.score_percentage >= 60 ? "2px solid #10b98120" : "2px solid #ef444420"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111" }}>
                            {result.role}
                          </h3>
                          <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
                            {result.difficulty} level • Completed on {new Date(result.end_time).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{
                          padding: "8px 16px",
                          background: result.score_percentage >= 60 ? "#dcfce7" : "#fee2e2",
                          color: result.score_percentage >= 60 ? "#166534" : "#991b1b",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 700
                        }}>
                          {result.score_percentage >= 60 ? "✓ PASSED" : "✗ FAILED"}
                        </div>
                      </div>

                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                        gap: 16,
                        marginBottom: 20
                      }}>
                        <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Score</div>
                          <div style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: result.score_percentage >= 60 ? "#10b981" : "#ef4444"
                          }}>
                            {result.score_percentage.toFixed(1)}%
                          </div>
                        </div>

                        <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Grade</div>
                          <div style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: getGradeColor(result.grade)
                          }}>
                            {result.grade}
                          </div>
                        </div>

                        <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Correct</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>
                            {result.correct_answers}/{result.total_questions}
                          </div>
                        </div>

                        <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Time</div>
                          <div style={{ fontSize: 20, fontWeight: 600, color: "#111" }}>
                            {formatTime(result.total_time_taken)}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        padding: 16,
                        background: result.score_percentage >= 60 ? "#dcfce7" : "#fef3c7",
                        borderRadius: 8,
                        marginBottom: 20
                      }}>
                        <div style={{ fontSize: 14, color: "#374151" }}>
                          <strong>Performance Summary:</strong>
                          <div style={{ marginTop: 8 }}>
                            ✓ Correct: {result.correct_answers} questions ({((result.correct_answers / result.total_questions) * 100).toFixed(1)}%)
                            <br />
                            ✗ Wrong: {result.wrong_answers} questions
                            <br />
                            ○ Unanswered: {result.unanswered} questions
                          </div>
                        </div>
                      </div>

                      {result.violations?.length > 0 && (
                        <div style={{
                          padding: 16,
                          background: "#fee2e2",
                          borderRadius: 8,
                          marginBottom: 20,
                          border: "1px solid #fca5a5"
                        }}>
                          <div style={{ fontSize: 14, color: "#991b1b", fontWeight: 600 }}>
                            ⚠️ {result.violations.length} violation(s) detected during assessment
                          </div>
                          <div style={{ fontSize: 12, color: "#991b1b", marginTop: 4 }}>
                            This may affect your final evaluation.
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          onClick={() => handleViewDetails(result.result_id)}
                          style={{
                            flex: 1,
                            padding: "12px",
                            background: "#4f46e5",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 600
                          }}
                        >
                          📊 View Detailed Report
                        </button>
                        <button
                          onClick={() => handleDownloadReport(result)}
                          style={{
                            flex: 1,
                            padding: "12px",
                            background: "#fff",
                            color: "#4f46e5",
                            border: "2px solid #4f46e5",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 600
                          }}
                        >
                          📥 Download Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedResult && (
        <div
          onClick={() => setSelectedResult(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              maxWidth: 900,
              maxHeight: "90vh",
              width: "100%",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
            }}
          >
            <div style={{
              padding: 24,
              borderBottom: "2px solid #e5e7eb",
              position: "sticky",
              top: 0,
              background: "#fff",
              zIndex: 10
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111" }}>
                  Detailed Assessment Report
                </h2>
                <button
                  onClick={() => setSelectedResult(null)}
                  style={{
                    padding: "8px 16px",
                    background: "#fff",
                    color: "#666",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  ✖ Close
                </button>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {/* Assessment Info */}
              <div style={{
                padding: 20,
                background: "#f9fafb",
                borderRadius: 8,
                marginBottom: 24
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#666" }}>Role</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#111", marginTop: 2 }}>
                      {selectedResult.result.role}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#666" }}>Difficulty</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#111", marginTop: 2, textTransform: "capitalize" }}>
                      {selectedResult.result.difficulty}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#666" }}>Start Time</div>
                    <div style={{ fontSize: 14, color: "#111", marginTop: 2 }}>
                      {new Date(selectedResult.result.start_time).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#666" }}>End Time</div>
                    <div style={{ fontSize: 14, color: "#111", marginTop: 2 }}>
                      {new Date(selectedResult.result.end_time).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Overview */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 16,
                marginBottom: 24
              }}>
                <div style={{ padding: 20, background: "#dcfce7", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#166534", marginBottom: 4 }}>Your Score</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#166534" }}>
                    {selectedResult.result.score_percentage.toFixed(1)}%
                  </div>
                </div>
                <div style={{ padding: 20, background: "#e0e7ff", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#4338ca", marginBottom: 4 }}>Grade</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#4338ca" }}>
                    {selectedResult.result.grade}
                  </div>
                </div>
                <div style={{ padding: 20, background: "#dbeafe", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#1e40af", marginBottom: 4 }}>Time Taken</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#1e40af" }}>
                    {formatTime(selectedResult.result.total_time_taken)}
                  </div>
                </div>
              </div>

              {/* Question-by-Question Breakdown */}
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#111" }}>
                Question-by-Question Breakdown
              </h3>
              
              {selectedResult.result.question_results?.map((qr, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 16,
                    marginBottom: 12,
                    background: qr.is_correct ? "#dcfce7" : qr.candidate_answer ? "#fee2e2" : "#f9fafb",
                    border: `2px solid ${qr.is_correct ? "#86efac" : qr.candidate_answer ? "#fca5a5" : "#e5e7eb"}`,
                    borderRadius: 8
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, color: "#4f46e5" }}>
                      Question {idx + 1}
                    </div>
                    <div style={{
                      padding: "4px 12px",
                      background: qr.is_correct ? "#10b981" : qr.candidate_answer ? "#ef4444" : "#9ca3af",
                      color: "#fff",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      {qr.is_correct ? "✓ Correct" : qr.candidate_answer ? "✗ Wrong" : "○ Unanswered"}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: 14, color: "#111", marginBottom: 12, lineHeight: 1.5 }}>
                    {qr.question_text}
                  </div>
                  
                  <div style={{ fontSize: 13 }}>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: "#666" }}>Your Answer:</span>{" "}
                      <span style={{ color: qr.is_correct ? "#166534" : "#991b1b" }}>
                        {qr.candidate_answer || "Not answered"}
                      </span>
                    </div>
                    {!qr.is_correct && qr.candidate_answer && (
                      <div>
                        <span style={{ fontWeight: 600, color: "#666" }}>Correct Answer:</span>{" "}
                        <span style={{ color: "#166534" }}>{qr.correct_answer}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Feedback Section */}
              <div style={{
                marginTop: 24,
                padding: 20,
                background: selectedResult.result.score_percentage >= 60 ? "#dcfce7" : "#fef3c7",
                borderRadius: 8,
                border: `2px solid ${selectedResult.result.score_percentage >= 60 ? "#86efac" : "#fde047"}`
              }}>
                <h4 style={{ margin: 0, marginBottom: 8, fontSize: 16, fontWeight: 600 }}>
                  {selectedResult.result.score_percentage >= 60 ? "🎉 Congratulations!" : "📚 Keep Learning!"}
                </h4>
                <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                  {selectedResult.result.score_percentage >= 60 
                    ? `You've successfully passed this assessment with a score of ${selectedResult.result.score_percentage.toFixed(1)}%. Great job! Your performance demonstrates strong understanding of the ${selectedResult.result.role} concepts.`
                    : `You scored ${selectedResult.result.score_percentage.toFixed(1)}% on this assessment. We encourage you to review the material and try again. Focus on the questions you missed to improve your understanding.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}