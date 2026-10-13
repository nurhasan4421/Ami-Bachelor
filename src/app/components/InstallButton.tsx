import { useEffect, useState } from 'react';

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  if (!deferredPrompt) return null;

  return (
    <button 
      onClick={handleInstallClick}
      className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors"
    >
      Install App
    </button>
  );
}

// You can keep your Navbar here if you want, or move it to App.tsx
export function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4 border-b border-gray-100">
      <h1 className="text-xl font-bold">Ami Bachelor</h1>
      <InstallButton />
    </nav>
  );
}