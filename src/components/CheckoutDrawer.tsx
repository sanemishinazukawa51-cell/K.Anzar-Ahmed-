import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useCanteen } from '../context/CanteenContext';
import { formatRupees } from '../engine/queueEngine';
import { Order, SlotClassification } from '../types/canteen';

interface CheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  onOrderPlaced: (order: Order) => void;
}

function getSlotStatusStyle(classification: SlotClassification) {
  switch (classification) {
    case 'Smart Pick':
      return 'text-[#09533A] bg-[#D1FAE5]';
    case 'Low Crowd':
      return 'text-[#065F46] bg-[#ECFDF5]';
    case 'Busy':
      return 'text-[#92400E] bg-[#FEF3C7]';
    case 'Slot Full':
    case 'Kitchen Cap':
      return 'text-[#991B1B] bg-[#FEE2E2]';
    case 'Too Soon':
    case 'Paused':
    default:
      return 'text-[#4B5E54] bg-[#EDF2EF]';
  }
}

export function CheckoutDrawer({
  open,
  onClose,
  onOrderPlaced,
}: CheckoutDrawerProps) {
  const {
    cart,
    menuMap,
    prepBreakdown,
    slotEvaluations,
    smartPickSlotId,
    nextAvailableSlotId,
    hasBlockedEarlierSlots,
    cartSubtotal,
    updateCartQty,
    clearCart,
    placeOrder,
  } = useCanteen();

  const [smartAutoAssign, setSmartAutoAssign] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    smartPickSlotId
  );
  const [kitchenNote, setKitchenNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (smartAutoAssign) {
      setSelectedSlotId(smartPickSlotId);
    } else {
      const currentValid = slotEvaluations.find(
        (ev) => ev.slot.id === selectedSlotId && ev.isBookable
      );
      if (!currentValid) {
        setSelectedSlotId(smartPickSlotId);
      }
    }
  }, [smartAutoAssign, smartPickSlotId, slotEvaluations, selectedSlotId]);

  if (!open) return null;

  const activeSlotId = smartAutoAssign ? smartPickSlotId : selectedSlotId;
  const selectedEval = slotEvaluations.find(
    (ev) => ev.slot.id === activeSlotId
  );
  const nextAvailableEval = slotEvaluations.find(
    (ev) => ev.slot.id === nextAvailableSlotId
  );

  const handleJumpToNextSlot = () => {
    if (!nextAvailableSlotId) return;
    setSelectedSlotId(nextAvailableSlotId);
    setErrorMsg(null);
  };

  const handleCommitOrder = async () => {
    setErrorMsg(null);
    if (!activeSlotId) {
      setErrorMsg(
        'No pickup windows are available for this order right now.'
      );
      return;
    }
    setSubmitting(true);
    const result = await placeOrder(activeSlotId, kitchenNote);
    setSubmitting(false);
    if (!result.ok || !result.order) {
      setErrorMsg(result.error || 'Could not place order.');
      return;
    }
    setKitchenNote('');
    onOrderPlaced(result.order);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#091812]/55 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[#DCE5DF] bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5ECE8] px-5 py-4">
          <div>
            <h2
              id="checkout-title"
              className="text-lg font-bold text-[#0F1E18] font-display"
            >
              Smart Checkout
            </h2>
            <p className="text-xs text-[#5A6D63]">
              Dynamic prep estimation &amp; dual-constraint slot allocation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-[#F6F8F7] text-[#3C4F45] transition-colors hover:bg-[#EAF1ED]"
            aria-label="Close checkout"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-[#0F1E18]">
                Your tray is empty
              </p>
              <p className="mt-1 text-xs text-[#5A6D63]">
                Add dishes from the menu to calculate prep time and allocate a
                pickup slot.
              </p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F1E18]">
                    Your Tray ({prepBreakdown.totalUnits})
                  </h3>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#B91C1C] hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                </div>

                <div className="mt-2.5 divide-y divide-[#EBF0ED] rounded-2xl border border-[#E2E8E4] bg-[#FAFBFB]">
                  {cart.map((entry) => {
                    const dish = menuMap.get(entry.menuItemId);
                    if (!dish) return null;
                    return (
                      <div
                        key={dish.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#0F1E18]">
                            {dish.name}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#5A6D63] tabular-nums">
                            {formatRupees(dish.price)} · {dish.prepTimeMinutes}m ·{' '}
                            {dish.workloadPoints} pts
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQty(dish.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4DFD8] bg-white text-[#0F1E18] hover:bg-[#EAF1ED]"
                            aria-label={`Decrease ${dish.name}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center font-mono text-sm font-bold tabular-nums">
                            {entry.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(dish.id, 1)}
                            disabled={entry.quantity >= dish.stock}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4DFD8] bg-white text-[#0F1E18] hover:bg-[#EAF1ED] disabled:opacity-40"
                            aria-label={`Increase ${dish.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <label
                    htmlFor="kitchen-note"
                    className="block text-xs font-medium text-[#4B5E54]"
                  >
                    Kitchen Note (optional)
                  </label>
                  <input
                    id="kitchen-note"
                    type="text"
                    value={kitchenNote}
                    onChange={(e) => setKitchenNote(e.target.value)}
                    placeholder="e.g., Less spice, sauce on the side, light ice"
                    className="mt-1 w-full rounded-xl border border-[#D4DFD8] bg-white px-3.5 py-2.5 text-sm text-[#0F1E18] placeholder:text-[#8FA097] focus:border-[#09533A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Prep Time Formula Breakdown */}
              <div className="rounded-2xl border border-[#D6E5DC] bg-[#F2F8F5] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#09533A]">
                    <Clock className="h-4 w-4" />
                    Dynamic Prep Estimate Breakdown
                  </span>
                  <span className="font-mono text-base font-bold text-[#09533A] tabular-nums">
                    ~{prepBreakdown.totalPrepMinutes} min
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white px-2 py-2">
                    <p className="font-mono text-sm font-bold text-[#0F1E18] tabular-nums">
                      {prepBreakdown.baseMaxPrepMinutes}m
                    </p>
                    <p className="text-[11px] text-[#5A6D63]">Base Max Item</p>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2">
                    <p className="font-mono text-sm font-bold text-[#0F1E18] tabular-nums">
                      +{prepBreakdown.batchOverheadMinutes}m
                    </p>
                    <p className="text-[11px] text-[#5A6D63]">
                      Batch ({prepBreakdown.totalUnits}u)
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2">
                    <p className="font-mono text-sm font-bold text-[#0F1E18] tabular-nums">
                      +{prepBreakdown.backlogPenaltyMinutes}m
                    </p>
                    <p className="text-[11px] text-[#5A6D63]">
                      Backlog ({prepBreakdown.activeQueuedOrders}q /{' '}
                      {prepBreakdown.parallelPrepStations}s)
                    </p>
                  </div>
                </div>

                <p className="mt-2.5 font-mono text-[11px] text-[#3F5E4E]">
                  Tray workload impact: +{prepBreakdown.cartWorkloadPoints} pts
                </p>
              </div>

              {/* Smart Auto-Assign Toggle */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E2E8E4] bg-white p-3.5">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0F1E18]">
                    <Sparkles className="h-4 w-4 text-[#10B981]" />
                    Smart Auto-Assign Slot
                  </p>
                  <p className="mt-0.5 text-xs text-[#5A6D63]">
                    Automatically routes to earliest low-crowd window &amp; smooths
                    peak rush
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={smartAutoAssign}
                  onClick={() => setSmartAutoAssign((v) => !v)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    smartAutoAssign ? 'bg-[#09533A]' : 'bg-[#CBD5CF]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                      smartAutoAssign ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Next Available Slot Suggestion Banner */}
              {hasBlockedEarlierSlots && nextAvailableEval && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#92400E]">
                      Earlier Rush Windows Blocked / Busy
                    </p>
                    <p className="mt-0.5 text-xs text-[#78350F]">
                      Next available low-crowd window:{' '}
                      <span className="font-mono font-semibold">
                        {nextAvailableEval.slot.label}
                      </span>
                    </p>
                  </div>
                  {!smartAutoAssign && selectedSlotId !== nextAvailableSlotId && (
                    <button
                      type="button"
                      onClick={handleJumpToNextSlot}
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl bg-[#D97706] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B45309] whitespace-nowrap"
                    >
                      Jump to Slot
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Pickup Window List */}
              <div>
                <h3 className="text-sm font-bold text-[#0F1E18]">
                  Select Pickup Window
                </h3>
                <div className="mt-2.5 space-y-2">
                  {slotEvaluations.map((ev) => {
                    const isSelected = ev.slot.id === activeSlotId;
                    const disabled = !ev.isBookable;

                    return (
                      <button
                        key={ev.slot.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSmartAutoAssign(false);
                          setSelectedSlotId(ev.slot.id);
                          setErrorMsg(null);
                        }}
                        className={`w-full rounded-2xl border p-3.5 text-left transition-colors ${
                          isSelected
                            ? 'border-[#09533A] bg-[#EEF7F2] ring-1 ring-[#09533A]'
                            : disabled
                            ? 'cursor-not-allowed border-[#E6ECE8] bg-[#F7F9F8] opacity-65'
                            : 'border-[#DCE5DF] bg-white hover:border-[#0F6B4B]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-[#0F1E18] tabular-nums">
                              {ev.slot.label}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-[#09533A]" />
                            )}
                          </div>
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${getSlotStatusStyle(
                              ev.classification
                            )}`}
                          >
                            {ev.classification}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span
                            className={
                              disabled
                                ? 'font-medium text-[#991B1B]'
                                : 'text-[#4B5E54]'
                            }
                          >
                            {ev.reason}
                          </span>
                          <span className="font-mono text-[11px] text-[#5A6D63] tabular-nums">
                            {ev.orderCount}/{ev.slot.maxOrders} orders ·{' '}
                            {ev.workloadPoints}/{ev.slot.maxWorkloadPoints} pts
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs font-medium text-[#991B1B]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-[#E5ECE8] bg-white px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-xs text-[#4B5E54]">
              <span>
                Slot:{' '}
                <strong className="font-mono text-[#0F1E18]">
                  {selectedEval?.slot.label ?? 'None available'}
                </strong>
              </span>
              <span className="font-mono text-base font-bold text-[#0F1E18] tabular-nums">
                Total {formatRupees(cartSubtotal)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCommitOrder}
              disabled={!selectedEval?.isBookable || submitting}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#09533A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F6B4B] disabled:cursor-not-allowed disabled:bg-[#9FB3A8]"
            >
              <span>
                {submitting
                  ? 'Confirming Slot & Generating QR...'
                  : 'Place Order & Generate QR Pass'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
