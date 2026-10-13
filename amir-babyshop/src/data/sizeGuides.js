/* ═══════════════════════════════════════════════════════════
   SIZE GUIDES — per category
   ─────────────────────────────────────────────────────────
   All measurements stored in cm. Inches derived on the fly.
   Categories: clothing, shoes, hats
   ═══════════════════════════════════════════════════════════ */

export const CM_PER_INCH = 2.54;

export const cmToIn = (cm) => +(cm / CM_PER_INCH).toFixed(1);
export const inToCm = (inch) => +(inch * CM_PER_INCH).toFixed(1);

export const SIZE_GUIDES = {
  clothing: {
    label: 'Clothing',
    icon: '👕',
    columns: ['Age', 'Height', 'Weight', 'Size'],
    units: { height: 'cm', weight: 'kg' },
    rows: [
      { age: '0–3 months',   heightCm: [50, 60],  weightKg: [3, 6],   size: '0-3M'   },
      { age: '3–6 months',   heightCm: [60, 68],  weightKg: [6, 8],   size: '3-6M'   },
      { age: '6–12 months',  heightCm: [68, 76],  weightKg: [8, 10],  size: '6-12M'  },
      { age: '12–18 months', heightCm: [76, 82],  weightKg: [10, 11], size: '12-18M' },
      { age: '18–24 months', heightCm: [82, 88],  weightKg: [11, 12], size: '18-24M' },
      { age: '2–3 years',    heightCm: [88, 96],  weightKg: [12, 14], size: '2-3Y'   },
    ],
    tips: 'When in doubt, size up — babies grow fast!',
    quizAgeRanges: [
      { minMonths: 0,  maxMonths: 3,  label: '0-3M'   },
      { minMonths: 3,  maxMonths: 6,  label: '3-6M'   },
      { minMonths: 6,  maxMonths: 12, label: '6-12M'  },
      { minMonths: 12, maxMonths: 18, label: '12-18M' },
      { minMonths: 18, maxMonths: 24, label: '18-24M' },
      { minMonths: 24, maxMonths: 36, label: '2-3Y'   },
    ],
  },

  shoes: {
    label: 'Shoes',
    icon: '👟',
    columns: ['Age', 'Foot length', 'EU', 'UK', 'US'],
    units: { length: 'cm' },
    rows: [
      { age: '0–3 months',   lengthCm: [8, 9],   eu: '16',    uk: '0',   us: '1'   },
      { age: '3–6 months',   lengthCm: [9, 10],  eu: '17',    uk: '1',   us: '2'   },
      { age: '6–12 months',  lengthCm: [10, 11], eu: '18',    uk: '2',   us: '3'   },
      { age: '12–18 months', lengthCm: [11, 12], eu: '19-20', uk: '3-4', us: '4-5' },
      { age: '18–24 months', lengthCm: [12, 13], eu: '21-22', uk: '4-5', us: '5-6' },
      { age: '2–3 years',    lengthCm: [13, 14], eu: '23-24', uk: '6-7', us: '7-8' },
    ],
    tips: 'Measure your baby\'s foot while standing for the best fit.',
    quizAgeRanges: [
      { minMonths: 0,  maxMonths: 3,  label: '16' },
      { minMonths: 3,  maxMonths: 6,  label: '17' },
      { minMonths: 6,  maxMonths: 12, label: '18' },
      { minMonths: 12, maxMonths: 18, label: '19-20' },
      { minMonths: 18, maxMonths: 24, label: '21-22' },
      { minMonths: 24, maxMonths: 36, label: '23-24' },
    ],
  },

  hats: {
    label: 'Hats & Caps',
    icon: '🧢',
    columns: ['Age', 'Head circumference', 'Size'],
    units: { circumference: 'cm' },
    rows: [
      { age: '0–3 months',   circumferenceCm: [35, 40], size: 'XS' },
      { age: '3–6 months',   circumferenceCm: [40, 44], size: 'S'  },
      { age: '6–12 months',  circumferenceCm: [44, 46], size: 'M'  },
      { age: '12–24 months', circumferenceCm: [46, 48], size: 'L'  },
      { age: '2–3 years',    circumferenceCm: [48, 50], size: 'XL' },
    ],
    tips: 'A well-fitted hat should sit just above the eyebrows.',
    quizAgeRanges: [
      { minMonths: 0,  maxMonths: 3,  label: 'XS' },
      { minMonths: 3,  maxMonths: 6,  label: 'S'  },
      { minMonths: 6,  maxMonths: 12, label: 'M'  },
      { minMonths: 12, maxMonths: 24, label: 'L'  },
      { minMonths: 24, maxMonths: 36, label: 'XL' },
    ],
  },
};

