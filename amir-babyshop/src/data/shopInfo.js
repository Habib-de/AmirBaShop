export const SHOP_INFO = {
  name: 'AMIR BabyShop',

  // 📍 Physical shop location
  address: {
    street: 'Markiti',
    area: 'Markiti',
    city: 'Mombasa',
    zip: '',
    country: 'Kenya',
    full: 'Markiti, Mombasa, Kenya',
  },

  phone: '+254 700 123 456',
  whatsapp: '+254700123456',
  email: 'hello@amirbabyshop.com',

  /* 🗺️ Coordinates for Markiti, Mombasa
     If you want exact coordinates of your shop,
     open Google Maps → right-click the exact spot →
     click the coordinates at the top → copy them.
     For now, this points to Markiti market area in Mombasa. */
  coordinates: {
    lat: -4.0547,
    lng: 39.6636,
  },

  hours: {
    monday:    ['09:00', '18:00'],
    tuesday:   ['09:00', '18:00'],
    wednesday: ['09:00', '18:00'],
    thursday:  ['09:00', '18:00'],
    friday:    ['09:00', '18:00'],
    saturday:  ['10:00', '16:00'],
    sunday:    null,
  },

  features: [
    { icon: '🅿️', label: 'Free parking' },
    { icon: '♿', label: 'Wheelchair access' },
    { icon: '💳', label: 'Card & M-Pesa' },
    { icon: '👶', label: 'Baby changing room' },
  ],

  photo: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200',
};