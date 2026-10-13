/* ═══════════════════════════════════════════════════════════
   CARRIER HELPERS
   ─────────────────────────────────────────────────────────
   Kenya-focused couriers + tracking number generator
   + checkpoint builder for order timelines
   + carrier-specific flow logic (courier / local / pickup)
   ═══════════════════════════════════════════════════════════ */

export const CARRIERS = [
  {
    id: 'g4s',
    name: 'G4S Kenya',
    prefix: 'G4S',
    website: 'https://www.g4s.com/en-ke',
    trackingUrlTemplate: null,
    avgDays: 3,
  },
  {
    id: 'sendy',
    name: 'Sendy',
    prefix: 'SND',
    website: 'https://sendyit.com',
    trackingUrlTemplate: 'https://sendyit.com/track/{number}',
    avgDays: 2,
  },
  {
    id: 'pickup',
    name: 'Pickup Mtaani',
    prefix: 'PM',
    website: 'https://pickupmtaani.com',
    trackingUrlTemplate: 'https://pickupmtaani.com/track/{number}',
    avgDays: 2,
  },
  {
    id: 'postal',
    name: 'Postal Corporation (Posta)',
    prefix: 'POSTA',
    website: 'https://posta.co.ke',
    trackingUrlTemplate: null,
    avgDays: 5,
  },
  {
    id: 'local',
    name: 'Local Delivery (Mombasa)',
    prefix: 'LOCAL',
    website: null,
    trackingUrlTemplate: null,
    avgDays: 1,
  },
  {
    id: 'pickup-store',
    name: 'Pickup from shop',
    prefix: 'PICKUP',
    website: null,
    trackingUrlTemplate: null,
    avgDays: 0,
  },
];

export const getCarrierById = (id) => CARRIERS.find(c => c.id === id) || null;

/* ═══════════════════════════════════════════════════════════
   TRACKING NUMBER GENERATOR
   ═══════════════════════════════════════════════════════════ */
export const generateTrackingNumber = (carrierId) => {
  const carrier = getCarrierById(carrierId);
  const prefix = carrier?.prefix || 'TRK';
  const year = new Date().getFullYear();
  const random = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}-${year}-${random}`;
};

/* ═══════════════════════════════════════════════════════════
   ETA CALCULATOR — skips weekends
   ═══════════════════════════════════════════════════════════ */
export const calculateETA = (carrierId, fromDate = new Date()) => {
  const carrier = getCarrierById(carrierId);
  const days = carrier?.avgDays ?? 3;

  const eta = new Date(fromDate);
  let added = 0;

  while (added < days) {
    eta.setDate(eta.getDate() + 1);
    const dayOfWeek = eta.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) added++;
  }

  return eta.toISOString();
};

/* ═══════════════════════════════════════════════════════════
   CHECKPOINT META
   ═══════════════════════════════════════════════════════════ */
const CHECKPOINT_META = {
  confirmed:        { label: 'Order confirmed',    icon: '✅', note: 'We received your order and it\'s being prepared' },
  picked_up:        { label: 'Picked up',          icon: '📦', note: 'Courier picked up your package' },
  in_transit:       { label: 'In transit',         icon: '🚚', note: 'On its way to your area' },
  out_for_delivery: { label: 'Out for delivery',   icon: '🏃', note: 'Arriving today — keep your phone on' },
  delivered:        { label: 'Delivered',          icon: '🎉', note: 'Package delivered successfully' },
  ready_pickup:     { label: 'Ready for pickup',   icon: '🏪', note: 'Your order is ready to collect from our shop' },
  collected:        { label: 'Collected',          icon: '🎉', note: 'Order collected — thank you!' },
  failed:           { label: 'Delivery failed',    icon: '⚠️', note: 'Courier couldn\'t reach you' },
  returned:         { label: 'Returned to shop',   icon: '↩️', note: 'Package came back to us' },
};

/* ═══════════════════════════════════════════════════════════
   BUILD a checkpoint object
   ═══════════════════════════════════════════════════════════ */
export const buildCheckpoint = (type, customNote = '') => {
  const meta = CHECKPOINT_META[type] || { label: type, icon: '📍', note: '' };

  return {
    id: `CP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    label: meta.label,
    icon: meta.icon,
    note: customNote || meta.note,
    at: new Date().toISOString(),
  };
};

