import { useState } from 'react';
import { X, Ruler, Lightbulb, Calculator, CheckCircle2, ChevronDown } from 'lucide-react';
import {
  SIZE_GUIDES,
  getGuideForCategory,
  findSizeForBaby,
  formatRange,
  formatNumber,
} from '../../data/sizeGuides';

export default function SizeGuideModal({ onClose, initialTab = 'clothing' }) {
  const safeTab = SIZE_GUIDES[initialTab] ? initialTab : getGuideForCategory(initialTab);

  const [tab, setTab] = useState(safeTab);
  const [unit, setUnit] = useState('cm');
  const [showQuiz, setShowQuiz] = useState(false);
  const [ageMonths, setAgeMonths] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [quizResult, setQuizResult] = useState(null);

  const current = SIZE_GUIDES[tab];
  const tabs = Object.entries(SIZE_GUIDES).map(([key, val]) => ({
    id: key,
    label: val.label,
    icon: val.icon,
  }));

  const handleRunQuiz = () => {
    const age = Number(ageMonths);
    const weight = weightKg ? Number(weightKg) : null;

    if (Number.isNaN(age) || age < 0 || age > 36) {
      setQuizResult({ error: 'Enter an age between 0 and 36 months' });
      return;
    }

    const result = findSizeForBaby(tab, { ageMonths: age, weightKg: weight });
    if (!result) {
      setQuizResult({ error: 'Could not find a match — check the table' });
      return;
    }

    setQuizResult(result);
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setQuizResult(null);
    setAgeMonths('');
    setWeightKg('');
  };

  /* ─── Render a single table cell value ─── */
  const renderCell = (row, col, ci) => {
    if (ci === 0) return row.age;

    if (col === 'Height') {
      return formatRange(row.heightCm[0], row.heightCm[1], unit);
    }
    if (col === 'Weight') {
      return `${formatNumber(row.weightKg[0])}–${formatNumber(row.weightKg[1])} kg`;
    }
    if (col === 'Foot length') {
      return formatRange(row.lengthCm[0], row.lengthCm[1], unit);
    }
    if (col === 'Head circumference') {
      return formatRange(row.circumferenceCm[0], row.circumferenceCm[1], unit);
    }
    if (col === 'Size') return row.size;
    if (col === 'EU') return row.eu;
    if (col === 'UK') return row.uk;
    if (col === 'US') return row.us;
    return '';
  };

  const showUnitToggle =
    tab === 'shoes' ||
    tab === 'hats' ||
    tab === 'clothing';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

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

        <div className="px-4 pt-3 flex gap-1.5 overflow-x-auto hide-scrollbar">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
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

        <div className="p-4 space-y-4">

          {showUnitToggle && (
            <div className="flex justify-end">
              <div className="inline-flex bg-gray-100 rounded-full p-0.5">
                <button
                  onClick={() => setUnit('cm')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    unit === 'cm' ? 'bg-white text-amir-dark shadow-sm' : 'text-gray-500'
                  }`}
                >
                  cm
                </button>
                <button
                  onClick={() => setUnit('in')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    unit === 'in' ? 'bg-white text-amir-dark shadow-sm' : 'text-gray-500'
                  }`}
                >
                  inches
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border-2 border-amir-pink/30 bg-amir-pink/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowQuiz(v => !v)}
              className="w-full flex items-center justify-between gap-2 p-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-amir-pink shrink-0" />
                <div>
                  <p className="text-xs font-black text-amir-dark">Find my size</p>
                  <p className="text-[10px] text-amir-dark/60 font-semibold">
                    Answer 2 quick questions
                  </p>
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`text-amir-dark/50 transition-transform ${showQuiz ? 'rotate-180' : ''}`}
              />
            </button>

            {showQuiz && (
              <div className="border-t border-amir-pink/20 p-3 space-y-3 animate-fade-in">

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                    Baby's age
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="36"
                      inputMode="numeric"
                      value={ageMonths}
                      onChange={e => setAgeMonths(e.target.value)}
                      placeholder="e.g. 6"
                      className="flex-1 px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-semibold"
                    />
                    <span className="text-xs font-bold text-amir-dark/60 shrink-0">months</span>
                  </div>
                </div>

                {tab === 'clothing' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1">
                      Baby's weight <span className="text-amir-dark/40 normal-case font-semibold">(optional)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        inputMode="decimal"
                        value={weightKg}
                        onChange={e => setWeightKg(e.target.value)}
                        placeholder="e.g. 7.5"
                        className="flex-1 px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-semibold"
                      />
                      <span className="text-xs font-bold text-amir-dark/60 shrink-0">kg</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRunQuiz}
                  className="w-full py-2.5 rounded-full bg-amir-dark hover:bg-amir-dark/90 text-white font-bold text-xs transition-colors active:scale-[0.99]"
                >
                  Get my size →
                </button>

                {quizResult && quizResult.error && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                    <p className="text-[11px] text-rose-600 font-semibold">{quizResult.error}</p>
                  </div>
                )}

                {quizResult && !quizResult.error && (
                  <div className="rounded-xl bg-white border-2 border-emerald-200 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Recommended size
                      </p>
                    </div>
                    <p className="text-2xl font-black text-amir-dark">
                      {quizResult.label}
                    </p>
                    <p className="text-[11px] text-amir-dark/70 font-semibold leading-snug">
                      {quizResult.note}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        quizResult.confidence === 'high'   ? 'bg-emerald-100 text-emerald-700' :
                        quizResult.confidence === 'medium' ? 'bg-amber-100 text-amber-700'    :
                                                              'bg-rose-100 text-rose-700'
                      }`}>
                        {quizResult.confidence === 'high'   ? '✓ High confidence' :
                         quizResult.confidence === 'medium' ? '~ Medium confidence' :
                                                              '⚠ Check the table'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {current.tips && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amir-yellow/30">
              <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amir-dark/70 font-semibold leading-relaxed">
                {current.tips}
              </p>
            </div>
          )}

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
                    {current.columns.map((col, ci) => (
                      <td
                        key={ci}
                        className={`px-3 py-2.5 text-xs ${
                          ci === 0
                            ? 'font-bold text-amir-dark'
                            : 'font-semibold text-amir-dark/70'
                        }`}
                      >
                        {renderCell(row, col, ci)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-amir-dark/50 text-center pt-2">
            💡 Measurements are approximate. When between sizes, size up for comfort.
          </p>
        </div>

      </div>
    </div>
  );
}