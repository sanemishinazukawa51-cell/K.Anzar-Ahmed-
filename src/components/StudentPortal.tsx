import { useMemo, useState } from 'react';
import {
  ChevronRight,
  Clock,
  Home,
  KeyRound,
  Leaf,
  LogOut,
  Minus,
  Plus,
  QrCode,
  ReceiptText,
  Search,
  ShoppingBag,
  Sparkles,
  Utensils,
  Zap,
} from 'lucide-react';
import { useCanteen } from '../context/CanteenContext';
import { formatMinutesToClock, formatRupees } from '../engine/queueEngine';
import { MenuCategory, Order } from '../types/canteen';
import { CheckoutDrawer } from './CheckoutDrawer';
import { DishImage } from './DishImage';
import { OrderProgressStepper } from './OrderProgressStepper';
import { QRPassModal } from './QRPassModal';

type StudentTab = 'home' | 'menu' | 'orders';

const CATEGORIES: ('All' | MenuCategory)[] = [
  'All',
  'Bowls & Meals',
  'Wraps & Sandwiches',
  'Snacks & Sides',
  'Drinks & Coffee',
];

export function StudentPortal() {
  const {
    authUser,
    serverState,
    cart,
    prepBreakdown,
    slotEvaluations,
    smartPickSlotId,
    cartCount,
    cartSubtotal,
    logout,
    addToCart,
    updateCartQty,
  } = useCanteen();

  const [tab, setTab] = useState<StudentTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | MenuCategory>('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState<'active' | 'history'>('active');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);

  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cart) {
      map.set(c.menuItemId, c.quantity);
    }
    return map;
  }, [cart]);

  const studentOrders = serverState?.orders ?? [];
  const menu = serverState?.menu ?? [];
  const activeQueuedCount = serverState?.activeQueuedCount ?? 0;
  const parallelPrepStations = serverState?.kitchenConfig.parallelPrepStations ?? 3;
  const serviceClock = serverState
    ? formatMinutesToClock(serverState.currentTimeMinutes)
    : '12:08 PM';
  const avgMinutesSaved = serverState?.analytics.avgMinutesSaved ?? 14;

  const activeOrders = useMemo(
    () => studentOrders.filter((o) => o.status !== 'Collected'),
    [studentOrders]
  );

  const historyOrders = useMemo(
    () => studentOrders.filter((o) => o.status === 'Collected'),
    [studentOrders]
  );

  const spotlightOrder = useMemo(() => {
    return (
      activeOrders.find((o) => o.status === 'Ready') ??
      activeOrders[0] ??
      null
    );
  }, [activeOrders]);

  const expressDishes = useMemo(
    () =>
      menu.filter(
        (m) => m.prepTimeMinutes <= 6 && m.isAvailable && m.stock > 0
      ),
    [menu]
  );

  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menu.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (vegOnly && !item.isVeg) {
        return false;
      }
      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [menu, selectedCategory, vegOnly, searchQuery]);

  const smartPickEval = slotEvaluations.find(
    (ev) => ev.slot.id === smartPickSlotId
  );

  const handleOrderPlaced = (newOrder: Order) => {
    setCheckoutOpen(false);
    setQrModalOrder(newOrder);
    setTab('orders');
    setOrdersFilter('active');
  };

  if (!authUser || !serverState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8F7] text-sm font-medium text-[#4B5E54]">
        Loading Student Portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#0F1E18]">
      <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
        {/* Desktop Sidebar Rail */}
        <aside className="hidden w-64 shrink-0 border-r border-[#E1E8E3] bg-white md:flex md:min-h-screen md:flex-col md:justify-between md:p-5">
          <div>
            <div>
              <p className="text-lg font-bold tracking-tight text-[#09533A] font-display">
                Queue-Free Canteen
              </p>
              <p className="font-mono text-xs text-[#5A6D63]">
                Student Portal · {serviceClock}
              </p>
            </div>

            {/* Signed-in Student Info */}
            <div className="mt-5 rounded-2xl border border-[#E4EAE6] bg-[#F6F8F7] p-3.5">
              <p className="truncate text-sm font-bold text-[#0F1E18]">
                {authUser.name}
              </p>
              <p className="mt-0.5 font-mono text-xs text-[#4B5E54]">
                {authUser.rollNumber} · {authUser.department}
              </p>
            </div>

            {/* Nav Links */}
            <nav className="mt-6 space-y-1.5" aria-label="Student navigation">
              <button
                type="button"
                onClick={() => setTab('home')}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  tab === 'home'
                    ? 'bg-[#09533A] text-white'
                    : 'text-[#3C4F45] hover:bg-[#EDF3EF]'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('menu')}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  tab === 'menu'
                    ? 'bg-[#09533A] text-white'
                    : 'text-[#3C4F45] hover:bg-[#EDF3EF]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Utensils className="h-4 w-4" />
                  <span>Menu</span>
                </span>
                {cartCount > 0 && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
                      tab === 'menu'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#EAF4EF] text-[#09533A]'
                    }`}
                  >
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTab('orders')}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  tab === 'orders'
                    ? 'bg-[#09533A] text-white'
                    : 'text-[#3C4F45] hover:bg-[#EDF3EF]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <ReceiptText className="h-4 w-4" />
                  <span>Orders</span>
                </span>
                {activeOrders.length > 0 && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
                      tab === 'orders'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#FEF3C7] text-[#92400E]'
                    }`}
                  >
                    {activeOrders.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="space-y-3">
            {cartCount > 0 && (
              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                className="flex min-h-[48px] w-full items-center justify-between rounded-2xl bg-[#10B981] px-4 py-3 text-left text-white transition-colors hover:bg-[#059669]"
              >
                <div>
                  <p className="text-xs font-semibold">Open Tray ({cartCount})</p>
                  <p className="font-mono text-sm font-bold tabular-nums">
                    {formatRupees(cartSubtotal)} · ~{prepBreakdown.totalPrepMinutes}m
                  </p>
                </div>
                <ShoppingBag className="h-5 w-5" />
              </button>
            )}

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
        <main className="min-w-0 flex-1 px-4 pb-36 pt-4 sm:px-6 md:pb-12 lg:px-8">
          {/* Mobile Top Bar */}
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#E1E8E3] pb-3 md:hidden">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#09533A] font-display">
                Queue-Free Canteen
              </p>
              <p className="font-mono text-[11px] text-[#5A6D63]">
                {serviceClock} · {authUser.rollNumber}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#D4DFD8] bg-white px-3 py-1.5 text-xs font-semibold text-[#2A3D34]"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* TAB 1: HOME DASHBOARD */}
          {tab === 'home' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F1E18] sm:text-3xl font-display">
                    Hey, {authUser.name.split(' ')[0]}
                  </h1>
                  <p className="mt-0.5 font-mono text-xs text-[#5A6D63]">
                    {authUser.rollNumber} · {serviceClock} · Skip the lunch counter rush
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setTab('menu')}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#09533A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F6B4B] whitespace-nowrap"
                >
                  Order Now
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Hero Grid: Active Order Spotlight + Live Smart Queue Pulse */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  {spotlightOrder ? (
                    <div className="flex h-full flex-col justify-between rounded-3xl bg-[#09533A] p-5 text-white sm:p-6">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-[11px] font-semibold tracking-wide text-[#A9E5C9]">
                              {spotlightOrder.status === 'Ready'
                                ? 'PICKUP NOW'
                                : 'ACTIVE ORDER'}{' '}
                              · {spotlightOrder.counterLabel}
                            </p>
                            <h2 className="mt-1 font-mono text-xl font-bold tabular-nums sm:text-2xl">
                              #{spotlightOrder.token} · {spotlightOrder.slotLabel}
                            </h2>
                          </div>

                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap ${
                              spotlightOrder.status === 'Ready'
                                ? 'bg-[#10B981] text-white'
                                : 'bg-white/15 text-[#FDE68A]'
                            }`}
                          >
                            {spotlightOrder.status === 'Ready'
                              ? 'READY FOR PICKUP'
                              : spotlightOrder.status.toUpperCase()}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-[#E2F3EA]">
                          {spotlightOrder.items
                            .map((i) => `${i.quantity}x ${i.name}`)
                            .join(', ')}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQrModalOrder(spotlightOrder)}
                          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#10B981] px-4 py-2.5 text-sm font-semibold text-[#042419] transition-colors hover:bg-[#34D399]"
                        >
                          <QrCode className="h-4 w-4" />
                          Show QR Ticket
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOrdersFilter('active');
                            setTab('orders');
                          }}
                          className="min-h-[44px] rounded-xl border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                        >
                          Track
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col justify-between rounded-3xl border border-[#DCE5DF] bg-white p-6">
                      <div>
                        <p className="text-xs font-semibold text-[#0F6B4B]">
                          No Active Orders
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-[#0F1E18] font-display">
                          Ready for lunch without the wait?
                        </h2>
                        <p className="mt-2 text-sm text-[#4B5E54]">
                          Build your tray from the menu and our Smart Queue Engine
                          will reserve the fastest low-crowd pickup slot.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTab('menu')}
                        className="mt-5 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-xl bg-[#09533A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0F6B4B]"
                      >
                        Browse Campus Menu
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Smart Queue Pulse Card */}
                <div className="rounded-3xl border border-[#DCE5DF] bg-white p-5 sm:p-6 lg:col-span-6">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="inline-flex items-center gap-2 text-base font-bold text-[#0F1E18] font-display">
                      <Sparkles className="h-4 w-4 text-[#10B981]" />
                      Live Smart Queue Pulse
                    </h2>
                    <span className="font-mono text-xs font-semibold text-[#09533A] tabular-nums">
                      {parallelPrepStations} stations active
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#F6F8F7] p-3.5">
                      <p className="text-xs font-medium text-[#5A6D63]">
                        Next Open Slot
                      </p>
                      <p className="mt-1 font-mono text-base font-bold text-[#0F1E18] tabular-nums">
                        {smartPickEval?.slot.label ?? 'None'}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-[#059669]">
                        {smartPickEval
                          ? `${Math.round(smartPickEval.loadRatio * 100)}% crowd`
                          : 'All slots full'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#F6F8F7] p-3.5">
                      <p className="text-xs font-medium text-[#5A6D63]">
                        Orders Ahead
                      </p>
                      <p className="mt-1 font-mono text-xl font-bold text-[#0F1E18] tabular-nums">
                        {activeQueuedCount}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-[#059669]">
                        -{avgMinutesSaved}m saved vs walk-in line
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-[#4B5E54]">
                      Upcoming Pickup Windows
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {slotEvaluations.slice(0, 4).map((ev) => {
                        const isSmart = ev.classification === 'Smart Pick';
                        const isFull =
                          ev.classification === 'Slot Full' ||
                          ev.classification === 'Kitchen Cap';
                        const isBusy = ev.classification === 'Busy';
                        return (
                          <button
                            key={ev.slot.id}
                            type="button"
                            onClick={() => setTab('menu')}
                            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                              isSmart
                                ? 'border-[#09533A] bg-[#09533A] text-white'
                                : isFull
                                ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                                : isBusy
                                ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]'
                                : 'border-[#DCE5DF] bg-[#F6F8F7] text-[#0F1E18] hover:border-[#09533A]'
                            }`}
                          >
                            <p className="font-mono text-xs font-bold tabular-nums">
                              {ev.slot.shortLabel}
                            </p>
                            <p
                              className={`mt-0.5 truncate text-[11px] font-semibold ${
                                isSmart ? 'text-[#A9E5C9]' : ''
                              }`}
                            >
                              {ev.classification}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Express Prep Carousel */}
              <section>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="inline-flex items-center gap-1.5 text-lg font-bold text-[#0F1E18] font-display">
                    <Zap className="h-4 w-4 text-[#F59E0B]" />
                    Express Prep (≤ 6 min)
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab('menu')}
                    className="text-xs font-semibold text-[#09533A] hover:underline"
                  >
                    See All
                  </button>
                </div>

                <div className="no-scrollbar mt-3 flex gap-4 overflow-x-auto pb-2">
                  {expressDishes.map((dish) => {
                    const qty = cartQtyMap.get(dish.id) ?? 0;
                    return (
                      <div
                        key={dish.id}
                        className="w-60 shrink-0 overflow-hidden rounded-2xl border border-[#DCE5DF] bg-white"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EAF1ED]">
                          <DishImage
                            src={dish.imageUrl}
                            alt={dish.name}
                            className="h-full w-full"
                          />
                        </div>
                        <div className="p-3.5">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-[#5A6D63]">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  dish.isVeg ? 'bg-[#10B981]' : 'bg-[#DC2626]'
                                }`}
                              />
                              {dish.isVeg ? 'Veg' : 'Non-Veg'}
                            </span>
                            <span className="font-mono font-semibold tabular-nums">
                              ~{dish.prepTimeMinutes}m · {dish.workloadPoints} pts
                            </span>
                          </div>
                          <h3 className="mt-1 truncate text-sm font-bold text-[#0F1E18]">
                            {dish.name}
                          </h3>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="font-mono text-sm font-bold text-[#0F1E18] tabular-nums">
                              {formatRupees(dish.price)}
                            </span>
                            {qty === 0 ? (
                              <button
                                type="button"
                                onClick={() => addToCart(dish.id)}
                                className="min-h-[36px] rounded-xl bg-[#09533A] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0F6B4B]"
                              >
                                + Add
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(dish.id, -1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4DFD8] bg-[#F6F8F7] text-[#0F1E18]"
                                  aria-label={`Remove one ${dish.name}`}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-5 text-center font-mono text-xs font-bold tabular-nums">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(dish.id, 1)}
                                  disabled={qty >= dish.stock}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#09533A] text-white disabled:opacity-40"
                                  aria-label={`Add one ${dish.name}`}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: MENU */}
          {tab === 'menu' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0F1E18] font-display">
                  Campus Canteen Menu
                </h1>
                <p className="mt-0.5 text-xs text-[#5A6D63]">
                  Live kitchen inventory, dish workload weights, and transparent
                  prep estimates
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A7C73]" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search bowls, paninis, coffee..."
                    className="min-h-[44px] w-full rounded-xl border border-[#DCE5DF] bg-white pl-10 pr-4 text-sm text-[#0F1E18] placeholder:text-[#8FA097] focus:border-[#09533A] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setVegOnly((v) => !v)}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    vegOnly
                      ? 'border-[#09533A] bg-[#09533A] text-white'
                      : 'border-[#DCE5DF] bg-white text-[#2A3D34] hover:bg-[#EAF1ED]'
                  }`}
                >
                  <Leaf className="h-4 w-4" />
                  Veg Only
                </button>
              </div>

              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map((category) => {
                  const active = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#09533A] text-white'
                          : 'border border-[#DCE5DF] bg-white text-[#3C4F45] hover:bg-[#EAF1ED]'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              {filteredMenu.length === 0 ? (
                <div className="rounded-3xl border border-[#DCE5DF] bg-white p-10 text-center">
                  <p className="text-sm font-semibold text-[#0F1E18]">
                    No dishes match your filters
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setVegOnly(false);
                    }}
                    className="mt-3 rounded-xl bg-[#09533A] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredMenu.map((item) => {
                    const qty = cartQtyMap.get(item.id) ?? 0;
                    const soldOut = !item.isAvailable || item.stock <= 0;
                    const lowStock = !soldOut && item.stock <= 4;

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col justify-between overflow-hidden rounded-2xl border border-[#DCE5DF] bg-white transition-shadow ${
                          soldOut ? 'opacity-80' : 'hover:shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#EAF1ED]">
                            <DishImage
                              src={item.imageUrl}
                              alt={item.name}
                              className={`h-full w-full ${
                                soldOut ? 'grayscale' : ''
                              }`}
                            />
                            {soldOut && (
                              <div className="absolute inset-0 flex items-center justify-center bg-[#091812]/55">
                                <span className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold tracking-wide text-[#991B1B]">
                                  Sold Out (0 left)
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="p-4">
                            <div className="flex items-center justify-between gap-2 text-xs text-[#5A6D63]">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <span
                                  className={`inline-block h-2.5 w-2.5 rounded-xs border ${
                                    item.isVeg
                                      ? 'border-[#059669] bg-[#10B981]'
                                      : 'border-[#B91C1C] bg-[#DC2626]'
                                  }`}
                                />
                                {item.isVeg ? 'Veg' : 'Non-Veg'}
                                {item.popular && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-semibold text-[#09533A]">
                                      Popular
                                    </span>
                                  </>
                                )}
                              </span>

                              <span className="font-mono text-[11px] font-semibold tabular-nums">
                                ~{item.prepTimeMinutes}m · {item.workloadPoints} pts
                              </span>
                            </div>

                            <h3 className="mt-1.5 text-base font-bold text-[#0F1E18] font-display">
                              {item.name}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#4B5E54]">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-[#EFF3F0] px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-mono text-base font-bold text-[#0F1E18] tabular-nums">
                                {formatRupees(item.price)}
                              </span>
                              <p className="text-[11px] text-[#5A6D63]">
                                <span className="font-mono tabular-nums">
                                  {item.calories} kcal
                                </span>
                                {lowStock && (
                                  <span className="ml-1.5 font-semibold text-[#D97706]">
                                    · Only {item.stock} left
                                  </span>
                                )}
                                {!soldOut && !lowStock && (
                                  <span className="ml-1.5 text-[#5A6D63]">
                                    · {item.stock} in stock
                                  </span>
                                )}
                              </p>
                            </div>

                            {soldOut ? (
                              <button
                                type="button"
                                disabled
                                className="min-h-[40px] cursor-not-allowed rounded-xl bg-[#EDF2EF] px-4 py-2 text-xs font-semibold text-[#7C8E85]"
                              >
                                Unavailable
                              </button>
                            ) : qty === 0 ? (
                              <button
                                type="button"
                                onClick={() => addToCart(item.id)}
                                className="min-h-[40px] rounded-xl bg-[#09533A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0F6B4B] active:scale-[0.98]"
                              >
                                + Add
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(item.id, -1)}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4DFD8] bg-[#F6F8F7] text-[#0F1E18] hover:bg-[#EAF1ED]"
                                  aria-label={`Remove one ${item.name}`}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-6 text-center font-mono text-sm font-bold tabular-nums">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(item.id, 1)}
                                  disabled={qty >= item.stock}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#09533A] text-white hover:bg-[#0F6B4B] disabled:opacity-40"
                                  aria-label={`Add one ${item.name}`}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORDERS & DIGITAL QR TICKETS */}
          {tab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F1E18] font-display">
                    Your Orders &amp; QR Passes
                  </h1>
                  <p className="mt-0.5 text-xs text-[#5A6D63]">
                    Live kitchen stage tracking for {authUser.name}
                  </p>
                </div>

                <div className="inline-flex rounded-xl border border-[#DCE5DF] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setOrdersFilter('active')}
                    className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      ordersFilter === 'active'
                        ? 'bg-[#09533A] text-white'
                        : 'text-[#4B5E54] hover:text-[#0F1E18]'
                    }`}
                  >
                    Active Orders ({activeOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrdersFilter('history')}
                    className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      ordersFilter === 'history'
                        ? 'bg-[#09533A] text-white'
                        : 'text-[#4B5E54] hover:text-[#0F1E18]'
                    }`}
                  >
                    Order History ({historyOrders.length})
                  </button>
                </div>
              </div>

              {(ordersFilter === 'active' ? activeOrders : historyOrders).length ===
              0 ? (
                <div className="rounded-3xl border border-[#DCE5DF] bg-white p-10 text-center">
                  <p className="text-sm font-semibold text-[#0F1E18]">
                    {ordersFilter === 'active'
                      ? 'No active orders right now'
                      : 'No collected orders in history yet'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('menu')}
                    className="mt-3 rounded-xl bg-[#09533A] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Order From Menu
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {(ordersFilter === 'active' ? activeOrders : historyOrders).map(
                    (order) => (
                      <div
                        key={order.id}
                        className="flex flex-col justify-between rounded-3xl border border-[#DCE5DF] bg-white p-5"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-lg font-bold text-[#0F1E18] tabular-nums">
                                #{order.token}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-[#5A6D63]">
                                {order.slotLabel} · {order.counterLabel} · Est.{' '}
                                {order.estimatedPrepMinutes}m
                              </p>
                            </div>

                            <div className="text-right">
                              <span
                                className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${
                                  order.status === 'Ready'
                                    ? 'bg-[#D1FAE5] text-[#065F46]'
                                    : order.status === 'Collected'
                                    ? 'bg-[#EDF2EF] text-[#475A50]'
                                    : 'bg-[#FEF3C7] text-[#92400E]'
                                }`}
                              >
                                {order.status}
                              </span>
                              <p className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#09533A] tabular-nums">
                                <KeyRound className="h-3 w-3" />
                                PIN {order.pin}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <OrderProgressStepper status={order.status} compact />
                          </div>

                          <ul className="mt-4 space-y-1 border-t border-[#EFF3F0] pt-3 text-sm">
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
                                  {formatRupees(item.unitPrice * item.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-[#EFF3F0] pt-3">
                          <span className="font-mono text-sm font-bold text-[#0F1E18] tabular-nums">
                            Total {formatRupees(order.totalAmount)}
                          </span>

                          <button
                            type="button"
                            onClick={() => setQrModalOrder(order)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#09533A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0F6B4B]"
                          >
                            <QrCode className="h-4 w-4" />
                            View QR Ticket
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Sticky Floating Cart Summary Bar (mobile) */}
      {cartCount > 0 && (
        <div className="fixed bottom-[68px] left-0 right-0 z-30 px-3 md:hidden">
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="mx-auto flex min-h-[48px] w-full max-w-lg items-center justify-between rounded-2xl bg-[#09533A] px-4 py-2.5 text-white shadow-lg"
          >
            <div className="min-w-0 text-left">
              <p className="truncate text-xs font-semibold text-[#A9E5C9]">
                {cartCount} {cartCount === 1 ? 'item' : 'items'} · Est.{' '}
                {prepBreakdown.totalPrepMinutes}m prep ·{' '}
                {smartPickEval?.slot.shortLabel ?? 'Slot'}
              </p>
              <p className="font-mono text-sm font-bold tabular-nums">
                {formatRupees(cartSubtotal)} · Open Smart Checkout
              </p>
            </div>
            <span className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#10B981] text-[#042419]">
              <Clock className="h-4 w-4" />
            </span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile student navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-3 border-t border-[#DCE5DF] bg-white/95 backdrop-blur-md md:hidden"
      >
        <button
          type="button"
          onClick={() => setTab('home')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            tab === 'home' ? 'text-[#09533A]' : 'text-[#5A6D63]'
          }`}
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('menu')}
          className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            tab === 'menu' ? 'text-[#09533A]' : 'text-[#5A6D63]'
          }`}
        >
          <Utensils className="h-5 w-5" />
          <span>Menu</span>
          {cartCount > 0 && (
            <span className="absolute right-[26%] top-2 rounded-full bg-[#10B981] px-1.5 font-mono text-[10px] font-bold text-[#042419] tabular-nums">
              {cartCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
            tab === 'orders' ? 'text-[#09533A]' : 'text-[#5A6D63]'
          }`}
        >
          <ReceiptText className="h-5 w-5" />
          <span>Orders</span>
          {activeOrders.length > 0 && (
            <span className="absolute right-[26%] top-2 rounded-full bg-[#F59E0B] px-1.5 font-mono text-[10px] font-bold text-white tabular-nums">
              {activeOrders.length}
            </span>
          )}
        </button>
      </nav>

      <CheckoutDrawer
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onOrderPlaced={handleOrderPlaced}
      />

      <QRPassModal
        order={qrModalOrder}
        onClose={() => setQrModalOrder(null)}
      />
    </div>
  );
}
