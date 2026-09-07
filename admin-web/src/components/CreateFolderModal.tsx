import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Loader2 } from 'lucide-react';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  initialName?: string;
  isEdit?: boolean;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialName = '',
  isEdit = false,
}) => {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFolderName(initialName);
    setError('');
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Please enter a folder name.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit(folderName.trim());
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save folder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkText/40 backdrop-blur-md animate-fade-in text-left">
      <div className="bg-panelBg rounded-2xl shadow-2xl w-full max-w-md border border-panelBorder overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-panelBorder">
          <div className="flex items-center space-x-2">
            <FolderPlus className="w-5 h-5 text-olivePrimary" />
            <h3 className="text-base font-bold text-darkText">
              {isEdit ? 'Rename Folder' : 'Create Folder'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-subtleText hover:text-darkText p-1.5 rounded-lg hover:bg-spaceBg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-accentDanger/10 border border-accentDanger/30 text-accentDanger text-xs rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-subtleText mb-2">
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Products / Shoes"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-panelBorder bg-spaceBg focus:outline-none focus:border-olivePrimary text-darkText text-sm transition-all"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-panelBorder text-mutedText hover:text-darkText font-medium text-xs hover:bg-spaceBg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-olivePrimary hover:bg-oliveHover text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEdit ? 'Save Changes' : 'Create Folder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
