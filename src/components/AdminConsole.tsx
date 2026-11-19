import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  Edit3,
  LogOut,
  Minus,
  Pause,
  Play,
  Plus,
  QrCode,
  RotateCcw,
  ScanLine,
  Search,
  SlidersHorizontal,
  Utensils,
} from 'lucide-react';
import { useCanteen } from '../context/CanteenContext';
import {
  formatMinutesToClock,
  formatRupees,
  parseVerificationQuery,
} from '../engine/queueEngine';
import { MenuItem, OrderStatus } from '../types/canteen';
import { AdminDishModal } from './AdminDishModal';
import { DishImage } from './DishImage';
import { QRCodeMatrix } from './QRCodeMatrix';

type AdminTab = 'orders' | 'verify' | 'menu' | 'slots' | 'analytics';

export function AdminConsole() {
  const {
    authUser,
    serverState,
    slotEvaluations,
    logout,
    updateOrderStatus,
    simulateIncomingOrder,
    verifyQrQuery,
    verifyAndCollectOrder,
    toggleItemInStock,
    adjustItemStock,
    saveMenuItem,
    addMenuItem,
    updateKitchenConfig,
    applyDefaultsToAllSlots,
    toggleSlotPaused,
    adjustSlotCapacity,
    advanceClock15m,
    resetServiceData,
  } = useCanteen();

  const [tab, setTab] = useState<AdminTab>('orders');
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [scanInput, setScanInput] = useState('QFC-104');
  const [menuSearch, setMenuSearch] = useState('');
  const [dishModalOpen, setDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [simToast, setSimToast] = useState<string | null>(null);
  const [serverVerifyResult, setServerVerifyResult] = useState<ReturnType<
    typeof parseVerificationQuery
  > | null>(null);

  const orders = serverState?.orders ?? [];
  const menu = serverState?.menu ?? [];
  const kitchenConfig = serverState?.kitchenConfig ?? {
    parallelPrepStations: 3,
    defaultMaxOrdersPerSlot: 5,
    defaultMaxWorkloadPointsPerSlot: 36,
  };
  const serviceClock = serverState
    ? formatMinutesToClock(serverState.currentTimeMinutes)
    : '12:08 PM';

  useEffect(() => {
    let active = true;
    const runVerify = async () => {
      const res = await verifyQrQuery(scanInput);
      if (active) setServerVerifyResult(res);
    };
    runVerify();
    return () => {
      active = false;
    };
  }, [scanInput, orders, verifyQrQuery]);

  const countsByStatus = useMemo(() => {
    const counts = { Received: 0, Preparing: 0, Ready: 0, Collected: 0 };
    for (const order of orders) {
      counts[order.status] += 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'All') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const scannableChips = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'Ready' || o.status === 'Preparing')
        .slice(0, 6),
    [orders]
  );

  const verificationResult = useMemo(
    () => serverVerifyResult ?? parseVerificationQuery(scanInput, orders),
    [serverVerifyResult, scanInput, orders]
  );

  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return menu;
    return menu.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [menu, menuSearch]);

  const analytics = serverState?.analytics;

  const topDishes = useMemo(() => {
    const qtyByDish = new Map<
      string,
      { name: string; count: number; revenue: number }
    >();
    for (const order of orders) {
      for (const item of order.items) {
        const prev = qtyByDish.get(item.menuItemId) ?? {
          name: item.name,
          count: 0,
          revenue: 0,
        };
        prev.count += item.quantity;
        prev.revenue += item.quantity * item.unitPrice;
        qtyByDish.set(item.menuItemId, prev);
      }
    }
    return Array.from(qtyByDish.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [orders]);

  const handleSimulateOrder = async () => {
    const res = await simulateIncomingOrder();
    if (res.ok && res.order) {
      setSimToast(
        `New order #${res.order.token} routed to ${res.order.slotLabel} (${res.order.totalWorkloadPoints} pts)`
      );
    } else {
      setSimToast(
        res.error || 'All open pickup windows are at capacity or items out of stock.'
      );
    }
    setTimeout(() => setSimToast(null), 3500);
  };

  const handleSaveDish = async (
    item: MenuItem | Omit<MenuItem, 'id'>,
    isEdit: boolean
  ) => {
    if (isEdit && 'id' in item) {
      await saveMenuItem(item);
    } else {
      await addMenuItem(item);
    }
  };

  const maxChartWorkload = useMemo(() => {
    const comp = analytics?.windowComparison ?? [];
    return Math.max(
      ...comp.map((w) =>
        Math.max(w.walkInWorkloadPts, w.smartLoadPts, w.maxWorkloadPoints)
      ),
      40
    );
  }, [analytics]);

  const navItems: {
    id: AdminTab;
    label: string;
    icon: typeof ClipboardList;
    badge?: number;
  }[] = [
    {
      id: 'orders',
      label: 'Orders',
      icon: ClipboardList,
      badge: countsByStatus.Received + countsByStatus.Preparing,
    },
    { id: 'verify', label: 'Verify QR', icon: QrCode },
    { id: 'menu', label: 'Menu & Stock', icon: Utensils },
    { id: 'slots', label: 'Smart Slots', icon: SlidersHorizontal },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (!authUser || !serverState || !analytics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8F7] text-sm font-medium text-[#4B5E54]">
        Loading Canteen Admin Console...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#0F1E18]">
      <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-[#E1E8E3] bg-white md:flex md:min-h-screen md:flex-col md:justify-between md:p-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#09533A] text-white">
                <ChefHat className="h-4 w-4" />
              </span>
              <div>
                <p className="text-base font-bold leading-tight text-[#09533A] font-display">
                  Canteen Admin
                </p>
                <p className="font-mono text-[11px] text-[#5A6D63]">
                  {authUser.staffId} · {serviceClock}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#E4EAE6] bg-[#F6F8F7] p-3">
              <p className="truncate text-xs font-bold text-[#0F1E18]">
                {authUser.name}
              </p>
              <p className="mt-0.5 text-[11px] text-[#5A6D63]">
                {authUser.station}
              </p>
            </div>

            <nav className="mt-5 space-y-1.5" aria-label="Admin navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-[#09533A] text-white'
                        : 'text-[#3C4F45] hover:bg-[#EDF3EF]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-3">
            {/* Admin Service Window Controls */}
            <div className="rounded-2xl border border-[#E4EAE6] bg-[#F6F8F7] p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#0F1E18]">Service Clock</span>
                <span className="font-mono font-bold text-[#09533A]">
                  {serviceClock}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={advanceClock15m}
                  className="flex-1 rounded-lg border border-[#D4DFD8] bg-white py-1.5 font-mono text-xs font-semibold text-[#09533A] hover:bg-[#EAF4EF]"
                >
                  +15m
                </button>
                <button
                  type="button"
                  onClick={resetServiceData}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#D4DFD8] bg-white py-1.5 text-xs font-semibold text-[#3C4F45] hover:bg-[#EDF2EF]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#DCE5DF] bg-white px-4 py-2 text-xs font-semibold text-[#3C4F45] transition-colors hover:bg-[#F6F8F7]"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6 md:pb-12 lg:px-8">
          {/* Mobile Admin Top Bar */}
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#E1E8E3] pb-3 md:hidden">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#09533A] font-display">
                Canteen Admin ({authUser.staffId})
              </p>
              <p className="inline-flex items-center gap-1 font-mono text-[11px] text-[#5A6D63]">
                <Clock className="h-3 w-3" />
                {serviceClock}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={advanceClock15m}
                className="min-h-[34px] rounded-lg border border-[#D4DFD8] bg-white px-2.5 font-mono text-xs font-semibold text-[#09533A]"
              >
                +15m
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#D4DFD8] bg-white px-2.5 text-xs font-semibold text-[#2A3D34]"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* TAB 1: ORDERS (KITCHEN QUEUE) */}
          {tab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F1E18] font-display">
                    Kitchen Order Queue
                  </h1>
                  <p className="mt-0.5 text-xs text-[#5A6D63]">
                    Advance live order stages — students see updates instantaneously
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSimulateOrder}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#09533A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0F6B4B] whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Simulate Incoming Order
                </button>
              </div>

              {simToast && (
                <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-xs font-semibold text-[#065F46]">
                  {simToast}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ['Received', countsByStatus.Received, 'text-[#D97706]'],
                    ['Preparing', countsByStatus.Preparing, 'text-[#09533A]'],
                    ['Ready', countsByStatus.Ready, 'text-[#059669]'],
                    ['Collected', countsByStatus.Collected, 'text-[#4B5E54]'],
                  ] as const
                ).map(([label, val, colorClass]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#DCE5DF] bg-white p-4"
                  >
                    <p className="text-xs font-medium text-[#5A6D63]">
                      {label}
                    </p>
                    <p
                      className={`mt-1 font-mono text-2xl font-bold tabular-nums ${colorClass}`}
                    >
                      {val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                {(
                  ['All', 'Received', 'Preparing', 'Ready', 'Collected'] as const
                ).map((st) => {
                  const active = statusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#09533A] text-white'
                          : 'border border-[#DCE5DF] bg-white text-[#3C4F45] hover:bg-[#EAF1ED]'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="rounded-3xl border border-[#DCE5DF] bg-white p-10 text-center">
                  <p className="text-sm font-semibold text-[#0F1E18]">
                    No orders in {statusFilter} status
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#DCE5DF] bg-white p-4 sm:p-5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-bold text-[#0F1E18] tabular-nums">
                                #{order.token}
                              </span>
                              <span className="font-mono text-xs font-semibold text-[#09533A] tabular-nums">
                                · {order.totalWorkloadPoints} pts
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-[#5A6D63]">
                              {order.studentName} ·{' '}
                              <span className="font-mono">{order.slotLabel}</span>
                            </p>
                          </div>

                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap ${
                              order.status === 'Ready'
                                ? 'bg-[#D1FAE5] text-[#065F46]'
                                : order.status === 'Collected'
                                ? 'bg-[#EDF2EF] text-[#475A50]'
                                : order.status === 'Preparing'
                                ? 'bg-[#E0F2FE] text-[#0369A1]'
                                : 'bg-[#FEF3C7] text-[#92400E]'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <ul className="mt-3 space-y-1 border-t border-[#EFF3F0] pt-3 text-sm">
                          {order.items.map((item) => (
                            <li
                              key={item.menuItemId}
                              className="flex items-center justify-between text-[#1A2D24]"
                            >
                              <span>
                                <span className="font-mono font-semibold text-[#09533A]">
                                  {item.quantity}x
                                </span>{' '}
                                {item.name}
                              </span>
                              <span className="font-mono text-xs text-[#5A6D63] tabular-nums">
                                {item.workloadPoints * item.quantity} pts
                              </span>
                            </li>
                          ))}
                        </ul>

                        {order.kitchenNote && (
                          <p className="mt-2 rounded-lg bg-[#FFFBEB] px-2.5 py-1.5 text-xs font-medium text-[#92400E]">
                            Note: {order.kitchenNote}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#EFF3F0] pt-3">
                        <span className="font-mono text-xs text-[#5A6D63] tabular-nums">
                          PIN {order.pin} · {order.counterLabel}
                        </span>

                        {order.status === 'Received' && (
                          <button
                            type="button"
                            onClick={() =>
                              updateOrderStatus(order.id, 'Preparing')
                            }
                            className="min-h-[38px] rounded-xl bg-[#09533A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0F6B4B]"
                          >
                            Start Preparing
                          </button>
                        )}
                        {order.status === 'Preparing' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.id, 'Ready')}
                            className="min-h-[38px] rounded-xl bg-[#10B981] px-3.5 py-1.5 text-xs font-semibold text-[#042419] hover:bg-[#34D399]"
                          >
                            Mark Ready
                          </button>
                        )}
                        {order.status === 'Ready' && (
                          <button
                            type="button"
                            onClick={() => {
                              setScanInput(order.token);
                              setTab('verify');
                            }}
                            className="min-h-[38px] rounded-xl border border-[#09533A] bg-[#EAF4EF] px-3.5 py-1.5 text-xs font-semibold text-[#09533A] hover:bg-[#DCEEE4]"
                          >
                            Verify &amp; Collect
                          </button>
                        )}
                        {order.status === 'Collected' && (
                          <span className="text-xs font-semibold text-[#6A7C73]">
                            Handover complete
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VERIFY QR (COUNTER SCANNER) */}
          {tab === 'verify' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0F1E18] font-display">
                  Counter QR Verification Scanner
                </h1>
                <p className="mt-0.5 text-xs text-[#5A6D63]">
                  Scan or enter Token (QFC-104), 4-digit PIN (4829), or full QR
                  payload
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="space-y-4 rounded-3xl border border-[#DCE5DF] bg-white p-5 lg:col-span-6">
                  <div className="relative flex h-44 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#D4DFD8] bg-[#0B2219] text-white">
                    <div className="pointer-events-none absolute inset-x-8 top-0 h-0.5 bg-[#10B981] shadow-[0_0_12px_#10B981] animate-scanner-sweep" />
                    <ScanLine className="h-10 w-10 text-[#34D399]" />
                    <p className="mt-2 font-mono text-xs text-[#A9E5C9]">
                      Optical Counter Scanner Ready
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/65">
                      Format: QFC|ORD-XXX|slot_XXXX|PIN
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="qr-scan-input"
                      className="block text-xs font-semibold text-[#3C4F45]"
                    >
                      Token, PIN, or QR Payload
                    </label>
                    <input
                      id="qr-scan-input"
                      type="text"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      placeholder="QFC-104 or 4829 or QFC|ORD-104|slot_1215|4829"
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-[#D4DFD8] bg-[#FAFBFB] px-3.5 font-mono text-sm text-[#0F1E18] focus:border-[#09533A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#4B5E54]">
                      1-Tap Active Ticket Scan
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {scannableChips.map((ticket) => (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => setScanInput(ticket.qrPayload)}
                          className={`min-h-[36px] rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
                            scanInput.includes(ticket.id) ||
                            scanInput.toUpperCase() === ticket.token
                              ? 'border-[#09533A] bg-[#09533A] text-white'
                              : 'border-[#DCE5DF] bg-[#F6F8F7] text-[#0F1E18] hover:bg-[#EAF1ED]'
                          }`}
                        >
                          #{ticket.token} ({ticket.status})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#DCE5DF] bg-white p-5 lg:col-span-6">
                  {verificationResult.status === 'NOT_FOUND' ||
                  !verificationResult.order ? (
                    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                      <AlertCircle className="h-10 w-10 text-[#DC2626]" />
                      <p className="mt-3 text-base font-bold text-[#991B1B]">
                        NOT FOUND
                      </p>
                      <p className="mt-1 max-w-xs text-xs text-[#5A6D63]">
                        No order matches "{scanInput || 'empty query'}". Try a
                        token like QFC-104 or tap an active ticket chip.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                              verificationResult.status === 'VALID'
                                ? 'bg-[#D1FAE5] text-[#065F46]'
                                : 'bg-[#EDF2EF] text-[#475A50]'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {verificationResult.status === 'VALID'
                              ? 'VALID PICKUP PASS'
                              : 'ALREADY COLLECTED'}
                          </span>
                          <h2 className="mt-2 font-mono text-2xl font-bold text-[#0F1E18] tabular-nums">
                            #{verificationResult.order.token}
                          </h2>
                          <p className="text-xs text-[#5A6D63]">
                            {verificationResult.order.studentName} ·{' '}
                            <span className="font-mono">
                              {verificationResult.order.slotLabel}
                            </span>{' '}
                            · PIN{' '}
                            <span className="font-mono font-bold text-[#09533A]">
                              {verificationResult.order.pin}
                            </span>
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#E2E8E4] p-1.5">
                          <QRCodeMatrix
                            payload={verificationResult.order.qrPayload}
                            size={76}
                          />
                        </div>
                      </div>

                      <div className="mt-4 border-t border-[#EFF3F0] pt-3">
                        <p className="text-xs font-semibold text-[#4B5E54]">
                          Handover Checklist ({verificationResult.order.status})
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm">
                          {verificationResult.order.items.map((item) => (
                            <li
                              key={item.menuItemId}
                              className="flex items-center justify-between rounded-xl bg-[#F6F8F7] px-3 py-2"
                            >
                              <span>
                                <span className="font-mono font-bold text-[#09533A]">
                                  {item.quantity}x
                                </span>{' '}
                                {item.name}
                              </span>
                              <span className="font-mono text-xs text-[#5A6D63] tabular-nums">
                                {formatRupees(item.unitPrice * item.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {verificationResult.status === 'VALID' ? (
                        <button
                          type="button"
                          onClick={() =>
                            verifyAndCollectOrder(verificationResult.order!.id)
                          }
                          className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#09533A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F6B4B]"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Confirm Handover (Mark Collected)
                        </button>
                      ) : (
                        <div className="mt-5 rounded-xl bg-[#EDF2EF] px-4 py-3 text-center text-xs font-semibold text-[#475A50]">
                          This pass has already been verified and collected.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MENU & STOCK MANAGER */}
          {tab === 'menu' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F1E18] font-display">
                    Menu &amp; Stock Manager
                  </h1>
                  <p className="mt-0.5 text-xs text-[#5A6D63]">
                    Real-time dish availability, workload point weights, and prep
                    times
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingDish(null);
                    setDishModalOpen(true);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#09533A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0F6B4B]"
                >
                  <Plus className="h-4 w-4" />
                  Add New Dish
                </button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A7C73]" />
                <input
                  type="search"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Filter menu dishes by name or category..."
                  className="min-h-[44px] w-full rounded-xl border border-[#DCE5DF] bg-white pl-10 pr-4 text-sm text-[#0F1E18] focus:border-[#09533A] focus:outline-none"
                />
              </div>

              <div className="space-y-3">
                {filteredMenu.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-[#DCE5DF] bg-white p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <DishImage
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-16 w-20 shrink-0 rounded-xl"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-xs border ${
                              item.isVeg
                                ? 'border-[#059669] bg-[#10B981]'
                                : 'border-[#B91C1C] bg-[#DC2626]'
                            }`}
                          />
                          <h3 className="truncate text-sm font-bold text-[#0F1E18]">
                            {item.name}
                          </h3>
                        </div>
                        <p className="mt-0.5 font-mono text-xs text-[#5A6D63] tabular-nums">
                          {formatRupees(item.price)} · {item.prepTimeMinutes}m ·{' '}
                          {item.workloadPoints} pts · {item.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustItemStock(item.id, -1)}
                          className="min-h-[34px] rounded-lg border border-[#D4DFD8] bg-[#F6F8F7] px-2.5 font-mono text-xs font-semibold hover:bg-[#EAF1ED]"
                        >
                          -1
                        </button>
                        <span className="w-16 text-center font-mono text-xs font-bold tabular-nums">
                          {item.stock} left
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustItemStock(item.id, 1)}
                          className="min-h-[34px] rounded-lg border border-[#D4DFD8] bg-[#F6F8F7] px-2.5 font-mono text-xs font-semibold hover:bg-[#EAF1ED]"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustItemStock(item.id, 10)}
                          className="min-h-[34px] rounded-lg border border-[#D4DFD8] bg-[#F6F8F7] px-2.5 font-mono text-xs font-semibold text-[#09533A] hover:bg-[#EAF4EF]"
                        >
                          +10
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#4B5E54]">
                          {item.isAvailable && item.stock > 0
                            ? 'In Stock'
                            : 'Sold Out'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.isAvailable && item.stock > 0}
                          onClick={() => toggleItemInStock(item.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            item.isAvailable && item.stock > 0
                              ? 'bg-[#10B981]'
                              : 'bg-[#CBD5CF]'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                              item.isAvailable && item.stock > 0
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingDish(item);
                          setDishModalOpen(true);
                        }}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-[#D4DFD8] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F1E18] hover:bg-[#F6F8F7]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SMART SLOTS & CAPACITY CONFIG */}
          {tab === 'slots' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0F1E18] font-display">
                  Smart Slots &amp; Kitchen Capacity
                </h1>
                <p className="mt-0.5 text-xs text-[#5A6D63]">
                  Tune parallel prep stations and dual-constraint window caps in
                  real time
                </p>
              </div>

              <div className="rounded-3xl border border-[#DCE5DF] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-[#0F1E18] font-display">
                    Global Kitchen Engine Controls
                  </h2>
                  <button
                    type="button"
                    onClick={applyDefaultsToAllSlots}
                    className="min-h-[38px] rounded-xl bg-[#09533A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0F6B4B]"
                  >
                    Apply Defaults to All Windows
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex items-center justify-between rounded-2xl bg-[#F6F8F7] p-3.5">
                    <div>
                      <p className="text-xs font-semibold text-[#3C4F45]">
                        Parallel Prep Stations
                      </p>
                      <p className="text-[11px] text-[#5A6D63]">
                        Range 1–6 active chefs
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateKitchenConfig({
                            parallelPrepStations:
                              kitchenConfig.parallelPrepStations - 1,
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4DFD8] bg-white"
                        aria-label="Decrease prep stations"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center font-mono text-base font-bold tabular-nums">
                        {kitchenConfig.parallelPrepStations}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateKitchenConfig({
                            parallelPrepStations:
                              kitchenConfig.parallelPrepStations + 1,
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4DFD8] bg-white"
                        aria-label="Increase prep stations"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#F6F8F7] p-3.5">
                    <div>
                      <p className="text-xs font-semibold text-[#3C4F45]">
                        Default Max Orders / Slot
                      </p>
                      <p className="text-[11px] text-[#5A6D63]">
                        Order count cap
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateKitchenConfig({
                            defaultMaxOrdersPerSlot:
                              kitchenConfig.defaultMaxOrdersPerSlot - 1,
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4DFD8] bg-white"
                        aria-label="Decrease default max orders"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center font-mono text-base font-bold tabular-nums">
                        {kitchenConfig.defaultMaxOrdersPerSlot}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateKitchenConfig({
                            defaultMaxOrdersPerSlot:
                              kitchenConfig.defaultMaxOrdersPerSlot + 1,
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4DFD8] bg-white"
                        aria-label="Increase default max orders"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-[#F6F8F7] p-3.5">
                    <div>
                      <p className="text-xs font-semibold text-[#3C4F45]">
                        Default Max Workload Pts
                      </p>
                      <p className="text-[11px] text-[#5A6D63]">
                        Complexity budget
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateKitchenConfig({
                            defaultMaxWorkloadPointsPerSlot:
                              kitchenConfig.defaultMaxWorkloadPointsPerSlot - 4,
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4DFD8] bg-white"
                        aria-label="Decrease default workload pts"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono text-base font-bold tabular-nums">
                        {kitchenConfig.defaultMaxWorkloadPointsPerSlot}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateKitchenConfig({
                            defaultMaxWorkloadPointsPerSlot:
                              kitchenConfig.defaultMaxWorkloadPointsPerSlot + 4,
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4DFD8] bg-white"
                        aria-label="Increase default workload pts"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {slotEvaluations.map((ev) => {
                  const orderPct = Math.min(
                    100,
                    Math.round((ev.orderCount / ev.slot.maxOrders) * 100)
                  );
                  const ptsPct = Math.min(
                    100,
                    Math.round(
                      (ev.workloadPoints / ev.slot.maxWorkloadPoints) * 100
                    )
                  );

                  return (
                    <div
                      key={ev.slot.id}
                      className="rounded-2xl border border-[#DCE5DF] bg-white p-4 sm:p-5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-base font-bold text-[#0F1E18] tabular-nums">
                            {ev.slot.label}
                          </p>
                          <p className="text-xs font-medium text-[#5A6D63]">
                            {ev.classification} · {ev.reason}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSlotPaused(ev.slot.id)}
                          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                            ev.slot.isPaused
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : 'bg-[#EAF4EF] text-[#09533A]'
                          }`}
                        >
                          {ev.slot.isPaused ? (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              Paused
                            </>
                          ) : (
                            <>
                              <Pause className="h-3.5 w-3.5" />
                              Open
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-[#3C4F45]">
                              Orders ({ev.orderCount}/{ev.slot.maxOrders})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  adjustSlotCapacity(ev.slot.id, 'maxOrders', -1)
                                }
                                className="flex h-6 w-6 items-center justify-center rounded border border-[#D4DFD8] bg-[#F6F8F7] text-xs"
                                aria-label={`Decrease max orders for ${ev.slot.label}`}
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  adjustSlotCapacity(ev.slot.id, 'maxOrders', 1)
                                }
                                className="flex h-6 w-6 items-center justify-center rounded border border-[#D4DFD8] bg-[#F6F8F7] text-xs"
                                aria-label={`Increase max orders for ${ev.slot.label}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#EDF2EF]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                orderPct >= 100
                                  ? 'bg-[#DC2626]'
                                  : orderPct >= 75
                                  ? 'bg-[#F59E0B]'
                                  : 'bg-[#10B981]'
                              }`}
                              style={{ width: `${orderPct}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-[#3C4F45]">
                              Workload ({ev.workloadPoints}/
                              {ev.slot.maxWorkloadPoints} pts)
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  adjustSlotCapacity(
                                    ev.slot.id,
                                    'maxWorkloadPoints',
                                    -4
                                  )
                                }
                                className="flex h-6 w-6 items-center justify-center rounded border border-[#D4DFD8] bg-[#F6F8F7] text-xs"
                                aria-label={`Decrease max workload for ${ev.slot.label}`}
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  adjustSlotCapacity(
                                    ev.slot.id,
                                    'maxWorkloadPoints',
                                    4
                                  )
                                }
                                className="flex h-6 w-6 items-center justify-center rounded border border-[#D4DFD8] bg-[#F6F8F7] text-xs"
                                aria-label={`Increase max workload for ${ev.slot.label}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#EDF2EF]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                ptsPct >= 100
                                  ? 'bg-[#DC2626]'
                                  : ptsPct >= 75
                                  ? 'bg-[#F59E0B]'
                                  : 'bg-[#09533A]'
                              }`}
                              style={{ width: `${ptsPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#EFF3F0] pt-2.5 text-xs">
                        <span className="font-medium text-[#5A6D63]">
                          Assigned Tokens:{' '}
                        </span>
                        {ev.assignedTokens.length === 0 ? (
                          <span className="text-[#8FA097]">None yet</span>
                        ) : (
                          <span className="font-mono font-semibold text-[#0F1E18]">
                            {ev.assignedTokens.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS */}
          {tab === 'analytics' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0F1E18] font-display">
                  Crowd-Smoothing &amp; Kitchen Analytics
                </h1>
                <p className="mt-0.5 text-xs text-[#5A6D63]">
                  Live impact of dual-constraint slot caps on peak lunch rush
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
                  <p className="text-xs font-medium text-[#5A6D63]">
                    Peak Crowd Cut
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#059669] tabular-nums">
                    -{analytics.peakCrowdCutPercent}%
                  </p>
                </div>
                <div className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
                  <p className="text-xs font-medium text-[#5A6D63]">
                    Total Revenue
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#0F1E18] tabular-nums">
                    {formatRupees(analytics.totalRevenue)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
                  <p className="text-xs font-medium text-[#5A6D63]">
                    Avg Prep Time
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#0F1E18] tabular-nums">
                    {analytics.avgPrepTime}m
                  </p>
                </div>
                <div className="rounded-2xl border border-[#DCE5DF] bg-white p-4">
                  <p className="text-xs font-medium text-[#5A6D63]">
                    Collected Orders
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#09533A] tabular-nums">
                    {analytics.collectedCount} / {orders.length}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-[#DCE5DF] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#0F1E18] font-display">
                      Uncoordinated Walk-In Rush vs. Smart Slot Assigned Load
                    </h2>
                    <p className="text-xs text-[#5A6D63]">
                      Workload points per 15-minute pickup window (hover or tap
                      bars to inspect)
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="inline-flex items-center gap-1.5 text-[#92400E]">
                      <span className="h-2.5 w-2.5 rounded-xs bg-[#F59E0B]" />
                      Walk-In Rush
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#09533A]">
                      <span className="h-2.5 w-2.5 rounded-xs bg-[#09533A]" />
                      Smart Slot Load
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-8 items-end gap-2 sm:gap-4">
                  {analytics.windowComparison.map((win) => {
                    const walkPct = Math.round(
                      (win.walkInWorkloadPts / maxChartWorkload) * 100
                    );
                    const smartPct = Math.round(
                      (win.smartLoadPts / maxChartWorkload) * 100
                    );
                    const isFocused = hoveredSlotId === win.slotId;

                    return (
                      <button
                        key={win.slotId}
                        type="button"
                        onMouseEnter={() => setHoveredSlotId(win.slotId)}
                        onMouseLeave={() => setHoveredSlotId(null)}
                        onClick={() =>
                          setHoveredSlotId(isFocused ? null : win.slotId)
                        }
                        className={`flex flex-col items-center rounded-xl p-1.5 transition-colors ${
                          isFocused ? 'bg-[#F2F7F4]' : 'hover:bg-[#F6F8F7]'
                        }`}
                      >
                        <div className="flex h-40 w-full items-end justify-center gap-1 sm:gap-1.5">
                          <div
                            className="w-2.5 rounded-t-md bg-[#F59E0B] transition-all sm:w-4"
                            style={{ height: `${Math.max(6, walkPct)}%` }}
                            title={`Walk-In Rush: ${win.walkInWorkloadPts} pts`}
                          />
                          <div
                            className="w-2.5 rounded-t-md bg-[#09533A] transition-all sm:w-4"
                            style={{ height: `${Math.max(6, smartPct)}%` }}
                            title={`Smart Slot: ${win.smartLoadPts} pts`}
                          />
                        </div>
                        <span className="mt-2 font-mono text-[10px] font-semibold text-[#4B5E54] tabular-nums sm:text-xs">
                          {win.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {hoveredSlotId && (() => {
                  const win = analytics.windowComparison.find(
                    (w) => w.slotId === hoveredSlotId
                  );
                  if (!win) return null;
                  return (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F6F8F7] px-4 py-2.5 text-xs">
                      <span className="font-mono font-bold text-[#0F1E18]">
                        {win.label}
                      </span>
                      <span className="font-mono text-[#92400E] tabular-nums">
                        Uncoordinated Walk-In: {win.walkInWorkloadPts} pts (~
                        {win.walkInOrdersCount} orders)
                      </span>
                      <span className="font-mono font-semibold text-[#09533A] tabular-nums">
                        Smart Assigned: {win.smartLoadPts}/{win.maxWorkloadPoints}{' '}
                        pts ({win.smartOrdersCount} orders)
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-3xl border border-[#DCE5DF] bg-white p-5">
                <h2 className="text-base font-bold text-[#0F1E18] font-display">
                  Top Selling Dishes
                </h2>
                <div className="mt-4 space-y-3">
                  {topDishes.map((dish, idx) => {
                    const maxCount = Math.max(topDishes[0]?.count ?? 1, 1);
                    const pct = Math.round((dish.count / maxCount) * 100);
                    return (
                      <div key={dish.name}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#0F1E18]">
                            <span className="mr-2 font-mono text-[#5A6D63]">
                              0{idx + 1}.
                            </span>
                            {dish.name}
                          </span>
                          <span className="font-mono text-[#4B5E54] tabular-nums">
                            {dish.count} sold · {formatRupees(dish.revenue)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#EDF2EF]">
                          <div
                            className="h-full rounded-full bg-[#10B981]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile admin navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 border-t border-[#DCE5DF] bg-white/95 backdrop-blur-md md:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
                active ? 'text-[#09533A]' : 'text-[#5A6D63]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate px-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <AdminDishModal
        open={dishModalOpen}
        editingItem={editingDish}
        onClose={() => setDishModalOpen(false)}
        onSave={handleSaveDish}
      />
    </div>
  );
}
