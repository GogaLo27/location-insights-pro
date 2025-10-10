export const DEMO_EMAIL = 'demolip29@gmail.com';

export const mockLocations = [
  {
    id: 'demo-location-1',
    name: 'Demo Restaurant Downtown',
    google_place_id: 'ChIJDemo1234567890',
    address: '123 Main St, San Francisco, CA 94102'
  },
  {
    id: 'demo-location-2',
    name: 'Demo Cafe Uptown',
    google_place_id: 'ChIJDemo0987654321',
    address: '456 Oak Ave, San Francisco, CA 94110'
  }
];

// Location-specific seed snippets used to synthesize larger sets of demo reviews
const restaurantSnippets = [
  { author: 'Sarah Johnson', text: 'Amazing food and excellent service! The pasta was perfectly cooked and the staff was very attentive. Will definitely come back again.', rating: 5, tags: ['food quality', 'service', 'pasta', 'staff'], sentiment: 'positive' },
  { author: 'Mike Chen', text: 'The food was okay but the wait time was really long. We waited almost 45 minutes for our order. The atmosphere is nice though.', rating: 3, tags: ['wait time', 'food quality', 'atmosphere'], sentiment: 'neutral' },
  { author: 'Emily Davis', text: 'Disappointing experience. The food was cold when it arrived and the server seemed uninterested. Expected much better based on the reviews.', rating: 2, tags: ['food temperature', 'service attitude', 'expectations'], sentiment: 'negative' },
  { author: 'James Park', text: 'The steak was cooked perfectly and the wine pairing was on point. Cozy vibe.', rating: 5, tags: ['steak', 'wine', 'ambiance'], sentiment: 'positive' },
  { author: 'Priya Patel', text: 'Loved the vegetarian options but the desserts were underwhelming.', rating: 4, tags: ['vegetarian', 'dessert'], sentiment: 'neutral' },
];

const cafeSnippets = [
  { author: 'David Wilson', text: 'Great coffee and cozy atmosphere! Perfect place to work on my laptop. The wifi is fast and the baristas are friendly.', rating: 5, tags: ['coffee quality', 'atmosphere', 'wifi', 'staff'], sentiment: 'positive' },
  { author: 'Lisa Martinez', text: 'The coffee is good but quite expensive for the portion size. Also, the place gets very crowded in the mornings.', rating: 3, tags: ['pricing', 'portion size', 'crowding'], sentiment: 'neutral' },
  { author: 'Hiro Tanaka', text: 'Flat white was perfect, but they ran out of almond croissants by noon.', rating: 4, tags: ['coffee', 'bakery'], sentiment: 'positive' },
  { author: 'Ava Thompson', text: 'Tables were sticky and there was a long line. Needs better rush-hour management.', rating: 2, tags: ['cleanliness', 'queue'], sentiment: 'negative' },
  { author: 'Omar Khaled', text: 'Love the outdoor seating and the matcha latte. Calm vibe in the afternoon.', rating: 5, tags: ['outdoor seating', 'matcha', 'vibe'], sentiment: 'positive' },
];

