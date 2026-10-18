import { SHOP_INFO } from '../data/shopInfo';

/* ═══════════════════════════════════════════════════════════
   JSON-LD BUILDERS
   ─────────────────────────────────────────────────────────
   These produce structured data Google can read.
   Used in SEO component's `jsonLd` prop.
   ═══════════════════════════════════════════════════════════ */

const SITE_URL = 'https://amirbabyshop.co.ke';

/* ─── Organization (sitewide — put on homepage) ─── */
export const buildOrganizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: SHOP_INFO.name,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  image: `${SITE_URL}/icon.png`,
  description:
    'Quality baby clothes, toys, and essentials curated with love.',
  telephone: SHOP_INFO.phone,
  email: SHOP_INFO.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: SHOP_INFO.address.street,
    addressLocality: SHOP_INFO.address.city,
    addressCountry: 'KE',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: SHOP_INFO.coordinates.lat,
    longitude: SHOP_INFO.coordinates.lng,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday'],
      opens: '10:00',
      closes: '16:00',
    },
  ],
});

/* ─── Product (put on product page) ─── */
export const buildProductSchema = (product) => {
  const inStock = (product.stock ?? 0) > 0;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: [product.image],
    sku: product.sku,
    category: product.category,
    brand: {
      '@type': 'Brand',
      name: SHOP_INFO.name,
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.id}`,
      priceCurrency: 'KES',
      price: product.price,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: SHOP_INFO.name,
      },
    },
  };

  // Add rating if we have review data
  if (product.rating && product.reviews > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviews,
    };
  }

  return schema;
};

/* ─── BreadcrumbList (put on product & category pages) ─── */
export const buildBreadcrumbSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: item.name,
    item: `${SITE_URL}${item.url}`,
  })),
});

/* ─── Website (put on homepage) ─── */
export const buildWebsiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SHOP_INFO.name,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
});