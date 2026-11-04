import type { IndustryId } from '../types/analysis'

export interface IndustryDefinition {
  id: IndustryId
  label: string
  /** Lower-case keywords matched against title, description and headings. */
  keywords: string[]
  /** schema.org @type values that confirm the industry. */
  schemaTypes: string[]
  /** Businesses that usually serve customers at a physical location. */
  physicalFootprint: boolean
}

export const INDUSTRIES: IndustryDefinition[] = [
  {
    id: 'dental',
    label: 'Dental',
    keywords: ['dental', 'dentist', 'orthodont', 'teeth', 'invisalign', 'implants'],
    schemaTypes: ['Dentist'],
    physicalFootprint: true,
  },
  {
    id: 'medical',
    label: 'Health & medical',
    keywords: ['clinic', 'medical', 'physio', 'chiro', 'gp ', 'doctor', 'health centre', 'pharmacy'],
    schemaTypes: ['MedicalClinic', 'Physician', 'MedicalBusiness', 'Pharmacy'],
    physicalFootprint: true,
  },
  {
    id: 'fitness',
    label: 'Fitness',
    keywords: ['gym', 'fitness', 'pilates', 'yoga', 'personal train', 'crossfit', 'studio classes'],
    schemaTypes: ['ExerciseGym', 'SportsActivityLocation', 'HealthClub'],
    physicalFootprint: true,
  },
  {
    id: 'retail',
    label: 'Retail',
    keywords: ['shop', 'store', 'collection', 'free shipping', 'add to cart', 'new arrivals', 'boutique'],
    schemaTypes: ['Store', 'ClothingStore', 'OnlineStore', 'Product', 'Offer'],
    physicalFootprint: true,
  },
  {
    id: 'hospitality',
    label: 'Hospitality',
    keywords: ['restaurant', 'cafe', 'menu', 'wine bar', 'dining', 'hotel', 'accommodation', 'bistro'],
    schemaTypes: ['Restaurant', 'CafeOrCoffeeShop', 'Hotel', 'FoodEstablishment', 'BarOrPub'],
    physicalFootprint: true,
  },
  {
    id: 'legal',
    label: 'Legal',
    keywords: ['lawyer', 'solicitor', 'legal', 'law firm', 'barrister', 'conveyancing'],
    schemaTypes: ['LegalService', 'Attorney'],
    physicalFootprint: false,
  },
  {
    id: 'real-estate',
    label: 'Real estate',
    keywords: ['real estate', 'property', 'for sale', 'for lease', 'realestate', 'agents', 'auction'],
    schemaTypes: ['RealEstateAgent'],
    physicalFootprint: true,
  },
  {
    id: 'trades',
    label: 'Trades & home services',
    keywords: ['plumb', 'electrician', 'electrical', 'roofing', 'landscap', 'hvac', 'air conditioning', 'builder'],
    schemaTypes: ['Plumber', 'Electrician', 'HomeAndConstructionBusiness', 'RoofingContractor', 'HVACBusiness'],
    physicalFootprint: false,
  },
  {
    id: 'automotive',
    label: 'Automotive',
    keywords: ['car dealer', 'car service', 'automotive', 'mechanic', 'dealership', 'vehicle', 'tyres', 'logbook service'],
    schemaTypes: ['AutoDealer', 'AutoRepair', 'AutomotiveBusiness'],
    physicalFootprint: true,
  },
  {
    id: 'beauty',
    label: 'Beauty & wellness',
    keywords: ['salon', 'beauty', 'hair', 'spa', 'skin', 'cosmetic', 'nails', 'barber'],
    schemaTypes: ['BeautySalon', 'HairSalon', 'DaySpa', 'NailSalon'],
    physicalFootprint: true,
  },
  {
    id: 'education',
    label: 'Education',
    keywords: ['school', 'college', 'courses', 'tutoring', 'university', 'academy', 'enrol'],
    schemaTypes: ['EducationalOrganization', 'School', 'CollegeOrUniversity'],
    physicalFootprint: true,
  },
  {
    id: 'finance',
    label: 'Finance',
    keywords: ['accountant', 'accounting', 'mortgage', 'finance', 'financial planner', 'tax return', 'broker'],
    schemaTypes: ['AccountingService', 'FinancialService', 'InsuranceAgency'],
    physicalFootprint: false,
  },
  {
    id: 'construction',
    label: 'Construction',
    keywords: ['construction', 'home builder', 'renovation', 'custom homes', 'commercial build'],
    schemaTypes: ['GeneralContractor'],
    physicalFootprint: false,
  },
]

export const AU_CITIES = [
  'Melbourne',
  'Sydney',
  'Brisbane',
  'Perth',
  'Adelaide',
  'Hobart',
  'Canberra',
  'Darwin',
  'Gold Coast',
  'Sunshine Coast',
  'Newcastle',
  'Geelong',
  'Wollongong',
  'Cairns',
  'Townsville',
  'Ballarat',
  'Bendigo',
  'Toowoomba',
  'Launceston',
]
