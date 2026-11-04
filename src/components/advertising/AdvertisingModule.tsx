import { ShieldAlert } from 'lucide-react'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { CategoryDetail } from '../overview/CategoryDetail'
import { Notice } from '../ui/Primitives'

export default function AdvertisingModule({ analysis }: ModuleProps) {
  return (
    <CategoryDetail
      analysis={analysis}
      id="advertising"
      checksTitle="Advertising & measurement tags"
      description="Advertising and analytics tags visible in the page’s scripts. Tags show tracking is configured — not that campaigns are running."
    >
      <Notice tone="attention" icon={ShieldAlert} title="What this module cannot tell you">
        Ad spend, active campaigns, keywords and creative are not visible from a website. No figures are estimated.
        Tags loaded later through Google Tag Manager or after cookie consent may also not appear. Future integrations
        (Google Ads Transparency Centre, Meta Ad Library, client account access) can fill this gap.
      </Notice>
    </CategoryDetail>
  )
}
