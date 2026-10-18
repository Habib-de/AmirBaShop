export const categories = [
  { id: 'all',      name: 'All',      icon: '🌟' },
  { id: 'clothing', name: 'Clothing', icon: '👕' },
  { id: 'toys',     name: 'Toys',     icon: '🧸' },
  { id: 'feeding',  name: 'Feeding',  icon: '🍼' },
  { id: 'gear',     name: 'Gear',     icon: '🚼' },
  { id: 'bath',     name: 'Bath',     icon: '🛁' },
];

/* ═══════════════════════════════════════════════════════════
   Helper: build variant map from sizes × colors × stock table
   All values auto-sum to the `stock` field for backward compat.
   ═══════════════════════════════════════════════════════════ */
const buildVariants = (sizes, colors, stockTable) => {
  const variants = {};
  const listSizes = sizes?.length ? sizes : ['_'];
  const listColors = colors?.length ? colors : ['_'];

  listSizes.forEach(size => {
    listColors.forEach(color => {
      const key = `${size}-${color}`;
      variants[key] = { stock: stockTable[key] ?? 0 };
    });
  });

  return variants;
};

/* Sum all variant stocks → used as the `stock` field */
const totalFrom = (variants) =>
  Object.values(variants).reduce((sum, v) => sum + (v.stock || 0), 0);

