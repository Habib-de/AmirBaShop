import { Helmet } from 'react-helmet-async';
import { SHOP_INFO } from '../data/shopInfo';

/* ═══════════════════════════════════════════════════════════
   SEO COMPONENT
   ─────────────────────────────────────────────────────────
   Drop into any page to set:
     - <title>
     - meta description
     - Open Graph (WhatsApp / Facebook / LinkedIn)
     - Twitter cards
     - canonical URL
     - Optional JSON-LD structured data
   ═══════════════════════════════════════════════════════════ */

const SITE_URL = 'https://amirbabyshop.co.ke'; // 👈 change when you have a real domain
const SITE_NAME = SHOP_INFO.name;
const DEFAULT_IMAGE = `${SITE_URL}/icon.png`;
const DEFAULT_DESCRIPTION =
  'Quality baby clothes, toys, and essentials curated with love. Shop online or visit us in Mombasa.';

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,                    // e.g. '/shop' — becomes SITE_URL + url
  type = 'website',       // 'website' | 'article' | 'product'
  jsonLd,                 // optional object (or array) for structured data
  noIndex = false,        // set true to add <meta name="robots" content="noindex">
  children,               // optional extra <meta> tags
}) {
  const fullTitle = title
    ? `${title} · ${SITE_NAME}`
    : `${SITE_NAME} — Everything your little one needs`;

  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const fullImage = image?.startsWith('http') ? image : `${SITE_URL}${image}`;

  return (
    <Helmet>
      {/* ─── Primary ─── */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* ─── Open Graph ─── */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:locale" content="en_KE" />

      {/* ─── Twitter Card ─── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* ─── JSON-LD structured data ─── */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}

      {children}
    </Helmet>
  );
}

/* ─── Export site constants for use elsewhere ─── */
export { SITE_URL, SITE_NAME, DEFAULT_IMAGE, DEFAULT_DESCRIPTION };