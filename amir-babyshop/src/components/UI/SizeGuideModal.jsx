import { useState } from 'react';
import { X, Ruler, Lightbulb } from 'lucide-react';
import { useExtras } from '../../context/ExtrasContext';

export default function SizeGuideModal({ onClose, initialTab = 'clothing' }) {
  const { sizeGuide } = useExtras();
  const [tab, setTab] = useState(initialTab);

  const tabs = Object.entries(sizeGuide).map(([key, val]) => ({
    id: key,
    label: val.label,
    icon: val.icon,
  }));

  const current = sizeGuide[tab];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-amir-dark/5 p-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="font-black text-base flex items-center gap-2">
              <Ruler size={18} className="text-amir-pink" />
              Size Guide
            </p>
            <p className="text-[11px] text-amir-dark/50">
              Find the perfect fit for your little one
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

        {/* Tabs */}
        <div className="px-4 pt-3 flex gap-1.5 overflow-x-auto hide-scrollbar">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3.5 py-2 rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
                tab === t.id
                  ? 'bg-amir-pink text-amir-dark shadow-sm'
                  : 'bg-transparent text-gray-500 hover:text-amir-dark hover:bg-amir-pink/10'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="p-4 space-y-4">

          {/* Tips */}
          {current.tips && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amir-yellow/30">
              <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amir-dark/70 font-semibold leading-relaxed">
                {current.tips}
              </p>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse min-w-[420px]">
              <thead>
                <tr className="bg-amir-cream/60">
                  {current.columns.map((col, i) => (
                    <th
                      key={i}
                      className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-amir-dark/70 border-b-2 border-amir-dark/10"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={`border-b border-amir-dark/5 transition-colors hover:bg-amir-pink/10 ${
                      ri % 2 === 0 ? 'bg-white' : 'bg-amir-cream/20'
                    }`}
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-3 py-2.5 text-xs ${
                          ci === 0
                            ? 'font-bold text-amir-dark'
                            : 'font-semibold text-amir-dark/70'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer hint */}
          <p className="text-[10px] text-amir-dark/50 text-center pt-2">
            💡 Measurements are approximate. When between sizes, size up for comfort.
          </p>
        </div>

      </div>
    </div>
  );
}