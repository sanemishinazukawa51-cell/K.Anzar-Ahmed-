import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChefHat,
  IdCard,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useCanteen } from '../context/CanteenContext';

interface AdminAuthPageProps {
  onBackToLanding: () => void;
  onGoToStudentLogin: () => void;
}

const SAMPLE_ADMINS = [
  {
    name: 'Chef Vikram Rao',
    staffId: 'ADMIN-01',
    identifier: 'kitchen@campus.edu',
    station: 'Main Kitchen Lead',
  },
  {
    name: 'Priya Nair',
    staffId: 'STAFF-02',
    identifier: 'counter@campus.edu',
    station: 'QR Pickup Desk',
  },
];

export function AdminAuthPage({
  onBackToLanding,
  onGoToStudentLogin,
}: AdminAuthPageProps) {
  const { loginAdmin } = useCanteen();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await loginAdmin(identifier, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Could not authenticate admin.');
    }
  };

  const handleQuickFill = (staffId: string) => {
    setIdentifier(staffId);
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0D1E17] text-white">
      <header className="border-b border-white/10 bg-[#091611]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex min-h-[40px] items-center gap-2 text-sm font-semibold text-[#CBEAD9] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Overview</span>
          </button>

          <div className="flex items-center gap-2 text-sm font-bold text-white font-display">
            <ChefHat className="h-4 w-4 text-[#10B981]" />
            <span>Canteen Staff Operations</span>
          </div>

          <button
            type="button"
            onClick={onGoToStudentLogin}
            className="text-xs font-semibold text-[#34D399] hover:underline whitespace-nowrap"
          >
            Student Login
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-12 sm:py-16">
        <div className="rounded-3xl border border-[#DCE5DF] bg-white p-6 text-[#0F1E18] shadow-2xl sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#09533A] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0F1E18] font-display">
                Canteen Admin Login
              </h1>
              <p className="text-xs text-[#5A6D63]">
                Authorized kitchen &amp; pickup counter personnel only
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-medium text-[#991B1B]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="admin-identifier"
                className="block text-xs font-semibold text-[#3C4F45]"
              >
                Staff ID or Canteen Email
              </label>
              <div className="relative mt-1">
                <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A7C73]" />
                <input
                  id="admin-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ADMIN-01 or kitchen@campus.edu"
                  className="min-h-[44px] w-full rounded-xl border border-[#D4DFD8] bg-white pl-10 pr-3.5 text-sm text-[#0F1E18] focus:border-[#09533A] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-[#3C4F45]"
              >
                Staff Password
              </label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A7C73]" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter staff password"
                  className="min-h-[44px] w-full rounded-xl border border-[#D4DFD8] bg-white pl-10 pr-3.5 text-sm text-[#0F1E18] focus:border-[#09533A] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#09533A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F6B4B] disabled:opacity-60"
            >
              <span>
                {submitting ? 'Verifying Staff Access...' : 'Sign In to Admin Console'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-5 border-t border-[#E6ECE8] pt-4">
            <p className="text-[11px] font-semibold text-[#5A6D63]">
              Quick-fill Sample Staff Credentials (Password:{' '}
              <span className="font-mono text-[#0F1E18]">admin123</span>)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_ADMINS.map((adm) => (
                <button
                  key={adm.staffId}
                  type="button"
                  onClick={() => handleQuickFill(adm.staffId)}
                  className="rounded-lg border border-[#D4DFD8] bg-[#F6F8F7] px-2.5 py-1.5 text-xs font-medium text-[#1A2D24] hover:bg-[#EAF1ED]"
                >
                  {adm.name} · {adm.staffId}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
