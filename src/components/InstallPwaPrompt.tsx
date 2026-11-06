import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, PlusSquare, MoreVertical, Download, X, Smartphone, Check, Sparkles } from 'lucide-react';

interface InstallPwaPromptProps {
  onDismiss?: () => void;
  forceOpen?: boolean;
}

export function InstallPwaPrompt({ onDismiss, forceOpen = false }: InstallPwaPromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Detect Standalone mode (already installed & running full screen)
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isInStandaloneMode);

    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // Listen for Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-show prompt after 3 seconds if not dismissed previously
      const hasDismissed = localStorage.getItem('ami_install_prompt_dismissed');
      if (!hasDismissed && !isInStandaloneMode) {
        setTimeout(() => setIsOpen(true), 2500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If on iOS and not standalone, show prompt after delay if not dismissed
    if (isIosDevice && !isInStandaloneMode) {
      const hasDismissed = localStorage.getItem('ami_install_prompt_dismissed');
      if (!hasDismissed) {
        setTimeout(() => setIsOpen(true), 2500);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // When triggered via header or menu
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsOpen(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('ami_install_prompt_dismissed', 'true');
    if (onDismiss) onDismiss();
  };

  // If already installed and running as standalone app, don't show prompt unless forced
  if (isStandalone && !forceOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-[#d6d6d6] overflow-hidden flex flex-col p-6 text-[#141414] pb-safe"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e6e1]">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Ami Bachelor" className="h-10 w-10 rounded-2xl object-contain shadow-xs bg-[#f3f3f1] p-1 border border-[#e5e6e1]" />
                <div>
                  <h3 className="font-sf-bold text-base text-[#141414] flex items-center gap-1.5">
                    Add to Home Screen <Sparkles size={14} className="text-red-600" />
                  </h3>
                  <p className="font-sf-regular text-[11px] text-[#626262]">
                    Use like a native mobile app without browser bar
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-[#8e8e8e] hover:text-[#141414] hover:bg-[#f3f3f1] rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Based on Platform */}
            <div className="py-4 space-y-3.5">
              {isIOS ? (
                /* iOS Instructions */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full w-fit text-[11px] font-sf-bold">
                    <Smartphone size={13} /> iPhone / iPad Setup
                  </div>
                  <ol className="space-y-2.5 text-xs text-[#333]">
                    <li className="flex items-start gap-2.5 bg-[#f9f9f8] p-3 rounded-[14px] border border-[#e5e6e1]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-sf-bold text-white">
                        1
                      </span>
                      <span>
                        Tap the <b>Share</b> button <Share2 size={14} className="inline mx-1 text-blue-600" /> at the bottom or top of Safari browser.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-[#f9f9f8] p-3 rounded-[14px] border border-[#e5e6e1]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-sf-bold text-white">
                        2
                      </span>
                      <span>
                        Scroll down and tap <b>Add to Home Screen</b> <PlusSquare size={14} className="inline mx-1 text-slate-700" />.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-[#f9f9f8] p-3 rounded-[14px] border border-[#e5e6e1]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-sf-bold text-white">
                        3
                      </span>
                      <span>
                        Tap <b>Add</b> in top right corner. The app opens full-screen without address bar!
                      </span>
                    </li>
                  </ol>
                </div>
              ) : isAndroid && deferredPrompt ? (
                /* Android 1-Click Install */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full w-fit text-[11px] font-sf-bold">
                    <Smartphone size={13} /> 1-Click Android App Install
                  </div>
                  <p className="text-xs text-[#626262] leading-relaxed">
                    Install <b>Ami Bachelor</b> to your home screen. It takes 0 MB storage, works offline, and opens like a real Play Store app!
                  </p>
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-sf-bold text-sm rounded-[14px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 active:scale-[0.99] cursor-pointer"
                  >
                    <Download size={16} /> Install App Now
                  </button>
                </div>
              ) : (
                /* Generic Android / Chrome / Browser instructions */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-full w-fit text-[11px] font-sf-bold">
                    <Smartphone size={13} /> Mobile Browser Setup
                  </div>
                  <ol className="space-y-2.5 text-xs text-[#333]">
                    <li className="flex items-start gap-2.5 bg-[#f9f9f8] p-3 rounded-[14px] border border-[#e5e6e1]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-sf-bold text-white">
                        1
                      </span>
                      <span>
                        Tap the browser menu <b>(⋮ or ⋯)</b> <MoreVertical size={14} className="inline text-[#141414]" /> in the top/bottom corner.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-[#f9f9f8] p-3 rounded-[14px] border border-[#e5e6e1]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-sf-bold text-white">
                        2
                      </span>
                      <span>
                        Tap <b>Install app</b> or <b>Add to Home screen</b>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 bg-[#f9f9f8] p-3 rounded-[14px] border border-[#e5e6e1]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-sf-bold text-white">
                        3
                      </span>
                      <span>
                        Confirm <b>Install</b>. The app will launch directly from your home screen without URL bars!
                      </span>
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Bottom benefits strip */}
            <div className="pt-2 border-t border-[#e5e6e1] flex items-center justify-around text-[10px] font-sf-medium text-[#626262]">
              <span className="flex items-center gap-1">
                <Check size={12} className="text-emerald-600" /> Full-Screen App
              </span>
              <span className="flex items-center gap-1">
                <Check size={12} className="text-emerald-600" /> Ultra Fast
              </span>
              <span className="flex items-center gap-1">
                <Check size={12} className="text-emerald-600" /> Zero Storage
              </span>
            </div>

            <button
              onClick={handleClose}
              className="mt-4 w-full py-2.5 rounded-[12px] bg-[#f3f3f1] hover:bg-[#e5e6e1] font-sf-semibold text-xs text-[#141414] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
