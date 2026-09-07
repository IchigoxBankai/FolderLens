import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkText/40 backdrop-blur-md animate-fade-in text-left">
      <div className="bg-panelBg rounded-2xl shadow-2xl w-full max-w-md border border-panelBorder overflow-hidden p-6 space-y-4">
        <div className="flex items-center space-x-3 text-accentDanger">
          <div className="w-10 h-10 rounded-full bg-accentDanger/15 text-accentDanger flex items-center justify-center flex-shrink-0 border border-accentDanger/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-darkText">{title}</h3>
        </div>

        <p className="text-xs text-mutedText leading-relaxed">{message}</p>

        <div className="flex justify-end space-x-3 pt-4 border-t border-panelBorder">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-panelBorder text-mutedText hover:text-darkText font-medium text-xs hover:bg-spaceBg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-accentDanger hover:bg-accentDanger/90 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
