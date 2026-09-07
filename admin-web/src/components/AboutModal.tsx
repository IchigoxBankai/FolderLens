import React from 'react';
import { X, Cpu, Layers, ShieldCheck, Zap, Code2 } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkText/40 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-3xl max-h-[85vh] bg-panelBg border border-panelBorder rounded-2xl shadow-2xl overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-subtleText hover:text-darkText hover:bg-spaceBg rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-oliveActive text-olivePrimary border border-panelBorder rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-darkText font-sans">About FOLDERLENS</h2>
            <p className="text-xs text-subtleText">Creative File Intelligence Platform Architecture</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-mutedText">
          {/* Problem & Solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-spaceBg border border-panelBorder">
              <h3 className="text-xs font-semibold text-olivePrimary uppercase tracking-wider mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" /> The Problem
              </h3>
              <p className="text-xs leading-relaxed text-darkText">
                Designers, product managers, and internal teams store tens of thousands of image assets across nested folders. Searching by filename fails when filenames are generic like <code className="text-olivePrimary bg-oliveActive/50 px-1 rounded">IMG_9824.jpg</code> or when trying to locate an image seen on a website.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-spaceBg border border-panelBorder">
              <h3 className="text-xs font-semibold text-accentSuccess uppercase tracking-wider mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> The Solution
              </h3>
              <p className="text-xs leading-relaxed text-darkText">
                FolderLens indexes personal image libraries into 512-dimensional vector spaces and perceptual hash strings. Users select any web image via Chrome Extension to instantly locate the exact file and folder.
              </p>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h3 className="text-xs font-semibold text-darkText uppercase tracking-wider mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-olivePrimary" /> Implemented Technology Stack
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-spaceBg border border-panelBorder">
                <div className="text-xs font-bold text-darkText">FastAPI & Python 3.13</div>
                <div className="text-[11px] text-subtleText">RESTful Async Backend</div>
              </div>
              <div className="p-3 rounded-lg bg-spaceBg border border-panelBorder">
                <div className="text-xs font-bold text-darkText">OpenAI CLIP Model</div>
                <div className="text-[11px] text-subtleText">512-Dim Vision Vector Transformer</div>
              </div>
              <div className="p-3 rounded-lg bg-spaceBg border border-panelBorder">
                <div className="text-xs font-bold text-darkText">Perceptual dHash & SHA256</div>
                <div className="text-[11px] text-subtleText">Near & Exact Duplicate Engine</div>
              </div>
              <div className="p-3 rounded-lg bg-spaceBg border border-panelBorder">
                <div className="text-xs font-bold text-darkText">React 18 & TypeScript</div>
                <div className="text-[11px] text-subtleText">Vite + Olive & Cream Editorial UI</div>
              </div>
              <div className="p-3 rounded-lg bg-spaceBg border border-panelBorder">
                <div className="text-xs font-bold text-darkText">Chrome Manifest V3</div>
                <div className="text-[11px] text-subtleText">Side Panel + Web Content Selector</div>
              </div>
              <div className="p-3 rounded-lg bg-spaceBg border border-panelBorder">
                <div className="text-xs font-bold text-darkText">SQLite / Cosine Store</div>
                <div className="text-[11px] text-subtleText">Vector & Hash Indexes</div>
              </div>
            </div>
          </div>

          {/* Matching Pipeline */}
          <div className="p-4 rounded-xl bg-spaceBg border border-panelBorder">
            <h3 className="text-xs font-semibold text-darkText uppercase tracking-wider mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-olivePrimary" /> Multi-Signal Image Matching Pipeline
            </h3>
            <div className="text-xs font-mono text-mutedText space-y-1 bg-panelBg p-3 rounded-lg border border-panelBorder">
              <div>Query Image ➔ SHA-256 Check (100% Binary Exact)</div>
              <div>           ➔ 64-bit dHash Hamming Distance (Scale/Crop Near Match)</div>
              <div>           ➔ CLIP ViT-Base Vector Embedding (Semantic Cosine Similarity)</div>
              <div>           ➔ Multi-Signal Confidence Ranker ➔ Match Candidate Card</div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-panelBorder flex justify-between items-center text-xs text-subtleText">
          <span>FOLDERLENS — Creative File Intelligence</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-olivePrimary text-white font-medium rounded-xl hover:bg-oliveHover transition-colors shadow-sm"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
