import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  SlidersHorizontal,
  Send,
  Wallet,
  Plus,
  Receipt,
  Users,
  RotateCcw,
  ArrowDownRight,
  Utensils,
  ChevronRight,
  Calendar,
  ChevronDown,
  Home,
  Banknote,
  ReceiptText,
  ShieldCheck,
  Settings,
  UserCheck,
  Eye,
  LogOut,
  X,
  Clock,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type DashboardView =
  | 'dashboard'
  | 'timeline'
  | 'fixed-costs'
  | 'meals'
  | 'expenses'
  | 'accounts'
  | 'manage-hostel'
  | 'availability'
  | 'settings';

export const expenses = [
  ['Rice 25kg & Dal 5kg', 'Nur H.', '08 Oct', '৳ 2,450'],
  ['Fresh Fish & Vegetables', 'Tanvir', '07 Oct', '৳ 1,280'],
  ['Chicken & Spices', 'Siam', '05 Oct', '৳ 950'],
  ['Cooking Oil & Salt', 'Rakib', '03 Oct', '৳ 643'],
];

export function Icon({
  name,
  className = '',
  alt
}: {
  name?: string;
  className?: string;
  alt?: string;
}) {
  // If it's an avatar image
  if (name?.endsWith('.png')) {
    return (
      <div className={`flex items-center justify-center bg-[#2b2b2b] text-white font-sf-bold text-xs ${className}`}>
        {alt ? alt.charAt(0) : 'N'}
      </div>
    );
  }

  // Icon mapping according to design
  switch (name) {
    case '965da.svg':
      return <Bell className={`text-red-600 ${className}`} />;
    case 'd3e95.svg':
      return <SlidersHorizontal className={`text-[#626262] ${className}`} />;
    case 'f8922.svg':
      return <Send className={`text-[#141414] ${className}`} />;
    case '17aa6.svg':
      return <Wallet className={`text-[#141414] ${className}`} />;
    case '9ebd9.svg':
      return <Plus className={`text-[#141414] ${className}`} />;
    case '50b05.svg':
      return <Receipt className={`text-[#141414] ${className}`} />;
    case '149c5.svg':
      return <Users className={`text-[#626262] ${className}`} />;
    case 'e45d9.svg':
      return <RotateCcw className={`text-[#626262] ${className}`} />;
    case '50f6c.svg':
      return <ArrowDownRight className={`text-[#626262] ${className}`} />;
    case '66992.svg':
      return <Utensils className={`text-red-600 ${className}`} />;
    case '10566.svg':
      return <ChevronRight className={`text-[#626262] ${className}`} />;
    case '5b19b.svg':
      return <Calendar className={`text-[#626262] ${className}`} />;
    case '67f13.svg':
    case '84274.svg':
      return <ShieldCheck className={`text-red-600 ${className}`} />;
    default:
      return <span className={`inline-block w-4 h-4 ${className}`} />;
  }
}

export function SectionTitle({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`font-sf-semibold text-[16px] text-[#141414] ${className}`}>
      {children}
    </h2>
  );
}

export function InfoCard({
  title,
  due = false,
  width = '160px',
  children,
  className = ''
}: {
  title: string;
  due?: boolean;
  width?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      style={{ width: width !== 'auto' ? width : undefined }}
      className={`flex h-[128px] shrink-0 flex-col justify-between rounded-[16px] bg-[#e5e6e1] px-[10px] py-[8px] text-[#141414] ${due ? 'border border-red-500/40 shadow-sm' : ''} ${className}`}
      tabIndex={0}
    >
      <div className="flex h-[24px] items-start justify-between">
        <span className="font-sf-medium text-[12px]">{title}</span>
        {due && <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />}
      </div>
      {children}
    </article>
  );
}

