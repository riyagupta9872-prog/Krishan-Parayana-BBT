import Modal from './Modal'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={danger ? 'btn-danger' : 'btn-primary'}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="font-body text-ink-2 text-sm leading-relaxed">{message}</p>
    </Modal>
  )
}
