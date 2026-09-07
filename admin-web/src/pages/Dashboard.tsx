import React, { useState, useEffect } from 'react';
import { Search, Folder, Copy, UploadCloud, CheckCircle2, AlertCircle, ArrowRight, Image as ImageIcon, RefreshCw, FolderIcon, X } from 'lucide-react';
import { Folder as FolderType, SearchResponse, AnalyticsResponse } from '../types/api';
import { searchByImageFile, searchByImageUrl, getImageUrl, fetchAnalytics, fetchFolders } from '../services/api';

interface DashboardProps {
  onNavigateFolder: (folder: FolderType) => void;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateFolder, onNavigateTab }) => {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchQueryUrl, setSearchQueryUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState('Extracting visual features...');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsData, folderList] = await Promise.all([
        fetchAnalytics().catch(() => null),
        fetchFolders().catch(() => [])
      ]);
      setAnalytics(analyticsData);
      setFolders(folderList);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSearchResult(null);
    setErrorMsg('');
  };

  // Clipboard paste handler for screenshots / copied images (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            const file = new File([blob], `pasted_screenshot_${Date.now()}.png`, { type: blob.type || 'image/png' });
            handleFileSelected(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const runVisualSearch = async () => {
    if (!selectedFile && !searchQueryUrl.trim()) return;

    try {
      setIsSearching(true);
      setErrorMsg('');
      setSearchStep('Generating 512-dim CLIP vector embedding...');

      let res: SearchResponse;
      if (selectedFile) {
        setSearchStep('Checking SHA-256 & dHash fingerprints against library...');
        res = await searchByImageFile(selectedFile);
      } else {
        setSearchStep('Downloading image URL & computing similarity score...');
        res = await searchByImageUrl(searchQueryUrl.trim());
      }

      setSearchResult(res);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Visual search failed. Please verify backend connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const totalFiles = analytics?.total_files || folders.reduce((acc, f) => acc + f.product_count, 0);
  const totalFoldersCount = analytics?.total_folders || folders.length;
  const totalDuplicatesCount = analytics?.total_duplicates || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left font-sans">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-panelBorder pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-darkText font-serif-title tracking-wide">
            Good evening.
          </h1>
          <p className="text-xs sm:text-sm text-subtleText mt-1">
            Your visual library at a glance.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('library')}
          className="self-start sm:self-auto px-4 py-2 bg-panelBg border border-panelBorder hover:border-olivePrimary text-darkText rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
        >
          <Folder className="w-4 h-4 text-olivePrimary" />
          <span>Manage Library</span>
        </button>
      </div>

      {/* Understated Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-panelBg p-5 rounded-2xl border border-panelBorder space-y-2 hover:border-olivePrimary transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-subtleText uppercase tracking-wider">FILES</span>
            <ImageIcon className="w-4 h-4 text-subtleText" />
          </div>
          <div className="text-2xl font-semibold text-darkText">{totalFiles.toLocaleString()}</div>
          <div className="text-[11px] text-olivePrimary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-olivePrimary"></span> Indexed
          </div>
        </div>

        <div className="bg-panelBg p-5 rounded-2xl border border-panelBorder space-y-2 hover:border-olivePrimary transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-subtleText uppercase tracking-wider">FOLDERS</span>
            <Folder className="w-4 h-4 text-subtleText" />
          </div>
          <div className="text-2xl font-semibold text-darkText">{totalFoldersCount}</div>
          <div className="text-[11px] text-subtleText">Active directories</div>
        </div>

        <div className="bg-panelBg p-5 rounded-2xl border border-panelBorder space-y-2 hover:border-olivePrimary transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-subtleText uppercase tracking-wider">INDEXED</span>
            <CheckCircle2 className="w-4 h-4 text-olivePrimary" />
          </div>
          <div className="text-2xl font-semibold text-olivePrimary">100%</div>
          <div className="text-[11px] text-subtleText">Normalized CLIP vectors</div>
        </div>

        <div
          className="bg-panelBg p-5 rounded-2xl border border-panelBorder space-y-2 hover:border-olivePrimary transition-all cursor-pointer group shadow-sm"
          onClick={() => onNavigateTab('duplicates')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-subtleText uppercase tracking-wider">DUPLICATES</span>
            <Copy className="w-4 h-4 text-accentWarning" />
          </div>
          <div className="text-2xl font-semibold text-darkText">{totalDuplicatesCount}</div>
          <div className="text-[11px] text-accentWarning font-medium flex items-center justify-between">
            <span>Review Duplicates</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Editorial Visual Search Area */}
      <div className="bg-panelBg p-6 sm:p-8 rounded-2xl border border-panelBorder space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-panelBorder pb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-darkText flex items-center gap-2">
              <Search className="w-4 h-4 text-olivePrimary" /> FIND IT VISUALLY
            </h2>
            <p className="text-xs text-subtleText mt-0.5">
              Drop an image, paste a screenshot (<kbd className="px-1.5 py-0.5 text-[10px] bg-spaceBg border border-panelBorder rounded font-mono text-darkText">Ctrl+V</kbd>), or enter a URL.
            </p>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-mono bg-oliveActive text-olivePrimary border border-panelBorder rounded-md hidden sm:inline-block">
            CLIP + PERCEPTUAL HASH
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Dropzone area */}
          <div className="lg:col-span-7 space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative overflow-hidden ${isDragging
                  ? 'border-olivePrimary bg-oliveActive shadow-glow-olive'
                  : 'border-panelBorder hover:border-olivePrimary bg-spaceBg/60 hover:bg-oliveActive/40'
                }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              {previewUrl ? (
                <div className="flex flex-col items-center gap-3 z-20 relative">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-xl overflow-hidden border-2 border-olivePrimary shadow-md bg-spaceBg">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setSearchResult(null);
                        setErrorMsg('');
                      }}
                      className="absolute -top-2.5 -right-2.5 p-1 bg-accentDanger text-white rounded-full shadow-lg hover:scale-110 hover:bg-accentDanger/90 transition-all z-30 cursor-pointer"
                      title="Remove selected image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-darkText truncate max-w-[220px]">{selectedFile?.name}</div>
                  <span className="text-[10px] text-olivePrimary">Click, drop, or press Ctrl+V to replace</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3.5 rounded-full bg-oliveActive text-olivePrimary border border-panelBorder">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-darkText uppercase tracking-wider">Drop an image or press <span className="text-olivePrimary font-mono font-bold bg-oliveActive/60 px-1.5 py-0.5 rounded border border-panelBorder">Ctrl+V</span> to paste screenshot</div>
                    <div className="text-[11px] text-subtleText mt-1.5">Direct screenshot clipboard paste · JPG · PNG · WEBP supported</div>
                  </div>
                </div>
              )}
            </div>

            {/* Image URL input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQueryUrl}
                onChange={(e) => {
                  setSearchQueryUrl(e.target.value);
                  if (e.target.value) setSelectedFile(null);
                }}
                placeholder="Or paste image URL (e.g. https://example.com/item.jpg)..."
                className="flex-1 px-4 py-2.5 bg-spaceBg border border-panelBorder rounded-xl text-xs text-darkText placeholder-subtleText focus:outline-none focus:border-olivePrimary"
              />
              <button
                onClick={runVisualSearch}
                disabled={isSearching || (!selectedFile && !searchQueryUrl.trim())}
                className="px-5 py-2.5 bg-olivePrimary hover:bg-oliveHover disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Visual Search</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search Results Card */}
          <div className="lg:col-span-5 bg-spaceBg p-5 rounded-2xl border border-panelBorder min-h-[260px] flex flex-col justify-between shadow-sm">
            {isSearching ? (
              <div className="my-auto text-center space-y-3 py-8">
                <RefreshCw className="w-8 h-8 text-olivePrimary animate-spin mx-auto" />
                <div className="text-xs font-bold text-darkText">{searchStep}</div>
                <div className="text-[11px] text-subtleText">Comparing multi-signal vector embeddings...</div>
              </div>
            ) : errorMsg ? (
              <div className="my-auto text-center space-y-2 py-6 text-accentDanger">
                <AlertCircle className="w-8 h-8 mx-auto" />
                <div className="text-xs font-semibold">{errorMsg}</div>
              </div>
            ) : searchResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-panelBorder pb-3">
                  <span className={`text-xs font-bold ${searchResult.matched ? 'text-accentSuccess' : 'text-accentWarning'}`}>
                    {searchResult.matched ? 'MATCH FOUND' : 'NO STRONG MATCH'}
                  </span>
                  {searchResult.best_match && (
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-oliveActive text-olivePrimary border border-panelBorder rounded-md">
                      {searchResult.best_match.confidence}% SIMILARITY
                    </span>
                  )}
                </div>

                {searchResult.best_match ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-panelBorder bg-panelBg">
                        <img
                          src={getImageUrl(searchResult.best_match.product.thumbnail_url || searchResult.best_match.product.image_url)}
                          alt="Match"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-darkText truncate max-w-[200px]" title={searchResult.best_match.product.name}>
                          {searchResult.best_match.product.name}
                        </div>
                        <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-oliveActive text-olivePrimary text-[11px] font-semibold border border-panelBorder">
                          <FolderIcon className="w-3 h-3 text-olivePrimary" />
                          <span>📁 {searchResult.best_match.folder.name}</span>
                        </div>
                      </div>
                    </div>

                    {searchResult.best_match.reasons && searchResult.best_match.reasons.length > 0 && (
                      <div className="space-y-1 bg-panelBg p-3 rounded-xl border border-panelBorder text-[10px] text-mutedText">
                        {searchResult.best_match.reasons.map((r, idx) => (
                          <div key={idx}>{r}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-subtleText">
                    {searchResult.message || 'No close match found.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="my-auto text-center space-y-2 py-8 text-subtleText">
                <Search className="w-8 h-8 mx-auto opacity-40 text-olivePrimary" />
                <div className="text-xs font-medium text-mutedText">Drop image or paste URL to run search</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Folders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-panelBorder pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-darkText">Recent Folders</h3>
          <button
            onClick={() => onNavigateTab('library')}
            className="text-xs text-olivePrimary hover:underline flex items-center gap-1 font-semibold"
          >
            <span>View All Folders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="p-8 text-center bg-panelBg rounded-2xl border border-panelBorder text-subtleText text-xs shadow-sm">
            No folders created yet. Click "Manage Library" to import your first image folder!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {folders.slice(0, 4).map((f) => (
              <div
                key={f.id}
                onClick={() => onNavigateFolder(f)}
                className="bg-panelBg p-4 rounded-xl border border-panelBorder hover:border-olivePrimary hover:bg-oliveActive/40 cursor-pointer space-y-2 transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-oliveActive text-olivePrimary border border-panelBorder">
                    <Folder className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono text-subtleText">{f.product_count} images</span>
                </div>
                <div className="text-xs font-bold text-darkText group-hover:text-olivePrimary transition-colors">{f.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
