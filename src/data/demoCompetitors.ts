import type { Competitor } from '../types/misc'

/**
 * DEMO DATA. Fictional competitor profiles used to demonstrate the competitor
 * module layout. Names use the reserved ".example" domain so they can never be
 * mistaken for real businesses.
 */
export const DEMO_COMPETITOR_TEMPLATES: Omit<Competitor, 'id' | 'name' | 'website'>[] = [
  {
    digitalPresence: 'strong',
    socialPresence: 'moderate',
    oohActivity: 'unknown',
    notes: 'Illustrative profile: established site with frequent content updates and visible booking flow.',
    potentialGap: 'If the prospect’s own CTA is weak, this type of competitor may capture more ready-to-buy visitors.',
  },
  {
    digitalPresence: 'moderate',
    socialPresence: 'strong',
    oohActivity: 'observed',
    notes: 'Illustrative profile: social-led brand with local OOH presence near their location.',
    potentialGap: 'Social content cadence and local awareness could be compared once real data is connected.',
  },
  {
    digitalPresence: 'limited',
    socialPresence: 'limited',
    oohActivity: 'not-observed',
    notes: 'Illustrative profile: smaller operator relying on referrals and directory listings.',
    potentialGap: 'Search visibility for core services may be contestable in this kind of market.',
  },
]