/* Product categories → size guide category */
export const CATEGORY_TO_GUIDE = {
  clothing: 'clothing',
  toys:     null,
  feeding:  null,
  gear:     null,
  bath:     null,
  shoes:    'shoes',
  hats:     'hats',
  accessories: 'hats',
};

/* Get guide key for a product category, or fallback to clothing */
export const getGuideForCategory = (productCategory) => {
  const mapped = CATEGORY_TO_GUIDE[productCategory];
  return mapped || 'clothing';
};

/* ═══════════════════════════════════════════════════════════
   "Find my size" — recommendation logic
   ═══════════════════════════════════════════════════════════ */

export const monthsToAgeLabel = (months) => {
  if (months < 1) return 'newborn';
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
  if (months === 12) return '1 year';
  if (months < 24) return `${Math.floor(months / 12)} year ${months % 12} month${months % 12 !== 1 ? 's' : ''}`;
  return `${Math.floor(months / 12)} years`;
};

export const formatNumber = (n) => {
  if (n === undefined || n === null || Number.isNaN(n)) return '';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
};

/* Returns { label, confidence, note } or null */
export const findSizeForBaby = (category, { ageMonths, weightKg, unit = 'cm' }) => {
  const guide = SIZE_GUIDES[category];
  if (!guide) return null;

  // Find by age first
  const ageBucket = guide.quizAgeRanges.find(
    r => ageMonths >= r.minMonths && ageMonths < r.maxMonths
  );

  let label = ageBucket?.label || null;
  let confidence = 'medium';
  let note = ageBucket
    ? `Based on age (${monthsToAgeLabel(ageMonths)})`
    : 'Age out of usual range — check the table below';

  // If we also have weight (clothing only), use it to refine
  if (category === 'clothing' && weightKg && label) {
    const rowByAge = guide.rows.find(r => r.size === label);
    if (rowByAge) {
      const [wMin, wMax] = rowByAge.weightKg;
      if (weightKg < wMin - 0.5) {
        // Baby is lighter than expected → maybe size down
        confidence = 'low';
        note += `, but baby is lighter than usual for this size. Consider sizing down or asking us.`;
      } else if (weightKg > wMax + 0.5) {
        // Baby is heavier → size up
        const idx = guide.rows.findIndex(r => r.size === label);
        const nextRow = guide.rows[idx + 1];
        if (nextRow) {
          label = nextRow.size;
          confidence = 'high';
          note = `Baby is heavier than usual for their age — recommend sizing up.`;
        } else {
          confidence = 'low';
          note = `Baby is at the top of the size range. This may be tight soon.`;
        }
      } else {
        confidence = 'high';
        note = `Age and weight both fit the ${label} range comfortably.`;
      }
    }
  }

  return label ? { label, confidence, note } : null;
};

/* ═══════════════════════════════════════════════════════════
   Table formatting helpers (for cm/inches toggle)
   ═══════════════════════════════════════════════════════════ */

export const formatRange = (minCm, maxCm, unit) => {
  if (unit === 'in') return `${cmToIn(minCm)}–${cmToIn(maxCm)} in`;
  return `${minCm}–${maxCm} cm`;
};

export const formatSingle = (cm, unit) => {
  if (unit === 'in') return `${cmToIn(cm)} in`;
  return `${cm} cm`;
};