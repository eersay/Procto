import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import QuestionBankPage from './pages/QuestionBankPage';
import ExamBuilderPage from './pages/ExamBuilderPage';
import TakeExamPage from './pages/TakeExamPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/faculty" element={<FacultyDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/questions" element={<QuestionBankPage />} />
        <Route path="/exams" element={<ExamBuilderPage />} />
        <Route path="/take-exam/:examId" element={<TakeExamPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
