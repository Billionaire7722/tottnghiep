import { useEffect, useRef } from "react";
import { Icon } from "./Icons";

export type ConfirmDialogTone = "default" | "danger";

export type ConfirmDialogContent = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmDialogTone;
};

type ConfirmDialogProps = ConfirmDialogContent & {
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="confirm-dialog-backdrop" onMouseDown={onCancel}>
      <section
        className={tone === "danger" ? "confirm-dialog danger" : "confirm-dialog"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <span className="confirm-dialog-icon" aria-hidden="true">
            <Icon name={tone === "danger" ? "trash" : "shield"} />
          </span>
          <div>
            <h2 id="confirm-dialog-title">{title}</h2>
            <p id="confirm-dialog-message">{message}</p>
          </div>
          <button className="confirm-dialog-close" type="button" onClick={onCancel} aria-label="Đóng bảng xác nhận">
            <Icon name="x" />
          </button>
        </div>
        <div className="confirm-dialog-actions">
          <button ref={cancelButtonRef} className="secondary-button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={tone === "danger" ? "confirm-action-button danger" : "confirm-action-button"} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
