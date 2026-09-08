import React, { useState, useEffect } from 'react';
import { MousePointerClick, Search, CheckCircle2, AlertCircle, RefreshCw, Folder as FolderIcon, Settings, X, Zap, Sun, Moon, ExternalLink } from 'lucide-react';
import {
  imageEmbeddingService,
  computeSHA256,
  computeDHash
} from '../services/imageEmbedding';

interface Product {
  id: string;
  name: string;
  image_url: string;
  thumbnail_url?: string;
}

interface Folder {
  id: string;
  name: string;
}

interface MatchCandidate {
  product: Product;
  folder: Folder;
  similarity: number;
  confidence: number;
  reasons?: string[];
}

interface SearchResponse {
  matched: boolean;
  message: string;
  best_match?: MatchCandidate;
  other_matches?: MatchCandidate[];
  search_duration_ms?: number;
}

const normalizeUrl = (rawUrl: string): string => {
  let u = (rawUrl || '').trim().replace(/\/+$/, '');
  if (!u) return 'https://folderlens.onrender.com';
  if (!u.startsWith('http://') && !u.startsWith('https://')) {
    u = `https://${u}`;
  }
  return u;
};

export const SidePanel: React.FC = () => {
  const [backendUrl, setBackendUrl] = useState(() => {
    return normalizeUrl(localStorage.getItem('folderlens_backend_url') || 'https://folderlens.onrender.com');
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [autoSelectEnabled, setAutoSelectEnabled] = useState(true);

  // Extension theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('folderlens_ext_theme') as 'dark' | 'light') || 'dark';
  });

  // States: 'idle' | 'selecting' | 'captured' | 'searching' | 'result' | 'error'
  const [status, setStatus] = useState<'idle' | 'selecting' | 'captured' | 'searching' | 'result' | 'error'>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [searchStep, setSearchStep] = useState('Preparing visual search engine...');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    localStorage.setItem('folderlens_ext_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const checkHealth = async (url = backendUrl) => {
    try {
      const target = normalizeUrl(url);
      const resp = await fetch(`${target}/api/health`, { method: 'GET' });
      setIsConnected(resp.ok);
    } catch {
      setIsConnected(false);
    }
  };

  const handleSaveBackendUrl = (newUrl: string) => {
    const clean = normalizeUrl(newUrl);
    setBackendUrl(clean);
    localStorage.setItem('folderlens_backend_url', clean);
    chrome.storage.local.set({ backendUrl: clean });
    checkHealth(clean);
    setShowSettings(false);
  };

  const handleStartSelection = () => {
    setStatus('selecting');
    setErrorMsg('');
    chrome.runtime.sendMessage({ type: 'TRIGGER_IMAGE_SELECTION' }, (res) => {
      if (res?.status === 'no_active_tab') {
        setErrorMsg('Please open a webpage tab to select an image.');
        setStatus('idle');
      }
    });
  };

  const handleCancelSelection = () => {
    setStatus('idle');
    chrome.runtime.sendMessage({ type: 'CANCEL_IMAGE_SELECTION' });
  };

  useEffect(() => {
    chrome.storage.local.get(['backendUrl'], (res) => {
      const url = normalizeUrl(res.backendUrl || localStorage.getItem('folderlens_backend_url') || 'https://folderlens.onrender.com');
      setBackendUrl(url);
      checkHealth(url);
    });

    // Automatically activate image selection mode on mount if auto-select is enabled
    chrome.storage.local.get(['autoSelectEnabled'], (res) => {
      const isAuto = res.autoSelectEnabled !== false;
      setAutoSelectEnabled(isAuto);
      if (isAuto) {
        handleStartSelection();
      }
    });

    const messageListener = (message: any) => {
      if (message.type === 'SIDE_PANEL_IMAGE_READY' || message.type === 'IMAGE_SELECTED') {
        const src = message.payload?.imageSource;
        if (src) {
          setCapturedImage(src);
          setStatus('captured');
          executeSearch(src);
        }
      } else if (message.type === 'SELECTION_CANCELLED') {
        setStatus('idle');
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    chrome.storage.local.get(['activeImage'], (res) => {
      if (res.activeImage && status === 'idle') {
        setCapturedImage(res.activeImage);
      }
    });

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              const dataUrl = loadEvt.target?.result as string;
              if (dataUrl) {
                setCapturedImage(dataUrl);
                setStatus('captured');
                executeSearch(dataUrl);
              }
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const toggleAutoSelect = () => {
    const newValue = !autoSelectEnabled;
    setAutoSelectEnabled(newValue);
    chrome.storage.local.set({ autoSelectEnabled: newValue });
    if (newValue) {
      handleStartSelection();
    } else {
      handleCancelSelection();
    }
  };

  const executeSearch = async (imageSrc: string) => {
    setStatus('searching');
    setSearchStep('Preparing image...');
    setErrorMsg('');

    try {
      let imageBlob: Blob | null = null;
      if (imageSrc.startsWith('data:image')) {
        const res = await fetch(imageSrc);
        imageBlob = await res.blob();
      } else if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
        try {
          const res = await fetch(imageSrc);
          if (res.ok) imageBlob = await res.blob();
        } catch {
          // CORS restricted URL - will pass imageSrc string directly
        }
      }

      setSearchStep('Generating visual signature...');
      const targetInput = imageBlob || imageSrc;

      const [sha256Hash, phash, embedding] = await Promise.all([
        imageBlob ? computeSHA256(imageBlob).catch(() => undefined) : undefined,
        computeDHash(targetInput).catch(() => undefined),
        imageEmbeddingService.generateEmbedding(targetInput, (info) => {
          setSearchStep(info.message);
        })
      ]);

      setSearchStep('Searching library...');

      const response = await fetch(`${backendUrl}/api/search/visual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embedding,
          sha256_hash: sha256Hash,
          phash: phash,
          limit: 10
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Visual search request failed');
      }

      const data: SearchResponse = await response.json();

      setSearchResult(data);
      setStatus('result');

      // Auto-re-arm selection mode if auto-select is enabled
      if (autoSelectEnabled) {
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: 'TRIGGER_IMAGE_SELECTION' });
        }, 500);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setErrorMsg(err.message || 'Unable to connect to FolderLens backend service.');
      setStatus('error');
    }
  };

  const getFullUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    return `${backendUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-spaceBg text-darkText p-4 font-sans select-none text-left transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-panelBorder pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-cardBg border border-panelBorder flex items-center justify-center">
            <Search className="w-4 h-4 text-brandCyan" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-wide text-darkText leading-none">FOLDERLENS</h1>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-accentSuccess animate-pulse' : 'bg-accentDanger'}`}></span>
              <span className="text-[10px] text-subtleText">
                {isConnected ? 'Lightweight API' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={toggleAutoSelect}
            title={autoSelectEnabled ? 'Auto-Select Mode ON: Left-click any web image' : 'Enable Auto-Select Mode'}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center space-x-1 ${
              autoSelectEnabled
                ? 'bg-brandPrimary/20 border-brandPrimary/40 text-brandCyan'
                : 'bg-cardBg border-panelBorder text-subtleText hover:text-darkText'
            }`}
          >
            <Zap className={`w-3 h-3 ${autoSelectEnabled ? 'text-brandCyan fill-brandCyan' : ''}`} />
            <span>{autoSelectEnabled ? 'Auto ON' : 'Auto OFF'}</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 text-subtleText hover:text-darkText rounded-lg hover:bg-cardHover border border-transparent transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-panelBg rounded-xl p-3 border border-panelBorder shadow-xl mb-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-darkText">
            <span>Backend Server API</span>
            <button onClick={() => setShowSettings(false)} className="text-subtleText"><X className="w-3.5 h-3.5" /></button>
          </div>
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="https://folderlens.onrender.com"
            className="w-full text-xs px-3 py-1.5 bg-spaceBg border border-panelBorder rounded-lg text-darkText focus:outline-none focus:border-brandPrimary"
          />
          <button
            onClick={() => handleSaveBackendUrl(backendUrl)}
            className="w-full py-1.5 bg-brandPrimary hover:bg-brandPrimary-hover text-white font-semibold text-xs rounded-lg shadow-sm"
          >
            Save & Reconnect
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-between">
        {/* IDLE STATE */}
        {status === 'idle' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
            <div className="w-14 h-14 rounded-2xl bg-brandPrimary/15 text-brandCyan border border-panelBorder flex items-center justify-center mb-4">
              <MousePointerClick className="w-7 h-7" />
            </div>

            <h2 className="text-sm font-bold text-darkText mb-1">Visual Search</h2>
            <p className="text-xs text-subtleText leading-relaxed mb-6">
              Click the button below or enable Auto-Select mode to click any image on a webpage instantly.
            </p>

            <button
              onClick={handleStartSelection}
              className="w-full py-3 px-4 bg-brandPrimary hover:bg-brandPrimary-hover text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Select Web Image</span>
            </button>
          </div>
        )}

        {/* SELECTING MODE */}
        {status === 'selecting' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-brandPrimary/20 text-brandCyan flex items-center justify-center mb-3 animate-pulse border border-brandPrimary/40">
              <MousePointerClick className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-bold text-brandCyan mb-1">FOLDERLENS ACTIVE</h3>
            <p className="text-[11px] text-mutedText mb-6 leading-relaxed">
              Hover & <b>left-click any image</b> on the webpage (or drag a box around it).
            </p>
            <button
              onClick={handleCancelSelection}
              className="px-4 py-2 bg-cardBg border border-panelBorder text-mutedText hover:text-darkText rounded-xl text-xs font-semibold"
            >
              Pause Selection
            </button>
          </div>
        )}

        {/* SEARCHING STATE */}
        {status === 'searching' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-panelBorder border-t-brandCyan animate-spin"></div>
            <h3 className="text-xs font-bold text-darkText">Analyzing Image Signature</h3>
            <p className="text-[11px] text-subtleText">{searchStep}</p>
          </div>
        )}

        {/* SEARCH RESULT STATE */}
        {status === 'result' && searchResult && (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            {searchResult.matched && searchResult.best_match ? (
              <div className="space-y-3">
                {/* Best Match Card */}
                <div className="bg-panelBg rounded-xl border border-accentSuccess/40 p-4 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-panelBorder pb-2">
                    <span className="text-xs font-bold text-accentSuccess flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> MATCH FOUND
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-accentSuccess/20 text-accentSuccess rounded border border-accentSuccess/30 font-bold">
                      {searchResult.best_match.confidence}% CONFIDENCE
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-16 rounded-lg border border-panelBorder bg-spaceBg overflow-hidden flex-shrink-0">
                      <img
                        src={getFullUrl(searchResult.best_match.product.image_url)}
                        alt={searchResult.best_match.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <h3 className="text-xs font-bold text-darkText truncate" title={searchResult.best_match.product.name}>
                        {searchResult.best_match.product.name}
                      </h3>

                      <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-brandPrimary/20 text-brandCyan font-semibold text-[11px] border border-brandPrimary/30">
                        <FolderIcon className="w-3 h-3 text-brandCyan" />
                        <span className="truncate">📁 {searchResult.best_match.folder.name}</span>
                      </div>
                    </div>
                  </div>

                  {searchResult.best_match.reasons && searchResult.best_match.reasons.length > 0 && (
                    <div className="bg-spaceBg p-2.5 rounded-lg border border-panelBorder space-y-1 text-[10px] text-subtleText">
                      {searchResult.best_match.reasons.map((r, idx) => (
                        <div key={idx}>{r}</div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <a
                      href={getFullUrl(searchResult.best_match.product.image_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brandCyan hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open file</span>
                    </a>
                    {searchResult.search_duration_ms && (
                      <span className="text-subtleText font-mono">{searchResult.search_duration_ms}ms</span>
                    )}
                  </div>
                </div>

                {/* Other Candidates (2nd Match, 3rd Match) */}
                {searchResult.other_matches && searchResult.other_matches.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-subtleText uppercase tracking-wider">Other Matches</h4>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {searchResult.other_matches.map((match, idx) => (
                        <div key={idx} className="bg-panelBg/80 p-2 rounded-lg border border-panelBorder flex items-center space-x-2 text-xs">
                          <img
                            src={getFullUrl(match.product.image_url)}
                            alt={match.product.name}
                            className="w-8 h-8 rounded object-cover border border-panelBorder flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-darkText truncate text-[11px]">{match.product.name}</p>
                            <p className="text-[10px] text-subtleText truncate">📁 {match.folder.name}</p>
                          </div>
                          <span className="text-[10px] font-mono text-brandCyan font-bold">{match.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-panelBg rounded-xl border border-panelBorder p-6 text-center shadow-xl space-y-2">
                <AlertCircle className="w-8 h-8 text-accentWarning mx-auto" />
                <h3 className="text-xs font-bold text-darkText">No Match Found</h3>
                <p className="text-[11px] text-subtleText">{searchResult.message}</p>
              </div>
            )}

            {autoSelectEnabled && (
              <div className="bg-brandPrimary/15 border border-brandPrimary/30 rounded-xl p-2.5 text-center text-[10px] text-brandCyan flex items-center justify-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-brandCyan fill-brandCyan animate-pulse" />
                <span><b>Auto-Select Active:</b> Click another image on page anytime</span>
              </div>
            )}

            <button
              onClick={handleStartSelection}
              className="w-full py-2.5 px-4 bg-brandPrimary hover:bg-brandPrimary-hover text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Search Again</span>
            </button>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4 space-y-3">
            <AlertCircle className="w-8 h-8 text-accentDanger mx-auto" />
            <h3 className="text-xs font-bold text-darkText">Search Failed</h3>
            <p className="text-[11px] text-subtleText">{errorMsg || 'Could not complete visual search.'}</p>
            <button
              onClick={handleStartSelection}
              className="px-4 py-2 bg-brandPrimary text-white font-semibold text-xs rounded-xl"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
