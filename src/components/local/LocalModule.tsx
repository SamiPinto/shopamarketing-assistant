import type { ModuleProps } from '../../pages/dashboardRoutes'
import { CategoryDetail } from '../overview/CategoryDetail'
import { lowerFirst } from '../../utils/format'
import { KeyValue } from '../ui/Primitives'

export default function LocalModule({ analysis }: ModuleProps) {
  const { business, page } = analysis
  const notDetected = <span className="muted-text">Not detected on this page</span>
  return (
    <CategoryDetail
      analysis={analysis}
      id="local"
      description="Signals that support local search and location-based marketing: address, phone, local schema and regional relevance."
    >
      <section className="panel" aria-labelledby="nap">
        <h2 id="nap" className="panel__title">
          Name, address & phone
        </h2>
        <dl className="kv-grid">
          <KeyValue label="Business name">
            {business.name} <span className="muted-text">(from {business.nameSource.replace('-', ' ')})</span>
          </KeyValue>
          <KeyValue label="Location">
            {business.location ? (
              <>
                {business.location.label} <span className="muted-text">({lowerFirst(business.location.basis)})</span>
              </>
            ) : (
              notDetected
            )}
          </KeyValue>
          <KeyValue label="Address text">{page.addressCandidates[0] ?? notDetected}</KeyValue>
          <KeyValue label="Phone">{page.phones[0] ?? page.schema.telephone ?? notDetected}</KeyValue>
        </dl>
      </section>
    </CategoryDetail>
  )
}
