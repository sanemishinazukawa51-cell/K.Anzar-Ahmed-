import { CheckCircle2, KeyRound, MapPin, X } from 'lucide-react';
import { useCanteen } from '../context/CanteenContext';
import { formatRupees } from '../engine/queueEngine';
import { Order } from '../types/canteen';
import { OrderProgressStepper } from './OrderProgressStepper';
import { QRCodeMatrix } from './QRCodeMatrix';

interface QRPassModalProps {
  order: Order | null;
  onClose: () => void;
}

export function QRPassModal({ order, onClose }: QRPassModalProps) {
  const { serverState } = useCanteen();

  if (!order) return null;

  // Read live order state so real-time SSE status updates reflect immediately
  const liveOrder =
    serverState?.orders.find((o) => o.id === order.id) ?? order;
  const isReady = liveOrder.status === 'Ready';
  const isCollected = liveOrder.status === 'Collected';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#091812]/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-pass-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-[#DCE5DF] bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`px-5 py-4 text-white ${
            isReady
              ? 'bg-[#09533A]'
              : isCollected
              ? 'bg-[#31443B]'
              : 'bg-[#0F3D2C]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#A9E5C9]">
                Digital QR Pickup Pass
              </p>
              <h2
                id="qr-pass-title"
                className="mt-0.5 font-mono text-2xl font-bold tracking-tight tabular-nums"
              >
                #{liveOrder.token}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              aria-label="Close QR pickup pass"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90">
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin className="h-3.5 w-3.5 text-[#34D399]" />
              {liveOrder.counterLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{liveOrder.slotLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{liveOrder.studentName}</span>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="flex flex-col items-center rounded-2xl border border-[#E4EAE6] bg-[#F6F8F7] p-4">
            <div className="rounded-xl border border-[#DCE5DF] bg-white p-3 shadow-xs">
              <QRCodeMatrix payload={liveOrder.qrPayload} size={172} />
            </div>

            <div className="mt-3 flex w-full items-center justify-between border-t border-[#E2E8E4] pt-3">
              <div>
                <p className="text-[11px] font-medium text-[#5A6D63]">
                  4-Digit Counter PIN
                </p>
                <p className="inline-flex items-center gap-1.5 font-mono text-xl font-bold tracking-widest text-[#09533A] tabular-nums">
                  <KeyRound className="h-4 w-4 text-[#10B981]" />
                  {liveOrder.pin}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium text-[#5A6D63]">
                  Current Status
                </p>
                <p
                  className={`text-sm font-semibold ${
                    isReady
                      ? 'text-[#059669]'
                      : isCollected
                      ? 'text-[#475A50]'
                      : 'text-[#D97706]'
                  }`}
                >
                  {isReady
                    ? 'Ready for Pickup'
                    : isCollected
                    ? 'Collected'
                    : liveOrder.status}
                </p>
              </div>
            </div>

            <p className="mt-2 w-full truncate text-center font-mono text-[11px] text-[#66796F]">
              {liveOrder.qrPayload}
            </p>
          </div>

          <div className="mt-4">
            <OrderProgressStepper status={liveOrder.status} />
          </div>

          <div className="mt-4 border-t border-[#E6ECE8] pt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#475A50]">
              <span>
                Tray Items ({liveOrder.items.reduce((s, i) => s + i.quantity, 0)})
              </span>
              <span className="font-mono tabular-nums">
                {formatRupees(liveOrder.totalAmount)}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {liveOrder.items.map((item) => (
                <li
                  key={item.menuItemId}
                  className="flex items-center justify-between text-[#1A2D24]"
                >
                  <span className="truncate pr-3">
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
            {liveOrder.kitchenNote && (
              <p className="mt-2 text-xs text-[#5A6D63]">
                Note: {liveOrder.kitchenNote}
              </p>
            )}
          </div>

          {isReady && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#ECFDF5] px-4 py-2.5 text-xs font-semibold text-[#065F46]">
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
              Flash this QR code at {liveOrder.counterLabel} for 5-second handover
            </div>
          )}

          {!isReady && !isCollected && (
            <p className="mt-4 text-center text-xs text-[#5A6D63]">
              Your pass updates automatically when the kitchen marks your order Ready.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
