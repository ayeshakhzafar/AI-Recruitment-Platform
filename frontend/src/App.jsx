import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";

// Existing Pages
import HomePage from "./pages/HomePage";
import AssessmentManagementPage from "./pages/AssessmentManagement";
import TakeAssessmentPage from "./pages/StandardTest";
import ResultsDashboard from "./pages/ResultsDashboard";
import CandidateResultsPage from "./pages/CandidateResults";
import AdaptiveTakeAssessment from "./pages/AdaptiveTakeAssessment";
import CodingChallengePage from "./pages/CodingChallenge";
import CodingSubmissionPage from "./pages/CodingSubmission";
import CvUploadPage from "./pages/CvUploadPage";
import CvManagement from "./pages/CvManagement";
import CvDashboard from "./components/CvDashboard";

// New Placeholder Pages
import JobPostingPage from "./pages/JobPostingPage";
import MonitoringPage from "./pages/MonitoringPage";
import InsightsPage from "./pages/InsightsPage";
import SchedulingPage from "./pages/SchedulingPage";

import RecommendationsPage from "./pages/RecommendationsPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import InterviewsPage from "./pages/InterviewsPage";
import AIInterviewPage from "./pages/AIInterviewPage";

// HR Dashboard - Unified recruitment management
import HRDashboard from "./pages/HRDashboard";
import LoginPage from "./pages/LoginPage";
import HRSignupPage from "./pages/HRSignupPage";
import CandidateWelcomePage from "./pages/CandidateWelcomePage";
import CandidateSignupPage from "./pages/CandidateSignupPage";
import CandidateDashboardPage from "./pages/CandidateDashboardPage";

// HR Dashboard - Pipeline Tracking
import HRPipelineDashboard from "./pages/HRPipelineDashboard";

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
          {/* Home */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/hr/signup" element={<HRSignupPage />} />

          {/* Module 2.2.11 — Candidate / user portal */}
          <Route path="/candidate" element={<CandidateWelcomePage />} />
          <Route path="/candidate/signup" element={<CandidateSignupPage />} />
          <Route path="/candidate/dashboard" element={<CandidateDashboardPage />} />

          {/* Module 1: Automated Job Posting */}
          <Route path="/job-posting" element={<JobPostingPage />} />

          {/* Module 2: CV Data Extraction */}
          <Route path="/cv-upload" element={<CvUploadPage />} />
          <Route path="/cv-management" element={<CvManagement />} />
          <Route path="/hr/candidates" element={<CvDashboard />} />
          
          {/* HR Pipeline Dashboard - Track all candidates across modules */}
          <Route path="/hr/pipeline" element={<HRPipelineDashboard />} />

          {/* HR Unified Dashboard - Main recruitment management */}
          <Route path="/hr/dashboard" element={<HRDashboard />} />

          {/* Module 3: Custom MCQ Generation */}
          <Route path="/assessments" element={<AssessmentManagementPage />} />
          <Route path="/take-assessment" element={<TakeAssessmentPage />} />
          <Route path="/adaptive-test" element={<AdaptiveTakeAssessment />} />

          {/* Module 4: Results Management */}
          <Route path="/results" element={<ResultsDashboard />} />
          <Route path="/my-results" element={<CandidateResultsPage />} />

          {/* Module 5: Technical Assessment */}
          <Route path="/coding-challenges" element={<CodingChallengePage />} />
          <Route path="/coding-challenge" element={<CodingSubmissionPage />} />

          {/* Module 6: Candidate Monitoring */}
          <Route path="/monitoring" element={<MonitoringPage />} />

          {/* Module 7: Insights Extraction */}
          <Route path="/insights" element={<InsightsPage />} />

          {/* Module 8: Interview Scheduling */}
          <Route path="/scheduling" element={<SchedulingPage />} />

          {/* Module 9: Fully & Semi-Automated Interview System */}
          <Route path="/interviews" element={<InterviewsPage />} />
          <Route path="/ai-interview" element={<AIInterviewPage />} />

          {/* Module 10: Candidate Recommendation */}
          <Route path="/recommendations" element={<RecommendationsPage />} />

          {/* Module 11: User Profile Management */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* Module 12: Notifications */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Module 13: System Settings */}
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
