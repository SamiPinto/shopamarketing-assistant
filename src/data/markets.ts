/**
 * Countries the assistant can recognise from a website, with the Google
 * search settings used for keyword ranking checks in that country.
 * Patterns are matched against address blocks, footer text and schema.
 */

export type MarketCode = 'AU' | 'NZ' | 'GB' | 'IE' | 'US' | 'CA' | 'IN' | 'SG' | 'ZA' | 'AE'

export interface Market {
  code: MarketCode
  name: string
  /** Host used for searches, e.g. "www.google.co.uk". */
  googleHost: string
  /** Google's country parameter (gl). */
  gl: string
  /** Domain endings that point to this country. */
  tlds: RegExp
  /** International dialling prefix, without "+". */
  dialCode: string
  /** Address fragment typical for the country (region + postcode). */
  address: RegExp
  /** The postcode / PIN / ZIP inside an address match; null where the country has none. */
  postcode: RegExp | null
  /** Names people use for the country in addresses and schema. */
  names: string[]
  /** Major cities, checked in addresses, footer, title and H1. */
  cities: string[]
}

const US_STATES =
  'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC'

export const MARKETS: Market[] = [
  {
    code: 'AU',
    name: 'Australia',
    googleHost: 'www.google.com.au',
    gl: 'au',
    tlds: /\.au$/,
    dialCode: '61',
    address:
      /\b(VIC|NSW|QLD|WA|SA|TAS|ACT|NT|Victoria|New South Wales|Queensland|Tasmania|Western Australia|South Australia)\b,?\s+\d{4}\b/i,
    postcode: /\b\d{4}\b/,
    names: ['australia'],
    cities: [
      'Melbourne', 'Sydney', 'Brisbane', 'Perth', 'Adelaide', 'Hobart', 'Canberra', 'Darwin', 'Gold Coast',
      'Sunshine Coast', 'Newcastle', 'Geelong', 'Wollongong', 'Cairns', 'Townsville', 'Ballarat', 'Bendigo',
      'Toowoomba', 'Launceston', 'Parramatta',
    ],
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    googleHost: 'www.google.co.nz',
    gl: 'nz',
    tlds: /\.nz$/,
    dialCode: '64',
    address: /\b(Auckland|Wellington|Christchurch|Hamilton|Tauranga|Dunedin)\s+\d{4}\b/i,
    postcode: /\b\d{4}\b/,
    names: ['new zealand', 'aotearoa'],
    cities: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Dunedin', 'Napier', 'Nelson', 'Queenstown'],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    googleHost: 'www.google.co.uk',
    gl: 'uk',
    tlds: /\.uk$/,
    dialCode: '44',
    // UK postcode, e.g. "SW1A 1AA", "M1 1AE", "EH8 9YL".
    address: /\b[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}\b/,
    postcode: /\b[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}\b/,
    names: ['united kingdom', 'uk', 'england', 'scotland', 'wales', 'northern ireland', 'great britain'],
    cities: [
      'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Edinburgh', 'Bristol', 'Sheffield',
      'Cardiff', 'Belfast', 'Nottingham', 'Leicester', 'Newcastle upon Tyne', 'Brighton', 'Southampton', 'Oxford', 'Cambridge',
    ],
  },
  {
    code: 'IE',
    name: 'Ireland',
    googleHost: 'www.google.ie',
    gl: 'ie',
    tlds: /\.ie$/,
    dialCode: '353',
    // Eircode, e.g. "D02 X285", or "Co. Cork".
    address: /\b([AC-FHKNPRTV-Y]\d{2}|D6W)\s?[0-9AC-FHKNPRTV-Y]{4}\b|\bCo\.?\s+(Dublin|Cork|Galway|Kerry|Limerick|Wicklow|Kildare|Meath)\b/,
    postcode: /\b([AC-FHKNPRTV-Y]\d{2}|D6W)\s?[0-9AC-FHKNPRTV-Y]{4}\b/,
    names: ['ireland', 'éire'],
    cities: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Kilkenny'],
  },
  {
    code: 'US',
    name: 'United States',
    googleHost: 'www.google.com',
    gl: 'us',
    tlds: /\.us$/,
    dialCode: '1',
    address: new RegExp(`,\\s*(${US_STATES})\\s+\\d{5}(-\\d{4})?\\b`),
    postcode: /\b\d{5}(-\d{4})?\b/,
    names: ['united states', 'usa', 'u.s.a.', 'united states of america'],
    cities: [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas',
      'Austin', 'San Francisco', 'Seattle', 'Denver', 'Boston', 'Miami', 'Atlanta', 'Las Vegas', 'Orlando', 'Nashville', 'Portland',
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    googleHost: 'www.google.ca',
    gl: 'ca',
    tlds: /\.ca$/,
    dialCode: '1',
    // Province + postal code, e.g. "ON M5V 2T6".
    address: /\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|Ontario|Quebec|British Columbia|Alberta)\b,?\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/,
    postcode: /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/,
    names: ['canada'],
    cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Mississauga', 'Halifax', 'Victoria'],
  },
  {
    code: 'IN',
    name: 'India',
    googleHost: 'www.google.co.in',
    gl: 'in',
    tlds: /\.in$/,
    dialCode: '91',
    address:
      /\b(Maharashtra|Karnataka|Tamil Nadu|Delhi|Telangana|Kerala|Gujarat|West Bengal|Uttar Pradesh|Rajasthan|Haryana|Punjab|Andhra Pradesh)\b[\s,-]+\d{3}\s?\d{3}\b/i,
    postcode: /\b\d{3}\s?\d{3}\b/,
    names: ['india', 'bharat'],
    cities: [
      'Mumbai', 'Delhi', 'New Delhi', 'Bengaluru', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
      'Jaipur', 'Kochi', 'Coimbatore', 'Noida', 'Gurugram', 'Gurgaon', 'Chandigarh', 'Lucknow', 'Madurai',
    ],
  },
  {
    code: 'SG',
    name: 'Singapore',
    googleHost: 'www.google.com.sg',
    gl: 'sg',
    tlds: /\.sg$/,
    dialCode: '65',
    address: /\bSingapore\s+\d{6}\b/i,
    postcode: /\b\d{6}\b/,
    names: ['singapore'],
    cities: ['Singapore'],
  },
  {
    code: 'ZA',
    name: 'South Africa',
    googleHost: 'www.google.co.za',
    gl: 'za',
    tlds: /\.za$/,
    dialCode: '27',
    address: /\b(Gauteng|Western Cape|KwaZulu-Natal|Eastern Cape|Johannesburg|Cape Town|Durban|Pretoria),?\s+\d{4}\b/i,
    postcode: /\b\d{4}\b/,
    names: ['south africa'],
    cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Gqeberha', 'Bloemfontein'],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    googleHost: 'www.google.ae',
    gl: 'ae',
    tlds: /\.ae$/,
    dialCode: '971',
    address: /\b(Dubai|Abu Dhabi|Sharjah|Ajman)\b.{0,40}\b(UAE|United Arab Emirates)\b/i,
    postcode: null,
    names: ['united arab emirates', 'uae'],
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Al Ain'],
  },
]

export function marketByCode(code: string | null | undefined): Market | null {
  return MARKETS.find((m) => m.code === code) ?? null
}

/** Fallback for sites whose country can't be told: Google without a country bias. */
export const WORLDWIDE = { googleHost: 'www.google.com', gl: '', name: 'Worldwide' }

