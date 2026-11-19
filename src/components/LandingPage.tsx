import {
  ArrowRight,
  ChefHat,
  Clock,
  GraduationCap,
  Layers,
  Lock,
  QrCode,
  ShieldCheck,
  UtensilsCrossed,
} from 'lucide-react';
import { useCanteen } from '../context/CanteenContext';
import { formatMinutesToClock } from '../engine/queueEngine';
import { AuthScreen } from '../types/canteen';

interface LandingPageProps {
  onNavigate: (screen: AuthScreen) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { publicTelemetry } = useCanteen();

  const serviceClock = publicTelemetry
    ? formatMinutesToClock(publicTelemetry.currentTimeMinutes)
    : '12:08 PM';
  const stations = publicTelemetry?.parallelPrepStations ?? 3;
  const rushCut = publicTelemetry?.peakCrowdCutPercent ?? 38;
  const waitSaved = publicTelemetry?.avgMinutesSaved ?? 14;
  const activeQueued = publicTelemetry?.activeQueuedCount ?? 6;
  const readyCount = publicTelemetry?.readyCount ?? 3;
  const upcomingSlots = publicTelemetry?.slotEvaluations.slice(0, 4) ?? [];

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#0F1E18]">
      {/* Clean 3-Zone Top Bar */}
      <header className="border-b border-[#E1E8E3] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <a
            href="#top"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#09533A] whitespace-nowrap shrink-0 font-display"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#09533A] text-white">
              <UtensilsCrossed className="h-4 w-4" />
            </span>
            Queue-Free Canteen
          </a>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[#4B5E54] md:flex">
            <a
              href="#how-it-works"
              className="transition-colors hover:text-[#09533A] whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#live-telemetry"
              className="transition-colors hover:text-[#09533A] whitespace-nowrap shrink-0"
            >
              Live Queue
            </a>
            <a
              href="#workspaces"
              className="transition-colors hover:text-[#09533A] whitespace-nowrap shrink-0"
            >
              Portals
            </a>
          </nav>

          <button
            type="button"
            onClick={() => onNavigate('student-login')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#09533A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0F6B4B] whitespace-nowrap shrink-0 sm:text-sm"
          >
            <span>Student Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        {/* Hero Split */}
        <section
          id="live-telemetry"
          className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8"
        >
          {/* Hero Narrative */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#DCE5DF] bg-white p-6 sm:p-8 lg:col-span-7">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-[#0F6B4B]">
                Campus Service Window · {serviceClock}
              </p>
              <h1
                className="mt-3 text-3xl font-bold tracking-tight text-[#0F1E18] sm:text-5xl sm:leading-[1.08] font-display"
                style={{ textWrap: 'balance' }}
              >
                Zero Counter Crowds. Fresh Food Ready When You Arrive.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#46594F]">
                Dynamic pickup slot allocation evaluates real-time kitchen workload
                points, batch prep times, and per-window order caps so students
                skip lunch-hour lines and counters never bottleneck.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('student-login')}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#09533A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F6B4B] active:scale-[0.99] whitespace-nowrap"
              >
                <GraduationCap className="h-4 w-4" />
                Student Portal Login
              </button>
              <button
                type="button"
                onClick={() => onNavigate('admin-login')}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#C8D6CE] bg-[#F6F8F7] px-6 py-3 text-sm font-semibold text-[#0F1E18] transition-colors hover:bg-[#EAF1ED] active:scale-[0.99] whitespace-nowrap"
              >
                <ChefHat className="h-4 w-4 text-[#09533A]" />
                Admin &amp; Kitchen Login
              </button>
            </div>
          </div>

          {/* Live Smart Queue Telemetry Hero Card */}
          <div className="flex flex-col justify-between rounded-3xl bg-[#09533A] p-6 text-white sm:p-8 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-white font-display">
                  Live Smart Queue Telemetry
                </h2>
                <span className="font-mono text-xs text-[#A9E5C9] tabular-nums">
                  {stations} prep stations
                </span>
              </div>
              <p className="mt-1 text-xs text-[#CBEAD9]">
                Real-time lunch service distribution across 15-minute windows
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-white/10 p-3.5">
                  <p className="font-mono text-2xl font-bold text-[#34D399] tabular-nums">
                    -{rushCut}%
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[#E2F3EA]">
                    Peak Rush Cut
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3.5">
                  <p className="font-mono text-2xl font-bold text-white tabular-nums">
                    {waitSaved}m
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[#E2F3EA]">
                    Avg Wait Saved
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3.5">
                  <p className="font-mono text-2xl font-bold text-white tabular-nums">
                    {activeQueued}
                    <span className="text-sm font-normal text-[#A9E5C9]">
                      /{readyCount}r
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[#E2F3EA]">
                    Queued / Ready
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-white/15 pt-4">
              <div className="flex items-center justify-between text-xs text-[#CBEAD9]">
                <span>Upcoming Window Load</span>
                <span className="font-mono tabular-nums">Dual-cap protection</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {upcomingSlots.map((ev) => {
                  const pct = Math.min(100, Math.round(ev.loadRatio * 100));
                  return (
                    <div
                      key={ev.slot.id}
                      className="rounded-xl bg-white/10 px-2.5 py-2"
                    >
                      <p className="font-mono text-[11px] font-semibold text-white tabular-nums">
                        {ev.slot.shortLabel}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                        <div
                          className={`h-full rounded-full ${
                            ev.classification === 'Slot Full' ||
                            ev.classification === 'Kitchen Cap'
                              ? 'bg-[#F87171]'
                              : ev.classification === 'Busy'
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#34D399]'
                          }`}
                          style={{ width: `${Math.max(12, pct)}%` }}
                        />
                      </div>
                      <p className="mt-1 truncate text-[10px] text-[#DCEFE5]">
                        {ev.classification}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Mechanism Explanation */}
        <section id="how-it-works" className="mt-10 sm:mt-12">
          <h2 className="text-xl font-bold text-[#0F1E18] sm:text-2xl font-display">
            How the Smart Queue Engine Eliminates Lines
          </h2>
          <p className="mt-1 text-sm text-[#4B5E54]">
            Every order passes through dynamic prep calculation and dual-cap slot validation.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#DCE5DF] bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF4EF] text-[#09533A]">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#0F1E18] font-display">
                01. Order Ahead
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#4B5E54]">
                Students browse live stock and see exact prep time computed from
                dish complexity, batch overhead, and current kitchen backlog.
              </p>
            </div>

            <div className="rounded-2xl border border-[#DCE5DF] bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF4EF] text-[#09533A]">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#0F1E18] font-display">
                02. Workload-Aware Slot Allocation
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#4B5E54]">
                Each 15-minute window enforces both order count and kitchen
                workload-point caps, auto-smoothing rush orders to calmer slots.
              </p>
            </div>

            <div className="rounded-2xl border border-[#DCE5DF] bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF4EF] text-[#09533A]">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#0F1E18] font-display">
                03. 5-Second QR Handover
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#4B5E54]">
                When the order hits Ready, students flash their encrypted QR
                pickup pass at the counter for instant verification and collection.
              </p>
            </div>
          </div>
        </section>

        {/* Separate Authenticated Portals */}
        <section id="workspaces" className="mt-10 sm:mt-12">
          <h2 className="text-xl font-bold text-[#0F1E18] sm:text-2xl font-display">
            Separate Authenticated Portals
          </h2>
          <p className="mt-1 text-sm text-[#4B5E54]">
            Students and canteen staff sign in to isolated, role-protected portals backed by real-time server sync.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Student Login Portal Card */}
            <div className="flex flex-col justify-between rounded-3xl border border-[#DCE5DF] bg-white p-6 sm:p-7">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF4EF] text-[#09533A]">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#09533A]">
                    <Lock className="h-3.5 w-3.5" />
                    Student Account Required
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-[#0F1E18] font-display">
                  Student Ordering Portal
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#4B5E54]">
                  Sign in with your campus email or roll number (or register a new
                  student account) to order ahead, view smart slot recommendations,
                  and track your private QR pickup passes.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-[#3C4F45]">
                  <div className="rounded-xl bg-[#F6F8F7] p-3">
                    <p className="font-semibold text-[#0F1E18]">Private Orders</p>
                    <p className="mt-0.5 text-[#5A6D63]">
                      Scoped strictly to your student account &amp; PIN
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F6F8F7] p-3">
                    <p className="font-semibold text-[#0F1E18]">Live Status Sync</p>
                    <p className="mt-0.5 text-[#5A6D63]">
                      Instant kitchen updates when food is Ready
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('student-login')}
                className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#09533A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F6B4B]"
              >
                <span>Go to Student Login</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Admin Login Portal Card */}
            <div className="flex flex-col justify-between rounded-3xl border border-[#DCE5DF] bg-white p-6 sm:p-7">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#B45309]">
                    <ChefHat className="h-6 w-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#B45309]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Staff Credentials Required
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-[#0F1E18] font-display">
                  Canteen Admin &amp; Kitchen Console
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#4B5E54]">
                  Dedicated staff portal to manage live kitchen queues, scan &amp;
                  verify student QR tickets at handover, control dish inventory,
                  and configure slot workload limits.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-[#3C4F45]">
                  <div className="rounded-xl bg-[#F6F8F7] p-3">
                    <p className="font-semibold text-[#0F1E18]">QR Counter Verification</p>
                    <p className="mt-0.5 text-[#5A6D63]">
                      Verify token, 4-digit PIN, or QR payload
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F6F8F7] p-3">
                    <p className="font-semibold text-[#0F1E18]">Capacity Governance</p>
                    <p className="mt-0.5 text-[#5A6D63]">
                      Live prep stations &amp; slot workload caps
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('admin-login')}
                className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#09533A] bg-white px-5 py-3 text-sm font-semibold text-[#09533A] transition-colors hover:bg-[#EAF4EF]"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Go to Admin Login</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
