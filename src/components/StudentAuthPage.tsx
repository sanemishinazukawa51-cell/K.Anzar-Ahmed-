import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Lock,
  Mail,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import { useCanteen } from '../context/CanteenContext';

interface StudentAuthPageProps {
  onBackToLanding: () => void;
  onGoToAdminLogin: () => void;
}

const SAMPLE_STUDENTS = [
  { name: 'Aarav Mehta', identifier: 'aarav@campus.edu', roll: 'CS-2026-042' },
  { name: 'Maya Lin', identifier: 'maya@campus.edu', roll: 'ME-2026-118' },
  { name: 'Zara Chen', identifier: 'zara@campus.edu', roll: 'EC-2026-089' },
];

export function StudentAuthPage({
  onBackToLanding,
  onGoToAdminLogin,
}: StudentAuthPageProps) {
  const { loginStudent, registerStudent } = useCanteen();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await loginStudent(identifier, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Could not sign in.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await registerStudent({
      name,
      email,
      rollNumber,
      department,
      password: regPassword,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Could not create student account.');
    }
  };

  const handleQuickFill = (sampleIdentifier: string) => {
    setMode('login');
    setIdentifier(sampleIdentifier);
    setPassword('student123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#0F1E18]">
      <header className="border-b border-[#E1E8E3] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex min-h-[40px] items-center gap-2 text-sm font-semibold text-[#3C4F45] hover:text-[#09533A]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Overview</span>
          </button>

          <div className="flex items-center gap-2 text-sm font-bold text-[#09533A] font-display">
            <UtensilsCrossed className="h-4 w-4" />
            <span>Queue-Free Canteen</span>
          </div>

          <button
            type="button"
            onClick={onGoToAdminLogin}
            className="text-xs font-semibold text-[#0F6B4B] hover:underline whitespace-nowrap"
          >
            Admin Login
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-10 sm:py-14">
        <div className="rounded-3xl border border-[#DCE5DF] bg-white p-6 shadow-xs sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF4EF] text-[#09533A]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0F1E18] font-display">
                Student Portal Login
              </h1>
              <p className="text-xs text-[#5A6D63]">
                Order ahead, reserve pickup slots &amp; access your QR tickets
              </p>
            </div>
          </div>

          {/* Sign In / Register Switch */}
          <div className="mt-6 grid grid-cols-2 rounded-xl border border-[#DCE5DF] bg-[#F6F8F7] p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-[#09533A] text-white'
                  : 'text-[#4B5E54] hover:text-[#0F1E18]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-[#09533A] text-white'
                  : 'text-[#4B5E54] hover:text-[#0F1E18]'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-medium text-[#991B1B]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="student-identifier"
                  className="block text-xs font-semibold text-[#3C4F45]"
                >
                  Campus Email or Roll Number
                </label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A7C73]" />
                  <input
                    id="student-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="aarav@campus.edu or CS-2026-042"
                    className="min-h-[44px] w-full rounded-xl border border-[#D4DFD8] bg-white pl-10 pr-3.5 text-sm text-[#0F1E18] focus:border-[#09533A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-password"
                  className="block text-xs font-semibold text-[#3C4F45]"
                >
                  Password
                </label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A7C73]" />
                  <input
                    id="student-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="min-h-[44px] w-full rounded-xl border border-[#D4DFD8] bg-white pl-10 pr-3.5 text-sm text-[#0F1E18] focus:border-[#09533A] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#09533A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F6B4B] disabled:opacity-60"
              >
                <span>{submitting ? 'Signing in...' : 'Sign In to Student Portal'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Quick-fill sample student accounts */}
              <div className="border-t border-[#E6ECE8] pt-4">
                <p className="text-[11px] font-semibold text-[#5A6D63]">
                  Quick-fill Sample Student Credentials (Password:{' '}
                  <span className="font-mono text-[#0F1E18]">student123</span>)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SAMPLE_STUDENTS.map((s) => (
                    <button
                      key={s.roll}
                      type="button"
                      onClick={() => handleQuickFill(s.identifier)}
                      className="rounded-lg border border-[#D4DFD8] bg-[#F6F8F7] px-2.5 py-1.5 text-xs font-medium text-[#1A2D24] hover:bg-[#EAF1ED]"
                    >
                      {s.name} ({s.roll})
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#3C4F45]">
                  Full Name
                </label>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A7C73]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Riya Sharma"
                    className="min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white pl-10 pr-3 text-sm focus:border-[#09533A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#3C4F45]">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="CS-2026-105"
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3 font-mono text-sm uppercase focus:border-[#09533A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3C4F45]">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Computer Science"
                    className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3 text-sm focus:border-[#09533A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3C4F45]">
                  Campus Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="riya@campus.edu"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3.5 text-sm focus:border-[#09533A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3C4F45]">
                  Create Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="mt-1 min-h-[42px] w-full rounded-xl border border-[#D4DFD8] bg-white px-3.5 text-sm focus:border-[#09533A] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#09533A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F6B4B] disabled:opacity-60"
              >
                <span>{submitting ? 'Creating Account...' : 'Create Student Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
