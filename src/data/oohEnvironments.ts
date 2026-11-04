import type { OOHEnvironment } from '../types/ooh'

/**
 * Planning reference only. Deliberately contains no inventory, pricing,
 * availability or audience figures — those must come from media owners or a
 * future OOH data provider.
 */
export const OOH_ENVIRONMENTS: OOHEnvironment[] = [
  {
    id: 'digital-billboards',
    label: 'Digital Billboards',
    description: 'Large-format digital screens, typically on major arterials and in urban centres.',
    considerations: ['Day-parting and creative rotation', 'Share-of-loop and dwell time', 'Proximity to the business or launch area'],
    oftenSuits: 'Awareness and launches needing timely or flexible creative',
  },
  {
    id: 'roadside',
    label: 'Roadside',
    description: 'Static and digital roadside formats targeting commuters and local traffic.',
    considerations: ['Commuter routes near the location', 'Readability at speed — short messages', 'Duration needed to build frequency'],
    oftenSuits: 'Local awareness for destination businesses',
  },
  {
    id: 'transit',
    label: 'Transit',
    description: 'Bus, tram, train and station formats reaching people on the move.',
    considerations: ['Route and line alignment with the catchment', 'Station versus vehicle formats', 'Longer dwell allows more detail'],
    oftenSuits: 'Urban audiences and frequency-led campaigns',
  },
  {
    id: 'shopping-centres',
    label: 'Shopping Centres',
    description: 'Digital and static panels inside retail centres, close to point of purchase.',
    considerations: ['Centre catchment and tenant mix', 'Proximity to the client’s own store', 'Promotional, offer-led messaging'],
    oftenSuits: 'Retail, services located in or near centres, promotions',
  },
  {
    id: 'retail',
    label: 'Retail',
    description: 'In-store and near-store screens in supermarkets, pharmacies and retail strips.',
    considerations: ['Category adjacency', 'Path-to-purchase timing', 'Retailer media rules and approvals'],
    oftenSuits: 'FMCG, health, and products sold through retail partners',
  },
  {
    id: 'airport',
    label: 'Airport',
    description: 'Terminal and landside formats reaching business and leisure travellers.',
    considerations: ['Domestic versus international terminals', 'Business-traveller relevance', 'Premium brand environment'],
    oftenSuits: 'Premium, B2B, tourism and national brands',
  },
  {
    id: 'street-furniture',
    label: 'Street Furniture',
    description: 'Bus shelters, kiosks and street-level panels at pedestrian eye level.',
    considerations: ['Suburb-level geographic targeting', 'Pedestrian versus vehicle exposure', 'Panel clustering around the location'],
    oftenSuits: 'Hyper-local targeting around a store or clinic',
  },
  {
    id: 'office',
    label: 'Office / Business District',
    description: 'Lift, foyer and CBD screens reaching office workers.',
    considerations: ['Weekday business-hour exposure', 'B2B and professional audiences', 'Lunchtime and commute behaviour'],
    oftenSuits: 'B2B, professional services, lunchtime offers',
  },
]

export const OOH_REQUIRED_INFORMATION = [
  'Campaign location',
  'Target audience',
  'Campaign duration',
  'Budget',
  'Media environment',
  'Available inventory',
  'Audience data',
]
