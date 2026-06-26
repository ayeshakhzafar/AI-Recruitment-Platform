// ✅ COMPLETE UNIFIED ASSESSMENT MANAGEMENT
// Combines: McqGenerator + HRDashboard with ALL features
// Side-by-side layout in Manage tab

import { useState, useEffect } from "react";
import McqForm from "../components/McqForm";

export default function AssessmentManagementPage() {
  // ========== TABS ==========
  const [activeTab, setActiveTab] = useState('generate');
  
  // ========== MCQ GENERATOR STATE ==========
  const [mcqs, setMcqs] = useState([]);
  const [assessmentId, setAssessmentId] = useState(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [testMode, setTestMode] = useState('standard');

  // ========== HR DASHBOARD STATE ==========
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ========== FETCH ASSESSMENTS ==========
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchAssessments();
    }
  }, [statusFilter, activeTab]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const url = statusFilter === "all" 
        ? "http://localhost:8000/api/mcq/assessments"
        : `http://localhost:8000/api/mcq/assessments?status=${statusFilter}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setAssessments(data.assessments || []);
    } catch (err) {
      console.error("Failed to fetch assessments:", err);
    } finally {
      setLoading(false);
    }
  };

  // ========== MCQ GENERATION ==========
  const handleGenerate = async (data) => {
    setGenerateLoading(true);
    setGenerateError(null);
    try {
      const res = await fetch("http://localhost:8000/api/mcq/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if(!res.ok){
        const err = await res.json();
        throw new Error(err?.detail || err?.error || 'Failed to generate MCQs');
      }
      const result = await res.json();
      setMcqs(result.questions || result.mcqs || []);
      setAssessmentId(result.assessment_id);
    } catch (e) {
      setGenerateError(e.message);
      console.error('Error generating MCQs:', e);
    } finally {
      setGenerateLoading(false);
    }
  };

  const copyGeneratedLink = () => {
    if (assessmentId) {
      const baseUrl = window.location.origin;
      const link = testMode === 'adaptive' 
        ? `${baseUrl}/adaptive-test?id=${assessmentId}`
        : `${baseUrl}/take-assessment?id=${assessmentId}`;
      
      navigator.clipboard.writeText(link);
      alert(`${testMode === 'adaptive' ? 'Adaptive' : 'Standard'} assessment link copied!`);
    }
  };

  const isStructuredMcq = (mcq) => {
    return mcq && typeof mcq === 'object' && mcq.question && mcq.options;
  };

  const renderStructuredMcq = (mcq, index) => (
    <div 
      key={index}
      style={{
        padding: 20,
        marginBottom: 20,
        background: '#fff',
        borderRadius: 12,
        border: '2px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}
    >
      <h4 style={{
        marginBottom: 16,
        color: '#111',
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1.5
      }}>
        Q{index + 1}. {mcq.question}
      </h4>
      
      <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
        {mcq.options && mcq.options.map((opt, idx) => (
          <div 
            key={idx}
            style={{
              padding: 14,
              background: '#f9fafb',
              borderRadius: 8,
              border: '1px solid #e5e7eb'
            }}
          >
            <strong style={{color: '#4f46e5', marginRight: 8}}>
              {opt.label})
            </strong>
            <span style={{color: '#374151'}}>
              {opt.text}
            </span>
          </div>
        ))}
      </div>
      
      <div style={{
        marginTop: 16,
        padding: 12,
        background: '#dcfce7',
        borderRadius: 8,
        border: '1px solid #86efac'
      }}>
        <strong style={{color: '#166534'}}>
          ✓ Correct Answer: {mcq.correct_answer}
        </strong>
      </div>
    </div>
  );

  // ========== HR DASHBOARD HANDLERS ==========
  const handleSelectAssessment = async (assessmentId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/mcq/assessment/${assessmentId}`);
      const data = await res.json();
      setSelectedAssessment(data);
      setEditedQuestions(JSON.parse(JSON.stringify(data.questions)));
      setEditMode(false);
    } catch (err) {
      console.error("Failed to fetch assessment details:", err);
      alert("Failed to load assessment details");
    }
  };

  const handleEnableEdit = () => {
    setEditMode(true);
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...editedQuestions];
    if (field === "question") {
      updated[index].question = value;
    } else if (field === "correct_answer") {
      updated[index].correct_answer = value;
    } else if (field.startsWith("option_")) {
      const optIndex = parseInt(field.split("_")[1]);
      updated[index].options[optIndex].text = value;
    }
    setEditedQuestions(updated);
  };

  const handleSaveChanges = async () => {
    if (!selectedAssessment) return;

    try {
      const res = await fetch(
        `http://localhost:8000/api/mcq/assessment/${selectedAssessment.assessment_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: editedQuestions,
            status: "reviewed"
          })
        }
      );

      if (!res.ok) throw new Error("Update failed");

      const data = await res.json();
      setSelectedAssessment(data.assessment);
      setEditMode(false);
      alert("✅ Assessment updated successfully!");
      fetchAssessments();
    } catch (err) {
      console.error("Failed to update assessment:", err);
      alert("❌ Failed to update assessment");
    }
  };

  const handleCancelEdit = () => {
    setEditedQuestions(JSON.parse(JSON.stringify(selectedAssessment.questions)));
    setEditMode(false);
  };

  const handleDeleteAssessment = async (assessmentId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/mcq/assessment/${assessmentId}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Delete failed");

      alert("✅ Assessment deleted successfully!");
      setDeleteConfirm(null);
      setSelectedAssessment(null);
      fetchAssessments();
    } catch (err) {
      console.error("Failed to delete assessment:", err);
      alert("❌ Failed to delete assessment");
    }
  };

  const handlePublishAssessment = async (assessmentId) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/mcq/assessment/${assessmentId}/publish`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error("Publish failed");

      alert("✅ Assessment published successfully!");
      fetchAssessments();
      if (selectedAssessment?.assessment_id === assessmentId) {
        handleSelectAssessment(assessmentId);
      }
    } catch (err) {
      console.error("Failed to publish assessment:", err);
      alert("❌ Failed to publish assessment");
    }
  };

  const copyAssessmentLink = (assessmentId) => {
    const baseUrl = window.location.origin;
    const assessment = assessments.find(a => a.assessment_id === assessmentId) || selectedAssessment;
    
    const link = (assessment?.is_adaptive || assessment?.difficulty === "adaptive")
      ? `${baseUrl}/adaptive-test?id=${assessmentId}`
      : `${baseUrl}/take-assessment?id=${assessmentId}`;
    
    navigator.clipboard.writeText(link);
    alert("📋 Assessment link copied to clipboard!");
  };

  const handleSendEmails = () => {
    const emails = prompt("Enter candidate emails (comma-separated):");
    if (emails) {
      const emailList = emails.split(',').map(e => e.trim()).filter(e => e);
      if (emailList.length > 0) {
        alert(`📧 Sending standard test to: ${emailList.join(', ')}\n(Email sending to be implemented)`);
      }
    }
  };

  const handleSendAdaptiveEmails = () => {
    const emails = prompt("Enter candidate emails (comma-separated):");
    if (emails) {
      const emailList = emails.split(',').map(e => e.trim()).filter(e => e);
      if (emailList.length > 0) {
        alert(`📧 Sending adaptive test to: ${emailList.join(', ')}\n(Email sending to be implemented)`);
      }
    }
  };

  return (
    <div style={{minHeight:'100vh', padding:40, background:'#f9fafb'}}>
      <div style={{maxWidth: 1600, margin: '0 auto'}}>
        {/* PAGE HEADER */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111", marginBottom: 8 }}>
            📝 Assessment Management
          </h1>
          <p style={{ color: "#666", fontSize: 16 }}>
            Generate new assessments and manage existing ones
          </p>
        </div>

        {/* TAB NAVIGATION */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 32,
          borderBottom: '2px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('generate')}
            style={{
              padding: '16px 32px',
              background: activeTab === 'generate' ? '#4f46e5' : 'transparent',
              color: activeTab === 'generate' ? '#fff' : '#666',
              border: 'none',
              borderBottom: activeTab === 'generate' ? '3px solid #4f46e5' : 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            🎯 Generate New
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            style={{
              padding: '16px 32px',
              background: activeTab === 'manage' ? '#4f46e5' : 'transparent',
              color: activeTab === 'manage' ? '#fff' : '#666',
              border: 'none',
              borderBottom: activeTab === 'manage' ? '3px solid #4f46e5' : 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            📚 Manage Existing
          </button>
        </div>

        {/* ========== GENERATE TAB ========== */}
        {activeTab === 'generate' && (
          <div style={{maxWidth: 900, margin: '0 auto'}}>
            {/* Test Mode Selection */}
            <div style={{
              background: '#fff',
              padding: 24,
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              marginBottom: 24,
              border: '2px solid #e5e7eb'
            }}>
              <label style={{ 
                display: 'block', 
                fontSize: 16, 
                fontWeight: 600, 
                marginBottom: 12,
                color: '#111'
              }}>
                Test Mode *
              </label>
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  cursor: 'pointer',
                  padding: '12px 20px',
                  background: testMode === 'standard' ? '#e0e7ff' : '#f9fafb',
                  border: testMode === 'standard' ? '2px solid #4f46e5' : '2px solid #e5e7eb',
                  borderRadius: 8,
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    value="standard"
                    checked={testMode === 'standard'}
                    onChange={(e) => setTestMode(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    📝 Standard (Fixed Difficulty)
                  </span>
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  cursor: 'pointer',
                  padding: '12px 20px',
                  background: testMode === 'adaptive' ? '#f3e8ff' : '#f9fafb',
                  border: testMode === 'adaptive' ? '2px solid #9333ea' : '2px solid #e5e7eb',
                  borderRadius: 8,
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    value="adaptive"
                    checked={testMode === 'adaptive'}
                    onChange={(e) => setTestMode(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    🎯 Adaptive (Dynamic Difficulty)
                  </span>
                </label>
              </div>
              
              <div style={{
                marginTop: 12,
                padding: 12,
                background: testMode === 'adaptive' ? '#fef3c7' : '#dbeafe',
                borderRadius: 8,
                fontSize: 13,
                color: '#374151'
              }}>
                {testMode === 'adaptive' ? (
                  <span>
                    <strong>🎯 Adaptive Mode:</strong> Questions generate one at a time. 
                    Difficulty adjusts based on performance.
                  </span>
                ) : (
                  <span>
                    <strong>📝 Standard Mode:</strong> All questions generated at once with fixed difficulty.
                  </span>
                )}
              </div>
            </div>

            {/* MCQ Form */}
            <McqForm onGenerate={handleGenerate} testMode={testMode} />

            {/* Loading */}
            {generateLoading && (
              <div style={{
                textAlign:'center',
                padding: 40,
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                marginTop: 24
              }}>
                <div style={{fontSize: 48, marginBottom: 12}}>⏳</div>
                <div style={{fontSize: 16, color: '#666', marginBottom: 8}}>
                  Generating {testMode === 'adaptive' ? 'Adaptive' : 'Standard'} MCQs...
                </div>
                <div style={{fontSize: 14, color: '#999'}}>
                  This may take 20-30 seconds
                </div>
              </div>
            )}

            {/* Error */}
            {generateError && (
              <div style={{
                color:'#dc2626',
                background:'#fee2e2',
                padding:16,
                borderRadius:8,
                border:'2px solid #fca5a5',
                marginTop: 24
              }}>
                <strong>❌ Error:</strong> {generateError}
              </div>
            )}

            {/* Generated MCQs */}
            {mcqs.length > 0 && (
              <div style={{
                background:'#fff',
                padding: 30,
                borderRadius:12,
                boxShadow:'0 4px 12px rgba(0,0,0,0.08)',
                marginTop: 24,
                border: '2px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 24,
                  paddingBottom: 16,
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <div>
                    <h3 style={{margin: 0, color:'#111', fontSize: 24, fontWeight: 700}}>
                      Generated {testMode === 'adaptive' ? 'Adaptive' : 'Standard'} MCQs
                    </h3>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{
                        background: '#4f46e5',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 14,
                        fontWeight: 600
                      }}>
                        {mcqs.length} Questions
                      </span>
                      <span style={{
                        background: testMode === 'adaptive' ? '#9333ea' : '#6b7280',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 14,
                        fontWeight: 600
                      }}>
                        {testMode === 'adaptive' ? '🎯 Adaptive' : '📝 Standard'}
                      </span>
                    </div>
                  </div>
                  
                  {assessmentId && (
                    <button
                      onClick={copyGeneratedLink}
                      style={{
                        padding: '12px 24px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 16,
                        fontWeight: 600
                      }}
                    >
                      📋 Copy Link
                    </button>
                  )}
                </div>
                
                {testMode === 'adaptive' && (
                  <div style={{
                    padding: 16,
                    background: '#fef3c7',
                    borderRadius: 8,
                    marginBottom: 20,
                    fontSize: 14,
                    color: '#92400e',
                    border: '1px solid #fde047'
                  }}>
                    <strong>⚠️ Note:</strong> In adaptive mode, candidates receive questions one at a time with dynamic difficulty.
                  </div>
                )}
                
                <div>
                  {mcqs.map((mcq, i) => 
                    isStructuredMcq(mcq) && renderStructuredMcq(mcq, i)
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== MANAGE TAB - SIDE BY SIDE ========== */}
        {activeTab === 'manage' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: selectedAssessment ? '420px 1fr' : '1fr',
            gap: 24,
            minHeight: 600
          }}>
            {/* LEFT: ASSESSMENTS LIST */}
            <div style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '2px solid #e5e7eb',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 280px)'
            }}>
              {/* Header */}
              <div style={{
                padding: 24,
                borderBottom: '2px solid #e5e7eb',
                background: '#f9fafb'
              }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 16 }}>
                  📚 All Assessments
                </h2>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: 'pointer',
                    background: '#fff'
                  }}
                >
                  <option value="all">All Assessments ({assessments.length})</option>
                  <option value="draft">Draft ({assessments.filter(a => a.status === 'draft').length})</option>
                  <option value="reviewed">Reviewed ({assessments.filter(a => a.status === 'reviewed').length})</option>
                  <option value="published">Published ({assessments.filter(a => a.status === 'published').length})</option>
                </select>
              </div>

              {/* List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: 16
              }}>
                {loading ? (
                  <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                    <div>Loading assessments...</div>
                  </div>
                ) : assessments.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                    <div style={{ fontSize: 14 }}>No assessments found</div>
                    <div style={{ fontSize: 12, marginTop: 8 }}>Generate one in the Generate tab</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {assessments.map((assessment) => (
                      <div
                        key={assessment.assessment_id}
                        onClick={() => handleSelectAssessment(assessment.assessment_id)}
                        style={{
                          padding: 16,
                          background: selectedAssessment?.assessment_id === assessment.assessment_id
                            ? '#dbeafe'
                            : '#f9fafb',
                          border: selectedAssessment?.assessment_id === assessment.assessment_id
                            ? '2px solid #3b82f6'
                            : '2px solid #e5e7eb',
                          borderRadius: 12,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#111',
                          marginBottom: 8
                        }}>
                          {assessment.role}
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: '#666',
                          marginBottom: 8
                        }}>
                          {assessment.questions?.length || 0} questions • {assessment.difficulty || 'medium'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '4px 8px',
                            background: assessment.status === 'published' ? '#dcfce7' :
                                       assessment.status === 'reviewed' ? '#fef3c7' : '#f3f4f6',
                            color: assessment.status === 'published' ? '#166534' :
                                   assessment.status === 'reviewed' ? '#92400e' : '#374151',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {assessment.status}
                          </span>
                          {(assessment.is_adaptive || assessment.difficulty === 'adaptive') && (
                            <span style={{
                              padding: '4px 8px',
                              background: '#f3e8ff',
                              color: '#9333ea',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600
                            }}>
                              🎯 ADAPTIVE
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: '#999' }}>
                            {new Date(assessment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: ASSESSMENT DETAILS */}
            {selectedAssessment && (
              <div style={{
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                border: '2px solid #e5e7eb',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 280px)'
              }}>
                {/* Header */}
                <div style={{
                  padding: 24,
                  background: '#f9fafb',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111' }}>
                        {selectedAssessment.role}
                      </h3>
                      <div style={{ marginTop: 8, fontSize: 14, color: '#666', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>{selectedAssessment.questions?.length || 0} questions</span>
                        <span>•</span>
                        <span>{selectedAssessment.difficulty || 'medium'} difficulty</span>
                        <span>•</span>
                        <span>{new Date(selectedAssessment.created_at).toLocaleDateString()}</span>
                      </div>
                      {(selectedAssessment.is_adaptive || selectedAssessment.difficulty === 'adaptive') && (
                        <div style={{
                          marginTop: 8,
                          padding: '6px 12px',
                          background: '#f3e8ff',
                          color: '#9333ea',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          display: 'inline-block'
                        }}>
                          🎯 Adaptive Test Mode
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedAssessment(null)}
                      style={{
                        padding: '8px 16px',
                        background: '#fff',
                        color: '#666',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      ✖
                    </button>
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!editMode ? (
                      <>
                        {selectedAssessment.status !== 'published' && (
                          <button
                            onClick={() => handlePublishAssessment(selectedAssessment.assessment_id)}
                            style={{
                              padding: "8px 16px",
                              background: "#10b981",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontSize: 14,
                              fontWeight: 600
                            }}
                          >
                            🚀 Publish
                          </button>
                        )}
                        <button
                          onClick={() => copyAssessmentLink(selectedAssessment.assessment_id)}
                          style={{
                            padding: "8px 16px",
                            background: "#fff",
                            color: "#4f46e5",
                            border: "1px solid #4f46e5",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 600
                          }}
                        >
                          📋 Copy Link
                        </button>

                        {(selectedAssessment.is_adaptive || selectedAssessment.difficulty === "adaptive") ? (
                          <button
                            onClick={handleSendAdaptiveEmails}
                            style={{
                              padding: "8px 16px",
                              background: "#10b981",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            📧 Email Adaptive
                          </button>
                        ) : (
                          <button
                            onClick={handleSendEmails}
                            style={{
                              padding: "8px 16px",
                              background: "#10b981",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            📧 Send Emails
                          </button>
                        )}

                        <button
                          onClick={handleEnableEdit}
                          style={{
                            padding: "8px 16px",
                            background: "#f59e0b",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 600
                          }}
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={() => setDeleteConfirm(selectedAssessment.assessment_id)}
                          style={{
                            padding: "8px 16px",
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 600
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleSaveChanges}
                          style={{
                            padding: "8px 16px",
                            background: "#10b981",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 600
                          }}
                        >
                          ✅ Save Changes
                        </button>
                        <button
                          onClick={handleCancelEdit}
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
                          ✖️ Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Questions */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 24
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {(editMode ? editedQuestions : selectedAssessment.questions || []).map((q, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 20,
                          background: "#f9fafb",
                          border: "2px solid #e5e7eb",
                          borderRadius: 12
                        }}
                      >
                        <div style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#666",
                          marginBottom: 12
                        }}>
                          Question {idx + 1}
                        </div>

                        {editMode ? (
                          <textarea
                            value={q.question}
                            onChange={(e) => handleQuestionChange(idx, "question", e.target.value)}
                            style={{
                              width: "100%",
                              minHeight: 80,
                              padding: 12,
                              border: "2px solid #e5e7eb",
                              borderRadius: 8,
                              fontSize: 15,
                              fontFamily: "inherit",
                              marginBottom: 12,
                              resize: "vertical"
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: 16, marginBottom: 16, lineHeight: 1.5, fontWeight: 500 }}>
                            {q.question}
                          </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {q.options?.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              style={{
                                padding: 12,
                                background: "#fff",
                                border: q.correct_answer === opt.label ? "2px solid #10b981" : "1px solid #e5e7eb",
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                gap: 12
                              }}
                            >
                              <strong style={{ color: "#4f46e5", minWidth: 30 }}>
                                {opt.label})
                              </strong>
                              {editMode ? (
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => handleQuestionChange(idx, `option_${optIdx}`, e.target.value)}
                                  style={{
                                    flex: 1,
                                    padding: 8,
                                    border: "1px solid #d1d5db",
                                    borderRadius: 6,
                                    fontSize: 14,
                                    fontFamily: "inherit"
                                  }}
                                />
                              ) : (
                                <span style={{ flex: 1 }}>{opt.text}</span>
                              )}
                              {q.correct_answer === opt.label && (
                                <span style={{
                                  padding: "4px 8px",
                                  background: "#dcfce7",
                                  color: "#166534",
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600
                                }}>
                                  ✓ Correct
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {editMode && (
                          <div style={{ marginTop: 12 }}>
                            <label style={{ fontSize: 14, color: "#666", marginRight: 12 }}>
                              Correct Answer:
                            </label>
                            <select
                              value={q.correct_answer}
                              onChange={(e) => handleQuestionChange(idx, "correct_answer", e.target.value)}
                              style={{
                                padding: "6px 12px",
                                border: "1px solid #d1d5db",
                                borderRadius: 6,
                                fontSize: 14
                              }}
                            >
                              {q.options?.map(opt => (
                                <option key={opt.label} value={opt.label}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div
            onClick={() => setDeleteConfirm(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                padding: 32,
                borderRadius: 16,
                maxWidth: 400,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
              }}
            >
              <h3 style={{ margin: 0, marginBottom: 16, fontSize: 20, fontWeight: 700, color: '#111' }}>
                ⚠️ Confirm Delete
              </h3>
              <p style={{ margin: 0, marginBottom: 24, color: '#666', fontSize: 14 }}>
                Are you sure you want to delete this assessment? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    padding: '10px 20px',
                    background: '#fff',
                    color: '#666',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteAssessment(deleteConfirm)}
                  style={{
                    padding: '10px 20px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}