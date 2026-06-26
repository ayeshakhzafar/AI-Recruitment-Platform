import { useState } from "react";
import McqForm from "../components/McqForm";

export default function McqGeneratorPage(){
  const [mcqs, setMcqs] = useState([]);
  const [assessmentId, setAssessmentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testMode, setTestMode] = useState('standard');

  const handleGenerate = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/mcq/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),  // data already includes mode from form
      });
      if(!res.ok){
        const err = await res.json();
        throw new Error(err?.detail || err?.error || 'Failed to generate MCQs');
      }
      const result = await res.json();
      setMcqs(result.questions || result.mcqs || []);
      setAssessmentId(result.assessment_id);
    } catch (e) {
      setError(e.message);
      console.error('Error generating MCQs:', e);
    } finally {
      setLoading(false);
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

  const copyAssessmentLink = () => {
    if (assessmentId) {
      const baseUrl = window.location.origin;
      const link = testMode === 'adaptive' 
        ? `${baseUrl}/adaptive-test?id=${assessmentId}`
        : `${baseUrl}/take-assessment?id=${assessmentId}`;
      
      navigator.clipboard.writeText(link);
      alert(`${testMode === 'adaptive' ? 'Adaptive' : 'Standard'} assessment link copied! Share it with candidates.`);
    }
  };

  return (
    <div style={{minHeight:'100vh', padding:40, background:'#f9fafb'}}>
      <div style={{maxWidth: 900, margin: '0 auto'}}>
        {/* Test Mode Selection */}
        <div style={{
          background: '#fff',
          padding: 24,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          marginBottom: 24
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
          
          {/* Mode Description */}
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
                Difficulty adjusts based on candidate performance. Answer correctly → harder questions. 
                Answer incorrectly → easier questions.
              </span>
            ) : (
              <span>
                <strong>📝 Standard Mode:</strong> All questions are generated at once with fixed difficulty. 
                Candidate sees all questions upfront and can navigate between them.
              </span>
            )}
          </div>
        </div>

        {/* MCQ Form - Now receives testMode prop */}
        <McqForm onGenerate={handleGenerate} testMode={testMode} />
      </div>
      
      <div style={{maxWidth:900, margin:'24px auto'}}>
        {loading && (
          <div style={{
            textAlign:'center',
            padding: 40,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <div style={{fontSize: 16, color: '#666', marginBottom: 12}}>
              🤖 Generating {testMode === 'adaptive' ? 'Adaptive' : 'Standard'} MCQs...
            </div>
            <div style={{fontSize: 14, color: '#999'}}>
              This may take 20-30 seconds
            </div>
          </div>
        )}
        
        {error && (
          <div style={{
            color:'#dc2626',
            background:'#fee2e2',
            padding:16,
            borderRadius:8,
            border:'1px solid #fca5a5',
            marginBottom: 20
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {mcqs.length > 0 && (
          <div style={{
            background:'#fff',
            padding: 30,
            borderRadius:12,
            boxShadow:'0 4px 12px rgba(0,0,0,0.08)'
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
                  onClick={copyAssessmentLink}
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
                  📋 Copy Assessment Link
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
                color: '#92400e'
              }}>
                <strong>⚠️ Note for Adaptive Mode:</strong> These questions are just a preview. 
                In adaptive mode, candidates will receive questions one at a time, with difficulty 
                adjusting based on their performance.
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
    </div>
  );
}