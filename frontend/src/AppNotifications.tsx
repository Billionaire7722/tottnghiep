import { ConfirmDialog, type ConfirmDialogContent } from "./ConfirmDialog";

export type ConfirmationRequest = ConfirmDialogContent & {
  resolve: (confirmed: boolean) => void;
};

export type ConfirmationOptions = Partial<Pick<ConfirmDialogContent, "cancelLabel" | "tone">> &
  Omit<ConfirmDialogContent, "cancelLabel" | "tone">;

type AppNotificationsProps = {
  notice: string;
  confirmation: ConfirmationRequest | null;
  onCancelConfirmation: () => void;
  onConfirmConfirmation: () => void;
};

export function AppNotifications({
  notice,
  confirmation,
  onCancelConfirmation,
  onConfirmConfirmation
}: AppNotificationsProps) {
  return (
    <>
      {notice && (
        <div className="toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          cancelLabel={confirmation.cancelLabel}
          tone={confirmation.tone}
          onCancel={onCancelConfirmation}
          onConfirm={onConfirmConfirmation}
        />
      )}
    </>
  );
}
