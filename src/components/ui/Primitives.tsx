import type { ReactNode } from 'react'
import { Info, type LucideIcon } from 'lucide-react'

export function DemoBadge({ label = 'Demo data' }: { label?: string }) {
  return (
    <span className="demo-badge" title="Fictional data for demonstration only">
      {label}
    </span>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>
}

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  as?: 'h1' | 'h2' | 'h3'
}

export function SectionHeader({ eyebrow, title, description, actions, as: Heading = 'h2' }: SectionHeaderProps) {
  return (
    <header className="section-header">
      <div className="section-header__text">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Heading className="section-header__title">{title}</Heading>
        {description && <p className="section-header__description">{description}</p>}
      </div>
      {actions && <div className="section-header__actions">{actions}</div>}
    </header>
  )
}

interface NoticeProps {
  tone?: 'info' | 'attention' | 'accent' | 'neutral'
  icon?: LucideIcon
  title?: string
  children: ReactNode
}

export function Notice({ tone = 'neutral', icon: Icon = Info, title, children }: NoticeProps) {
  return (
    <div className={`notice notice--${tone}`} role="note">
      <Icon size={16} aria-hidden="true" className="notice__icon" />
      <div>
        {title && <p className="notice__title">{title}</p>}
        <div className="notice__body">{children}</div>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <h3 className="empty-state__title">{title}</h3>
      {children && <div className="empty-state__body">{children}</div>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}

/** Official Shopa Marketing wordmark (public/images/logo-main.webp). */
export function BrandLogo({ width = 112, className = '' }: { width?: number; className?: string }) {
  return (
    <img
      src="/images/logo-main.webp"
      alt="Shopa Marketing"
      width={width}
      height={Math.round(width * (791 / 1920))}
      className={`brand-logo ${className}`.trim()}
      draggable={false}
    />
  )
}

/** Rule-based signal strength, always shown with what it is made of. */
export function SignalMeter({ score, good, total }: { score: number; good: number; total: number }) {
  return (
    <div className="meter">
      <div
        className="meter__track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label="Rule-based signal strength"
      >
        <span className="meter__fill" style={{ width: `${score}%` }} />
      </div>
      <p className="meter__caption">
        <strong>{good}</strong> of {total} weighted checks good · rule-based {score}/100
      </p>
    </div>
  )
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kv">
      <dt className="kv__label">{label}</dt>
      <dd className="kv__value">{children}</dd>
    </div>
  )
}
