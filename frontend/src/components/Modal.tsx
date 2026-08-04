import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  titleId: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, titleId, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Close modal" onClick={onClose}>
          x
        </button>
        {children}
      </section>
    </div>
  )
}

