import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Course {
  id: string;
  name: string;
  code: string;
  description: string | null;
  faculty: {
    firstName: string;
    lastName: string;
  };
  _count: {
    enrollments: number;
  };
}

interface Exam {
  id: string;
  title: string;
  courseId: string;
  durationMinutes: number;
  startAt: string;
  endAt: string;
  course: {
    name: string;
    code: string;
  };
  _count: {
    examQuestions: number;
  };
}

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchCourses();
  }, [navigate]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      const courses = response.data.courses;
      setEnrolledCourses(courses);
      
      // Fetch exams for all enrolled courses
      const examPromises = courses.map((course: Course) =>
        api.get(`/exams?courseId=${course.id}`).catch(() => ({ data: { exams: [] } }))
      );
      
      const examResponses = await Promise.all(examPromises);
      const allExams = examResponses.flatMap((res, idx) =>
        res.data.exams.map((exam: any) => ({
          ...exam,
          course: {
            name: courses[idx].name,
            code: courses[idx].code,
          },
        }))
      );
      
      // Filter to only show upcoming/active exams
      const now = new Date();
      const upcoming = allExams.filter((exam: Exam) => new Date(exam.endAt) > now);
      setUpcomingExams(upcoming);
    } catch (error) {
      console.error('Fetch courses error:', error);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/courses/enroll', { courseCode });
      toast.success(`Successfully enrolled in ${response.data.course.name}!`);
      setShowEnrollModal(false);
      setCourseCode('');
      fetchCourses();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Enrollment failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clear();
      navigate('/login');
    }
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const start = new Date(exam.startAt);
    const end = new Date(exam.endAt);
    
    if (now < start) return { status: 'UPCOMING', color: 'bg-blue-100 text-blue-700', canTake: false };
    if (now >= start && now <= end) return { status: 'ACTIVE', color: 'bg-green-100 text-green-700', canTake: true };
    return { status: 'ENDED', color: 'bg-gray-100 text-gray-700', canTake: false };
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">PROCTO</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.firstName} {user.lastName}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <div className="text-blue-600 text-4xl mb-4">📚</div>
            <h3 className="text-lg font-semibold mb-2">Enrolled Courses</h3>
            <p className="text-3xl font-bold text-blue-600">{enrolledCourses.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <div className="text-green-600 text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">Upcoming Exams</h3>
            <p className="text-3xl font-bold text-green-600">{upcomingExams.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <div className="text-purple-600 text-4xl mb-4">✅</div>
            <h3 className="text-lg font-semibold mb-2">Completed</h3>
            <p className="text-3xl font-bold text-purple-600">0</p>
          </div>
        </div>

        {/* Upcoming Exams Section */}
        {upcomingExams.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-4">Upcoming Exams</h3>
            <div className="space-y-4">
              {upcomingExams.map((exam) => {
                const examStatus = getExamStatus(exam);
                return (
                  <div key={exam.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-xl font-bold text-gray-900">{exam.title}</h4>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${examStatus.color}`}>
                            {examStatus.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {exam.course.name} ({exam.course.code})
                        </p>
                        <div className="flex gap-6 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Duration:</span> {exam.durationMinutes} min
                          </div>
                          <div>
                            <span className="font-medium">Questions:</span> {exam._count.examQuestions}
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-gray-600">
                          <div>📅 Start: {new Date(exam.startAt).toLocaleString()}</div>
                          <div>🏁 End: {new Date(exam.endAt).toLocaleString()}</div>
                        </div>
                      </div>
                      
                      <div>
                        {examStatus.canTake ? (
                          <button
                            onClick={() => navigate(`/take-exam/${exam.id}`)}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                          >
                            Start Exam →
                          </button>
                        ) : examStatus.status === 'UPCOMING' ? (
                          <button
                            disabled
                            className="px-6 py-3 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
                          >
                            Not Yet Available
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-6 py-3 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
                          >
                            Exam Ended
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">My Courses</h3>
          <button
            onClick={() => setShowEnrollModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            <span className="text-xl">+</span>
            Join Course
          </button>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
            <p className="text-gray-600 mb-6">Ask your instructor for a course code to join</p>
            <button
              onClick={() => setShowEnrollModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Join Course
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <div className="mb-4">
                  <h4 className="text-lg font-bold text-gray-900 mb-1">{course.name}</h4>
                  <p className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded inline-block">
                    {course.code}
                  </p>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  👨‍🏫 {course.faculty.firstName} {course.faculty.lastName}
                </p>
                
                {course.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                )}
                
                <div className="pt-4 border-t flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {course._count.enrollments} students
                  </div>
                  
                  <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    View →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Join Course Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Join Course</h3>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setCourseCode('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Code
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg text-center tracking-wider"
                  placeholder="e.g., abc-defg-hij"
                  maxLength={20}
                  required
                />
                <p className="text-sm text-gray-500 mt-3">
                  💡 Ask your instructor for the course code
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setCourseCode('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !courseCode}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
