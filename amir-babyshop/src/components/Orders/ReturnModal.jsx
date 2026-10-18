import { useState } from 'react';
import {
  X, RotateCcw, AlertCircle, Check, ChevronDown,
} from 'lucide-react';
import { useExtras } from '../../context/ExtrasContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';

const REASONS = [
  'Wrong size',
  'Not as described',
  'Damaged or defective',
  'Changed my mind',
  'Received wrong item',
  'Other',
];

export default function ReturnModal({ order, onClose, onSuccess }) {
  const { requestReturn } = useExtras();
  const { user } = useAuth();

  // Which items are selected (keyed by item.key or index)
  const [selected, setSelected] = useState(() => {
    // Default: all items selected
    const map = {};
    order.items.forEach((it, i) => {
      map[it.key || `idx-${i}`] = true;
    });
    return map;
  });

  const [reason, setReason] = useState('Wrong size');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const toggleItem = (key) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedItems = order.items.filter((it, i) => selected[it.key || `idx-${i}`]);
  const refundTotal = selectedItems.reduce((s, it) => s + it.price * it.qty, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (selectedItems.length === 0) {
      setError('Please select at least one item to return');
      return;
    }
    if (!reason) {
      setError('Please choose a reason');
      return;
    }

    requestReturn({
      order,
      items: selectedItems,
      reason,
      note,
      user,
    });

    onSuccess?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="font-black text-base flex items-center gap-2">
              <RotateCcw size={18} className="text-rose-500" />
              Request return
            </p>
            <p className="text-[11px] font-mono text-amir-dark/50 truncate">
              Order {order.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon w-9 h-9 hover:bg-amir-pink/20 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amir-dark/60">
                Select items to return *
              </p>
              <p className="text-[10px] font-bold text-amir-dark/50">
                {selectedItems.length} of {order.items.length}
              </p>
            </div>

            <div className="space-y-2">
              {order.items.map((it, i) => {
                const key = it.key || `idx-${i}`;
                const isSelected = selected[key];
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleItem(key)}
                    className={`w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-amir-pink bg-amir-pink/10'
                        : 'border-gray-200 bg-white hover:border-amir-pink/40'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 ${
                      isSelected
                        ? 'bg-amir-pink border-amir-pink text-amir-dark'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </span>

                    <img
                      src={it.image}
                      alt={it.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-tight line-clamp-2">{it.name}</p>
                      <p className="text-[10px] text-amir-dark/50 font-semibold mt-0.5">
                        {[it.size, it.color].filter(Boolean).join(' • ') || 'Standard'} · Qty {it.qty}
                      </p>
                    </div>

                    <p className="text-xs font-black shrink-0">
                      {formatCurrency(it.price * it.qty)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
              Reason for return *
            </label>
            <div className="relative">
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amir-pink focus:outline-none text-sm font-bold bg-white cursor-pointer pr-10"
              >
                {REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
              Additional notes (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Tell us more about why you're returning..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amir-pink focus:outline-none text-sm font-medium resize-none bg-white leading-relaxed"
            />
            {note.length > 0 && (
              <p className="text-[10px] text-amir-dark/40 mt-0.5 text-right">
                {note.length}/300
              </p>
            )}
          </div>

          {/* Refund summary */}
          <div className="bg-amir-cream/60 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-amir-dark/70">
              Estimated refund
            </span>
            <span className="font-black text-base text-amir-dark">
              {formatCurrency(refundTotal)}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle size={14} className="text-rose-500 shrink-0" />
              <p className="text-xs text-rose-600 font-semibold">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-amir-dark/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-all active:scale-[0.99]"
            >
              <RotateCcw size={14} /> Submit request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}