export const products = [
  // ─── CLOTHING ────────────────────────────────────────────────
  (() => {
    const sizes = ['0-3M', '3-6M', '6-9M', '9-12M'];
    const colors = ['Pink', 'Blue', 'White'];
    const variants = buildVariants(sizes, colors, {
      '0-3M-Pink': 5,  '0-3M-Blue': 4,  '0-3M-White': 6,
      '3-6M-Pink': 6,  '3-6M-Blue': 5,  '3-6M-White': 5,
      '6-9M-Pink': 4,  '6-9M-Blue': 4,  '6-9M-White': 3,
      '9-12M-Pink': 2, '9-12M-Blue': 1, '9-12M-White': 0, // ❌ sold out
    });
    return {
      id: 1,
      name: 'Organic Cotton Onesie',
      category: 'clothing',
      price: 1299,
      originalPrice: 1799,
      image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600',
      description: 'Soft organic cotton onesie, perfect for delicate baby skin. Features snap buttons for easy changing.',
      rating: 4.8, reviews: 124,
      sku: 'CLO-001',
      sizes, colors, variants,
      stock: totalFrom(variants),
      badge: 'Best Seller',
    };
  })(),

  (() => {
    const sizes = ['0-3M', '3-6M', '6-9M'];
    const colors = ['Mint', 'Yellow'];
    const variants = buildVariants(sizes, colors, {
      '0-3M-Mint': 12,  '0-3M-Yellow': 10,
      '3-6M-Mint': 14,  '3-6M-Yellow': 11,
      '6-9M-Mint': 10,  '6-9M-Yellow': 10,
    });
    return {
      id: 6,
      name: 'Baby Romper Set',
      category: 'clothing',
      price: 1699,
      image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600',
      description: 'Adorable 3-piece romper set. Made from 100% organic cotton.',
      rating: 4.9, reviews: 201,
      sku: 'CLO-002',
      sizes, colors, variants,
      stock: totalFrom(variants),
    };
  })(),

  (() => {
    const sizes = ['0-6M', '6-12M', '12-18M'];
    const colors = ['Cream', 'Grey', 'Mint'];
    const variants = buildVariants(sizes, colors, {
      '0-6M-Cream':  6, '0-6M-Grey':   5, '0-6M-Mint':   4,
      '6-12M-Cream': 5, '6-12M-Grey':  4, '6-12M-Mint':  4,
      '12-18M-Cream':3, '12-18M-Grey': 4, '12-18M-Mint': 3,
    });
    return {
      id: 9,
      name: 'Newborn Sleep Sack',
      category: 'clothing',
      price: 1499,
      originalPrice: 1999,
      image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=600',
      description: 'Cozy sleep sack that keeps baby warm and safe all night. Zip closure for easy changes.',
      rating: 4.9, reviews: 178,
      sku: 'CLO-003',
      sizes, colors, variants,
      stock: totalFrom(variants),
      badge: 'Best Seller',
    };
  })(),

  (() => {
    const colors = ['White', 'Pink', 'Blue'];
    const variants = buildVariants([], colors, {
      '_-White': 35,
      '_-Pink':  30,
      '_-Blue':  27,
    });
    return {
      id: 10,
      name: 'Cotton Baby Mittens',
      category: 'clothing',
      price: 499,
      image: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600',
      description: 'Soft cotton mittens to protect baby from scratching. Set of 3 pairs.',
      rating: 4.6, reviews: 91,
      sku: 'CLO-004',
      colors, variants,
      stock: totalFrom(variants),
    };
  })(),

  (() => {
    const sizes = ['0-6M', '6-12M'];
    const colors = ['Multicolor'];
    const variants = buildVariants(sizes, colors, {
      '0-6M-Multicolor':  65,
      '6-12M-Multicolor': 55,
    });
    return {
      id: 11,
      name: 'Baby Socks (5-Pack)',
      category: 'clothing',
      price: 699,
      image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=600',
      description: 'Five pairs of soft, non-slip baby socks in assorted colors.',
      rating: 4.7, reviews: 143,
      sku: 'CLO-005',
      sizes, colors, variants,
      stock: totalFrom(variants),
    };
  })(),

  // ─── TOYS ────────────────────────────────────────────────────
  {
    id: 2,
    name: 'Plush Teddy Bear',
    category: 'toys',
    price: 999,
    image: 'https://images.unsplash.com/photo-1562040506-a9b32cb51b94?w=600',
    description: 'Ultra-soft teddy bear, perfect first friend for your little one.',
    rating: 4.9, reviews: 89,
    stock: 32, sku: 'TOY-001',       // no sizes/colors — single SKU
    badge: 'New',
  },
  {
    id: 7,
    name: 'Wooden Building Blocks',
    category: 'toys',
    price: 1899,
    image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600',
    description: '50-piece wooden blocks set. Safe, non-toxic paint. Ages 1+.',
    rating: 4.8, reviews: 92,
    stock: 24, sku: 'TOY-002',
  },
  {
    id: 12,
    name: 'Musical Mobile Crib Toy',
    category: 'toys',
    price: 2399,
    image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600',
    description: 'Soothing musical mobile with rotating toys. Helps baby fall asleep.',
    rating: 4.8, reviews: 67,
    stock: 18, sku: 'TOY-003',
    badge: 'New',
  },
  {
    id: 13,
    name: 'Soft Teething Ring Set',
    category: 'toys',
    price: 799,
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600',
    description: 'BPA-free teething rings in various shapes and textures. Set of 4.',
    rating: 4.7, reviews: 105,
    stock: 55, sku: 'TOY-004',
  },
  {
    id: 14,
    name: 'Activity Play Gym',
    category: 'toys',
    price: 3199,
    originalPrice: 4199,
    image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600',
    description: 'Play gym with hanging toys, mirror, and soft mat. Encourages tummy time.',
    rating: 4.9, reviews: 82,
    stock: 14, sku: 'TOY-005',
    badge: 'Sale',
  },

  // ─── FEEDING ─────────────────────────────────────────────────
  {
    id: 16,
    name: 'Baby Food Maker',
    category: 'feeding',
    price: 4199,
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600',
    description: 'Steam and blend baby food in one compact appliance. BPA-free.',
    rating: 4.6, reviews: 54,
    stock: 20, sku: 'FED-003',
  },

  // ─── GEAR ────────────────────────────────────────────────────
  {
    id: 4,
    name: 'Baby Stroller - Deluxe',
    category: 'gear',
    price: 24999,
    originalPrice: 29999,
    image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600',
    description: 'Lightweight, foldable stroller with adjustable canopy and storage basket.',
    rating: 4.6, reviews: 78,
    stock: 12, sku: 'GER-001',
    badge: 'Sale',
  },
  {
    id: 8,
    name: 'Baby Monitor',
    category: 'gear',
    price: 9999,
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600',
    description: 'HD video baby monitor with night vision and two-way audio.',
    rating: 4.4, reviews: 63,
    stock: 15, sku: 'GER-002',
  },
  {
    id: 18,
    name: 'Baby Carrier Wrap',
    category: 'gear',
    price: 2999,
    image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600',
    description: 'Soft stretchy wrap carrier for newborns. Keeps baby close and hands free.',
    rating: 4.9, reviews: 210,
    stock: 30, sku: 'GER-003',
    badge: 'Best Seller',
  },

  (() => {
    const colors = ['Grey', 'Black'];
    const variants = buildVariants([], colors, {
      '_-Grey':  12,
      '_-Black': 10,
    });
    return {
      id: 19,
      name: 'Diaper Bag Backpack',
      category: 'gear',
      price: 3199,
      originalPrice: 3999,
      image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600',
      description: 'Stylish diaper bag with insulated pockets, changing pad, and stroller straps.',
      rating: 4.7, reviews: 96,
      sku: 'GER-004',
      colors, variants,
      stock: totalFrom(variants),
      badge: 'Sale',
    };
  })(),

  // ─── BATH ────────────────────────────────────────────────────
  {
    id: 21,
    name: 'Baby Bath Toys Set',
    category: 'bath',
    price: 999,
    image: 'https://images.unsplash.com/photo-1562040506-a9b32cb51b94?w=600',
    description: 'Fun floating bath toys. Mold-resistant and BPA-free. Set of 6.',
    rating: 4.6, reviews: 74,
    stock: 6, sku: 'BAT-003',
  },
];