export function SheetCard({
  showPeople = false,
  peopleCount = 0,
  total = '0',
  onClick,
  roommates = [],
  dailyMeals = []
}: {
  showPeople?: boolean;
  peopleCount?: number;
  total?: string;
  onClick?: () => void;
  roommates?: string[];
  dailyMeals?: Array<{ date: string; meals: Record<string, number> }>;
}) {
  const displayNames = roommates.slice(0, 5);
  const getInitial = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const sortedDays = [...dailyMeals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const row1 = sortedDays[0]?.meals || {};
  const row2 = sortedDays[1]?.meals || {};

  return (
    <article
      onClick={onClick}
      className="flex h-[128px] w-[160px] shrink-0 cursor-pointer flex-col justify-between rounded-[16px] bg-[#e5e6e1] px-[10px] py-[8px] hover:bg-[#dedfd9] transition-colors"
      tabIndex={0}
    >
      <div className="flex items-center gap-[6px]">
        <div className="flex h-[19px] w-[17px] items-center justify-center shrink-0">
          <svg className="h-[19px] w-[17px]" viewBox="0 0 17 20" fill="none">
            <path d="M0 3.5C0 1.567 1.567 0 3.5 0H11L17 6V16.5C17 18.433 15.433 20 13.5 20H3.5C1.567 20 0 18.433 0 16.5V3.5Z" fill="#ff0000" />
            <path d="M11 0V4.5C11 5.328 11.672 6 12.5 6H17L11 0Z" fill="#ff3333" opacity="0.8" />
            <rect x="2.5" y="6" width="3.5" height="2.2" rx="0.8" fill="white" />
            <rect x="7" y="6" width="3.5" height="2.2" rx="0.8" fill="white" />
            <rect x="2.5" y="10" width="3.5" height="2.2" rx="0.8" fill="white" />
            <rect x="7" y="10" width="3.5" height="2.2" rx="0.8" fill="white" />
            <rect x="2.5" y="14" width="3.5" height="2.2" rx="0.8" fill="white" />
            <rect x="7" y="14" width="3.5" height="2.2" rx="0.8" fill="white" />
          </svg>
        </div>
        <span className="font-sf-medium text-[13px] text-[#141414]">Sheet</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[#141414]">
          {showPeople ? (
            <div className="flex items-center gap-1 font-sf-bold text-[11px]">
              <Users size={12} className="text-[#141414]" />
              <span>{peopleCount}</span>
            </div>
          ) : (
            <div />
          )}
          <p className="font-sf-bold text-[10px] text-[#141414]">
            TOTAL <span className="text-[#141414] font-sf-bold text-[11px]">{total}</span>
          </p>
        </div>
        <div className="w-full text-[8.5px] font-sf-medium">
          {displayNames.length > 0 ? (
            <>
              <div
                className="grid text-center text-[#8e8e8e] pb-0.5 border-b border-[#d4d5cf]"
                style={{ gridTemplateColumns: `repeat(${Math.max(displayNames.length, 1)}, minmax(0, 1fr))` }}
              >
                {displayNames.map((name, i) => (
                  <span key={i} className="truncate px-0.5 font-sf-bold">{getInitial(name)}</span>
                ))}
              </div>
              <div
                className="grid text-center text-[#141414] py-0.5 border-b border-[#d4d5cf]/60 font-sf-medium"
                style={{ gridTemplateColumns: `repeat(${Math.max(displayNames.length, 1)}, minmax(0, 1fr))` }}
              >
                {displayNames.map((name, i) => {
                  const val = row1[name];
                  return (
                    <span key={i} className={val !== undefined && val !== null ? '' : 'text-[#8e8e8e]'}>
                      {val !== undefined && val !== null ? val : '-'}
                    </span>
                  );
                })}
              </div>
              <div
                className="grid text-center text-[#141414] pt-0.5 font-sf-medium"
                style={{ gridTemplateColumns: `repeat(${Math.max(displayNames.length, 1)}, minmax(0, 1fr))` }}
              >
                {displayNames.map((name, i) => {
                  const val = row2[name];
                  return (
                    <span key={i} className={val !== undefined && val !== null ? '' : 'text-[#8e8e8e]'}>
                      {val !== undefined && val !== null ? val : '-'}
                    </span>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-2 text-center text-[#8e8e8e] text-[9px]">
              No members added
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

interface DashboardHeaderProps {
  current: 'admin' | 'member';
  activeView?: DashboardView;
  logo?: string;
  onNavigate: (view: DashboardView) => void;
  onToggleRole?: () => void;
  registeredName?: string;
  hostelName?: string;
  broadcastNotice?: string;
  onSendNotice?: (text: string) => void;
  onOpenNoticeModal?: () => void;
}

export function DashboardHeader({
  current,
  activeView = 'dashboard',
  onNavigate,
  onToggleRole,
  registeredName = 'Nur H.',
  hostelName = 'AREA 51',
  broadcastNotice = 'Everyone Please send money before Sunday evening...',
  onSendNotice,
  onOpenNoticeModal
}: DashboardHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdminNoticeModal, setShowAdminNoticeModal] = useState(false);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);

  // Prevent background scrolling when manager notification modal is active
  useEffect(() => {
    if (showAdminNoticeModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showAdminNoticeModal]);

  // Notifications list (initialized with current broadcast notice if available)
  const [adminNotices, setAdminNotices] = useState<Array<{
    id: string;
    title: string;
    message: string;
    dateStr: string;
    timeStr: string;
    sender: string;
    category: string;
    unread: boolean;
    sentToCount?: number;
  }>>(() => {
    if (broadcastNotice && !broadcastNotice.toLowerCase().includes('sunday evening')) {
      const now = new Date();
      return [{
        id: 'notice-current',
        title: 'Active Announcement',
        message: broadcastNotice,
        dateStr: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        timeStr: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sender: registeredName ? `Manager (${registeredName})` : 'Manager',
        category: 'Announcement',
        unread: true,
      }];
    }
    return [];
  });

  // Keep live notice updated if prop changes
  useEffect(() => {
    if (broadcastNotice) {
      setAdminNotices((prev) => {
        const first = prev[0];
        if (first && first.id === 'admin-notif-1') {
          return [{ ...first, message: broadcastNotice }, ...prev.slice(1)];
        }
        return prev;
      });
    }
  }, [broadcastNotice]);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteNotice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAdminNotices((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="sticky top-0 z-50 mb-[16px] border-b border-[#d6d6d6]/70 bg-[#f3f3f1]/90 backdrop-blur-md">
      <div className="mx-auto flex h-[64px] w-[calc(100%-32px)] items-center justify-between lg:max-w-[900px]">
        {/* Brand / Logo */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex cursor-pointer items-center select-none hover:opacity-85 transition-opacity"
          title="Home"
        >
          <img src="/logo.png" alt="Logo" className="h-[34px] w-auto object-contain" />
        </div>

        {/* Action Controls & Dropdown Menu */}
        <div ref={menuRef} className="relative flex items-center gap-[8px] sm:gap-[10px]">
          {/* Admin / Member Role Switch Pill */}
          <button
            type="button"
            onClick={onToggleRole}
            className="flex h-[34px] items-center gap-[6px] rounded-[30px] border border-[#d6d6d6] bg-[#e5e6e1] px-[12px] font-sf-medium text-[11px] text-[#141414] transition-transform active:scale-95 shadow-sm"
            title="Switch between Admin and Member mode"
          >
            {current === 'admin' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-red-600" />
                <span className="font-sf-bold text-red-600">Admin</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Member</span>
              </>
            )}
            <Eye size={12} className="text-[#626262] ml-1" />
          </button>

          {/* Notification Icon (on the left side of hamburger) */}
          <button
            type="button"
            onClick={() => {
              if (current === 'member' && onOpenNoticeModal) {
                onOpenNoticeModal();
              } else {
                setShowAdminNoticeModal(true);
              }
            }}
            className="relative flex h-[34px] w-[34px] items-center justify-center text-[#141414] hover:text-red-600 transition-colors active:scale-95 cursor-pointer bg-transparent border-0"
            title={current === 'admin' ? "Manager Notifications & Broadcast" : "Mess Notifications"}
          >
            <Bell size={20} className="text-current" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-[#f3f3f1] animate-pulse" />
          </button>

          {/* Animated Hamburger Icon Button (transparent, just icon color) */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation menu"
            className={`relative flex h-[34px] w-[34px] items-center justify-center transition-colors active:scale-95 cursor-pointer bg-transparent border-0 ${
              isMenuOpen ? 'text-red-600' : 'text-[#141414] hover:text-red-600'
            }`}
            title="Navigation Menu"
          >
            <div className="flex h-[18px] w-[20px] flex-col items-center justify-center gap-[4.5px]">
              <span
                className={`block h-[2px] w-[18px] rounded-full transition-all duration-300 ease-in-out ${
                  isMenuOpen
                    ? 'bg-red-600 rotate-45 translate-y-[6.5px]'
                    : 'bg-current'
                }`}
              />
              <span
                className={`block h-[2px] w-[18px] rounded-full transition-all duration-300 ease-in-out ${
                  isMenuOpen
                    ? 'opacity-0 translate-x-2'
                    : 'bg-current'
                }`}
              />
              <span
                className={`block h-[2px] w-[18px] rounded-full transition-all duration-300 ease-in-out ${
                  isMenuOpen
                    ? 'bg-red-600 -rotate-45 -translate-y-[6.5px]'
                    : 'bg-current'
                }`}
              />
            </div>
          </button>

          {/* Dropdown Menu Modal / Sheet */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-[8px] w-[260px] rounded-[20px] border border-[#d6d6d6] bg-[#f3f3f1] p-[8px] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="space-y-[4px]">
                {[
                  { view: 'timeline' as DashboardView, label: 'Timeline Months', icon: <Calendar size={16} /> },
                  { view: 'fixed-costs' as DashboardView, label: 'Fixed Monthly Cost', icon: <Banknote size={16} /> },
                  { view: 'meals' as DashboardView, label: 'Meal Details', icon: <Utensils size={16} /> },
                  { view: 'expenses' as DashboardView, label: 'Recent Expenses', icon: <ReceiptText size={16} /> },
                  { view: 'accounts' as DashboardView, label: 'Accounts', icon: <Wallet size={16} /> },
                  { view: 'availability' as DashboardView, label: 'Member Availability', icon: <UserCheck size={16} /> },
                  { view: 'manage-hostel' as DashboardView, label: 'Manage Flatmates', icon: <Users size={16} /> },
                  { view: 'settings' as DashboardView, label: 'Settings & History', icon: <Settings size={16} /> },
                ].map((item) => {
                  const isActive = activeView === item.view;
                  const isSettings = item.view === 'settings';
                  return (
                    <React.Fragment key={item.view}>
                      {isSettings && <div className="my-1 border-t border-[#d6d6d6]/60" />}
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(item.view);
                          setIsMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-[10px] rounded-[12px] px-[12px] py-[9.5px] text-[13px] transition-all cursor-pointer ${
                          isActive
                            ? 'bg-red-50/70 text-red-600 font-sf-bold'
                            : 'font-sf-medium text-[#141414] hover:bg-[#e5e6e1]'
                        }`}
                      >
                        <span className={isActive ? 'text-red-600' : 'text-[#626262]'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MANAGER / ADMIN NOTIFICATION POPUP OVERLAY */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showAdminNoticeModal && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overscroll-contain select-none"
                onClick={() => setShowAdminNoticeModal(false)}
                onTouchMove={(e) => {
                  if (e.target === e.currentTarget) {
                    e.preventDefault();
                  }
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 16 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="relative flex w-[calc(100%-16px)] sm:w-full max-w-[420px] max-h-[82vh] flex-col rounded-[22px] sm:rounded-[24px] bg-[#f8f8f6] p-4 sm:p-5 shadow-2xl border border-[#e5e6e1] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#e5e6e1] shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-red-600/10 text-red-600 shrink-0">
                        <Bell className="h-5 w-5 fill-red-600 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-sf-bold text-[15px] sm:text-[16px] text-[#141414] leading-tight">
                            Mess Notifications
                          </h3>
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-sf-bold text-red-600 uppercase tracking-wider">
                            Manager
                          </span>
                        </div>
                        <p className="font-sf-regular text-[11px] text-[#8e8e8e] mt-0.5">
                          Recent updates & announcements
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAdminNoticeModal(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5e6e1] text-[#626262] hover:bg-[#d8d9d4] hover:text-black transition-colors shrink-0 cursor-pointer"
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Manager Broadcast Notice Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const input = form.elements.namedItem('broadcastInput') as HTMLInputElement;
                      const val = input?.value?.trim();
                      if (val) {
                        if (onSendNotice) {
                          onSendNotice(val);
                        }
                        const now = new Date();
                        const newNotice = {
                          id: 'notice-' + Date.now(),
                          title: 'Notice from Manager',
                          message: val,
                          dateStr: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
                          timeStr: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                          sender: registeredName ? `Manager (${registeredName})` : 'Manager',
                          category: 'Announcement',
                          unread: true,
                          sentToCount: 0,
                        };
                        setAdminNotices((prev) => [newNotice, ...prev]);
                        input.value = '';
                      }
                    }}
                    className="mt-3 flex items-center gap-2 bg-white p-2 rounded-[14px] border border-[#d6d6d6] shadow-xs"
                  >
                    <input
                      name="broadcastInput"
                      type="text"
                      placeholder="Send notice to all flatmates..."
                      className="flex-1 bg-transparent px-2 text-xs font-sf-medium text-[#141414] outline-none placeholder-[#8e8e8e]"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-[10px] font-sf-bold text-[11px] transition-colors shadow-xs"
                    >
                      <Send size={12} />
                      <span>Send</span>
                    </button>
                  </form>

                  {/* Notifications List */}
                  <div className="mt-2.5 flex-1 overflow-y-auto divide-y divide-[#e5e6e1] overscroll-contain pr-1 -mr-1">
                    {adminNotices.length > 0 ? (
                      adminNotices.map((notif) => {
                        const isExpanded = expandedNoticeId === notif.id;
                        return (
                          <div
                            key={notif.id}
                            onClick={() => setExpandedNoticeId(isExpanded ? null : notif.id)}
                            className={`group cursor-pointer py-3.5 px-1.5 transition-colors ${
                              isExpanded ? 'bg-black/[0.02]' : 'hover:bg-black/[0.015]'
                            }`}
                          >
                            {/* Top Meta Row */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {notif.unread && (
                                  <span className="h-2 w-2 rounded-full bg-red-600 shrink-0 animate-pulse" />
                                )}
                                <span className="rounded-full bg-[#e5e6e1] px-2 py-0.5 text-[9px] font-sf-semibold uppercase tracking-wider text-[#626262]">
                                  {notif.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] font-sf-medium text-[#8e8e8e] shrink-0">
                                <Clock size={11} className="text-[#8e8e8e]" />
                                <span>{notif.dateStr}</span>
                                <span className="text-[#c0c0c0]">•</span>
                                <span>{notif.timeStr}</span>
                                <ChevronDown
                                  size={14}
                                  className={`ml-1 text-[#8e8e8e] transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180 text-red-600' : ''
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Title & Preview */}
                            <div className="mt-1.5">
                              <h4 className="font-sf-semibold text-[13px] text-[#141414] leading-snug">
                                {notif.title}
                              </h4>
                              {!isExpanded && (
                                <p className="mt-0.5 truncate font-sf-regular text-[11.5px] text-[#626262]">
                                  {notif.message}
                                </p>
                              )}
                            </div>

                            {/* Dropdown Motion Expanded Content */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: 'easeOut' }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-2.5 border-t border-[#e5e6e1]/60 pt-2 text-[12.5px] leading-relaxed text-[#2c2c2c]">
                                    <p className="whitespace-pre-wrap font-sf-regular">{notif.message}</p>
                                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#8e8e8e] border-t border-[#e5e6e1]/40 pt-2">
                                      <div className="flex items-center gap-1.5">
                                        <span>
                                          Author: <strong className="text-black font-sf-medium">{notif.sender}</strong>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteNotice(notif.id, e)}
                                          className="flex items-center gap-1 text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                          title="Delete notice"
                                        >
                                          <Trash2 size={12} />
                                          <span>Delete</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-xs text-[#8e8e8e]">
                        No notifications yet
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </header>
  );
}
