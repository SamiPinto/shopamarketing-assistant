export type OOHEnvironmentId =
  | 'digital-billboards'
  | 'roadside'
  | 'transit'
  | 'shopping-centres'
  | 'retail'
  | 'airport'
  | 'street-furniture'
  | 'office'

export interface OOHEnvironment {
  id: OOHEnvironmentId
  label: string
  description: string
  /** Planning considerations — never inventory, pricing or audience figures. */
  considerations: string[]
  oftenSuits: string
}

export interface OOHBriefInput {
  clientName: string
  objective: string
  location: string
  audience: string
  budget: string
  duration: string
  environments: OOHEnvironmentId[]
  message: string
  cta: string
}

export interface OOHBriefSection {
  heading: string
  lines: string[]
}

export interface OOHBrief {
  createdAt: string
  input: OOHBriefInput
  sections: OOHBriefSection[]
  outstanding: string[]
}
