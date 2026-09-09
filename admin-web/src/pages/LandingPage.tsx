import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  ArrowRight, 
  Chrome, 
  CheckCircle2, 
  Copy, 
  Bot, 
  Cpu, 
  Folder, 
  ShieldCheck, 
  Download, 
  Check, 
  FolderArchive, 
  Settings, 
  Puzzle,
  ExternalLink
} from 'lucide-react';

interface LandingPageProps {
  onOpenApp: () => void;
  onOpenAboutModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenApp, onOpenAboutModal }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Animated demonstration step loop
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const handleCopyChromeUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const scrollToExtensionGuide = () => {
    const element = document.getElementById('extension-setup-guide');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const demoSteps = [
    { title: '1. Select Webpage Image', subtitle: 'User hovers & left-clicks product image on any website', badge: 'Chrome Extension' },
    { title: '2. Multi-Signal AI Analysis', subtitle: 'Generates 512-dim CLIP vector & dHash fingerprint', badge: 'FastAPI Backend' },
    { title: '3. Vector Similarity Search', subtitle: 'Scans indexed library vectors & SHA-256 hashes', badge: 'Image Intelligence Engine' },
    { title: '4. Exact Folder Location Found', subtitle: 'Identifies 98.7% Match in "Products / Nike / Shoes"', badge: 'FolderLens Result' },
  ];

  const installSteps = [
    {
      step: '01',
      title: 'Download & Unzip',
      desc: 'Download the extension package (.zip) using the button above and extract it to a permanent folder on your PC.',
      badge: 'Step 1'
    },
    {
      step: '02',
      title: 'Open Chrome Extensions',
      desc: 'Navigate to chrome://extensions in your Google Chrome or Brave/Edge URL bar.',
      badge: 'Step 2'
    },
    {
      step: '03',
      title: 'Enable Developer Mode',
      desc: 'Toggle the "Developer mode" switch in the top-right corner of your extensions page to ON.',
      badge: 'Step 3'
    },
    {
      step: '04',
      title: 'Click "Load Unpacked"',
      desc: 'Click the "Load unpacked" button in the top-left corner and select your extracted folder.',
      badge: 'Step 4'
    }
  ];

  return (
    <div className="relative min-h-screen text-darkText pt-10 pb-24 px-4 sm:px-6 lg:px-8 space-y-20 font-sans text-left transition-colors duration-200 overflow-hidden">
      {/* Background Image Layer for Overview page only */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('/overview-bg.png')`,
        }}
      />
      
      {/* Soft ambient overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/20 via-transparent to-spaceBg/80 pointer-events-none" />

      {/* Hero Section Container with Frosted Translucent Glass */}
      <div className="relative z-10 max-w-4xl mx-auto bg-white/45 backdrop-blur-md border border-white/50 shadow-2xl rounded-3xl p-8 sm:p-14 text-center space-y-7">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md text-olivePrimary text-xs font-bold tracking-wide border border-white/60 shadow-sm">
          <Sparkles className="w-4 h-4 text-olivePrimary" /> FOLDERLENS — CREATIVE FILE INTELLIGENCE
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-serif-title text-[#0F172A] leading-[1.12]">
          YOUR FILES.<br />
          <span className="text-[#0284C7]">
            VISUALLY SEARCHABLE.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#1E293B] font-semibold leading-relaxed">
          Find any image in your library using nothing but the image itself. Powered by OpenAI CLIP, perceptual hashing, and seamless Chrome Manifest V3 side panel integration.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={onOpenApp}
            className="px-7 py-3.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <span>Open Workspace Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={scrollToExtensionGuide}
            className="px-6 py-3.5 bg-white/80 hover:bg-white text-[#0F172A] font-bold text-sm rounded-xl border border-white/80 shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-[#0284C7]"
          >
            <Chrome className="w-4 h-4 text-[#0284C7]" />
            <span>Install Extension</span>
          </button>

          <button
            onClick={onOpenAboutModal}
            className="px-6 py-3.5 bg-white/60 backdrop-blur-md border border-white/60 hover:border-[#0284C7] text-[#0F172A] font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-md hover:bg-white/80"
          >
            <Cpu className="w-4 h-4 text-[#0284C7]" />
            <span>Architecture & Stack</span>
          </button>
        </div>
      </div>

      {/* Animated Live Demonstration Card */}
      <div className="relative z-10 max-w-4xl mx-auto bg-white/45 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/50 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between pb-6 border-b border-white/40">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accentDanger"></div>
            <div className="w-3 h-3 rounded-full bg-accentWarning"></div>
            <div className="w-3 h-3 rounded-full bg-accentSuccess"></div>
            <span className="ml-2 text-xs font-mono font-bold text-[#0F172A]">FolderLens Workflow Simulator</span>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-white/70 text-[#0284C7] border border-white/60 rounded-md">
            LIVE AI PIPELINE
          </span>
        </div>

        {/* Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-8">
          {demoSteps.map((step, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border text-left transition-all ${activeStep === idx
                  ? 'bg-white/80 border-[#0284C7] shadow-lg scale-105'
                  : 'bg-white/35 backdrop-blur-sm border-white/40 opacity-90'
                }`}
            >
              <span className="text-[10px] font-bold text-[#0284C7] uppercase tracking-wider block mb-1">
                {step.badge}
              </span>
              <div className="text-xs font-bold text-[#0F172A] mb-1">{step.title}</div>
              <div className="text-[11px] text-[#1E293B] font-medium leading-snug">{step.subtitle}</div>
            </div>
          ))}
        </div>

        {/* Simulation Output Card */}
        <div className="bg-white/50 backdrop-blur-sm p-5 rounded-2xl border border-white/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/80 border border-white/60 overflow-hidden flex items-center justify-center relative group shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=200"
                alt="Demo Product"
                className="w-full h-full object-cover"
              />
              <span className="absolute inset-0 bg-[#0284C7]/20 flex items-center justify-center opacity-100">
                <CheckCircle2 className="w-6 h-6 text-[#0D9488]" />
              </span>
            </div>
            <div>
              <div className="text-xs font-mono text-[#0D9488] flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> 98.7% MATCH CONFIDENCE
              </div>
              <div className="text-sm font-bold text-[#0F172A]">Nike Air Max Red Edition.jpg</div>
              <div className="text-xs text-[#1E293B] font-semibold flex items-center gap-1.5 mt-0.5">
                <Folder className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Products / Nike / Shoes</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onOpenApp}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <span>Test In Web App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chrome Extension Download & How-To-Use Guide Section */}
      <div id="extension-setup-guide" className="relative z-10 max-w-5xl mx-auto space-y-8 scroll-mt-20">
        <div className="bg-white/55 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-white/60 shadow-2xl space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-white/50">
            <div className="space-y-2 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0284C7]/10 text-[#0284C7] text-xs font-bold border border-[#0284C7]/20">
                <Chrome className="w-3.5 h-3.5" /> CHROME EXTENSION SETUP
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] font-serif-title">
                Install FolderLens in Your Browser
              </h2>
              <p className="text-xs sm:text-sm text-[#334155] font-medium max-w-xl">
                Search images on any live website using the FolderLens Manifest V3 Chrome Extension. Download the package below and activate it in 30 seconds.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href="/folderlens-extension.zip"
                download="folderlens-extension.zip"
                className="px-6 py-4 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 group transform hover:-translate-y-0.5"
              >
                <Download className="w-5 h-5 group-hover:animate-bounce" />
                <div className="text-left leading-tight">
                  <div className="text-[11px] font-medium opacity-90">Ready-to-use package</div>
                  <div className="text-sm font-extrabold">Download Extension (.zip)</div>
                </div>
              </a>
            </div>
          </div>

          {/* Step-by-Step Installation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {installSteps.map((item, idx) => (
              <div 
                key={idx}
                className="bg-white/65 backdrop-blur-sm p-5 rounded-2xl border border-white/60 shadow-md hover:border-[#0284C7] hover:shadow-lg transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-[#0284C7]/40">{item.step}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0284C7]/10 text-[#0284C7] rounded-md border border-[#0284C7]/20">
                      {item.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172A]">{item.title}</h4>
                  <p className="text-xs text-[#334155] font-medium leading-relaxed">{item.desc}</p>
                </div>

                {item.step === '02' && (
                  <div className="pt-2">
                    <button
                      onClick={handleCopyChromeUrl}
                      className="w-full py-1.5 px-2.5 bg-white/80 hover:bg-white text-[#0284C7] text-[11px] font-mono font-bold rounded-lg border border-[#0284C7]/30 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'Copied to Clipboard!' : 'chrome://extensions'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Start Tip Box */}
          <div className="bg-white/75 backdrop-blur-md p-5 rounded-2xl border border-[#0284C7]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center shrink-0">
                <Puzzle className="w-5 h-5" />
              </div>
              <div className="text-left text-xs text-[#1E293B] font-medium">
                <span className="font-bold text-[#0F172A] block text-sm">How to use once activated:</span>
                Click the Extension puzzle icon in Chrome toolbar, pin <strong className="text-[#0284C7]">FolderLens</strong>, and click it to open the search sidepanel!
              </div>
            </div>

            <a
              href="/folderlens-extension.zip"
              download="folderlens-extension.zip"
              className="text-xs font-bold text-[#0284C7] hover:text-[#0369A1] underline flex items-center gap-1 shrink-0 self-end sm:self-center"
            >
              <span>Download .zip again</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </div>

      {/* Feature Grid */}
      <div className="relative z-10 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2 bg-white/45 backdrop-blur-md rounded-2xl py-4 px-6 max-w-xl mx-auto border border-white/50 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] font-serif-title">Engineered for Precision & Speed</h2>
          <p className="text-xs sm:text-sm text-[#1E293B] font-semibold">Everything you need to index, organize, and visually search your file library.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/45 backdrop-blur-md p-6 rounded-2xl border border-white/50 text-left space-y-3 shadow-lg hover:bg-white/60 hover:border-[#0284C7] transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/70 text-[#0284C7] flex items-center justify-center border border-white/60 shadow-sm">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">Visual AI Search</h3>
            <p className="text-xs text-[#1E293B] font-medium leading-relaxed">
              Drop any image to compare against stored library vectors. Uses OpenAI CLIP ViT-Base models to recognize visual features across style changes.
            </p>
          </div>

          <div className="bg-white/45 backdrop-blur-md p-6 rounded-2xl border border-white/50 text-left space-y-3 shadow-lg hover:bg-white/60 hover:border-[#0284C7] transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/70 text-[#0284C7] flex items-center justify-center border border-white/60 shadow-sm">
              <Chrome className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">Chrome Extension</h3>
            <p className="text-xs text-[#1E293B] font-medium leading-relaxed">
              Browse any website, activate FolderLens Side Panel, and click any product image to immediately locate its folder inside your personal library.
            </p>
          </div>

          <div className="bg-white/45 backdrop-blur-md p-6 rounded-2xl border border-white/50 text-left space-y-3 shadow-lg hover:bg-white/60 hover:border-[#0284C7] transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/70 text-[#0D9488] flex items-center justify-center border border-white/60 shadow-sm">
              <Copy className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">Duplicate Intelligence</h3>
            <p className="text-xs text-[#1E293B] font-medium leading-relaxed">
              Automatically identifies exact SHA-256 binary duplicates and near-duplicate dHash resized versions to calculate storage space savings.
            </p>
          </div>

          <div className="bg-white/45 backdrop-blur-md p-6 rounded-2xl border border-white/50 text-left space-y-3 shadow-lg hover:bg-white/60 hover:border-[#0284C7] transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/70 text-[#0284C7] flex items-center justify-center border border-white/60 shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">AI Natural Assistant</h3>
            <p className="text-xs text-[#1E293B] font-medium leading-relaxed">
              Ask queries like "Find all black shoes" or "Which folder has charger images?". Translates text queries into real semantic vector searches.
            </p>
          </div>

          <div className="bg-white/45 backdrop-blur-md p-6 rounded-2xl border border-white/50 text-left space-y-3 shadow-lg hover:bg-white/60 hover:border-[#0284C7] transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/70 text-[#D97706] flex items-center justify-center border border-white/60 shadow-sm">
              <Folder className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">Folder & Batch Indexing</h3>
            <p className="text-xs text-[#1E293B] font-medium leading-relaxed">
              Upload entire image folders at once with real-time status tracking ("Uploading...", "Generating Fingerprints...", "Indexed").
            </p>
          </div>

          <div className="bg-white/45 backdrop-blur-md p-6 rounded-2xl border border-white/50 text-left space-y-3 shadow-lg hover:bg-white/60 hover:border-[#0284C7] transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/70 text-[#0D9488] flex items-center justify-center border border-white/60 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">Local & Isolated Security</h3>
            <p className="text-xs text-[#1E293B] font-medium leading-relaxed">
              Your indexed images and vector database remain fully under your control. Zero third-party indexing exposure or data leakage.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Footer Banner */}
      <div className="relative z-10 max-w-4xl mx-auto p-8 rounded-3xl bg-white/45 backdrop-blur-md border border-white/50 text-center space-y-4 shadow-2xl">
        <h3 className="text-2xl font-bold font-serif-title text-[#0F172A]">Ready to Search Your Library Visually?</h3>
        <p className="text-xs sm:text-sm text-[#1E293B] font-semibold max-w-xl mx-auto">
          Start creating product folders, importing images, and searching with the Chrome Extension.
        </p>
        <button
          onClick={onOpenApp}
          className="px-8 py-3.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          Launch FolderLens Workspace
        </button>
      </div>
    </div>
  );
};