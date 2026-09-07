import React, { useState, useRef } from 'react';
import { X, FolderPlus, FolderUp, UploadCloud, Loader2 } from 'lucide-react';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFolder: (folderName: string, files: File[], onProgress: (msg: string) => void) => Promise<void>;
  onCreateEmptyFolder: (name: string) => Promise<void>;
}

// Recursive directory traversal for HTML5 Drag & Drop
async function getAllFilesFromDataTransfer(items: DataTransferItemList): Promise<File[]> {
  const files: File[] = [];
  const entries: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
  }

  async function readEntry(entry: any) {
    if (entry.isFile) {
      return new Promise<void>((resolve) => {
        entry.file((file: File) => {
          Object.defineProperty(file, 'webkitRelativePath', {
            value: entry.fullPath.replace(/^\//, ''),
            writable: true,
          });
          files.push(file);
          resolve();
        }, () => resolve());
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readEntries = (): Promise<any[]> => {
        return new Promise((resolve) => {
          dirReader.readEntries((results: any[]) => resolve(results), () => resolve([]));
        });
      };
      let batch: any[] = [];
      do {
        batch = await readEntries();
        for (const child of batch) {
          await readEntry(child);
        }
      } while (batch.length > 0);
    }
  }

  for (const entry of entries) {
    await readEntry(entry);
  }

  return files;
}

export const AddFolderModal: React.FC<AddFolderModalProps> = ({
  isOpen,
  onClose,
  onUploadFolder,
  onCreateEmptyFolder,
}) => {
  const [mode, setMode] = useState<'upload' | 'empty'>('upload');
  const [folderName, setFolderName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFilesList = (filesArray: File[]) => {
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.jfif', '.bmp', '.gif', '.tiff', '.avif'];

    const imageFiles = filesArray.filter((file) => {
      const lower = file.name.toLowerCase();
      const isImgExt = validExts.some((ext) => lower.endsWith(ext));
      const isImgType = file.type && file.type.startsWith('image/');
      return isImgExt || isImgType;
    });

    if (imageFiles.length === 0) {
      setError(`Selected folder contains ${filesArray.length} files, but no valid image files (JPG, PNG, WEBP, etc.) were found.`);
      return;
    }

    setError('');
    setSelectedFiles(imageFiles);

    let parsedFolderName = '';
    const firstPath = imageFiles[0]?.webkitRelativePath;
    if (firstPath && firstPath.includes('/')) {
      parsedFolderName = firstPath.split('/')[0];
    } else {
      parsedFolderName = 'Uploaded Product Folder';
    }

    if (parsedFolderName && !folderName) {
      setFolderName(parsedFolderName);
    }
  };

  const handleFolderSelect = (filesList: FileList | File[]) => {
    processFilesList(Array.from(filesList));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setLoading(true);
      setProgressMsg('Scanning dropped folder contents...');
      try {
        const files = await getAllFilesFromDataTransfer(e.dataTransfer.items);
        processFilesList(files);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFilesList(Array.from(e.dataTransfer.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'upload') {
      if (!folderName.trim()) {
        setError('Please specify a folder name.');
        return;
      }
      if (selectedFiles.length === 0) {
        setError('Please select a folder containing product images.');
        return;
      }

      try {
        setLoading(true);
        setError('');
        setProgressMsg(`Uploading ${selectedFiles.length} images from '${folderName}'...`);

        await onUploadFolder(folderName.trim(), selectedFiles, (msg) => {
          setProgressMsg(msg);
        });

        setProgressMsg('Folder successfully added and indexed!');
        setTimeout(() => {
          handleReset();
          onClose();
        }, 500);
      } catch (err: any) {
        if (!err.response) {
          setError("Backend server is not running or unreachable at http://localhost:8000. Please start the backend server in terminal.");
        } else {
          setError(err.response?.data?.detail || 'Failed to upload folder. Please try again.');
        }
        setLoading(false);
      }
    } else {
      if (!folderName.trim()) {
        setError('Please enter a folder name.');
        return;
      }

      try {
        setLoading(true);
        setError('');
        await onCreateEmptyFolder(folderName.trim());
        handleReset();
        onClose();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to create folder.');
        setLoading(false);
      }
    }
  };

  const handleReset = () => {
    setFolderName('');
    setSelectedFiles([]);
    setLoading(false);
    setProgressMsg('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkText/40 backdrop-blur-md animate-fade-in text-left">
      <div className="bg-panelBg rounded-2xl shadow-2xl w-full max-w-lg border border-panelBorder overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-panelBorder">
          <div className="flex items-center space-x-2">
            <FolderUp className="w-5 h-5 text-olivePrimary" />
            <h3 className="text-base font-bold text-darkText">Add Folder</h3>
          </div>
          <button
            onClick={() => { handleReset(); onClose(); }}
            disabled={loading}
            className="text-subtleText hover:text-darkText p-1.5 rounded-lg hover:bg-spaceBg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-6 pt-4 flex space-x-2 border-b border-panelBorder pb-3">
          <button
            type="button"
            onClick={() => setMode('upload')}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'upload'
                ? 'bg-olivePrimary text-white shadow-sm'
                : 'text-subtleText hover:text-darkText hover:bg-spaceBg'
            }`}
          >
            <FolderUp className="w-4 h-4" />
            <span>Upload PC Folder</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('empty')}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'empty'
                ? 'bg-olivePrimary text-white shadow-sm'
                : 'text-subtleText hover:text-darkText hover:bg-spaceBg'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create Empty</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-accentDanger/10 border border-accentDanger/30 text-accentDanger text-xs rounded-xl">
              {error}
            </div>
          )}

          {mode === 'upload' ? (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-subtleText mb-2">
                  Select Folder from Computer
                </label>

                {selectedFiles.length > 0 ? (
                  <div className="p-4 bg-oliveActive/40 rounded-2xl border border-olivePrimary/40 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-oliveActive text-olivePrimary flex items-center justify-center mx-auto">
                      <FolderUp className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-darkText">
                      📁 {folderName} ({selectedFiles.length} Images Found)
                    </p>
                    <p className="text-xs text-mutedText">
                      Product images will be indexed with CLIP embeddings & hash signatures.
                    </p>
                    {!loading && (
                      <button
                        type="button"
                        onClick={() => { setSelectedFiles([]); setFolderName(''); }}
                        className="text-xs font-semibold text-accentDanger hover:underline pt-1 block mx-auto"
                      >
                        Choose Different Folder
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                      isDragOver ? 'border-olivePrimary bg-oliveActive/30' : 'border-panelBorder hover:border-olivePrimary bg-spaceBg'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      // @ts-ignore
                      webkitdirectory=""
                      directory=""
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && handleFolderSelect(e.target.files)}
                    />
                    <div className="w-12 h-12 rounded-full bg-oliveActive text-olivePrimary flex items-center justify-center mx-auto mb-3 border border-panelBorder">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-darkText">Click to select folder or drag folder here</p>
                    <p className="text-xs text-subtleText mt-1">Select any folder from your computer containing product images</p>
                  </div>
                )}
              </div>

              {selectedFiles.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-subtleText mb-1.5">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Folder Name"
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-xl border border-panelBorder bg-spaceBg text-darkText text-sm focus:outline-none focus:border-olivePrimary"
                  />
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-subtleText mb-2">
                Empty Folder Name
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. Products / Shoes"
                autoFocus
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl border border-panelBorder bg-spaceBg text-darkText text-sm focus:outline-none focus:border-olivePrimary"
              />
            </div>
          )}

          {/* Loading Progress */}
          {loading && (
            <div className="p-4 bg-oliveActive/40 rounded-2xl border border-olivePrimary/40 flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-olivePrimary animate-spin" />
              <div>
                <p className="text-xs font-bold text-olivePrimary uppercase tracking-wider">AI Visual Indexing</p>
                <p className="text-sm font-semibold text-darkText">{progressMsg}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
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
              disabled={loading || (mode === 'upload' && selectedFiles.length === 0)}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-olivePrimary hover:bg-oliveHover text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{mode === 'upload' ? 'Upload & Index Folder' : 'Create Folder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