/* ═══════════════════════════════════════════════════════════
   FLOWS — which stages apply per carrier type
   ═══════════════════════════════════════════════════════════ */

const FLOWS = {
  courier: [
    { type: 'confirmed',        buttonLabel: 'Confirm order' },
    { type: 'picked_up',        buttonLabel: 'Mark picked up' },
    { type: 'in_transit',       buttonLabel: 'Mark in transit' },
    { type: 'out_for_delivery', buttonLabel: 'Out for delivery' },
    { type: 'delivered',        buttonLabel: 'Mark delivered' },
  ],
  local: [
    { type: 'confirmed',        buttonLabel: 'Confirm order' },
    { type: 'out_for_delivery', buttonLabel: 'Out for delivery' },
    { type: 'delivered',        buttonLabel: 'Mark delivered' },
  ],
  pickup: [
    { type: 'confirmed',      buttonLabel: 'Confirm order' },
    { type: 'ready_pickup',   buttonLabel: 'Mark ready for pickup' },
    { type: 'collected',      buttonLabel: 'Mark collected' },
  ],
};

export const getFlowForCarrier = (carrierId) => {
  if (carrierId === 'pickup-store') return 'pickup';
  if (carrierId === 'local')        return 'local';
  return 'courier';
};

/* Return the flow array for a carrier */
export const getFlowSteps = (carrierId) => {
  const key = getFlowForCarrier(carrierId);
  return FLOWS[key] || FLOWS.courier;
};

/* Return the next stage to advance to, or null if done */
export const getNextCheckpoint = (checkpoints = [], carrierId) => {
  const flow = getFlowSteps(carrierId);
  const doneTypes = new Set(checkpoints.map(c => c.type));

  const next = flow.find(step => !doneTypes.has(step.type));
  if (!next) return null;

  const meta = buildCheckpoint(next.type);
  return {
    type: next.type,
    buttonLabel: next.buttonLabel,
    label: meta.label,
    icon: meta.icon,
    isFinal: next.type === 'delivered' || next.type === 'collected',
  };
};

/* ═══════════════════════════════════════════════════════════
   CHECKPOINT STATUS — for timeline component
   ─────────────────────────────────────────────────────────
   Now flow-aware: uses the carrier's flow, not a fixed list.
   ═══════════════════════════════════════════════════════════ */

/* Legacy: full order (kept for backward compatibility) */
export const CHECKPOINT_ORDER = [
  'confirmed',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

/* New: get the status of a checkpoint within a specific flow */
export const getCheckpointStatusInFlow = (checkpoints, type, carrierId) => {
  const flow = getFlowSteps(carrierId);
  const flowTypes = flow.map(s => s.type);
  const idx = flowTypes.indexOf(type);
  if (idx === -1) return 'pending';

  const doneTypes = new Set(checkpoints.map(c => c.type));

  /* Find the latest done step in this flow */
  let latestDoneIdx = -1;
  flowTypes.forEach((t, i) => {
    if (doneTypes.has(t)) latestDoneIdx = Math.max(latestDoneIdx, i);
  });

  if (idx < latestDoneIdx) return 'done';
  if (idx === latestDoneIdx) return 'current';
  return 'pending';
};

/* Legacy function — kept for old code paths (uses fixed 5-stage order) */
export const getCheckpointStatus = (checkpoints, type) => {
  const idx = CHECKPOINT_ORDER.indexOf(type);
  if (idx === -1) return 'pending';

  const latest = checkpoints
    .filter(c => CHECKPOINT_ORDER.includes(c.type))
    .sort((a, b) => new Date(b.at) - new Date(a.at))[0];

  if (!latest) return 'pending';

  const latestIdx = CHECKPOINT_ORDER.indexOf(latest.type);

  if (idx < latestIdx) return 'done';
  if (idx === latestIdx) return 'current';
  return 'pending';
};

/* ═══════════════════════════════════════════════════════════
   FORMAT helpers
   ═══════════════════════════════════════════════════════════ */
export const formatTrackingDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-KE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatETA = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return d.toLocaleDateString('en-KE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const daysUntilETA = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
};