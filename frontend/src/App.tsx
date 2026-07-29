import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import QuestionBankPage from './pages/QuestionBankPage';
import ExamBuilderPage from './pages/ExamBuilderPage';
import ExamPreflightPage from './pages/ExamPreflightPage';
import TakeExamPage from './pages/TakeExamPage';
import ProctorDashboardPage from './pages/ProctorDashboardPage';
import MyResultsPage from './pages/MyResultsPage';
import ResultDetailPage from './pages/ResultDetailPage';
import GradingDashboardPage from './pages/GradingDashboardPage';
import GradeSessionPage from './pages/GradeSessionPage';
import ClassAnalyticsPage from './pages/ClassAnalyticsPage';
import CourseDetailPage from './pages/CourseDetailPage';
import MyCoursesPage from './pages/MyCoursesPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/faculty" element={<FacultyDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/questions" element={<QuestionBankPage />} />
        <Route path="/exams" element={<ExamBuilderPage />} />
        <Route path="/exam-preflight/:examId" element={<ExamPreflightPage />} />
        <Route path="/take-exam/:examId" element={<TakeExamPage />} />
        <Route path="/proctor-dashboard" element={<ProctorDashboardPage />} />
        <Route path="/my-results" element={<MyResultsPage />} />
        <Route path="/result/:sessionId" element={<ResultDetailPage />} />
        <Route path="/grading" element={<GradingDashboardPage />} />
        <Route path="/grade/:examId/:sessionId" element={<GradeSessionPage />} />
        <Route path="/analytics/:examId" element={<ClassAnalyticsPage />} />
        <Route path="/course/:id" element={<CourseDetailPage />} />
        <Route path="/my-courses" element={<MyCoursesPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
