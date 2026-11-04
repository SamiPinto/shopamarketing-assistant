import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose(): void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/** Native <dialog> modal: focus trapping, Esc handling and inert background for free. */
export function Modal({ open, title, description, onClose, children, footer, wide }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' modal--wide' : ''}`}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(event) => {
        // Close only for genuine backdrop clicks: pointer outside the dialog box.
        // (Keyboard-activated clicks report 0,0 coordinates and are ignored.)
        const dialog = ref.current
        if (!dialog || event.target !== dialog || (event.clientX === 0 && event.clientY === 0)) return
        const r = dialog.getBoundingClientRect()
        const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom
        if (!inside) onClose()
      }}
    >
      <div className="modal__inner">
        <header className="modal__header">
          <div>
            <h2 id="modal-title" className="modal__title">
              {title}
            </h2>
            {description && <p className="modal__description">{description}</p>}
          </div>
          <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </dialog>
  )
}
