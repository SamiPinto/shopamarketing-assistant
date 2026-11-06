import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  FileText,
  Presentation,
  LayoutGrid,
  Megaphone,
  MapPin,
  Monitor,
  MousePointerClick,
  Search,
  Share2,
  Signpost,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { FEATURES, HIDDEN_SCREENS } from '../config/features'
import type { CategoryId, MarketingAnalysis } from '../types/analysis'

export const ROUTES = [
  'overview',
  'website',
  'seo',
  'conversion',
  'social',
  'advertising',
  'local',
  'ooh',
  'competitors',
  'client',
  'strategy',
  'report',
] as const

export type RouteId = (typeof ROUTES)[number]

export interface ModuleProps {
  analysis: MarketingAnalysis
  navigate(route: RouteId): void
}

interface RouteDefinition {
  id: RouteId
  label: string
  icon: LucideIcon
  group: 'Analysis' | 'Research' | 'Deliverables'
  /** Category whose status is shown in the sidebar, if any. */
  category?: CategoryId
  component: LazyExoticComponent<ComponentType<ModuleProps>>
}

// Modules are lazy-loaded so the dashboard shell paints immediately.
const ALL_ROUTES: RouteDefinition[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid, group: 'Analysis', component: lazy(() => import('../components/overview/OverviewModule')) },
  { id: 'website', label: 'Website', icon: Monitor, group: 'Analysis', category: 'website', component: lazy(() => import('../components/website/WebsiteModule')) },
  { id: 'seo', label: 'SEO', icon: Search, group: 'Analysis', category: 'seo', component: lazy(() => import('../components/seo/SeoModule')) },
  { id: 'conversion', label: 'Conversion', icon: MousePointerClick, group: 'Analysis', category: 'conversion', component: lazy(() => import('../components/conversion/ConversionModule')) },
  { id: 'social', label: 'Social', icon: Share2, group: 'Analysis', category: 'social', component: lazy(() => import('../components/social/SocialModule')) },
  { id: 'advertising', label: 'Advertising', icon: Megaphone, group: 'Analysis', category: 'advertising', component: lazy(() => import('../components/advertising/AdvertisingModule')) },
  { id: 'local', label: 'Local', icon: MapPin, group: 'Analysis', category: 'local', component: lazy(() => import('../components/local/LocalModule')) },
  { id: 'ooh', label: 'OOH', icon: Signpost, group: 'Analysis', category: 'ooh', component: lazy(() => import('../components/ooh/OOHModule')) },
  { id: 'competitors', label: 'Competitors', icon: Users, group: 'Research', component: lazy(() => import('../components/competitors/CompetitorsModule')) },
  { id: 'client', label: 'Sales Talking Points', icon: Presentation, group: 'Deliverables', component: lazy(() => import('../components/reports/ClientReportModule')) },
  { id: 'strategy', label: 'Strategy', icon: Target, group: 'Deliverables', component: lazy(() => import('../components/strategy/StrategyModule')) },
  { id: 'report', label: 'Full Report', icon: FileText, group: 'Deliverables', component: lazy(() => import('../components/reports/ReportModule')) },
]

const HIDDEN: RouteId[] = [...(FEATURES.ooh ? [] : (['ooh'] as const)), ...(FEATURES.competitors ? [] : (['competitors'] as const)), ...HIDDEN_SCREENS]

export const ROUTE_DEFINITIONS: RouteDefinition[] = ALL_ROUTES.filter((r) => !HIDDEN.includes(r.id))

/** Routes reachable by URL hash (hidden ones fall back to Overview). */
export const ACTIVE_ROUTES: RouteId[] = ROUTE_DEFINITIONS.map((r) => r.id)
