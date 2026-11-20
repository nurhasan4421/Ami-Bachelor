import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Globe, Send, Shield, Sparkles, Heart, ExternalLink, HelpCircle, FileText } from 'lucide-react';

interface AboutPageProps {
  onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const socials = [
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/nurhasan4421/',
      color: '#1877F2',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/nurhasan4421/',
      color: '#E4405F',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      )
    },
    {
      name: 'Telegram',
      url: 'https://t.me/nurhasan4421',
      color: '#229ED9',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      )
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/nurhasan4421/',
      color: '#0A66C2',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-4 text-[#141414] animate-in fade-in duration-200">
      {/* Top Header bar with back button */}
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-sf-bold text-[#141414] hover:text-red-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <span className="font-sf-bold text-sm text-[#141414]">About</span>
        <div className="w-12" /> {/* Spacer for balance */}
      </div>

      {/* Main Identity Card (iOS Style) */}
      <section className="rounded-[24px] bg-white p-6 sm:p-7 shadow-sm border border-[#d6d6d6] text-center flex flex-col items-center">
        {/* App Icon */}
        <div className="w-20 h-20 rounded-[22px] bg-[#f8f8f6] p-2.5 shadow-md border border-[#e5e6e1] mb-3.5 flex items-center justify-center">
          <img src="/logo.png" alt="Ami Bachelor" className="w-full h-full object-contain" />
        </div>

        {/* App Name & Meta */}
        <h2 className="font-sf-bold text-xl text-[#141414] tracking-tight mb-1">
          Ami Bachelor
        </h2>

        <div className="space-y-0.5 text-xs font-sf-medium text-[#626262] mb-3">
          <p><strong className="text-[#141414]">Version:</strong> 1.0.0</p>
          <p><strong className="text-[#141414]">Build:</strong> 2026.11.21 (Production)</p>
          <p><strong className="text-[#141414]">Developer:</strong> @nurhasan4421</p>
        </div>

        <p className="font-sf-regular text-xs text-[#8e8e8e] mb-4">
          Ami Bachelor Corporation • Copyright © 2026
        </p>

        {/* Short Story / Why App Was Made */}
        <div className="p-3.5 rounded-[16px] bg-[#f8f8f6] border border-[#e5e6e1] text-left text-xs font-sf-regular text-[#444] leading-relaxed mb-5">
          <p>
            Designed & built for bachelors, roommates, and mess members to make shared living effortless. Track daily meals, split grocery and bazar costs fairly, manage individual food deposits, and view automated monthly calculations with zero paper hassle.
          </p>
        </div>

        {/* Social Media Link Icons */}
        <div className="w-full pt-4 border-t border-[#e5e6e1]">
          <p className="font-sf-bold text-[10px] text-[#8e8e8e] uppercase tracking-wider mb-3">
            Connect with Developer
          </p>
          <div className="flex items-center justify-center gap-3.5 sm:gap-4">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#f3f3f1] hover:bg-[#e5e6e1] text-[#333] hover:text-red-600 transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95 border border-[#d6d6d6]"
                title={s.name}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Grouped iOS List Menu (like reference image) */}
      <div className="rounded-[20px] bg-white border border-[#d6d6d6] shadow-sm overflow-hidden divide-y divide-[#e5e6e1]">
        {/* Row 1: Why Ami Bachelor? */}
        <button
          onClick={() => setActiveDialog(activeDialog === 'why' ? null : 'why')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="font-sf-semibold text-xs sm:text-[13px] text-[#141414]">
            Why Ami Bachelor?
          </span>
          <ChevronRight size={16} className={`text-[#8e8e8e] transition-transform ${activeDialog === 'why' ? 'rotate-90' : ''}`} />
        </button>
        {activeDialog === 'why' && (
          <div className="p-4 bg-[#f8f8f6] text-xs font-sf-regular text-[#4a4a4a] leading-relaxed space-y-2 text-left">
            <p>
              In traditional messes across Bangladesh, monthly calculations are maintained on handwritten paper notebooks (khata). When paper gets lost or numbers don't add up, conflicts arise among roommates.
            </p>
            <p>
              Ami Bachelor automates everything with live cloud sync: meal rates are dynamically calculated, bazar expenses are verified, and individual balances (credit/due) are generated transparently.
            </p>
          </div>
        )}

        {/* Row 2: Core Features */}
        <button
          onClick={() => setActiveDialog(activeDialog === 'features' ? null : 'features')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="font-sf-semibold text-xs sm:text-[13px] text-[#141414]">
            Core Platform Features
          </span>
          <ChevronRight size={16} className={`text-[#8e8e8e] transition-transform ${activeDialog === 'features' ? 'rotate-90' : ''}`} />
        </button>
        {activeDialog === 'features' && (
          <div className="p-4 bg-[#f8f8f6] text-xs font-sf-regular text-[#4a4a4a] leading-relaxed space-y-1.5 text-left">
            <p>• <strong>Daily Bazar Checklist:</strong> Check off grocery items in real-time with purchase costs.</p>
            <p>• <strong>Meal Spreadsheet:</strong> Breakfast, Lunch, and Dinner tracker with auto sums.</p>
            <p>• <strong>Individual Accounts:</strong> One-click money receipt slips and due/credit statements.</p>
            <p>• <strong>ManagerBro Bot:</strong> Add meals and expenses straight from Telegram.</p>
            <p>• <strong>Offline PWA Support:</strong> Works full-screen on iPhone and Android with zero browser bars.</p>
          </div>
        )}

        {/* Row 3: Privacy & Security */}
        <button
          onClick={() => setActiveDialog(activeDialog === 'privacy' ? null : 'privacy')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="font-sf-semibold text-xs sm:text-[13px] text-[#141414]">
            Privacy & Security
          </span>
          <ChevronRight size={16} className={`text-[#8e8e8e] transition-transform ${activeDialog === 'privacy' ? 'rotate-90' : ''}`} />
        </button>
        {activeDialog === 'privacy' && (
          <div className="p-4 bg-[#f8f8f6] text-xs font-sf-regular text-[#4a4a4a] leading-relaxed space-y-2 text-left">
            <p>
              Your hostel data is protected by Supabase Row-Level Security (RLS). Only approved members of your hostel can view your mess records.
            </p>
            <p>
              We do not track personal cookies, sell user metrics, or inject ads.
            </p>
          </div>
        )}

        {/* Row 4: Community Standards & Fair Use */}
        <button
          onClick={() => setActiveDialog(activeDialog === 'standards' ? null : 'standards')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="font-sf-semibold text-xs sm:text-[13px] text-[#141414]">
            Community Standards & Support
          </span>
          <ChevronRight size={16} className={`text-[#8e8e8e] transition-transform ${activeDialog === 'standards' ? 'rotate-90' : ''}`} />
        </button>
        {activeDialog === 'standards' && (
          <div className="p-4 bg-[#f8f8f6] text-xs font-sf-regular text-[#4a4a4a] leading-relaxed space-y-2 text-left">
            <p>
              Managers are responsible for fair calculation rules and timely entries. If you encounter any bugs, feature requests, or need custom deployment, reach out directly on Telegram to <strong>@nurhasan4421</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="text-center py-2 text-[11px] font-sf-medium text-[#8e8e8e]">
        Made with ❤️ for Bangladeshi Bachelors
      </div>
    </div>
  );
}
