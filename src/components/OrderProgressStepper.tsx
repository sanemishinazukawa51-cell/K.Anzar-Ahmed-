import { Check } from 'lucide-react';
import { OrderStatus } from '../types/canteen';

const STAGES: OrderStatus[] = ['Received', 'Preparing', 'Ready', 'Collected'];

interface OrderProgressStepperProps {
  status: OrderStatus;
  compact?: boolean;
}

export function OrderProgressStepper({
  status,
  compact = false,
}: OrderProgressStepperProps) {
  const currentIdx = STAGES.indexOf(status);

  return (
    <div className="w-full" aria-label={`Order status: ${status}`}>
      <div className="flex items-center justify-between">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isReadyHighlight = stage === 'Ready' && isCurrent;

          return (
            <div key={stage} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
                    isCompleted
                      ? 'border-[#09533A] bg-[#09533A] text-white'
                      : isReadyHighlight
                      ? 'border-[#10B981] bg-[#10B981] text-white shadow-sm shadow-emerald-500/25'
                      : isCurrent
                      ? 'border-[#09533A] bg-[#EAF4EF] text-[#09533A]'
                      : 'border-[#D5DFD9] bg-white text-[#7C8E85]'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  ) : (
                    <span className="font-mono">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`whitespace-nowrap ${
                    compact ? 'text-[10px]' : 'text-[11px]'
                  } font-medium ${
                    isCurrent
                      ? isReadyHighlight
                        ? 'text-[#09533A] font-semibold'
                        : 'text-[#0F1E18] font-semibold'
                      : isCompleted
                      ? 'text-[#09533A]'
                      : 'text-[#6A7C73]'
                  }`}
                >
                  {stage}
                </span>
              </div>

              {idx < STAGES.length - 1 && (
                <div
                  className={`mx-1.5 mb-4 h-[2px] flex-1 rounded-full transition-colors ${
                    idx < currentIdx ? 'bg-[#09533A]' : 'bg-[#E2E8E4]'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
