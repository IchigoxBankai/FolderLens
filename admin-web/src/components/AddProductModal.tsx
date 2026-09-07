import React, { useState } from 'react';
import { X, UploadCloud, Loader2 } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  folderName: string;
  onClose: () => void;
  onSubmit: (name: string, file: File, onProgress: (step: string) => void) => Promise<void>;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  folderName,
  onClose,
  onSubmit,
}) => {
  const [productName, setProductName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPG, JPEG, PNG, WEBP).');
      return;
    }

    setSelectedFile(file);
    setError('');
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    if (!productName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setProductName(nameWithoutExt);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setError('Please enter a product name.');
      return;
    }
    if (!selectedFile) {
      setError('Please select a product image.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setProgressStep('Uploading image...');

      await onSubmit(productName.trim(), selectedFile, (step) => {
        setProgressStep(step);
      });

      setProgressStep('Product successfully added.');
      setTimeout(() => {
        handleReset();
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add product. Please try again.');
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProductName('');
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setLoading(false);
    setProgressStep('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkText/40 backdrop-blur-md animate-fade-in text-left">
      <div className="bg-panelBg rounded-2xl shadow-2xl w-full max-w-lg border border-panelBorder overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-panelBorder">
          <div>
            <h3 className="text-base font-bold text-darkText">Add Product Image</h3>
            <p className="text-xs text-subtleText">Adding to <span className="font-semibold text-olivePrimary">{folderName}</span></p>
          </div>
          <button
            onClick={() => { handleReset(); onClose(); }}
            disabled={loading}
            className="text-subtleText hover:text-darkText p-1.5 rounded-lg hover:bg-spaceBg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-accentDanger/10 border border-accentDanger/30 text-accentDanger text-xs rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-subtleText mb-2">
              Product Name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Samsung Charger"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl border border-panelBorder bg-spaceBg focus:outline-none focus:border-olivePrimary text-darkText text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-subtleText mb-2">
              Product Image
            </label>
            
            {previewUrl ? (
              <div className="relative rounded-2xl border border-panelBorder bg-spaceBg p-4 text-center">
                <div className="relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Product preview"
                    className="max-h-48 mx-auto rounded-xl object-contain shadow-sm border border-panelBorder"
                  />
                  {!loading && (
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                      className="absolute -top-2.5 -right-2.5 p-1.5 bg-accentDanger text-white rounded-full shadow-lg hover:scale-110 hover:bg-accentDanger/90 transition-all z-20 cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {!loading && (
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="mt-3 text-xs font-semibold text-accentDanger hover:underline block mx-auto"
                  >
                    Change / Remove Image
                  </button>
                )}
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  isDragOver ? 'border-olivePrimary bg-oliveActive/30' : 'border-panelBorder hover:border-olivePrimary bg-spaceBg'
                }`}
                onClick={() => document.getElementById('product-image-input')?.click()}
              >
                <input
                  id="product-image-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <div className="w-12 h-12 rounded-full bg-oliveActive text-olivePrimary flex items-center justify-center mx-auto mb-3 border border-panelBorder">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-darkText">Drag image here or browse</p>
                <p className="text-xs text-subtleText mt-1">Supports JPG, JPEG, PNG, WEBP</p>
              </div>
            )}
          </div>

          {loading && (
            <div className="p-4 bg-oliveActive/40 rounded-2xl border border-olivePrimary/40 flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-olivePrimary animate-spin" />
              <div>
                <p className="text-xs font-bold text-olivePrimary uppercase tracking-wider">Visual AI Indexing</p>
                <p className="text-sm font-semibold text-darkText">{progressStep}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => { handleReset(); onClose(); }}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-panelBorder text-mutedText hover:text-darkText font-medium text-xs hover:bg-spaceBg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedFile || !productName.trim()}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-olivePrimary hover:bg-oliveHover text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save & Index Product</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