export const mockReviews = [
  {
    id: 'demo-review-1',
    user_id: 'demo-user-id',
    google_review_id: 'demo-google-1',
    location_id: 'demo-location-1',
    author_name: 'Sarah Johnson',
    text: 'Amazing food and excellent service! The pasta was perfectly cooked and the staff was very attentive. Will definitely come back again.',
    rating: 5,
    review_date: '2025-01-15T10:30:00Z',
    reply_text: 'Thank you so much for your wonderful review, Sarah! We\'re thrilled you enjoyed the pasta and our service.',
    reply_date: '2025-01-16T09:15:00Z',
    ai_sentiment: 'positive',
    ai_tags: ['food quality', 'service', 'pasta', 'staff'],
    ai_issues: [],
    ai_suggestions: ['Continue maintaining high food quality', 'Keep training staff for excellent service'],
    ai_analyzed_at: '2025-01-16T12:00:00Z',
    created_at: '2025-01-15T10:30:00Z',
    updated_at: '2025-01-16T12:00:00Z'
  },
  {
    id: 'demo-review-2',
    user_id: 'demo-user-id',
    google_review_id: 'demo-google-2',
    location_id: 'demo-location-1',
    author_name: 'Mike Chen',
    text: 'The food was okay but the wait time was really long. We waited almost 45 minutes for our order. The atmosphere is nice though.',
    rating: 3,
    review_date: '2025-01-14T19:45:00Z',
    reply_text: 'Hi Mike, thank you for your feedback. We apologize for the long wait time and are working on improving our kitchen efficiency.',
    reply_date: '2025-01-15T08:30:00Z',
    ai_sentiment: 'neutral',
    ai_tags: ['wait time', 'food quality', 'atmosphere'],
    ai_issues: ['Long wait times', 'Kitchen efficiency'],
    ai_suggestions: ['Improve kitchen workflow', 'Consider staff training for faster service', 'Implement order tracking system'],
    ai_analyzed_at: '2025-01-15T11:00:00Z',
    created_at: '2025-01-14T19:45:00Z',
    updated_at: '2025-01-15T11:00:00Z'
  },
  {
    id: 'demo-review-3',
    user_id: 'demo-user-id',
    google_review_id: 'demo-google-3',
    location_id: 'demo-location-1',
    author_name: 'Emily Davis',
    text: 'Disappointing experience. The food was cold when it arrived and the server seemed uninterested. Expected much better based on the reviews.',
    rating: 2,
    review_date: '2025-01-13T18:20:00Z',
    reply_text: 'Dear Emily, we sincerely apologize for your disappointing experience. We are addressing these issues immediately with our team.',
    reply_date: '2025-01-14T07:45:00Z',
    ai_sentiment: 'negative',
    ai_tags: ['food temperature', 'service attitude', 'expectations'],
    ai_issues: ['Cold food delivery', 'Poor server attitude', 'Service quality inconsistency'],
    ai_suggestions: ['Implement food temperature checks', 'Staff attitude training', 'Service quality monitoring'],
    ai_analyzed_at: '2025-01-14T10:30:00Z',
    created_at: '2025-01-13T18:20:00Z',
    updated_at: '2025-01-14T10:30:00Z'
  },
  {
    id: 'demo-review-4',
    user_id: 'demo-user-id',
    google_review_id: 'demo-google-4',
    location_id: 'demo-location-2',
    author_name: 'David Wilson',
    text: 'Great coffee and cozy atmosphere! Perfect place to work on my laptop. The wifi is fast and the baristas are friendly.',
    rating: 5,
    review_date: '2025-01-12T14:15:00Z',
    reply_text: 'Thank you David! We\'re so happy you enjoy our cafe as your workspace. See you again soon!',
    reply_date: '2025-01-13T09:00:00Z',
    ai_sentiment: 'positive',
    ai_tags: ['coffee quality', 'atmosphere', 'wifi', 'staff'],
    ai_issues: [],
    ai_suggestions: ['Maintain wifi quality', 'Continue providing comfortable workspace environment'],
    ai_analyzed_at: '2025-01-13T12:15:00Z',
    created_at: '2025-01-12T14:15:00Z',
    updated_at: '2025-01-13T12:15:00Z'
  },
  {
    id: 'demo-review-5',
    user_id: 'demo-user-id',
    google_review_id: 'demo-google-5',
    location_id: 'demo-location-2',
    author_name: 'Lisa Martinez',
    text: 'The coffee is good but quite expensive for the portion size. Also, the place gets very crowded in the mornings.',
    rating: 3,
    review_date: '2025-01-11T08:30:00Z',
    reply_text: 'Hi Lisa, thanks for your feedback about pricing and morning crowds. We\'re exploring options to better manage peak hours.',
    reply_date: '2025-01-12T07:20:00Z',
    ai_sentiment: 'neutral',
    ai_tags: ['pricing', 'portion size', 'crowding'],
    ai_issues: ['High prices relative to portions', 'Morning crowd management'],
    ai_suggestions: ['Review pricing strategy', 'Implement reservation system for peak hours', 'Consider larger portion options'],
    ai_analyzed_at: '2025-01-12T10:45:00Z',
    created_at: '2025-01-11T08:30:00Z',
    updated_at: '2025-01-12T10:45:00Z'
  }
];

export const mockUserPlan = {
  id: 'demo-plan-1',
  user_id: 'demo-user-id',
  plan_type: 'professional',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
};

export const mockSelectedLocation = {
  id: 'demo-location-selection-1',
  user_id: 'demo-user-id',
  google_place_id: 'ChIJDemo1234567890',
  location_name: 'Demo Restaurant Downtown',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
};

export const isDemoUser = (email: string | undefined) => {
  return email === DEMO_EMAIL;
};

// Generate 50 reviews per location deterministically for demo mode
export function getDemoReviewsForLocation(locationId: string): any[] {
  const reviews: any[] = [];
  const total = 50;
  const now = new Date();
  const snippets = locationId === 'demo-location-2' ? cafeSnippets : restaurantSnippets;
  for (let i = 0; i < total; i++) {
    const seed = snippets[i % snippets.length];
    const dayOffset = i;
    const d = new Date(now);
    d.setDate(now.getDate() - dayOffset);
    const id = `${locationId}-rev-${i + 1}`;
    const rating = seed.rating + ((i % 10 === 0) ? -1 : 0);
    const clippedRating = Math.max(1, Math.min(5, rating));
    const sentiment = clippedRating >= 4 ? 'positive' : clippedRating <= 2 ? 'negative' : 'neutral';
    reviews.push({
      id,
      user_id: 'demo-user-id',
      google_review_id: id,
      location_id: locationId,
      author_name: seed.author,
      text: seed.text,
      rating: clippedRating,
      review_date: d.toISOString(),
      reply_text: i % 4 === 0 ? 'Thanks for your feedback! We appreciate your support.' : null,
      reply_date: i % 4 === 0 ? new Date(d.getTime() + 24 * 3600 * 1000).toISOString() : null,
      ai_sentiment: sentiment,
      ai_tags: seed.tags,
      ai_issues: sentiment === 'negative' ? ['Service delays', 'Temperature control'] : [],
      ai_suggestions: sentiment !== 'negative' ? ['Maintain service levels'] : ['Improve speed of service'],
      ai_analyzed_at: new Date(d.getTime() + 2 * 3600 * 1000).toISOString(),
      created_at: d.toISOString(),
      updated_at: d.toISOString()
    });
  }
  // Sort newest first
  return reviews.sort((a, b) => +new Date(b.review_date) - +new Date(a.review_date));
}

export function getAllDemoReviews(): any[] {
  return [
    ...getDemoReviewsForLocation('demo-location-1'),
    ...getDemoReviewsForLocation('demo-location-2'),
  ];
}

