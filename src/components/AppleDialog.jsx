import { useCallback, useState } from 'react';

export const useAppleDialog = () => {
  const [dialog, setDialog] = useState(null);

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const showAlert = useCallback(({ title, message, actionText = '好', onAction }) => {
    setDialog({
      title,
      message,
      actions: [{
        label: actionText,
        variant: 'primary',
        onClick: () => {
          closeDialog();
          onAction?.();
        },
      }],
    });
  }, [closeDialog]);

  const showConfirm = useCallback(({ title, message, confirmText = '确认', cancelText = '取消', destructive = false, onConfirm }) => {
    setDialog({
      title,
      message,
      actions: [
        { label: cancelText, variant: 'secondary', onClick: closeDialog },
        {
          label: confirmText,
          variant: destructive ? 'danger' : 'primary',
          onClick: () => {
            closeDialog();
            onConfirm?.();
          },
        },
      ],
    });
  }, [closeDialog]);

  return { dialog, showAlert, showConfirm, closeDialog };
};

export const AppleDialog = ({ dialog, onClose }) => {
  if (!dialog) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
      }}
    >
      <div
        className="glass-panel"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(320px, 100%)',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 18px 48px rgba(0, 0, 0, 0.45)',
          border: '1px solid var(--divider)',
        }}
      >
        <div style={{ padding: '22px 22px 18px', textAlign: 'center' }}>
          {dialog.title && (
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: dialog.message ? '8px' : 0 }}>
              {dialog.title}
            </div>
          )}
          {dialog.message && (
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {dialog.message}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', borderTop: '1px solid var(--divider)' }}>
          {dialog.actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              onClick={action.onClick}
              style={{
                flex: 1,
                minHeight: '48px',
                color: action.variant === 'danger' ? 'var(--danger)' : 'var(--accent)',
                fontWeight: action.variant === 'primary' ? 700 : 500,
                borderLeft: index > 0 ? '1px solid var(--divider)' : 'none',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
