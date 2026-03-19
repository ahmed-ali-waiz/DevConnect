import Modal from './Modal';
import Button from './Button';

const variants = {
  danger: {
    titleClass: 'text-red-500',
    primaryClass: 'btn-primary bg-red-500/90 hover:bg-red-500 text-white',
  },
  warning: {
    titleClass: 'text-orange-400',
    primaryClass: 'btn-primary bg-orange-400/90 hover:bg-orange-400 text-black',
  },
  info: {
    titleClass: 'text-(--accent-primary)',
    primaryClass: 'btn-primary',
  },
};

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const v = variants[variant] || variants.danger;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-(--text-muted)">{description}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button className={v.primaryClass} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;