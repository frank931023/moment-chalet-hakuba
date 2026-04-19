// Utility for page meta information (title + description) per route

const metaMap: Record<string, { title: string; description: string }> = {
  home: {
    title: 'Moment Chalet Hakuba — Boutique Chalets in Hakuba, Japan',
    description:
      'Book your stay at Moment Chalet Hakuba — nine thoughtfully designed boutique chalets in Hakuba Village, Japan. Experience the best of the Japanese Alps.',
  },
  properties: {
    title: 'Properties — Moment Chalet Hakuba',
    description:
      'Browse all available boutique chalets at Moment Chalet Hakuba in Hakuba Village, Japan.',
  },
  'property-detail': {
    title: 'Property Detail — Moment Chalet Hakuba',
    description:
      'View details, room types, amenities and availability for this chalet at Moment Chalet Hakuba.',
  },
  booking: {
    title: 'Book Your Stay — Moment Chalet Hakuba',
    description:
      'Complete your booking at Moment Chalet Hakuba. Select dates, room type and guest details.',
  },
  'booking-confirmation': {
    title: 'Booking Confirmed — Moment Chalet Hakuba',
    description:
      'Your booking at Moment Chalet Hakuba is confirmed. Check your email for details.',
  },
  'my-booking': {
    title: 'My Booking — Moment Chalet Hakuba',
    description:
      'Look up your booking status at Moment Chalet Hakuba using your email and booking ID.',
  },
}

const fallback: { title: string; description: string } = {
  title: 'Moment Chalet Hakuba',
  description: 'Boutique chalets in Hakuba Village, Japan.',
}

export function getPageMeta(routeName: string): { title: string; description: string } {
  return Object.hasOwn(metaMap, routeName) ? metaMap[routeName] : fallback
}
