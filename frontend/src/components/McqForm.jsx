import { useState } from "react";

export default function McqForm({ onGenerate, testMode }) {  // ← Added testMode prop
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [errors, setErrors] = useState({});

  // ✅ Auto-calculate duration based on mode
  const duration = testMode === 'adaptive' 
    ? numQuestions * 2  // 2 minutes per question for adaptive
    : 30;  // Fixed 30 mins for standard

  const validateForm = () => {
    const newErrors = {};
    
    if (!role.trim()) {
      newErrors.role = "Role is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onGenerate({
      role: role.trim(),
      difficulty,
      num_questions: numQuestions,
      mode: testMode  // Use mode from parent component
    });
  };

  return (
    <div style={{
      maxWidth: 600,
      margin: "0 auto",
      background: "#fff",
      padding: 32,
      borderRadius: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
    }}>
      <h2 style={{ marginTop: 0, fontSize: 24, fontWeight: 700, color: "#111" }}>
        Generate Assessment
      </h2>
      
      <form onSubmit={handleSubmit}>
        {/* Role Input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
            Job Role *
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., Software Engineer, Data Analyst"
            style={{
              width: "100%",
              padding: "12px 16px",
              border: `2px solid ${errors.role ? "#ef4444" : "#e5e7eb"}`,
              borderRadius: 8,
              fontSize: 16,
              fontFamily: "inherit"
            }}
          />
          {errors.role && (
            <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
              {errors.role}
            </div>
          )}
        </div>

        {/* Difficulty Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
            Difficulty Level
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 16,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            <option value="easy">🟢 Easy - Basic concepts</option>
            <option value="medium">🟡 Medium - Standard knowledge</option>
            <option value="hard">🔴 Hard - Advanced expertise</option>
          </select>
        </div>

        {/* Number of Questions */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
            Number of Questions
          </label>
          <input
            type="number"
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
            min="1"
            max="20"
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 16,
              fontFamily: "inherit"
            }}
          />
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Choose between 1-20 questions
          </div>
        </div>

        {/* ✅ Duration (Auto-calculated, Read-only) */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
            Duration
          </label>
          <div style={{
            padding: '12px 16px',
            background: '#f9fafb',
            borderRadius: 8,
            fontSize: 15,
            color: '#374151',
            border: '2px solid #e5e7eb'
          }}>
            <strong>{duration} minutes</strong>
            {testMode === 'adaptive' && (
              <span style={{ fontSize: 13, color: '#666', marginLeft: 8 }}>
                ({numQuestions} questions × 2 min each)
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {testMode === 'adaptive' 
              ? 'Duration automatically calculated for adaptive mode'
              : 'Fixed 30 minutes for standard assessments'
            }
          </div>
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "14px",
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          🚀 Generate {testMode === 'adaptive' ? 'Adaptive' : 'Standard'} Assessment
        </button>
      </form>
    </div>
  );
}