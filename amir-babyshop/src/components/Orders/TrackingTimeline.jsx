import { Check, Package, Truck, Home, MapPin, AlertCircle, Store } from 'lucide-react';
import {
  getFlowSteps,
  getCheckpointStatusInFlow,
  formatTrackingDate,
  buildCheckpoint,
} from '../../utils/carrierHelpers';

/* ═══════════════════════════════════════════════════════════
   TRACKING TIMELINE — flow-aware
   ─────────────────────────────────────────────────────────
   Renders the correct stages based on the carrier:
     - Courier (G4S, Sendy, Posta): Confirmed → Picked up → In transit → Out for delivery → Delivered
     - Local delivery:              Confirmed → Out for delivery → Delivered
     - Pickup from shop:            Confirmed → Ready for pickup → Collected

   Automatically renders VERTICALLY for staff (no `compact`) and
   HORIZONTALLY for customers (`compact` prop = true).
   ═══════════════════════════════════════════════════════════ */

const STEP_ICONS = {
  confirmed:        Check,
  picked_up:        Package,
  in_transit:       Truck,
  out_for_delivery: MapPin,
  delivered:        Home,
  ready_pickup:     Store,
  collected:        Check,
};

export default function TrackingTimeline({
  checkpoints = [],
  carrierId = null,
  compact = false,
}) {
  if (!checkpoints.length) {
    return (
      <div className="text-xs text-amir-dark/50 font-semibold py-3 italic text-center">
        No tracking info yet
      </div>
    );
  }

  const sorted = [...checkpoints].sort((a, b) => new Date(b.at) - new Date(a.at));
  const latest = sorted[0];
  const isFailed   = latest?.type === 'failed';
  const isReturned = latest?.type === 'returned';

  const flow = getFlowSteps(carrierId);

  return (
    <div className="space-y-0">
      {/* Failed / returned override */}
      {(isFailed || isReturned) && (
        <div className={`mb-3 p-3 rounded-xl border-2 ${
          isFailed ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className={isFailed ? 'text-rose-600' : 'text-amber-600'} />
            <p className={`text-xs font-bold ${isFailed ? 'text-rose-800' : 'text-amber-800'}`}>
              {latest.label}
            </p>
          </div>
          {latest.note && (
            <p className="text-[11px] text-amir-dark/70 font-semibold mt-1 leading-relaxed">
              {latest.note}
            </p>
          )}
          <p className="text-[10px] text-amir-dark/40 font-semibold mt-1">
            {formatTrackingDate(latest.at)}
          </p>
        </div>
      )}

            {/* 👇 HORIZONTAL COMPACT VIEW (with dates & notes) 👇 */}
      {compact ? (
        <div className="flex items-start justify-between w-full mt-4 overflow-x-auto hide-scrollbar pb-4 gap-2">
          {flow.map((step, idx) => {
            const status = getCheckpointStatusInFlow(checkpoints, step.type, carrierId);
            const meta = buildCheckpoint(step.type);
            const Icon = STEP_ICONS[step.type] || Check;
            const cp = checkpoints.find(c => c.type === step.type);
            const isLast = idx === flow.length - 1;

            return (
              <div key={step.type} className="flex flex-col items-center flex-1 min-w-[70px] relative">
                
                {/* Connecting Line */}
                {!isLast && (
                  <div className={`absolute top-4 left-1/2 w-full h-0.5 ${
                    status === 'done' ? 'bg-emerald-400' : 'bg-gray-200'
                  }`} />
                )}

                {/* Circle Icon */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  status === 'done'
                    ? 'bg-emerald-500 text-white'
                    : status === 'current'
                    ? 'bg-amir-pink text-amir-dark ring-4 ring-amir-pink/30'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                }`}>
                  {status === 'done' ? <Check size={14} /> : <Icon size={14} />}
                </div>

                {/* Label & Date */}
                <div className="text-center mt-2 px-0.5 w-full">
                  <p className={`text-[9px] font-bold leading-tight ${
                    status === 'done'    ? 'text-emerald-700' :
                    status === 'current' ? 'text-amir-dark' :
                                           'text-amir-dark/40'
                  }`}>
                    {meta.label}
                  </p>
                  
                  {cp?.at && (
                    <p className="text-[8px] text-amir-dark/50 font-semibold mt-0.5">
                      {formatTrackingDate(cp.at)}
                    </p>
                  )}
                  
                  {/* The Note (e.g. "Arriving today") */}
                  {status === 'current' && cp?.note && (
                    <p className="text-[8px] text-amir-dark/60 font-semibold mt-1 leading-tight italic line-clamp-2">
                      {cp.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════
            VERTICAL DETAILED VIEW — for staff (Orders)
           ═════════════════════════════════════════════════════ */
        <div className="relative">
          {flow.map((step, idx) => {
            const status = getCheckpointStatusInFlow(checkpoints, step.type, carrierId);
            const meta = buildCheckpoint(step.type);
            const Icon = STEP_ICONS[step.type] || Check;
            const cp = checkpoints.find(c => c.type === step.type);
            const isLast = idx === flow.length - 1;

            return (
              <div key={step.type} className="relative flex gap-3">
                {!isLast && (
                  <div
                    className={`absolute left-[15px] top-8 w-0.5 ${
                      status === 'done' ? 'bg-emerald-400' : 'bg-gray-200'
                    }`}
                    style={{ height: '24px' }}
                  />
                )}

                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    status === 'done'
                      ? 'bg-emerald-500 text-white'
                      : status === 'current'
                      ? 'bg-amir-pink text-amir-dark ring-4 ring-amir-pink/30'
                      : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                  }`}
                >
                  {status === 'done' ? <Check size={14} /> : <Icon size={14} />}
                </div>

                <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-6'}`}>
                  <p
                    className={`text-xs font-bold leading-tight ${
                      status === 'done'
                        ? 'text-emerald-700'
                        : status === 'current'
                        ? 'text-amir-dark'
                        : 'text-amir-dark/40'
                    }`}
                  >
                    {meta.label}
                  </p>
                  {cp?.at && (
                    <p className="text-[10px] text-amir-dark/50 font-semibold mt-0.5">
                      {formatTrackingDate(cp.at)}
                    </p>
                  )}
                  {status === 'current' && cp?.note && (
                    <p className="text-[10px] text-amir-dark/60 font-semibold mt-1 leading-relaxed">
                      {cp.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}