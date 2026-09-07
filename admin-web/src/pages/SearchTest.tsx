import React, { useState } from 'react';
import { SearchResponse } from '../types/api';
import { searchByImageFile, searchByImageUrl, getImageUrl } from '../services/api';
import { Search, UploadCloud, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2, Folder as FolderIcon, X } from 'lucide-react';

export const SearchTest: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setError('');
    setResult(null);
    setPreviewUrl(URL.createObjectURL(file));
  };

  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            setActiveMode('file');
            const file = new File([blob], `pasted_screenshot_${Date.now()}.png`, { type: blob.type || 'image/png' });
            handleFileChange(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    try {
      setSearching(true);
      let res: SearchResponse;

      if (activeMode === 'file') {
        if (!selectedFile) {
          setError('Please select an image file.');
          setSearching(false);
          return;
        }
        res = await searchByImageFile(selectedFile);
      } else {
        if (!imageUrl.trim()) {
          setError('Please enter an image URL.');
          setSearching(false);
          return;
        }
        res = await searchByImageUrl(imageUrl.trim());
      }

      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Search failed. Please verify the backend service.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left font-sans transition-colors duration-200">
      <div className="mb-8 border-b border-panelBorder pb-6">
        <h1 className="text-2xl font-normal text-darkText font-serif-title tracking-wide">AI Visual Search Engine</h1>
        <p className="text-xs sm:text-sm text-subtleText mt-1">Upload a test image file or paste an image URL to verify vector embedding matching.</p>
      </div>

      <div className="bg-panelBg rounded-2xl border border-panelBorder p-6 shadow-sm mb-8">
        {/* Search Mode Switcher */}
        <div className="flex space-x-2 border-b border-panelBorder pb-4 mb-6">
          <button
            onClick={() => setActiveMode('file')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeMode === 'file'
                ? 'bg-olivePrimary text-white shadow-sm'
                : 'text-subtleText hover:text-darkText hover:bg-spaceBg'
              }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Image File</span>
          </button>
          <button
            onClick={() => setActiveMode('url')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeMode === 'url'
                ? 'bg-olivePrimary text-white shadow-sm'
                : 'text-subtleText hover:text-darkText hover:bg-spaceBg'
              }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Image URL</span>
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-5">
          {error && (
            <div className="p-4 bg-accentDanger/10 border border-accentDanger/30 text-accentDanger text-xs rounded-xl flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeMode === 'file' ? (
            <div>
              {previewUrl ? (
                <div className="relative rounded-2xl border border-panelBorder bg-spaceBg p-4 text-center">
                  <div className="relative inline-block">
                    <img src={previewUrl} alt="Search Query" className="max-h-56 mx-auto rounded-xl object-contain shadow-sm border border-panelBorder" />
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                      className="absolute -top-2.5 -right-2.5 p-1.5 bg-accentDanger text-white rounded-full shadow-lg hover:scale-110 hover:bg-accentDanger/90 transition-all z-20 cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="mt-3 text-xs font-semibold text-accentDanger hover:underline block mx-auto"
                  >
                    Change / Remove Image
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-panelBorder hover:border-olivePrimary rounded-2xl p-10 text-center bg-spaceBg cursor-pointer"
                  onClick={() => document.getElementById('search-file-input')?.click()}
                >
                  <input
                    id="search-file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  />
                  <div className="w-12 h-12 rounded-full bg-oliveActive text-olivePrimary flex items-center justify-center mx-auto mb-3 border border-panelBorder">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-darkText">Click or drag image file here</p>
                  <p className="text-xs text-subtleText mt-1">Select any product picture to test visual similarity</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-subtleText mb-2">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/product.jpg"
                className="w-full px-4 py-2.5 rounded-xl border border-panelBorder bg-spaceBg text-darkText text-xs focus:outline-none focus:border-olivePrimary"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={searching}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-olivePrimary hover:bg-oliveHover text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Computing CLIP Vectors...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Run Visual Search</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results Display */}
      {result && (
        <div className="animate-fade-in space-y-6">
          {result.matched && result.best_match ? (
            <div className="bg-panelBg rounded-2xl border border-accentSuccess/40 p-8 shadow-sm">
              <div className="flex items-center space-x-2 text-accentSuccess font-bold text-xs mb-4">
                <CheckCircle2 className="w-5 h-5 text-accentSuccess" />
                <span>PRODUCT MATCH FOUND</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-36 h-36 rounded-2xl border border-panelBorder bg-spaceBg p-2 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                  <img
                    src={getImageUrl(result.best_match.product.image_url)}
                    alt={result.best_match.product.name}
                    className="max-h-full max-w-full object-cover rounded-lg"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h3 className="text-xl font-bold text-darkText">{result.best_match.product.name}</h3>

                  <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-oliveActive text-olivePrimary font-bold text-xs border border-panelBorder">
                    <FolderIcon className="w-4 h-4 text-olivePrimary" />
                    <span>📁 {result.best_match.folder.name}</span>
                  </div>

                  <div className="pt-2 flex items-center justify-center sm:justify-start space-x-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-subtleText">Match Confidence</span>
                    <span className="px-3 py-1 bg-accentSuccess/20 text-accentSuccess border border-accentSuccess/30 rounded-full font-mono font-bold text-xs">
                      {result.best_match.confidence}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Other Candidates */}
              {result.other_matches && result.other_matches.length > 0 && (
                <div className="mt-6 pt-6 border-t border-panelBorder">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-subtleText mb-3">Other Possible Matches</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {result.other_matches.map((match, idx) => (
                      <div key={idx} className="bg-spaceBg p-4 rounded-xl border border-panelBorder flex items-center space-x-3">
                        <img
                          src={getImageUrl(match.product.image_url)}
                          alt={match.product.name}
                          className="w-12 h-12 object-cover rounded-lg border border-panelBorder"
                        />
                        <div>
                          <p className="font-bold text-xs text-darkText">{match.product.name}</p>
                          <p className="text-[11px] text-subtleText">📁 {match.folder.name}</p>
                          <span className="text-[10px] font-bold text-olivePrimary">{match.confidence}% match</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-panelBg rounded-2xl border border-panelBorder p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-oliveActive text-accentWarning flex items-center justify-center mx-auto mb-4 border border-panelBorder">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-darkText">No Matching Product Found</h3>
              <p className="text-xs text-subtleText max-w-md mx-auto mt-1">{result.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
