import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  iconRight?: LucideIcon
  block?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  block,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', !children && 'btn--icon', className]
    .filter(Boolean)
    .join(' ')
  const iconSize = size === 'sm' ? 14 : 16
  return (
    <button type={type} className={classes} {...rest}>
      {Icon && <Icon size={iconSize} aria-hidden="true" />}
      {children && <span>{children}</span>}
      {IconRight && <IconRight size={iconSize} aria-hidden="true" />}
    </button>
  )
}
