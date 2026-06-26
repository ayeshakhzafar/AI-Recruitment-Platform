// COMPLETE ResultsDashboard.jsx - PROFESSIONAL HR PLATFORM UI
// Module 2.2.3, 2.2.4, 2.2.5 - Complete Results Management System
// ✅ Professional HR Platform Design with Deep Indigo, Light Purple, Charcoal Black, Slate Gray Theme
// ✅ All features + Job Role Filter + Complete MCQ Modal + Updated Coding Details
// ✅ Added coding violations, AI detection, plagiarism display
// ✅ Hiring Period Grouping (Dec-2024, Jan-2025, etc.)
// ✅ Auto-detect period from test_date
// ✅ Combined scores for same role in same month
// ✅ Period filter dropdown
// ✅ Hierarchy: Period → Role → Test Type (MCQ/Coding)
// ✅ Shows ALL AI detection patterns, evidence, and similarity with other candidates
// ✅ Chart rendering with search filters
// ✅ Charts dynamically change based on selected job role filter

import { useState, useEffect } from "react";
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';

export default function ResultsDashboard() {
  // Combined State
  const [allResults, setAllResults] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedCodingSubmission, setSelectedCodingSubmission] = useState(null);
  const [selectedCombinedView, setSelectedCombinedView] = useState(null);
  
  // Filters
  const [viewMode, setViewMode] = useState('all');
  const [sortBy, setSortBy] = useState("date");
  const [minScore, setMinScore] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchEmail, setSearchEmail] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');

  // Professional HR Color Palette
  const colors = {
    deepIndigo: '#312e81',
    deepIndigoDark: '#1e1b4b',
    lightPurple: '#a78bfa',
    lightPurpleLight: '#c4b5fd',
    charcoal: '#1f2937',
    charcoalLight: '#374151',
    slateGray: '#64748b',
    slateGrayLight: '#94a3b8',
    background: '#0f172a',
    cardBg: '#1e293b',
    borderColor: '#334155',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    white: '#ffffff',
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1'
  };

  useEffect(() => {
    fetchAllResults();
    fetchAnalytics();
  }, [sortBy, minScore, statusFilter]);

  const extractPeriod = (dateStr) => {
    if (!dateStr) return 'Unknown';
    try {
      const date = new Date(dateStr);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
    } catch {
      return 'Unknown';
    }
  };

  const fetchAllResults = async () => {
    setLoading(true);
    try {
      let mcqUrl = `http://localhost:8000/api/results?sort_by=${sortBy}`;
      if (minScore) mcqUrl += `&min_score=${minScore}`;
      if (statusFilter) mcqUrl += `&status=${statusFilter}`;
      
      const mcqRes = await fetch(mcqUrl);
      const mcqData = await mcqRes.json();
      
      const codingRes = await fetch('http://localhost:8000/api/coding/submissions');
      const codingData = await codingRes.json();
      
      const submissions = codingData.submissions || [];
      const enhancedSubmissions = [];
      
      for (const submission of submissions) {
        try {
          const aiRes = await fetch(`http://localhost:8000/api/coding/ai-detection/${submission.submission_id}`);
          let aiDetection = null;
          
          if (aiRes.ok) {
            aiDetection = await aiRes.json();
          }
          
          let integrityData = null;
          try {
            const integrityRes = await fetch(`http://localhost:8000/api/coding/submission-integrity/${submission.submission_id}`);
            if (integrityRes.ok) {
              integrityData = await integrityRes.json();
            }
          } catch (integrityErr) {
            console.log('Could not fetch integrity report:', integrityErr);
          }
          
          enhancedSubmissions.push({
            ...submission,
            ai_detection_direct: aiDetection?.ai_detection || null,
            is_ai_generated: aiDetection?.is_ai_generated || false,
            ai_confidence: aiDetection?.ai_confidence || 0,
            ai_summary: aiDetection?.summary || null,
            ai_detection_data: aiDetection || null,
            integrity_report: integrityData,
            violations: integrityData?.violations?.list || submission.violations || [],
            plagiarism_check: integrityData?.plagiarism_check || submission.plagiarism_check,
            integrity_summary: integrityData?.integrity_summary,
            ai_detection: aiDetection?.ai_detection || submission.ai_detection,
            plagiarism_detected: integrityData?.plagiarism_check?.detected || submission.plagiarism_detected || false,
            plagiarism_score: integrityData?.plagiarism_check?.score || submission.plagiarism_score || 0
          });
        } catch (err) {
          console.error('Error enhancing submission:', err);
          enhancedSubmissions.push(submission);
        }
      }
      
      const combined = combineResults(mcqData.results || [], enhancedSubmissions);
      setAllResults(combined);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/results/analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  };

  const combineResults = (mcqResults, codingSubmissions) => {
    const allEntries = [];
    
    mcqResults.forEach(mcq => {
      let violationCount = 0;
      let violationList = [];
      try {
        const v = typeof mcq.violations === 'string' ? JSON.parse(mcq.violations) : mcq.violations;
        if (typeof v === 'object' && !Array.isArray(v)) {
          violationCount = Object.values(v).reduce((sum, count) => sum + (count || 0), 0);
          violationList = Object.entries(v)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => ({ type, count }));
        } else if (Array.isArray(v)) {
          violationCount = v.length;
          violationList = v.map(violation => ({ type: violation, count: 1 }));
        }
      } catch (e) {
        violationCount = 0;
      }
      
      const testDate = mcq.end_time || mcq.completed_at || mcq.start_time || mcq.created_at || new Date().toISOString();
      
      allEntries.push({
        id: `mcq_${mcq.result_id}`,
        type: 'MCQ',
        candidate_email: mcq.candidate_email,
        test_date: testDate,
        period: extractPeriod(testDate),
        score: mcq.score_percentage,
        grade: mcq.grade,
        role: mcq.role,
        difficulty: mcq.difficulty,
        correct_answers: mcq.correct_answers,
        total_questions: mcq.total_questions,
        wrong_answers: mcq.wrong_answers,
        unanswered: mcq.unanswered,
        total_time_taken: mcq.total_time_taken,
        status: mcq.status || 'completed',
        flagged: mcq.flagged || false,
        violations: violationList,
        violation_count: violationCount,
        result_id: mcq.result_id,
        end_time: mcq.end_time,
        completed_at: mcq.completed_at,
        start_time: mcq.start_time,
        created_at: mcq.created_at,
        question_results: mcq.question_results,
        is_adaptive: mcq.is_adaptive || false,
        has_mcq: true,
        has_coding: false,
        coding_score: null,
        combined_score: mcq.score_percentage
      });
    });
    
    codingSubmissions.forEach(coding => {
      const testDate = coding.submitted_at || coding.created_at || new Date().toISOString();
      
      allEntries.push({
        id: `coding_${coding.submission_id}`,
        type: 'Coding',
        candidate_email: coding.candidate_email,
        test_date: testDate,
        period: extractPeriod(testDate),
        score: coding.score,
        grade: getGrade(coding.score),
        role: coding.role || 'Software Engineer',
        difficulty: coding.difficulty || 'Medium',
        status: coding.status || 'completed',
        has_mcq: false,
        has_coding: true,
        coding_score: coding.score,
        combined_score: coding.score,
        submission_id: coding.submission_id,
        challenge_id: coding.challenge_id,
        challenge_title: coding.challenge_title,
        language: coding.language,
        code_submitted: coding.code_submitted,
        test_results: coding.test_results,
        submitted_at: coding.submitted_at,
        time_taken: coding.time_taken,
        ai_detected: coding.is_ai_generated || false,
        ai_confidence: coding.ai_confidence || 0,
        plagiarism_detected: coding.plagiarism_detected || false,
        plagiarism_score: coding.plagiarism_score || 0,
        violations: coding.violations || [],
        integrity_report: coding.integrity_report,
        ai_detection_data: coding.ai_detection_data,
        ai_detection: coding.ai_detection
      });
    });
    
    const grouped = {};
    allEntries.forEach(entry => {
      const key = `${entry.candidate_email}_${entry.period}_${entry.role}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          candidate_email: entry.candidate_email,
          period: entry.period,
          role: entry.role,
          test_date: entry.test_date,
          mcq_tests: [],
          coding_tests: [],
          has_mcq: false,
          has_coding: false,
          mcq_score: 0,
          coding_score: 0,
          combined_score: 0,
          grade: 'N/A'
        };
      }
      
      if (entry.type === 'MCQ') {
        grouped[key].mcq_tests.push(entry);
        grouped[key].has_mcq = true;
      } else if (entry.type === 'Coding') {
        grouped[key].coding_tests.push(entry);
        grouped[key].has_coding = true;
      }
    });
    
    const finalResults = Object.values(grouped).map(group => {
      if (group.mcq_tests.length > 0) {
        group.mcq_score = (group.mcq_tests.reduce((sum, t) => sum + t.score, 0) / group.mcq_tests.length).toFixed(1);
      }
      if (group.coding_tests.length > 0) {
        group.coding_score = (group.coding_tests.reduce((sum, t) => sum + t.score, 0) / group.coding_tests.length).toFixed(1);
      }
      
      if (group.has_mcq && group.has_coding) {
        group.combined_score = ((parseFloat(group.mcq_score) + parseFloat(group.coding_score)) / 2).toFixed(1);
      } else if (group.has_mcq) {
        group.combined_score = group.mcq_score;
      } else if (group.has_coding) {
        group.combined_score = group.coding_score;
      }
      
      group.grade = getGrade(parseFloat(group.combined_score));
      
      return group;
    });
    
    return finalResults;
  };

  const getGrade = (score) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const getFilteredResults = () => {
    let filtered = allResults;
    
    if (searchEmail) {
      filtered = filtered.filter(r => 
        r.candidate_email.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(r => r.role === roleFilter);
    }
    
    if (periodFilter !== 'all') {
      filtered = filtered.filter(r => r.period === periodFilter);
    }
    
    if (selectedDate) {
      filtered = filtered.filter(r => {
        const testDate = new Date(r.test_date).toISOString().split('T')[0];
        return testDate === selectedDate;
      });
    }
    
    // Apply sorting based on sortBy state
    if (sortBy === 'score') {
      filtered = [...filtered].sort((a, b) => b.score - a.score);
    } else { // date (default)
      filtered = [...filtered].sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
    }
    
    return filtered;
  };

  const getAvailableRoles = () => {
    const roles = new Set(allResults.map(r => r.role));
    return Array.from(roles);
  };

  const getAvailablePeriods = () => {
    const periods = new Set(allResults.map(r => r.period));
    return Array.from(periods).sort().reverse();
  };

  const getAnalyticsData = () => {
    const filtered = getFilteredResults();
    
    const gradeDistribution = filtered.reduce((acc, r) => {
      acc[r.grade] = (acc[r.grade] || 0) + 1;
      return acc;
    }, {});
    
    const scoreRanges = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      '50-59': 0,
      '0-49': 0
    };
    
    filtered.forEach(r => {
      const score = parseFloat(r.combined_score);
      if (score >= 90) scoreRanges['90-100']++;
      else if (score >= 80) scoreRanges['80-89']++;
      else if (score >= 70) scoreRanges['70-79']++;
      else if (score >= 60) scoreRanges['60-69']++;
      else if (score >= 50) scoreRanges['50-59']++;
      else scoreRanges['0-49']++;
    });
    
    const averageScore = filtered.length > 0 
      ? (filtered.reduce((sum, r) => sum + parseFloat(r.combined_score), 0) / filtered.length).toFixed(1)
      : 0;
    
    return {
      totalCandidates: filtered.length,
      averageScore,
      gradeDistribution,
      scoreRanges
    };
  };

  const analyticsData = getAnalyticsData();
  const filteredResults = getFilteredResults();

  const pieChartData = Object.entries(analyticsData.gradeDistribution).map(([name, value]) => ({
    name,
    value
  }));

  const barChartData = Object.entries(analyticsData.scoreRanges).map(([name, value]) => ({
    name,
    value
  }));

  const CHART_COLORS = [colors.lightPurple, colors.deepIndigo, colors.slateGray, colors.lightPurpleLight, colors.charcoalLight];

  // Helper functions for AI detection display
  const getEvidenceIcon = (evidence) => {
    const evidenceStr = String(evidence).toLowerCase();
    if (evidenceStr.includes('chatgpt') || evidenceStr.includes('pattern')) {
      return '🤖';
    } else if (evidenceStr.includes('comment')) {
      return '💬';
    } else if (evidenceStr.includes('function')) {
      return '⚙️';
    } else if (evidenceStr.includes('variable')) {
      return '📊';
    } else if (evidenceStr.includes('indent')) {
      return '📐';
    } else if (evidenceStr.includes('diversity')) {
      return '🎭';
    } else if (evidenceStr.includes('single') && evidenceStr.includes('function')) {
      return '🔧';
    } else if (evidenceStr.includes('import')) {
      return '📦';
    }
    return '🔍';
  };

  const formatEvidenceText = (evidence) => {
    const evidenceStr = String(evidence);
    return evidenceStr.replace(/^[⚠️✅🚨📋🔍⚙️💬📊📐🎭🤖🔧📦\s]+/, '');
  };

  // Export Functions
  const exportToCSV = () => {
    const csvData = sortedCombinedScores.map(row => ({
      Period: row.period,
      Role: row.role,
      Candidate: row.candidate_email,
      Type: row.type,
      'MCQ Score': row.mcq_score || '-',
      'Coding Score': row.coding_score || '-',
      'Combined Score': row.combined_score,
      Grade: row.grade,
      Date: new Date(row.test_date).toLocaleDateString()
    }));

    if (csvData.length === 0) {
      alert('No data to export!');
      return;
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `assessment_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    console.log('Export to Excel - CSV format will be used (Excel compatible)');
    exportToCSV();
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: colors.background,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: 600
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            border: `4px solid ${colors.lightPurple}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Loading Results Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.background,
      padding: '32px 24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .scroll-container::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          .scroll-container::-webkit-scrollbar-track {
            background: ${colors.charcoalLight};
            border-radius: 4px;
          }
          
          .scroll-container::-webkit-scrollbar-thumb {
            background: ${colors.slateGray};
            border-radius: 4px;
          }
          
          .scroll-container::-webkit-scrollbar-thumb:hover {
            background: ${colors.lightPurple};
          }
        `}
      </style>

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: `2px solid ${colors.borderColor}`
        }}>
          <h1 style={{ 
            fontSize: 32, 
            fontWeight: 700, 
            color: colors.textPrimary,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ 
              fontSize: 36,
              background: `linear-gradient(135deg, ${colors.lightPurple}, ${colors.deepIndigo})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              📊
            </span>
            Results Dashboard
          </h1>
          <p style={{ 
            fontSize: 15, 
            color: colors.textSecondary,
            margin: 0
          }}>
            Comprehensive candidate assessment analytics and performance tracking
          </p>
        </div>

        {/* Analytics Summary Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: 20,
          marginBottom: 32
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${colors.deepIndigo}, ${colors.deepIndigoDark})`,
            padding: 24,
            borderRadius: 12,
            border: `1px solid ${colors.borderColor}`,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ 
              fontSize: 13, 
              color: colors.lightPurpleLight,
              fontWeight: 600,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total Candidates
            </div>
            <div style={{ 
              fontSize: 36, 
              fontWeight: 700, 
              color: colors.white
            }}>
              {analyticsData.totalCandidates}
            </div>
          </div>

          <div style={{
            background: `linear-gradient(135deg, ${colors.lightPurple}, #8b5cf6)`,
            padding: 24,
            borderRadius: 12,
            border: `1px solid ${colors.borderColor}`,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ 
              fontSize: 13, 
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 600,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Average Score
            </div>
            <div style={{ 
              fontSize: 36, 
              fontWeight: 700, 
              color: colors.white
            }}>
              {analyticsData.averageScore}%
            </div>
          </div>

          <div style={{
            background: `linear-gradient(135deg, ${colors.charcoal}, ${colors.charcoalLight})`,
            padding: 24,
            borderRadius: 12,
            border: `1px solid ${colors.borderColor}`,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ 
              fontSize: 13, 
              color: colors.slateGrayLight,
              fontWeight: 600,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Hiring Periods
            </div>
            <div style={{ 
              fontSize: 36, 
              fontWeight: 700, 
              color: colors.white
            }}>
              {getAvailablePeriods().length}
            </div>
          </div>

          <div style={{
            background: `linear-gradient(135deg, ${colors.slateGray}, #475569)`,
            padding: 24,
            borderRadius: 12,
            border: `1px solid ${colors.borderColor}`,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ 
              fontSize: 13, 
              color: colors.textSecondary,
              fontWeight: 600,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Job Roles
            </div>
            <div style={{ 
              fontSize: 36, 
              fontWeight: 700, 
              color: colors.white
            }}>
              {getAvailableRoles().length}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div style={{
          background: colors.cardBg,
          padding: 24,
          borderRadius: 12,
          border: `1px solid ${colors.borderColor}`,
          marginBottom: 32,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          <h2 style={{ 
            fontSize: 18, 
            fontWeight: 600, 
            color: colors.textPrimary,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ color: colors.lightPurple }}>🔍</span>
            Filter & Search
          </h2>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16
          }}>
            <div>
              <label style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                color: colors.textSecondary,
                display: 'block',
                marginBottom: 8
              }}>
                Search by Email
              </label>
              <input
                type="text"
                placeholder="Enter candidate email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: colors.charcoal,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: 8,
                  color: colors.textPrimary,
                  fontSize: 14,
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = colors.lightPurple}
                onBlur={(e) => e.target.style.borderColor = colors.borderColor}
              />
            </div>

            <div>
              <label style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                color: colors.textSecondary,
                display: 'block',
                marginBottom: 8
              }}>
                Job Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: colors.charcoal,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: 8,
                  color: colors.textPrimary,
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Roles</option>
                {getAvailableRoles().map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                color: colors.textSecondary,
                display: 'block',
                marginBottom: 8
              }}>
                Hiring Period
              </label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: colors.charcoal,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: 8,
                  color: colors.textPrimary,
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Periods</option>
                {getAvailablePeriods().map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                color: colors.textSecondary,
                display: 'block',
                marginBottom: 8
              }}>
                Test Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: colors.charcoal,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: 8,
                  color: colors.textPrimary,
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>


            <div>
              <label style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                color: colors.textSecondary,
                display: 'block',
                marginBottom: 8
              }}>
                🔄 Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: colors.charcoal,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: 8,
                  color: colors.textPrimary,
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="date">Date (Newest First)</option>
                <option value="score">Score (Highest First)</option>
              </select>
            </div>
          </div>

          {/* Export Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${colors.borderColor}`,
            flexWrap: 'wrap'
          }}>
            <button
              onClick={exportToCSV}
              style={{
                padding: '10px 20px',
                background: colors.success,
                color: colors.white,
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.opacity = '0.9'}
              onMouseOut={(e) => e.target.style.opacity = '1'}
            >
              📥 Export CSV
            </button>
            <button
              onClick={exportToExcel}
              style={{
                padding: '10px 20px',
                background: colors.deepIndigo,
                color: colors.white,
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.opacity = '0.9'}
              onMouseOut={(e) => e.target.style.opacity = '1'}
            >
              📊 Export Excel
            </button>
            {(searchEmail || roleFilter !== 'all' || periodFilter !== 'all' || selectedDate) && (
              <button
                onClick={() => {
                  setSearchEmail('');
                  setRoleFilter('all');
                  setPeriodFilter('all');
                  setSelectedDate('');
                }}
                style={{
                  padding: '10px 20px',
                  background: colors.warning,
                  color: colors.white,
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: 'auto',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.opacity = '0.9'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                🗑️ Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: 24,
          marginBottom: 32
        }}>
          {/* Grade Distribution */}
          <div style={{
            background: colors.cardBg,
            padding: 24,
            borderRadius: 12,
            border: `1px solid ${colors.borderColor}`,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ 
              fontSize: 16, 
              fontWeight: 600, 
              color: colors.textPrimary,
              marginBottom: 20
            }}>
              Grade Distribution
            </h3>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill={colors.lightPurple}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      background: colors.charcoal,
                      border: `1px solid ${colors.borderColor}`,
                      borderRadius: 8,
                      color: colors.textPrimary
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: 40,
                color: colors.textSecondary 
              }}>
                No data available
              </div>
            )}
          </div>

          {/* Score Ranges */}
          <div style={{
            background: colors.cardBg,
            padding: 24,
            borderRadius: 12,
            border: `1px solid ${colors.borderColor}`,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ 
              fontSize: 16, 
              fontWeight: 600, 
              color: colors.textPrimary,
              marginBottom: 20
            }}>
              Score Distribution
            </h3>
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.borderColor} />
                  <XAxis 
                    dataKey="name" 
                    stroke={colors.textSecondary}
                    style={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke={colors.textSecondary}
                    style={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      background: colors.charcoal,
                      border: `1px solid ${colors.borderColor}`,
                      borderRadius: 8,
                      color: colors.textPrimary
                    }}
                  />
                  <Bar dataKey="value" fill={colors.lightPurple} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: 40,
                color: colors.textSecondary 
              }}>
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Results Table */}
        <div style={{
          background: colors.cardBg,
          borderRadius: 12,
          border: `1px solid ${colors.borderColor}`,
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ 
            padding: 24,
            borderBottom: `1px solid ${colors.borderColor}`
          }}>
            <h2 style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              color: colors.textPrimary,
              margin: 0
            }}>
              Candidate Results ({filteredResults.length})
            </h2>
          </div>

          <div className="scroll-container" style={{ 
            overflowX: 'auto',
            maxHeight: 600
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse'
            }}>
              <thead style={{ 
                background: colors.deepIndigo,
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}>
                <tr>
                  <th style={tableHeaderStyle}>Candidate</th>
                  <th style={tableHeaderStyle}>Period</th>
                  <th style={tableHeaderStyle}>Role</th>
                  <th style={tableHeaderStyle}>Assessments</th>
                  <th style={tableHeaderStyle}>MCQ Score</th>
                  <th style={tableHeaderStyle}>Coding Score</th>
                  <th style={tableHeaderStyle}>Combined Score</th>
                  <th style={tableHeaderStyle}>Grade</th>
                  <th style={tableHeaderStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ 
                      padding: 40,
                      textAlign: 'center',
                      color: colors.textSecondary,
                      fontSize: 14
                    }}>
                      No results found matching your filters
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((result, idx) => (
                    <tr 
                      key={result.id}
                      style={{ 
                        borderBottom: `1px solid ${colors.borderColor}`,
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = colors.charcoalLight}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={tableCellStyle}>
                        <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                          {result.candidate_email}
                        </div>
                        <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                          {new Date(result.test_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          padding: '4px 10px',
                          background: colors.deepIndigo,
                          color: colors.lightPurpleLight,
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {result.period}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ 
                          color: colors.textPrimary,
                          fontWeight: 500
                        }}>
                          {result.role}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {result.has_mcq && (
                            <span style={{
                              padding: '3px 8px',
                              background: colors.lightPurple,
                              color: colors.white,
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600
                            }}>
                              MCQ ({result.mcq_tests.length})
                            </span>
                          )}
                          {result.has_coding && (
                            <span style={{
                              padding: '3px 8px',
                              background: colors.slateGray,
                              color: colors.white,
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600
                            }}>
                              Coding ({result.coding_tests.length})
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        {result.has_mcq ? (
                          <span style={{ 
                            color: colors.textPrimary,
                            fontWeight: 600
                          }}>
                            {result.mcq_score}%
                          </span>
                        ) : (
                          <span style={{ color: colors.textSecondary }}>—</span>
                        )}
                      </td>
                      <td style={tableCellStyle}>
                        {result.has_coding ? (
                          <span style={{ 
                            color: colors.textPrimary,
                            fontWeight: 600
                          }}>
                            {result.coding_score}%
                          </span>
                        ) : (
                          <span style={{ color: colors.textSecondary }}>—</span>
                        )}
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          background: getScoreColor(parseFloat(result.combined_score)),
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 14,
                          color: colors.white
                        }}>
                          {result.combined_score}%
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          padding: '4px 10px',
                          background: getGradeColor(result.grade),
                          color: colors.white,
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 13
                        }}>
                          {result.grade}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <button
                          onClick={() => setSelectedCombinedView(result)}
                          style={{
                            padding: '6px 14px',
                            background: colors.lightPurple,
                            color: colors.white,
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.target.style.background = colors.deepIndigo}
                          onMouseOut={(e) => e.target.style.background = colors.lightPurple}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MCQ Details Modal */}
      {selectedResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="scroll-container" style={{
            background: colors.cardBg,
            borderRadius: 16,
            maxWidth: 900,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: `2px solid ${colors.borderColor}`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              background: colors.deepIndigo,
              padding: 24,
              borderBottom: `1px solid ${colors.borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10
            }}>
              <h2 style={{ 
                fontSize: 22, 
                fontWeight: 700, 
                color: colors.white,
                margin: 0
              }}>
                MCQ Assessment Details
              </h2>
              <button
                onClick={() => setSelectedResult(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.white,
                  fontSize: 28,
                  cursor: 'pointer',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Candidate Info */}
              <div style={{
                background: colors.charcoal,
                padding: 20,
                borderRadius: 12,
                marginBottom: 24,
                border: `1px solid ${colors.borderColor}`
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                      Candidate Email
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
                      {selectedResult.candidate_email}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                      Role
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
                      {selectedResult.role}
                    </div>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                      Difficulty
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.warning }}>
                      {selectedResult.difficulty || 'Medium'}
                    </div>
                  </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                      Test Date
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
                      {new Date(selectedResult.test_date).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Overview */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 16,
                marginBottom: 24
              }}>
                <div style={{
                  background: `linear-gradient(135deg, ${colors.lightPurple}, #8b5cf6)`,
                  padding: 20,
                  borderRadius: 12,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>
                    Score
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: colors.white }}>
                    {selectedResult.score}%
                  </div>
                </div>
                <div style={{
                  background: colors.charcoal,
                  padding: 20,
                  borderRadius: 12,
                  textAlign: 'center',
                  border: `1px solid ${colors.borderColor}`
                }}>
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                    Grade
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: colors.lightPurple }}>
                    {selectedResult.grade}
                  </div>
                </div>
                <div style={{
                  background: colors.charcoal,
                  padding: 20,
                  borderRadius: 12,
                  textAlign: 'center',
                  border: `1px solid ${colors.borderColor}`
                }}>
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                    Correct
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: colors.success }}>
                    {selectedResult.correct_answers}
                  </div>
                </div>
                <div style={{
                  background: colors.charcoal,
                  padding: 20,
                  borderRadius: 12,
                  textAlign: 'center',
                  border: `1px solid ${colors.borderColor}`
                }}>
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                    Wrong
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: colors.danger }}>
                    {selectedResult.wrong_answers}
                  </div>
                </div>
              </div>

              {/* Test Details */}
              <div style={{
                background: colors.charcoal,
                padding: 20,
                borderRadius: 12,
                marginBottom: 24,
                border: `1px solid ${colors.borderColor}`
              }}>
                <h3 style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: colors.textPrimary,
                  marginBottom: 16
                }}>
                  Test Information
                </h3>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                  fontSize: 14
                }}>
                  <div>
                    <span style={{ color: colors.textSecondary }}>Total Questions:</span>{' '}
                    <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
                      {selectedResult.total_questions}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: colors.textSecondary }}>Unanswered:</span>{' '}
                    <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
                      {selectedResult.unanswered}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: colors.textSecondary }}>Time Taken:</span>{' '}
                    <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
                      {Math.floor(selectedResult.total_time_taken / 60)}m {selectedResult.total_time_taken % 60}s
                    </span>
                  </div>
                  <div>
                    <span style={{ color: colors.textSecondary }}>Difficulty:</span>{' '}
                    <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
                      {selectedResult.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Violations */}
              {selectedResult.violations && selectedResult.violations.length > 0 && (
                <div style={{
                  background: colors.charcoal,
                  padding: 20,
                  borderRadius: 12,
                  border: `2px solid ${colors.danger}`,
                  marginBottom: 24
                }}>
                  <h3 style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    color: colors.danger,
                    marginBottom: 16
                  }}>
                    ⚠️ Test Violations Detected
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedResult.violations.map((violation, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 12,
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderRadius: 8,
                          fontSize: 14,
                          color: colors.textPrimary
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{violation.type}:</span>{' '}
                        <span style={{ color: colors.textSecondary }}>{violation.count} time(s)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question Results */}
              {selectedResult.question_results && selectedResult.question_results.length > 0 && (
                <div style={{
                  background: colors.charcoal,
                  padding: 20,
                  borderRadius: 12,
                  border: `1px solid ${colors.borderColor}`
                }}>
                  <h3 style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    color: colors.textPrimary,
                    marginBottom: 16
                  }}>
                    Question-by-Question Breakdown
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedResult.question_results.map((q, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 16,
                          background: colors.background,
                          borderRadius: 8,
                          border: `1px solid ${q.is_correct ? colors.success : colors.danger}`
                        }}
                      >
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          marginBottom: 8
                        }}>
                          <span style={{ 
                            fontWeight: 600,
                            color: colors.textPrimary,
                            fontSize: 14
                          }}>
                            Question {idx + 1}
                          </span>
                          <span style={{
                            padding: '3px 10px',
                            background: q.is_correct ? colors.success : colors.danger,
                            color: colors.white,
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600
                          }}>
                            {q.is_correct ? '✓ Correct' : '✗ Wrong'}
                          </span>
                        </div>
                        
                        {/* Question Text */}
                        <div style={{ 
                          fontSize: 14, 
                          color: colors.textPrimary, 
                          marginBottom: 12,
                          lineHeight: 1.5,
                          padding: 12,
                          background: colors.charcoal,
                          borderRadius: 6
                        }}>
                          {q.question_text || q.question || 'Question text not available'}
                        </div>
                        
                        <div style={{ fontSize: 13, color: colors.textSecondary }}>
                          <div><strong>Your Answer:</strong> {q.selected_answer || q.candidate_answer || 'Not answered'}</div>
                          {!q.is_correct && (
                            <div style={{ color: colors.success }}>
                              <strong>Correct Answer:</strong> {q.correct_answer}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Coding Details Modal */}
      {selectedCodingSubmission && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="scroll-container" style={{
            background: colors.cardBg,
            borderRadius: 16,
            maxWidth: 1000,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: `2px solid ${colors.borderColor}`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              background: colors.deepIndigo,
              padding: 24,
              borderBottom: `1px solid ${colors.borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10
            }}>
              <h2 style={{ 
                fontSize: 22, 
                fontWeight: 700, 
                color: colors.white,
                margin: 0
              }}>
                Coding Assessment Details
              </h2>
              <button
                onClick={() => setSelectedCodingSubmission(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.white,
                  fontSize: 28,
                  cursor: 'pointer',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Candidate Info */}
              <div style={{
                background: colors.charcoal,
                padding: 20,
                borderRadius: 12,
                marginBottom: 24,
                border: `1px solid ${colors.borderColor}`
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                      Candidate Email
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
                      {selectedCodingSubmission.candidate_email}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                      Challenge
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
                      {selectedCodingSubmission.challenge_title || 'Coding Challenge'}
                    </div>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                      Difficulty
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.warning }}>
                      {selectedCodingSubmission.difficulty || 'Medium'}
                    </div>
                  </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                      Submission Date
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
                      {new Date(selectedCodingSubmission.submitted_at || selectedCodingSubmission.test_date).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Score & Performance */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 16,
                marginBottom: 24
              }}>
                <div style={{
                  background: `linear-gradient(135deg, ${colors.lightPurple}, #8b5cf6)`,
                  padding: 20,
                  borderRadius: 12,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>
                    Score
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: colors.white }}>
                    {selectedCodingSubmission.score}%
                  </div>
                </div>
                <div style={{
                  background: colors.charcoal,
                  padding: 20,
                  borderRadius: 12,
                  textAlign: 'center',
                  border: `1px solid ${colors.borderColor}`
                }}>
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                    Language
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: colors.lightPurple }}>
                    {selectedCodingSubmission.language || 'Python'}
                  </div>
                </div>
                {selectedCodingSubmission.test_results && (
                  <div style={{
                    background: colors.charcoal,
                    padding: 20,
                    borderRadius: 12,
                    textAlign: 'center',
                    border: `1px solid ${colors.borderColor}`
                  }}>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                      Tests Passed
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: colors.success }}>
                      {selectedCodingSubmission.test_results.passed || 0}/{selectedCodingSubmission.test_results.total || 0}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Detection & Plagiarism Alerts */}
              {(selectedCodingSubmission.ai_detected || selectedCodingSubmission.plagiarism_detected) && (
                <div style={{
                  background: colors.charcoal,
                  padding: 20,
                  borderRadius: 12,
                  border: `2px solid ${colors.danger}`,
                  marginBottom: 24
                }}>
                  <h3 style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    color: colors.danger,
                    marginBottom: 16
                  }}>
                    ⚠️ Integrity Alerts
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedCodingSubmission.ai_detected && (
                      <div style={{
                        padding: 14,
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}>
                        <span style={{ fontSize: 24 }}>🤖</span>
                        <div>
                          <div style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>
                            AI-Generated Code Detected
                          </div>
                          <div style={{ fontSize: 13, color: colors.textSecondary }}>
                            Confidence: {selectedCodingSubmission.ai_confidence}%
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedCodingSubmission.plagiarism_detected && (
                      <div style={{
                        padding: 14,
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}>
                        <span style={{ fontSize: 24 }}>📋</span>
                        <div>
                          <div style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>
                            Plagiarism Detected
                          </div>
                          <div style={{ fontSize: 13, color: colors.textSecondary }}>
                            Similarity Score: {selectedCodingSubmission.plagiarism_score}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* VIOLATIONS SECTION */}
              {selectedCodingSubmission.violation_count > 0 && selectedCodingSubmission.violations && (
                <div style={{
                  padding: 20,
                  background: "rgba(239, 68, 68, 0.1)",
                  border: `2px solid ${colors.danger}`,
                  borderRadius: 12,
                  marginBottom: 24
                }}>
                  <h3 style={{ 
                    fontSize: 18, 
                    fontWeight: 600, 
                    marginBottom: 16, 
                    color: colors.danger,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    Test Violations: {selectedCodingSubmission.violation_count}
                  </h3>
                  <div style={{ 
                    padding: 16, 
                    background: colors.cardBg, 
                    borderRadius: 8,
                    border: `1px solid ${colors.danger}`
                  }}>
                    <ul style={{ 
                      paddingLeft: 20, 
                      margin: 0, 
                      color: colors.danger, 
                      fontSize: 14 
                    }}>
                      {selectedCodingSubmission.violations.map((v, idx) => (
                        <li key={idx} style={{ 
                          marginBottom: 8,
                          padding: '8px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderRadius: 6
                        }}>
                          <strong style={{ color: colors.danger }}>
                            {v.type || v}
                          </strong>
                          {v.timestamp && ` - ${new Date(v.timestamp).toLocaleTimeString()}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* DETAILED EVALUATION */}
              {selectedCodingSubmission.detailed_report && (
                <div style={{
                  padding: 20,
                  background: colors.deepIndigoDark,
                  borderRadius: 12,
                  marginBottom: 24,
                  border: `1px solid ${colors.borderColor}`
                }}>
                  <h4 style={{ 
                    margin: 0, 
                    marginBottom: 16, 
                    fontSize: 18, 
                    fontWeight: 600, 
                    color: colors.textPrimary 
                  }}>
                    📈 Detailed Evaluation
                  </h4>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: 16, 
                    fontSize: 14 
                  }}>
                    <div style={{ 
                      padding: 12, 
                      background: colors.cardBg, 
                      borderRadius: 6, 
                      border: `1px solid ${colors.borderColor}` 
                    }}>
                      <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                        Code Quality
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: colors.lightPurple }}>
                        {selectedCodingSubmission.detailed_report.code_quality || 0}%
                      </div>
                    </div>
                    <div style={{ 
                      padding: 12, 
                      background: colors.cardBg, 
                      borderRadius: 6, 
                      border: `1px solid ${colors.borderColor}` 
                    }}>
                      <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                        Best Practices
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: colors.lightPurple }}>
                        {selectedCodingSubmission.detailed_report.best_practices || 0}%
                      </div>
                    </div>
                    <div style={{ 
                      padding: 12, 
                      background: colors.cardBg, 
                      borderRadius: 6, 
                      border: `1px solid ${colors.borderColor}` 
                    }}>
                      <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                        Readability
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: colors.lightPurple }}>
                        {selectedCodingSubmission.detailed_report.readability || 0}%
                      </div>
                    </div>
                    <div style={{ 
                      padding: 12, 
                      background: colors.cardBg, 
                      borderRadius: 6, 
                      border: `1px solid ${colors.borderColor}` 
                    }}>
                      <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                        Time Complexity
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: colors.lightPurple }}>
                        {selectedCodingSubmission.detailed_report.time_complexity || 'N/A'}
                      </div>
                    </div>
                    <div style={{ 
                      padding: 12, 
                      background: colors.cardBg, 
                      borderRadius: 6, 
                      border: `1px solid ${colors.borderColor}` 
                    }}>
                      <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                        Space Complexity
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: colors.lightPurple }}>
                        {selectedCodingSubmission.detailed_report.space_complexity || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Code Submission */}
              {selectedCodingSubmission.code_submitted && (
                <div style={{
                  background: colors.charcoal,
                  padding: 20,
                  borderRadius: 12,
                  border: `1px solid ${colors.borderColor}`,
                  marginBottom: 24
                }}>
                  <h3 style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    color: colors.textPrimary,
                    marginBottom: 16
                  }}>
                    Submitted Code
                  </h3>
                  <pre style={{
                    background: colors.background,
                    padding: 16,
                    borderRadius: 8,
                    color: colors.textPrimary,
                    fontSize: 13,
                    lineHeight: 1.6,
                    overflow: 'auto',
                    border: `1px solid ${colors.borderColor}`
                  }}>
                    <code>{selectedCodingSubmission.code || selectedCodingSubmission.code_submitted}</code>
                  </pre>
                </div>
              )}

              {/* Test Results Details */}
              {selectedCodingSubmission.test_results && selectedCodingSubmission.test_results.test_cases && (
                <div style={{
                  background: colors.charcoal,
                  padding: 20,
                  borderRadius: 12,
                  border: `1px solid ${colors.borderColor}`
                }}>
                  <h3 style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    color: colors.textPrimary,
                    marginBottom: 16
                  }}>
                    Test Case Results
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedCodingSubmission.test_results.test_cases.map((testCase, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 16,
                          background: colors.background,
                          borderRadius: 8,
                          border: `1px solid ${testCase.passed ? colors.success : colors.danger}`
                        }}
                      >
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8
                        }}>
                          <span style={{ 
                            fontWeight: 600,
                            color: colors.textPrimary,
                            fontSize: 14
                          }}>
                            Test Case {idx + 1}
                          </span>
                          <span style={{
                            padding: '3px 10px',
                            background: testCase.passed ? colors.success : colors.danger,
                            color: colors.white,
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600
                          }}>
                            {testCase.passed ? '✓ Passed' : '✗ Failed'}
                          </span>
                        </div>
                        {!testCase.passed && testCase.error && (
                          <div style={{
                            fontSize: 13,
                            color: colors.textSecondary,
                            marginTop: 8,
                            padding: 10,
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: 6
                          }}>
                            {testCase.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COMPLETE AI DETECTION SECTION FROM REFERENCE */}
              {(selectedCodingSubmission.ai_detected || selectedCodingSubmission.ai_detection_data) && (
                <div style={{
                  padding: 24,
                  background: selectedCodingSubmission.ai_detected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  border: `2px solid ${selectedCodingSubmission.ai_detected ? colors.danger : colors.success}`,
                  borderRadius: 12,
                  marginBottom: 24
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    marginBottom: 20, 
                    fontSize: 20, 
                    fontWeight: 700, 
                    color: selectedCodingSubmission.ai_detected ? colors.danger : colors.success,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <span style={{ fontSize: 28 }}>🤖</span>
                    {selectedCodingSubmission.ai_detected ? '🚨 AI-GENERATED CODE DETECTED' : '✅ Human-Written Code'}
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
                    <div style={{ padding: 16, background: colors.cardBg, borderRadius: 8, border: `1px solid ${colors.borderColor}` }}>
                      <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>Confidence Score</div>
                      <div style={{ 
                        fontSize: 36, 
                        fontWeight: 800, 
                        color: selectedCodingSubmission.ai_confidence >= 70 ? colors.danger :
                              selectedCodingSubmission.ai_confidence >= 40 ? colors.warning : colors.success
                      }}>
                        {selectedCodingSubmission.ai_confidence}%
                      </div>
                    </div>
                    
                    <div style={{ padding: 16, background: colors.cardBg, borderRadius: 8, border: `1px solid ${colors.borderColor}` }}>
                      <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>Detection Result</div>
                      <div style={{ 
                        fontSize: 20, 
                        fontWeight: 700, 
                        color: selectedCodingSubmission.ai_detected ? colors.danger : colors.success
                      }}>
                        {selectedCodingSubmission.ai_detected ? 'AI-Generated' : 'Human-Written'}
                      </div>
                    </div>
                  </div>
                  
                  {/* DISPLAY DETECTION EVIDENCE */}
                  {(selectedCodingSubmission.ai_detection_data?.evidence || selectedCodingSubmission.ai_detection_data?.ai_detection?.evidence) && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: colors.textPrimary }}>
                        📋 Why This Was Flagged ({selectedCodingSubmission.ai_detection_data?.evidence?.length || selectedCodingSubmission.ai_detection_data?.ai_detection?.evidence?.length || 0} indicators)
                      </h4>
                      <div style={{ 
                        padding: 16, 
                        background: colors.cardBg, 
                        borderRadius: 8,
                        border: `1px solid ${colors.borderColor}`
                      }}>
                        <div style={{ 
                          fontSize: 14, 
                          color: colors.textSecondary,
                          marginBottom: 16,
                          padding: 12,
                          background: colors.background,
                          borderRadius: 6
                        }}>
                          The AI detector identified the following patterns that are commonly found in AI-generated code:
                        </div>
                        <ul style={{ 
                          paddingLeft: 20, 
                          margin: 0, 
                          fontSize: 14, 
                          color: colors.textPrimary,
                          lineHeight: 1.6
                        }}>
                          {(selectedCodingSubmission.ai_detection_data?.evidence || selectedCodingSubmission.ai_detection_data?.ai_detection?.evidence || []).map((evidence, idx) => (
                            <li key={idx} style={{ 
                              marginBottom: 12,
                              padding: '12px 16px',
                              background: idx % 2 === 0 ? colors.background : colors.cardBg,
                              borderRadius: 6,
                              borderLeft: `4px solid ${colors.warning}`,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 8
                            }}>
                              <span style={{ 
                                fontSize: 18, 
                                flexShrink: 0,
                                marginTop: 2
                              }}>
                                {getEvidenceIcon(evidence)}
                              </span>
                              <span style={{ flex: 1, color: colors.textPrimary }}>
                                {formatEvidenceText(evidence)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* DISPLAY DETECTION METRICS */}
                  {selectedCodingSubmission.ai_detection_data?.metrics && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: colors.textPrimary }}>
                        📊 Detection Metrics Analysis
                      </h4>
                      <div style={{ 
                        padding: 16, 
                        background: colors.cardBg, 
                        borderRadius: 8,
                        border: `1px solid ${colors.borderColor}`
                      }}>
                        <div style={{ 
                          fontSize: 14, 
                          color: colors.textSecondary,
                          marginBottom: 20,
                          padding: 12,
                          background: colors.background,
                          borderRadius: 6
                        }}>
                          These metrics show what the AI detector analyzed and how each factor contributed to the decision:
                        </div>
                        
                        <div style={{ 
                          display: "grid", 
                          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", 
                          gap: 16,
                          fontSize: 14
                        }}>
                          {selectedCodingSubmission.ai_detection_data.metrics.total_lines !== undefined && (
                            <div style={{ 
                              padding: 12,
                              background: colors.background,
                              borderRadius: 6,
                              border: `1px solid ${colors.borderColor}`
                            }}>
                              <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Total Lines</div>
                              <div style={{ fontWeight: 600, color: colors.textPrimary, fontSize: 16 }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.total_lines}
                              </div>
                              <div style={{ fontSize: 11, color: colors.slateGrayLight, marginTop: 2 }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.total_lines > 20 ? 
                                 'Longer code is more reliable to analyze' : 
                                 'Short code may be harder to analyze accurately'}
                              </div>
                            </div>
                          )}
                          
                          {selectedCodingSubmission.ai_detection_data.metrics.chatgpt_matches !== undefined && (
                            <div style={{ 
                              padding: 12,
                              background: 'rgba(239, 68, 68, 0.1)',
                              borderRadius: 6,
                              border: `1px solid ${colors.danger}`
                            }}>
                              <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>ChatGPT Patterns</div>
                              <div style={{ 
                                fontWeight: 700, 
                                color: selectedCodingSubmission.ai_detection_data.metrics.chatgpt_matches > 3 ? colors.danger : colors.warning,
                                fontSize: 16
                              }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.chatgpt_matches} matches
                              </div>
                              <div style={{ fontSize: 11, color: colors.slateGrayLight, marginTop: 2 }}>
                                Common ChatGPT phrases and patterns found
                              </div>
                            </div>
                          )}
                          
                          {selectedCodingSubmission.ai_detection_data.metrics.chatgpt_ratio !== undefined && (
                            <div style={{ 
                              padding: 12,
                              background: selectedCodingSubmission.ai_detection_data.metrics.chatgpt_ratio > 0.15 ? 'rgba(239, 68, 68, 0.1)' : colors.background,
                              borderRadius: 6,
                              border: selectedCodingSubmission.ai_detection_data.metrics.chatgpt_ratio > 0.15 ? `1px solid ${colors.danger}` : `1px solid ${colors.borderColor}`
                            }}>
                              <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>ChatGPT Pattern Ratio</div>
                              <div style={{ 
                                fontWeight: 700, 
                                color: selectedCodingSubmission.ai_detection_data.metrics.chatgpt_ratio > 0.15 ? colors.danger :
                                       selectedCodingSubmission.ai_detection_data.metrics.chatgpt_ratio > 0.05 ? colors.warning : colors.success,
                                fontSize: 16
                              }}>
                                {(selectedCodingSubmission.ai_detection_data.metrics.chatgpt_ratio * 100).toFixed(1)}%
                              </div>
                              <div style={{ fontSize: 11, color: colors.slateGrayLight, marginTop: 2 }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.chatgpt_ratio > 0.15 ? 
                                 'High density of AI patterns' : 
                                 selectedCodingSubmission.ai_detection_data.metrics.chatgpt_ratio > 0.05 ?
                                 'Moderate AI patterns' : 'Few AI patterns'}
                              </div>
                            </div>
                          )}
                          
                          {selectedCodingSubmission.ai_detection_data.metrics.function_count !== undefined && (
                            <div style={{ 
                              padding: 12,
                              background: colors.background,
                              borderRadius: 6,
                              border: `1px solid ${colors.borderColor}`
                            }}>
                              <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Functions</div>
                              <div style={{ fontWeight: 600, color: colors.textPrimary, fontSize: 16 }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.function_count}
                              </div>
                              <div style={{ fontSize: 11, color: colors.slateGrayLight, marginTop: 2 }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.function_count === 1 ? 
                                 'Single-function solution (common for AI)' : 
                                 'Multiple functions (more human-like)'}
                              </div>
                            </div>
                          )}
                          
                          {selectedCodingSubmission.ai_detection_data.metrics.ai_function_count !== undefined && (
                            <div style={{ 
                              padding: 12,
                              background: selectedCodingSubmission.ai_detection_data.metrics.ai_function_count > 0 ? 'rgba(239, 68, 68, 0.1)' : colors.background,
                              borderRadius: 6,
                              border: selectedCodingSubmission.ai_detection_data.metrics.ai_function_count > 0 ? `1px solid ${colors.danger}` : `1px solid ${colors.borderColor}`
                            }}>
                              <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>AI-style Functions</div>
                              <div style={{ 
                                fontWeight: 700, 
                                color: selectedCodingSubmission.ai_detection_data.metrics.ai_function_count > 0 ? colors.danger : colors.success,
                                fontSize: 16
                              }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.ai_function_count}
                              </div>
                              <div style={{ fontSize: 11, color: colors.slateGrayLight, marginTop: 2 }}>
                                Functions with names like "solve", "calculate", "compute"
                              </div>
                            </div>
                          )}
                          
                          {selectedCodingSubmission.ai_detection_data.metrics.comment_ratio !== undefined && (
                            <div style={{ 
                              padding: 12,
                              background: selectedCodingSubmission.ai_detection_data.metrics.comment_ratio > 0.25 ? 'rgba(239, 68, 68, 0.1)' : 
                                        selectedCodingSubmission.ai_detection_data.metrics.comment_ratio < 0.05 ? 'rgba(245, 158, 11, 0.1)' : colors.background,
                              borderRadius: 6,
                              border: selectedCodingSubmission.ai_detection_data.metrics.comment_ratio > 0.25 ? `1px solid ${colors.danger}` :
                                      selectedCodingSubmission.ai_detection_data.metrics.comment_ratio < 0.05 ? `1px solid ${colors.warning}` : `1px solid ${colors.borderColor}`
                            }}>
                              <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Comment Ratio</div>
                              <div style={{ 
                                fontWeight: 700, 
                                color: selectedCodingSubmission.ai_detection_data.metrics.comment_ratio > 0.25 ? colors.danger :
                                       selectedCodingSubmission.ai_detection_data.metrics.comment_ratio < 0.05 ? colors.warning : colors.success,
                                fontSize: 16
                              }}>
                                {(selectedCodingSubmission.ai_detection_data.metrics.comment_ratio * 100).toFixed(1)}%
                              </div>
                              <div style={{ fontSize: 11, color: colors.slateGrayLight, marginTop: 2 }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.comment_ratio > 0.25 ? 
                                 'Over-commented (AI characteristic)' : 
                                 selectedCodingSubmission.ai_detection_data.metrics.comment_ratio < 0.05 ?
                                 'Under-commented' : 'Normal comment level'}
                              </div>
                            </div>
                          )}
                          
                          {selectedCodingSubmission.ai_detection_data.metrics.ai_var_count !== undefined && (
                            <div style={{ 
                              padding: 12,
                              background: selectedCodingSubmission.ai_detection_data.metrics.ai_var_count > 3 ? 'rgba(239, 68, 68, 0.1)' : colors.background,
                              borderRadius: 6,
                              border: selectedCodingSubmission.ai_detection_data.metrics.ai_var_count > 3 ? `1px solid ${colors.danger}` : `1px solid ${colors.borderColor}`
                            }}>
                              <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>AI-style Variables</div>
                              <div style={{ 
                                fontWeight: 700, 
                                color: selectedCodingSubmission.ai_detection_data.metrics.ai_var_count > 3 ? colors.danger : colors.success,
                                fontSize: 16
                              }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.ai_var_count}
                              </div>
                              <div style={{ fontSize: 11, color: colors.slateGrayLight, marginTop: 2 }}>
                                Variables like "result", "ans", "temp", "dp", "memo"
                              </div>
                            </div>
                          )}
                          
                          {selectedCodingSubmission.ai_detection_data.metrics.token_diversity !== undefined && (
                            <div style={{ 
                              padding: 12,
                              background: selectedCodingSubmission.ai_detection_data.metrics.token_diversity < 0.4 ? 'rgba(239, 68, 68, 0.1)' : colors.background,
                              borderRadius: 6,
                              border: selectedCodingSubmission.ai_detection_data.metrics.token_diversity < 0.4 ? `1px solid ${colors.danger}` : `1px solid ${colors.borderColor}`
                            }}>
                              <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Token Diversity</div>
                              <div style={{ 
                                fontWeight: 700, 
                                color: selectedCodingSubmission.ai_detection_data.metrics.token_diversity < 0.4 ? colors.danger : colors.success,
                                fontSize: 16
                              }}>
                                {(selectedCodingSubmission.ai_detection_data.metrics.token_diversity * 100).toFixed(1)}%
                              </div>
                              <div style={{ fontSize: 11, color: colors.slateGrayLight, marginTop: 2 }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.token_diversity < 0.4 ? 
                                 'Low diversity (repetitive vocabulary)' : 
                                 'Good vocabulary diversity'}
                              </div>
                            </div>
                          )}
                          
                          {selectedCodingSubmission.ai_detection_data.metrics.final_confidence !== undefined && (
                            <div style={{ 
                              padding: 12,
                              background: selectedCodingSubmission.ai_detected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              borderRadius: 6,
                              border: selectedCodingSubmission.ai_detected ? `1px solid ${colors.danger}` : `1px solid ${colors.success}`
                            }}>
                              <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Final Confidence</div>
                              <div style={{ 
                                fontWeight: 800, 
                                color: selectedCodingSubmission.ai_detected ? colors.danger : colors.success,
                                fontSize: 18
                              }}>
                                {selectedCodingSubmission.ai_detection_data.metrics.final_confidence}%
                              </div>
                              <div style={{ fontSize: 11, color: colors.slateGrayLight, marginTop: 2 }}>
                                Combined score from all detection methods
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* DISPLAY DETECTION DETAILS */}
                  {selectedCodingSubmission.ai_detection_data?.details && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: colors.textPrimary }}>
                        📝 Overall Assessment
                      </h4>
                      <div style={{ 
                        padding: 16, 
                        background: colors.cardBg, 
                        borderRadius: 8,
                        border: `1px solid ${colors.borderColor}`,
                        fontSize: 14,
                        color: colors.textPrimary,
                        lineHeight: 1.6
                      }}>
                        {selectedCodingSubmission.ai_detection_data.details}
                      </div>
                    </div>
                  )}
                  
                  {/* DISPLAY SOURCE INFORMATION */}
                  {selectedCodingSubmission.ai_detection_data?.source && (
                    <div>
                      <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: colors.textPrimary }}>
                        🏷️ Detection Source
                      </h4>
                      <div style={{ 
                        padding: 12, 
                        background: colors.background, 
                        borderRadius: 8,
                        border: `1px solid ${colors.borderColor}`,
                        fontSize: 14,
                        color: colors.textPrimary
                      }}>
                        <strong>Source:</strong> {selectedCodingSubmission.ai_detection_data.source}
                        {selectedCodingSubmission.ai_detection_data?.needs_groq_check !== undefined && (
                          <div style={{ marginTop: 4, fontSize: 13 }}>
                            <strong>Needs Groq Check:</strong> {selectedCodingSubmission.ai_detection_data.needs_groq_check ? 'Yes' : 'No'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TEST RESULTS WITH DETAILS */}
              {selectedCodingSubmission.test_results && selectedCodingSubmission.test_results.results && (
                <div style={{
                  background: colors.charcoal,
                  padding: 20,
                  borderRadius: 12,
                  border: `1px solid ${colors.borderColor}`,
                  marginBottom: 24
                }}>
                  <h3 style={{ 
                    fontSize: 18, 
                    fontWeight: 600, 
                    color: colors.textPrimary,
                    marginBottom: 16
                  }}>
                    🧪 Test Results
                  </h3>
                  <div>
                    {selectedCodingSubmission.test_results.results.map((test, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 16,
                          marginBottom: 12,
                          background: test.passed ? 
                            'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          border: `2px solid ${test.passed ? colors.success : colors.danger}`,
                          borderRadius: 8
                        }}
                      >
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "start", 
                          marginBottom: 12 
                        }}>
                          <div style={{ fontWeight: 600, color: colors.lightPurple, fontSize: 15 }}>
                            Test {test.test_number || idx + 1}
                          </div>
                          <div style={{
                            padding: "4px 12px",
                            background: test.passed ? colors.success : colors.danger,
                            color: colors.white,
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600
                          }}>
                            {test.passed ? "✓ Passed" : "✗ Failed"}
                          </div>
                        </div>
                        
                        <div style={{ fontSize: 13, color: colors.textPrimary }}>
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: colors.textSecondary }}>Input:</strong>{' '}
                            <code style={{ 
                              color: colors.textPrimary,
                              background: colors.background,
                              padding: '4px 8px',
                              borderRadius: 4,
                              display: 'inline-block',
                              marginTop: 4
                            }}>
                              {test.input}
                            </code>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: colors.textSecondary }}>Expected:</strong>{' '}
                            <code style={{ 
                              color: colors.success,
                              background: colors.background,
                              padding: '4px 8px',
                              borderRadius: 4,
                              display: 'inline-block',
                              marginTop: 4
                            }}>
                              {test.expected}
                            </code>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: colors.textSecondary }}>Actual:</strong>{' '}
                            <code style={{ 
                              color: test.passed ? colors.success : colors.danger,
                              background: colors.background,
                              padding: '4px 8px',
                              borderRadius: 4,
                              display: 'inline-block',
                              marginTop: 4
                            }}>
                              {test.actual}
                            </code>
                          </div>
                          {test.execution_time_ms && (
                            <div style={{ 
                              marginTop: 8, 
                              fontSize: 12, 
                              color: colors.textSecondary 
                            }}>
                              ⏱️ Execution Time: {test.execution_time_ms.toFixed(2)}ms
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STRENGTHS & IMPROVEMENTS */}
              {selectedCodingSubmission.detailed_report && (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "1fr 1fr", 
                  gap: 24,
                  marginBottom: 24
                }}>
                  <div style={{
                    padding: 20,
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: 12,
                    border: `1px solid ${colors.success}`
                  }}>
                    <h4 style={{ 
                      margin: 0, 
                      marginBottom: 12, 
                      fontSize: 16, 
                      fontWeight: 600, 
                      color: colors.success 
                    }}>
                      ✅ Strengths
                    </h4>
                    {selectedCodingSubmission.detailed_report.strengths && 
                     Array.isArray(selectedCodingSubmission.detailed_report.strengths) ? (
                      <ul style={{ 
                        paddingLeft: 20, 
                        margin: 0, 
                        color: colors.textPrimary, 
                        lineHeight: 1.6 
                      }}>
                        {selectedCodingSubmission.detailed_report.strengths.map((strength, idx) => (
                          <li key={idx} style={{ marginBottom: 8 }}>{strength}</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ color: colors.textSecondary, fontStyle: "italic" }}>
                        No strengths listed
                      </div>
                    )}
                  </div>
                  
                  <div style={{
                    padding: 20,
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: 12,
                    border: `1px solid ${colors.warning}`
                  }}>
                    <h4 style={{ 
                      margin: 0, 
                      marginBottom: 12, 
                      fontSize: 16, 
                      fontWeight: 600, 
                      color: colors.warning 
                    }}>
                      📝 Improvements
                    </h4>
                    {selectedCodingSubmission.detailed_report.improvements && 
                     Array.isArray(selectedCodingSubmission.detailed_report.improvements) ? (
                      <ul style={{ 
                        paddingLeft: 20, 
                        margin: 0, 
                        color: colors.textPrimary, 
                        lineHeight: 1.6 
                      }}>
                        {selectedCodingSubmission.detailed_report.improvements.map((improvement, idx) => (
                          <li key={idx} style={{ marginBottom: 8 }}>{improvement}</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ color: colors.textSecondary, fontStyle: "italic" }}>
                        No improvements suggested
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Combined View Modal */}
      {selectedCombinedView && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="scroll-container" style={{
            background: colors.cardBg,
            borderRadius: 16,
            maxWidth: 1100,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: `2px solid ${colors.borderColor}`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              background: colors.deepIndigo,
              padding: 24,
              borderBottom: `1px solid ${colors.borderColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10
            }}>
              <h2 style={{ 
                fontSize: 22, 
                fontWeight: 700, 
                color: colors.white,
                margin: 0
              }}>
                Combined Assessment Report
              </h2>
              <button
                onClick={() => setSelectedCombinedView(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.white,
                  fontSize: 28,
                  cursor: 'pointer',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Candidate Overview */}
              <div style={{
                background: colors.charcoal,
                padding: 24,
                borderRadius: 12,
                marginBottom: 24,
                border: `1px solid ${colors.borderColor}`
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 20
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                      Candidate Email
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>
                      {selectedCombinedView.candidate_email}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                      Job Role
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>
                      {selectedCombinedView.role}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                      Hiring Period
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: colors.lightPurple }}>
                      {selectedCombinedView.period}
                    </div>
                  </div>
                </div>
              </div>

              {/* Combined Score Card */}
              <div style={{
                background: `linear-gradient(135deg, ${colors.deepIndigo}, ${colors.deepIndigoDark})`,
                padding: 32,
                borderRadius: 16,
                marginBottom: 24,
                textAlign: 'center',
                border: `2px solid ${colors.lightPurple}`,
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ 
                  fontSize: 14,
                  color: colors.lightPurpleLight,
                  fontWeight: 600,
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  🎯 Combined Assessment Score
                </div>
                <div style={{ 
                  fontSize: 56, 
                  fontWeight: 700, 
                  color: colors.white,
                  marginBottom: 8
                }}>
                  {selectedCombinedView.combined_score}%
                </div>
                <div style={{ 
                  display: 'inline-block',
                  padding: '8px 20px',
                  background: getGradeColor(selectedCombinedView.grade),
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 20,
                  color: colors.white
                }}>
                  Grade: {selectedCombinedView.grade}
                </div>
              </div>

              {/* Assessment Breakdown */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: selectedCombinedView.has_mcq && selectedCombinedView.has_coding ? '1fr 1fr' : '1fr',
                gap: 24,
                marginBottom: 24
              }}>
                {/* MCQ Section */}
                {selectedCombinedView.has_mcq && (
                  <div style={{
                    background: colors.charcoal,
                    padding: 24,
                    borderRadius: 12,
                    border: `2px solid ${colors.lightPurple}`
                  }}>
                    <h3 style={{ 
                      fontSize: 18, 
                      fontWeight: 700, 
                      marginBottom: 20,
                      color: colors.lightPurple,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      📝 MCQ Assessment
                    </h3>
                    <div style={{
                      textAlign: 'center',
                      padding: 20,
                      background: colors.background,
                      borderRadius: 10,
                      marginBottom: 16,
                      border: `1px solid ${colors.borderColor}`
                    }}>
                      <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>
                        Average Score
                      </div>
                      <div style={{ fontSize: 36, fontWeight: 700, color: colors.lightPurple }}>
                        {selectedCombinedView.mcq_score}%
                      </div>
                    </div>
                    {selectedCombinedView.mcq_tests.map((mcq, idx) => (
                      <div key={idx} style={{ 
                        marginBottom: 16,
                        padding: 16,
                        background: colors.background,
                        borderRadius: 10,
                        border: `1px solid ${colors.borderColor}`
                      }}>
                        <div style={{ 
                          fontSize: 15, 
                          fontWeight: 600, 
                          color: colors.textPrimary,
                          marginBottom: 12
                        }}>
                          Test #{idx + 1}
                        </div>
                        <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: colors.textSecondary }}>Score:</span>
                            <span style={{ fontWeight: 600, color: colors.textPrimary }}>{mcq.score}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: colors.textSecondary }}>Grade:</span>
                            <span style={{ fontWeight: 600, color: colors.lightPurple }}>{mcq.grade}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: colors.textSecondary }}>Correct:</span>
                            <span style={{ fontWeight: 600, color: colors.success }}>{mcq.correct_answers}/{mcq.total_questions}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: colors.textSecondary }}>Time:</span>
                            <span style={{ fontWeight: 600, color: colors.textPrimary }}>
                              {Math.floor(mcq.total_time_taken / 60)}m {mcq.total_time_taken % 60}s
                            </span>
                          </div>
                          {mcq.violation_count > 0 && (
                            <div style={{
                              marginTop: 8,
                              padding: 10,
                              background: 'rgba(239, 68, 68, 0.1)',
                              borderRadius: 6,
                              color: colors.danger,
                              fontSize: 12,
                              fontWeight: 600
                            }}>
                              ⚠️ {mcq.violation_count} violation(s) detected
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCombinedView(null);
                            setSelectedResult(mcq);
                          }}
                          style={{
                            marginTop: 14,
                            padding: '10px 16px',
                            background: colors.lightPurple,
                            color: colors.white,
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            width: '100%',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.target.style.background = colors.deepIndigo}
                          onMouseOut={(e) => e.target.style.background = colors.lightPurple}
                        >
                          View Full MCQ Details →
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Coding Section */}
                {selectedCombinedView.has_coding && (
                  <div style={{
                    background: colors.charcoal,
                    padding: 24,
                    borderRadius: 12,
                    border: `2px solid ${colors.slateGray}`
                  }}>
                    <h3 style={{ 
                      fontSize: 18, 
                      fontWeight: 700, 
                      marginBottom: 20,
                      color: colors.slateGrayLight,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      💻 Coding Assessment
                    </h3>
                    <div style={{
                      textAlign: 'center',
                      padding: 20,
                      background: colors.background,
                      borderRadius: 10,
                      marginBottom: 16,
                      border: `1px solid ${colors.borderColor}`
                    }}>
                      <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>
                        Average Score
                      </div>
                      <div style={{ fontSize: 36, fontWeight: 700, color: colors.slateGrayLight }}>
                        {selectedCombinedView.coding_score}%
                      </div>
                    </div>
                    {selectedCombinedView.coding_tests.map((coding, idx) => (
                      <div key={idx} style={{ 
                        marginBottom: 16,
                        padding: 16,
                        background: colors.background,
                        borderRadius: 10,
                        border: `1px solid ${colors.borderColor}`
                      }}>
                        <div style={{ 
                          fontSize: 15, 
                          fontWeight: 600, 
                          color: colors.textPrimary,
                          marginBottom: 12
                        }}>
                          Test #{idx + 1}
                        </div>
                        <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: colors.textSecondary }}>Score:</span>
                            <span style={{ fontWeight: 600, color: colors.textPrimary }}>{coding.score}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: colors.textSecondary }}>Challenge:</span>
                            <span style={{ fontWeight: 600, color: colors.textPrimary }}>
                              {coding.challenge_title || 'Coding Challenge'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: colors.textSecondary }}>Language:</span>
                            <span style={{ fontWeight: 600, color: colors.textPrimary }}>
                              {coding.language || 'Python'}
                            </span>
                          </div>
                          {coding.test_results && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: colors.textSecondary }}>Tests Passed:</span>
                              <span style={{ fontWeight: 600, color: colors.success }}>
                                {coding.test_results.passed || 0}/{coding.test_results.total || 0}
                              </span>
                            </div>
                          )}
                          {(coding.ai_detected || coding.plagiarism_detected) && (
                            <div style={{
                              marginTop: 8,
                              padding: 10,
                              background: 'rgba(239, 68, 68, 0.1)',
                              borderRadius: 6,
                              color: colors.danger,
                              fontSize: 12,
                              fontWeight: 600
                            }}>
                              {coding.ai_detected && '🤖 AI Detected'}
                              {coding.ai_detected && coding.plagiarism_detected && ' • '}
                              {coding.plagiarism_detected && '📋 Plagiarism'}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCombinedView(null);
                            setSelectedCodingSubmission(coding);
                          }}
                          style={{
                            marginTop: 14,
                            padding: '10px 16px',
                            background: colors.slateGray,
                            color: colors.white,
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            width: '100%',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.target.style.background = colors.deepIndigo}
                          onMouseOut={(e) => e.target.style.background = colors.slateGray}
                        >
                          View Full Coding Details →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Score Calculation Info */}
              <div style={{
                background: colors.charcoal,
                padding: 20,
                borderRadius: 12,
                border: `1px solid ${colors.borderColor}`
              }}>
                <div style={{ 
                  fontWeight: 600, 
                  marginBottom: 12, 
                  color: colors.textPrimary,
                  fontSize: 15
                }}>
                  📐 Score Calculation Method
                </div>
                <div style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.6 }}>
                  <div style={{ marginBottom: 6 }}>
                    Combined Score = (Average MCQ Score + Average Coding Score) / 2
                  </div>
                  <div style={{ 
                    marginTop: 12,
                    padding: 12,
                    background: colors.background,
                    borderRadius: 8,
                    fontFamily: 'monospace',
                    color: colors.lightPurple,
                    border: `1px solid ${colors.borderColor}`
                  }}>
                    = ({selectedCombinedView.mcq_score}% + {selectedCombinedView.coding_score}%) / 2 = {selectedCombinedView.combined_score}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function for score colors
function getScoreColor(score) {
  if (score >= 90) return '#10b981';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

// Helper function for grade colors
function getGradeColor(grade) {
  const gradeColors = {
    'A+': '#10b981',
    'A': '#3b82f6',
    'B': '#8b5cf6',
    'C': '#f59e0b',
    'D': '#f97316',
    'F': '#ef4444'
  };
  return gradeColors[grade] || '#64748b';
}

// Table styles
const tableHeaderStyle = {
  padding: '16px 20px',
  textAlign: 'left',
  fontSize: 13,
  fontWeight: 700,
  color: '#ffffff',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '2px solid #a78bfa'
};

const tableCellStyle = {
  padding: '16px 20px',
  fontSize: 14,
  color: '#cbd5e1'
};