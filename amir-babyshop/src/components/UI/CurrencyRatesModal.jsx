import { useEffect, useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { currencyService } from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';

export default function CurrencyRatesModal({ open, onClose }) {
  const { refreshRates } = useCurrency();
  const [rates, setRates] = useState({});
  const [editing, setEditing] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState({ code: '', kesPerUnit: '', symbol: '', label: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setEditing(null);
      setIsCreating(false);
      try {
        const r = await currencyService.getRates();
        if (!cancelled) setRates(r || {});
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load rates');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  const startCreate = () => {
    setIsCreating(true);
    setEditing(null);
    setDraft({ code: '', kesPerUnit: '', symbol: '', label: '' });
    setError('');
  };

  const startEdit = (code) => {
    const r = rates[code];
    setIsCreating(false);
    setEditing(code);
    setDraft({
      code,
      kesPerUnit: String(r?.kesPerUnit ?? ''),
      symbol: r?.symbol ?? '',
      label: r?.label ?? '',
    });
    setError('');
  };

  const cancel = () => { setEditing(null); setIsCreating(false); setError(''); };

  const save = async () => {
    const val = Number(draft.kesPerUnit);
    if (!val || val <= 0) { setError('Rate must be greater than 0'); return; }

    setSaving(true);
    setError('');
    try {
      if (isCreating) {
        const code = draft.code.trim().toUpperCase();
        if (code.length !== 3) { setError('Code must be 3 letters (e.g. EUR)'); setSaving(false); return; }
        const created = await currencyService.createRate({
          code,
          kesPerUnit: val,
          symbol: draft.symbol,
          label: draft.label,
        });
        setRates(prev => ({ ...prev, [created.currencyCode]: created }));
        setIsCreating(false);
      } else {
        const updated = await currencyService.updateRate(editing, {
          kesPerUnit: val,
          symbol: draft.symbol,
          label: draft.label,
        });
        setRates(prev => ({ ...prev, [editing]: updated }));
        setEditing(null);
      }
      if (refreshRates) await refreshRates();
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-amir-dark/5">
          <div>
            <p className="font-black text-base">Currency Rates</p>
            <p className="text-[11px] text-amir-dark/60 font-semibold">
              Base is KES · “KES per unit” = how many KES 1 unit is worth
            </p>
          </div>
          <button onClick={onClose} className="btn-icon w-9 h-9 hover:bg-amir-pink/20" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2 font-bold">
              {error}
            </div>
          )}

          {!isCreating && (
            <button
              onClick={startCreate}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-black px-3 py-2.5 rounded-xl border-2 border-dashed border-amir-dark/20 hover:border-amir-dark/40 hover:bg-amir-dark/5 mb-3"
            >
              <Plus size={14} /> Add currency
            </button>
          )}

          {isCreating && (
            <div className="rounded-xl border border-amir-dark/20 bg-amber-50/40 p-3 mb-3">
              <div className="grid grid-cols-4 gap-2">
                <label className="block">
                  <span className="text-[10px] font-bold text-amir-dark/60">Code</span>
                  <input
                    value={draft.code}
                    onChange={e => setDraft({ ...draft, code: e.target.value.toUpperCase().slice(0, 3) })}
                    placeholder="EUR"
                    maxLength={3}
                    className="input w-full mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-amir-dark/60">KES/unit</span>
                  <input type="number" step="0.0001" min="0.0001"
                         value={draft.kesPerUnit}
                         onChange={e => setDraft({ ...draft, kesPerUnit: e.target.value })}
                         placeholder="145"
                         className="input w-full mt-1" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-amir-dark/60">Symbol</span>
                  <input value={draft.symbol}
                         onChange={e => setDraft({ ...draft, symbol: e.target.value })}
                         placeholder="€"
                         className="input w-full mt-1" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-amir-dark/60">Label</span>
                  <input value={draft.label}
                         onChange={e => setDraft({ ...draft, label: e.target.value })}
                         placeholder="Euro"
                         className="input w-full mt-1" />
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 mt-2">
                <button onClick={cancel} disabled={saving}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100">
                  Cancel
                </button>
                <button onClick={save} disabled={saving}
                        className="text-xs font-black px-3 py-1.5 rounded-lg bg-amir-pink hover:bg-amir-pink/80 flex items-center gap-1.5">
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  {saving ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-amir-dark/60">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : Object.keys(rates).length === 0 && !isCreating ? (
            <div className="text-center py-8 text-amir-dark/50 text-xs font-semibold">
              No currencies yet — click “Add currency” above to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {Object.values(rates).map((r) => {
                const isEditing = editing === r.currencyCode;
                return (
                  <div
                    key={r.currencyCode}
                    className={`rounded-xl border p-3 ${isEditing ? 'border-amir-dark/20 bg-amber-50/40' : 'border-amir-dark/10'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-black text-sm">
                          {r.currencyCode} <span className="text-amir-dark/50 font-semibold">{r.symbol}</span>
                        </p>
                        <p className="text-[10px] text-amir-dark/50 font-semibold truncate">{r.label}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {!isEditing && (
                          <>
                            <p className="text-xs font-black">{r.kesPerUnit} KES</p>
                            <p className="text-[10px] text-amir-dark/40 font-semibold">1 {r.currencyCode}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <label className="block">
                          <span className="text-[10px] font-bold text-amir-dark/60">KES/unit</span>
                          <input type="number" step="0.0001" min="0.0001"
                                 value={draft.kesPerUnit}
                                 onChange={e => setDraft({ ...draft, kesPerUnit: e.target.value })}
                                 className="input w-full mt-1" />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold text-amir-dark/60">Symbol</span>
                          <input value={draft.symbol}
                                 onChange={e => setDraft({ ...draft, symbol: e.target.value })}
                                 className="input w-full mt-1" />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold text-amir-dark/60">Label</span>
                          <input value={draft.label}
                                 onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                                 className="input w-full mt-1" />
                        </label>
                        <div className="col-span-3 flex items-center justify-end gap-2 mt-1">
                          <button onClick={cancel} disabled={saving}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100">
                            Cancel
                          </button>
                          <button onClick={save} disabled={saving}
                                  className="text-xs font-black px-3 py-1.5 rounded-lg bg-amir-pink hover:bg-amir-pink/80 flex items-center gap-1.5">
                            {saving && <Loader2 size={12} className="animate-spin" />}
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex justify-end">
                        <button onClick={() => startEdit(r.currencyCode)}
                                className="text-[11px] font-black px-3 py-1.5 rounded-lg bg-amir-dark/5 hover:bg-amir-dark/10">
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-amir-dark/5 text-[10px] text-amir-dark/50 font-semibold text-center">
          Changes take effect for all users on their next page load
        </div>
      </div>
    </div>
  );
}