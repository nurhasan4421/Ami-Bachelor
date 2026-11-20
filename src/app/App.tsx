import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabaseClient';
import { HostelOnboarding } from './components/HostelOnboarding';
import { RoommateManager } from './components/RoommateManager';
import { ExpenseForm } from './components/ExpenseForm';
import { IndividualAccount } from './components/IndividualAccount';
import { MealSpreadsheet } from './components/MealSpreadsheet';
import { FoodFundTracker } from './components/FoodFundTracker';
import { FixedCostsManager } from './components/FixedCostsManager';
import { motion, AnimatePresence } from 'framer-motion';
import MemberPage from '@/components/MemberPage';
import AdminPage from '@/components/AdminPage';
import { DashboardHeader, type DashboardView } from '@/components/DashboardShared';
import { InstallPwaPrompt } from '@/components/InstallPwaPrompt';
import SuperAdminPage from '@/components/SuperAdminPage';
import { AboutPage } from '@/components/AboutPage';
import { showPhonePushNotification } from '@/lib/pushNotifications';
import { generatePrintableDoc, openPrintableWindow } from '@/lib/pdfReportTemplate';

import { KeyRound, LogOut, Plus, History, ReceiptText, Home, Utensils, RotateCcw, ChevronDown, X, Eye, ShieldCheck, Users, Wallet, UserCircle, ClipboardList, Copy, Check, ShoppingBag, CheckCircle2, Circle, Settings, Banknote, Trash2, UserCheck, UserX, Download, ArrowRight, ArrowLeft, Calendar, MoreVertical, Bell, Clock, Power, Bot, Info } from 'lucide-react';

interface HostelData { 
  id: number; 
  name: string; 
  security_code: string; 
  telegram_link_code?: string;
  bot_enabled?: boolean;
  role: 'manager' | 'member'; 
  latestMonthId: string;
  status?: 'active' | 'pending' | 'deactivated' | 'rejected';
  rejection_reason?: string;
  transaction_id?: string;
}
interface MonthSheet { id: string; name: string; owner_id?: string; security_code?: string; hostel_id?: number; show_actions_to_members?: boolean; hostels?: { id: number; name: string; security_code: string; telegram_link_code?: string; bot_enabled?: boolean; status?: string; }; }
interface Roommate { id: string; name: string; user_id: string | null; month_id: string; role?: string; email?: string; phone?: string; address?: string; joined_date?: string; }
interface Expense { id: string; description: string; amount: number; category: string; paidBy: string; date: string; }
interface DailyMeal { id?: string; date: string; meals: { [person: string]: number }; }
interface FoodDeposit { id: string; person: string; amount: number; date: string; }
interface ManualAdjustments { [person: string]: number; }
interface FixedCost { category: string; amount: number; }
interface AuditLog { id: string; person: string; action: string; created_at: string; }
interface BazarItem { id: number; date: string; item_name: string; is_completed: boolean; completed_by?: string; }
interface MealSchedule { id?: number; date: string; breakfast: string; lunch: string; dinner: string; }
interface MemberAvail { id: number; user_id: string; name: string; status: 'in'|'out'; }

type ViewState = 'dashboard' | 'timeline' | 'fixed-costs' | 'meals' | 'expenses' | 'accounts' | 'manage-hostel' | 'settings' | 'availability' | 'super-admin' | 'about';
const StatusBadge = ({ balance }: { balance: number }) => {
  if (Math.abs(balance) < 1) return <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[9px] font-black uppercase">Paid</span>;
  if (balance > 0) return <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[9px] font-black uppercase">CR ৳{balance.toFixed(0)}</span>;
  return <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-[9px] font-black uppercase">Due ৳{Math.abs(balance).toFixed(0)}</span>;
};
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [months, setMonths] = useState<MonthSheet[]>([]);
  const [activeMonthId, setActiveMonthId] = useState<string | null>(() => localStorage.getItem('activeMonthId'));
  const [isInitialSyncing, setIsInitialSyncing] = useState(true);
  
  const [activeView, setActiveView] = useState<ViewState>(() => {
    const saved = localStorage.getItem('ami_active_view') as ViewState;
    const validViews: ViewState[] = ['dashboard', 'timeline', 'fixed-costs', 'meals', 'expenses', 'accounts', 'manage-hostel', 'settings', 'availability', 'super-admin', 'about'];
    return (saved && validViews.includes(saved)) ? saved : 'dashboard';
  });

  const [managedHostels, setManagedHostels] = useState<HostelData[]>([]);
  const [joinedHostels, setJoinedHostels] = useState<HostelData[]>([]);
  const [roommatesData, setRoommatesData] = useState<Roommate[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyMeals, setDailyMeals] = useState<DailyMeal[]>([]);
  const [foodDeposits, setFoodDeposits] = useState<FoodDeposit[]>([]);
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustments>({});
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>(() => {
    const currentM = localStorage.getItem('activeMonthId') || 'month-current';
    try {
      const saved = localStorage.getItem(`ami_fixed_costs_${currentM}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bazarItems, setBazarItems] = useState<BazarItem[]>([]);
  const [newBazarItem, setNewBazarItem] = useState('');
  const [showAllBazar, setShowAllBazar] = useState(false);
  const [mealSchedule, setMealSchedule] = useState<MealSchedule>({ date: new Date().toISOString().split('T')[0], breakfast: '0', lunch: '0', dinner: '0' });
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [availability, setAvailability] = useState<MemberAvail[]>([]);
  const [showFlatmatesModal, setShowFlatmatesModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedTelegramCode, setCopiedTelegramCode] = useState(false);
  const [regeneratingTelegram, setRegeneratingTelegram] = useState(false);
  const [showTelegramInfoOverlay, setShowTelegramInfoOverlay] = useState(false);
  const [viewMode, setViewMode] = useState<'manager' | 'member'>('manager');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [showAllAccounts, setShowAllAccounts] = useState(false); 
  const [showAllAvail, setShowAllAvail] = useState(false);
  const [openTimelineMenuId, setOpenTimelineMenuId] = useState<string | null>(null);
  const [showInstallPwa, setShowInstallPwa] = useState(false);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
  const [showActiveMonthRedirectDialog, setShowActiveMonthRedirectDialog] = useState(false);
  const activeMonthRedirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeMonthGraceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🌟 NEW: Apple-Style Notification Banner & Dialog States
  const [staySignedIn, setStaySignedIn] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('ami_stay_signed_in');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'prompt';
    title: string;
    message?: string;
    defaultValue?: string;
    placeholder?: string;
    isDanger?: boolean;
    onConfirm: (val?: string) => void;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const roommates = useMemo(() => roommatesData.map(r => r.name), [roommatesData]);

  const isManager = useMemo(() => {
    if (!activeMonthId || months.length === 0) return false;
    const currentMonth = months.find(m => m.id === activeMonthId);
    const myRoommateRecord = roommatesData.find(r => r.user_id === session?.user?.id);
    const isOwner = session?.user?.id === currentMonth?.owner_id;
    const isSupervisor = myRoommateRecord?.role === 'supervisor';
    return isOwner || isSupervisor;
  }, [session, months, activeMonthId, roommatesData]);

  const registeredName = useMemo(() => {
    const myRecord = roommatesData.find(r => r.user_id === session?.user?.id);
    return myRecord ? myRecord.name : (isManager ? 'Manager' : '');
  }, [roommatesData, session, isManager]);

  const SUPER_ADMIN_EMAIL = 'nurhasan4421@gmail.com';

  const isSuperAdmin = useMemo(() => {
    const email = session?.user?.email?.trim().toLowerCase();
    return email === SUPER_ADMIN_EMAIL || email === 'nurhasan@gmail.com';
  }, [session]);

  const effectiveIsManager = isManager && viewMode === 'manager';

  useEffect(() => {
    if (activeMonthId) localStorage.setItem('activeMonthId', activeMonthId);
    else localStorage.removeItem('activeMonthId');
  }, [activeMonthId]);

  useEffect(() => {
    if (activeView) localStorage.setItem('ami_active_view', activeView);
  }, [activeView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { 
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false); 
      if (openTimelineMenuId && !(event.target as Element).closest('.timeline-menu-container')) {
        setOpenTimelineMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, openTimelineMenuId]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error signing out:", e);
    }
    setSession(null);
    try {
      sessionStorage.removeItem('ami_session_active');
      localStorage.removeItem('activeMonthId');
      localStorage.removeItem('ami_active_view');
    } catch (e) {
      console.warn("Storage cleanup error:", e);
    }
  };

  useEffect(() => {
    // If user explicitly unchecked "Stay signed in", check if this is a fresh launch
    try {
      const staySignedInPref = localStorage.getItem('ami_stay_signed_in');
      if (staySignedInPref === 'false') {
        const isSessionActive = sessionStorage.getItem('ami_session_active');
        if (!isSessionActive) {
          // User closed tab/app earlier and chose not to stay signed in -> auto logout
          handleLogout();
          setLoadingAuth(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Auth persistence check warning:", e);
    }

    supabase.auth.getSession().then(({ data, error }: any) => {
      if (!error && data?.session) {
        setSession(data.session);
        try {
          sessionStorage.setItem('ami_session_active', 'true');
        } catch {}
      }
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null);
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setSession(session);
        try {
          sessionStorage.setItem('ami_session_active', 'true');
        } catch {}
      } else if (event === 'PASSWORD_RECOVERY') {
        // If password is being reset, log out current session for security
        handleLogout();
      } else {
        setSession(session);
      }
      setLoadingAuth(false);
    });

    // In case user changed their password or revoked access on another device/tab
    // listen for cross-tab storage changes to automatically log out
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.includes('auth-token') && !e.newValue) {
        handleLogout();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Auto-logout if user chose NOT to stay signed in and becomes inactive
  useEffect(() => {
    if (!session) return;
    try {
      const staySignedInPref = localStorage.getItem('ami_stay_signed_in');
      if (staySignedInPref === 'true') return; // User opted to stay signed in permanently
    } catch {
      return;
    }

    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
    let timeoutId: any;
    let lastActive = Date.now();

    const resetInactivity = () => {
      lastActive = Date.now();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
      }, INACTIVITY_LIMIT_MS);
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        if (Date.now() - lastActive > INACTIVITY_LIMIT_MS) {
          handleLogout();
        } else {
          resetInactivity();
        }
      }
    };

    resetInactivity();
    const activeEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activeEvents.forEach(evt => window.addEventListener(evt, resetInactivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timeoutId);
      activeEvents.forEach(evt => window.removeEventListener(evt, resetInactivity));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [session]);

  const logAction = async (action: string) => {
    if (!activeMonthId) return;
    try { await supabase.from('history_logs').insert([{ month_id: activeMonthId, person: registeredName || 'Manager', action }]); fetchSheetData(); } 
    catch (e) { console.error("Logging error", e); }
  };

  const fetchMonthsAndHostels = useCallback(async () => {
    if (!session) return;
    const { data: managedRes } = await supabase
      .from('months')
      .select('*, hostels(id, name, security_code, telegram_link_code, bot_enabled, status, transaction_id, rejection_reason)')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: false });
      
    const { data: myRooms } = await supabase.from('roommates').select('month_id').eq('user_id', session.user.id);
    let joinedRes: MonthSheet[] = [];
    if (myRooms && myRooms.length > 0) {
      const monthIds = [...new Set(myRooms.map(r => r.month_id))];
      const { data } = await supabase
        .from('months')
        .select('*, hostels(id, name, security_code, telegram_link_code, bot_enabled, status, transaction_id, rejection_reason)')
        .in('id', monthIds)
        .order('created_at', { ascending: false });
      if (data) joinedRes = data;
    }
    const managedM = managedRes || [];
    const joinedM = joinedRes;
    const allAccessibleMonths = [...managedM, ...joinedM].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    setMonths(allAccessibleMonths);

    // Find the month configured as active for the workspace
    const hostelActiveMonth = allAccessibleMonths.find(m => m.show_actions_to_members === true);

    const savedMonthId = localStorage.getItem('activeMonthId');
    if (savedMonthId && allAccessibleMonths.some(m => m.id === savedMonthId)) {
      setActiveMonthId(savedMonthId);
    } else if (savedMonthId === null) {
      // User explicitly exited to Setup Screen - do NOT auto-redirect!
      setActiveMonthId(null);
    } else if (activeMonthId && !allAccessibleMonths.some(m => m.id === activeMonthId)) {
      setActiveMonthId(hostelActiveMonth?.id || allAccessibleMonths[0]?.id || null);
    } else if (!activeMonthId && allAccessibleMonths.length > 0) {
      // Only initial load if no explicit exit
      setActiveMonthId(hostelActiveMonth?.id || allAccessibleMonths[0].id);
    }
    const mHostelsMap = new Map<number, HostelData>();
    managedM.forEach(m => { 
      if (m.hostels && !mHostelsMap.has(m.hostels.id)) {
        mHostelsMap.set(m.hostels.id, { 
          ...m.hostels, 
          status: (m.hostels.status as any) || 'active',
          role: 'manager', 
          latestMonthId: m.id 
        }); 
      }
    });

    const jHostelsMap = new Map<number, HostelData>();
    joinedM.forEach(m => { 
      if (m.hostels && !mHostelsMap.has(m.hostels.id) && !jHostelsMap.has(m.hostels.id)) {
        jHostelsMap.set(m.hostels.id, { 
          ...m.hostels, 
          status: (m.hostels.status as any) || 'active',
          role: 'member', 
          latestMonthId: m.id 
        }); 
      }
    });
    setManagedHostels(Array.from(mHostelsMap.values()));
    setJoinedHostels(Array.from(jHostelsMap.values()));
    setIsInitialSyncing(false);
  }, [session, activeMonthId]);

  useEffect(() => { fetchMonthsAndHostels(); }, [fetchMonthsAndHostels]);

  const activeHostelId = months.find(m => m.id === activeMonthId)?.hostels?.id;
  const visibleMonthsInHostel = months.filter(m => m.hostels?.id === activeHostelId);
  const hostelActiveMonth = useMemo(() => {
    const active = visibleMonthsInHostel.find(m => m.show_actions_to_members === true);
    return active || visibleMonthsInHostel[0] || null;
  }, [visibleMonthsInHostel]);
  const currentMonthObj = months.find(m => m.id === activeMonthId);
  const currentHostel = currentMonthObj?.hostels;
  const currentHostelStatus = (currentHostel as any)?.status || 'active';
  const isHostelLocked = currentHostelStatus === 'deactivated' || currentHostelStatus === 'pending' || currentHostelStatus === 'rejected';

  // Monitor when a member is browsing a non-active month (auto redirect after 5m or wait 3m)
  useEffect(() => {
    if (activeMonthRedirectTimerRef.current) {
      clearTimeout(activeMonthRedirectTimerRef.current);
      activeMonthRedirectTimerRef.current = null;
    }
    if (activeMonthGraceTimerRef.current) {
      clearTimeout(activeMonthGraceTimerRef.current);
      activeMonthGraceTimerRef.current = null;
    }
    setShowActiveMonthRedirectDialog(false);

    // Only apply to members when viewing another month in the hostel
    if (viewMode === 'member' && hostelActiveMonth && activeMonthId && activeMonthId !== hostelActiveMonth.id) {
      // 5 minutes timer
      activeMonthRedirectTimerRef.current = setTimeout(() => {
        setShowActiveMonthRedirectDialog(true);
      }, 5 * 60 * 1000);
    }

    return () => {
      if (activeMonthRedirectTimerRef.current) clearTimeout(activeMonthRedirectTimerRef.current);
      if (activeMonthGraceTimerRef.current) clearTimeout(activeMonthGraceTimerRef.current);
    };
  }, [activeMonthId, hostelActiveMonth?.id, viewMode]);

  const handleConfirmActiveMonthRedirect = () => {
    if (hostelActiveMonth) {
      setActiveMonthId(hostelActiveMonth.id);
      showToast(`Switched to active month: ${hostelActiveMonth.name}`);
    }
    setShowActiveMonthRedirectDialog(false);
  };

  const handleWaitActiveMonthRedirect = () => {
    setShowActiveMonthRedirectDialog(false);
    showToast("Waiting 3 minutes before auto-switching to active month", "info");
    if (activeMonthGraceTimerRef.current) clearTimeout(activeMonthGraceTimerRef.current);
    activeMonthGraceTimerRef.current = setTimeout(() => {
      if (hostelActiveMonth) {
        setActiveMonthId(hostelActiveMonth.id);
        showToast(`Auto-switched to active month (${hostelActiveMonth.name})`);
      }
    }, 3 * 60 * 1000);
  };

  const monthsByYear = useMemo(() => {
    return visibleMonthsInHostel.reduce((acc, m) => {
      const yearMatch = m.name.match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : 'Other';
      if (!acc[year]) acc[year] = [];
      acc[year].push(m);
      return acc;
    }, {} as Record<string, MonthSheet[]>);
  }, [visibleMonthsInHostel]);

  const fetchSheetData = useCallback(async () => {
    if (!session || !activeMonthId) return;
    const today = scheduleDate;
    const [rooms, exps, meals, deposits, adjustments, fixed, logs, bazar, schedules, avail] = await Promise.all([
      supabase.from('roommates').select('*').eq('month_id', activeMonthId).order('name'),
      supabase.from('expenses').select('*').eq('month_id', activeMonthId).order('date', { ascending: false }),
      supabase.from('daily_meals').select('*').eq('month_id', activeMonthId),
      supabase.from('food_deposits').select('*').eq('month_id', activeMonthId),
      supabase.from('manual_adjustments').select('*').eq('month_id', activeMonthId),
      supabase.from('fixed_costs').select('*').eq('month_id', activeMonthId),
      supabase.from('history_logs').select('*').eq('month_id', activeMonthId).order('created_at', { ascending: false }),
      supabase.from('bazar_list').select('*').eq('month_id', activeMonthId).eq('date', today).order('id', { ascending: true }),
      supabase.from('meal_schedules').select('*').eq('month_id', activeMonthId).eq('date', today).maybeSingle(),
      supabase.from('member_availability').select('*').eq('month_id', activeMonthId)
    ]);

    setRoommatesData(rooms.data || []); setExpenses(exps.data?.map(e => ({ ...e, amount: parseFloat(e.amount) })) || []);
    setDailyMeals(meals.data || []); setFoodDeposits(deposits.data?.map(d => ({ ...d, amount: parseFloat(d.amount) })) || []);

    // Fixed Costs persistence: sync Supabase data with local fallback
    let resolvedFixed = fixed.data || [];
    if (resolvedFixed.length > 0) {
      localStorage.setItem(`ami_fixed_costs_${activeMonthId}`, JSON.stringify(resolvedFixed));
    } else {
      try {
        const cached = localStorage.getItem(`ami_fixed_costs_${activeMonthId}`);
        if (cached) resolvedFixed = JSON.parse(cached);
      } catch {}
    }
    setFixedCosts(resolvedFixed); setAuditLogs(logs.data || []); setBazarItems(bazar.data || []); setAvailability(avail.data || []);
    if (schedules.data) setMealSchedule(schedules.data); else setMealSchedule({ date: today, breakfast: '0', lunch: '0', dinner: '0' });
    const adjObject: Record<string, number> = {};
    adjustments.data?.forEach(item => { adjObject[item.person] = Number(item.amount) });
    setManualAdjustments(adjObject);
  }, [session, activeMonthId, scheduleDate]);

  useEffect(() => { fetchSheetData(); }, [fetchSheetData]);

  // Realtime Live Data Synchronization & System Notifications
  useEffect(() => {
    if (!session || !activeMonthId) return;

    // Fetch initial latest notice from notifications table if available
    supabase
      .from('notifications')
      .select('message')
      .eq('month_id', activeMonthId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data[0]?.message) {
          setBroadcastNotice(data[0].message);
        }
      });

    let syncTimer: any = null;
    const triggerSilentSync = (msg?: string) => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        fetchSheetData();
        showToast(msg || "Data updated live", "info");
      }, 350);
    };

    const channel = supabase
      .channel(`live-sync-month-${activeMonthId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `month_id=eq.${activeMonthId}`
        },
        (payload: any) => {
          const newNoti = payload.new;
          if (!newNoti) return;

          // Check if it's meant for everyone or specifically for current user
          if (!newNoti.target_member_id || newNoti.target_member_id === session?.user?.id) {
            setBroadcastNotice(newNoti.message);
            showToast(`New Announcement: ${newNoti.message}`);
            showPhonePushNotification('Ami Bachelor - Notice', newNoti.message);
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roommates', filter: `month_id=eq.${activeMonthId}` }, () => {
        triggerSilentSync("Flatmates updated live");
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `month_id=eq.${activeMonthId}` }, () => {
        triggerSilentSync("Expenses updated live");
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_meals', filter: `month_id=eq.${activeMonthId}` }, () => {
        triggerSilentSync("Meals updated live");
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_deposits', filter: `month_id=eq.${activeMonthId}` }, () => {
        triggerSilentSync("Deposits updated live");
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixed_costs', filter: `month_id=eq.${activeMonthId}` }, () => {
        triggerSilentSync("Fixed costs updated live");
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bazar_list', filter: `month_id=eq.${activeMonthId}` }, () => {
        triggerSilentSync("Bazar list updated live");
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_schedules', filter: `month_id=eq.${activeMonthId}` }, () => {
        triggerSilentSync("Meal schedule updated live");
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'months', filter: `id=eq.${activeMonthId}` }, () => {
        triggerSilentSync("Month updated live");
      })
      .subscribe();

    return () => {
      if (syncTimer) clearTimeout(syncTimer);
      supabase.removeChannel(channel);
    };
  }, [session, activeMonthId, fetchSheetData]);

  const handleAddBazarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBazarItem.trim() || !activeMonthId) return;
    const { data } = await supabase.from('bazar_list').insert([{ month_id: activeMonthId, date: scheduleDate, item_name: newBazarItem.trim() }]).select();
    if (data) { setBazarItems([...bazarItems, data[0]]); setNewBazarItem(''); }
  };

  const handleToggleBazarItem = async (id: number, currentStatus: boolean) => {
    const newlyChecked = !currentStatus;
    const completedBy = newlyChecked ? registeredName : undefined;
    
    setBazarItems(prev => prev.map(item => item.id === id ? { ...item, is_completed: newlyChecked, completed_by: completedBy } : item));
    await supabase.from('bazar_list').update({ is_completed: newlyChecked }).eq('id', id);
    
    if (!effectiveIsManager) logAction(`Marked ${bazarItems.find(i=>i.id===id)?.item_name} as ${newlyChecked ? 'done' : 'needed'}`);
  };

  const handleDeleteBazarItem = async (id: number) => {
    if (!effectiveIsManager) return;
    setBazarItems(prev => prev.filter(item => item.id !== id));
    await supabase.from('bazar_list').delete().eq('id', id);
  };

  const handleUpdateMealMenu = async (type: 'breakfast'|'lunch'|'dinner', value: string) => {
    if (!activeMonthId) return;
    const updatedSchedule = { ...mealSchedule, [type]: value, date: scheduleDate, month_id: activeMonthId };
    setMealSchedule(updatedSchedule);
    if (mealSchedule.id) await supabase.from('meal_schedules').update({ [type]: value }).eq('id', mealSchedule.id);
    else { const { data } = await supabase.from('meal_schedules').insert([updatedSchedule]).select(); if (data) setMealSchedule(data[0]); }
  };

  const handleToggleAvailability = async (status: 'in' | 'out') => {
    if (!activeMonthId || !session?.user?.id || !registeredName) return;
    const existing = availability.find(a => a.user_id === session.user.id);
    if (existing) {
      setAvailability(availability.map(a => a.id === existing.id ? { ...a, status } : a));
      await supabase.from('member_availability').update({ status }).eq('id', existing.id);
    } else {
      const { data } = await supabase.from('member_availability').insert([{ month_id: activeMonthId, user_id: session.user.id, name: registeredName, status }]).select();
      if (data) setAvailability([...availability, data[0]]);
    }
  };

  const handleNavClick = (view: ViewState) => { setActiveView(view); setIsMenuOpen(false); };
  
  const handlePrintMasterTransaction = () => {
    const totalExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${window.location.origin}/logo.png" style="height: 52px; object-fit: contain; margin-bottom: 8px;" />
        <h1 style="margin: 0; font-size: 22px;">Master Transaction Register</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">${currentMonthObj?.hostels?.name || 'Hostel Workspace'} • ${currentMonthObj?.name || 'Current Month'}</p>
        <p style="color: #94a3b8; font-size: 11px; margin: 2px 0 0 0;">Total Logged: <b>৳${totalExp.toLocaleString()}</b> across ${expenses.length} records</p>
      </div>

      <h2>Transaction Details</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 100px;">Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Paid By</th>
            <th class="text-right" style="width: 120px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${sortedExpenses.map(e => `
            <tr>
              <td>${new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
              <td><b>${e.description}</b></td>
              <td><span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${e.category}</span></td>
              <td>${e.paidBy}</td>
              <td class="text-right font-mono">৳${Number(e.amount || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f8fafc; font-weight: bold;">
            <td colspan="4" class="text-right">TOTAL EXPENSES:</td>
            <td class="text-right font-mono" style="color: #ff0000; font-size: 15px;">৳${totalExp.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    `;

    const html = generatePrintableDoc({
      defaultFilename: `Master_Transactions_${(currentMonthObj?.name || 'CurrentMonth').replace(/\s+/g, '_')}`,
      contentHtml
    });

    openPrintableWindow(html);
  };

  // Set month as the workspace active month (visible to all members on home page)
  const handleSetGlobalActiveMonth = async (targetMonth: MonthSheet) => {
    try {
      setActiveMonthId(targetMonth.id);
      // Set show_actions_to_members = true on selected month, and false on other months in this hostel
      await supabase
        .from('months')
        .update({ show_actions_to_members: false })
        .eq('hostel_id', targetMonth.hostel_id);

      await supabase
        .from('months')
        .update({ show_actions_to_members: true })
        .eq('id', targetMonth.id);

      // Update local months state
      setMonths(prev =>
        prev.map(m =>
          m.hostel_id === targetMonth.hostel_id
            ? { ...m, show_actions_to_members: m.id === targetMonth.id }
            : m
        )
      );

      logAction(`Set "${targetMonth.name}" as current active month for all members`);
      showToast(`Set "${targetMonth.name}" as active month for all members!`);
      await fetchMonthsAndHostels();
    } catch (err) {
      console.error('Failed setting active month:', err);
      showToast('Failed to set active month', 'error');
    }
  };

  // 🌟 NEW: Custom Modal Handlers
  const handleRenameMonth = (m: MonthSheet) => {
    setDialog({ isOpen: true, type: 'prompt', title: 'Rename Month', defaultValue: m.name, onConfirm: async (newName: string | undefined) => {
      if (!newName || newName === m.name) return;
      await supabase.from('months').update({ name: newName }).eq('id', m.id);
      setMonths(months.map(mon => mon.id === m.id ? { ...mon, name: newName } : mon));
      logAction(`Renamed month to: ${newName}`);
      showToast("Month renamed successfully");
    }});
  };

  const handleCloneMonth = (m: MonthSheet) => {
    setDialog({ isOpen: true, type: 'prompt', title: 'Clone Month', defaultValue: `${m.name} (Copy)`, onConfirm: async (newName: string | undefined) => {
      if (!newName) return;
      const { data: newMonth } = await supabase.from('months').insert([{ name: newName, owner_id: session?.user.id, hostel_id: m.hostel_id, security_code: m.security_code }]).select('*, hostels(id, name, security_code)');
      if (newMonth) { 
        const { data: oldRooms } = await supabase.from('roommates').select('*').eq('month_id', m.id);
        if (oldRooms) await supabase.from('roommates').insert(oldRooms.map(r => ({ name: r.name, month_id: newMonth[0].id, user_id: r.user_id })));
        const { data: oldFixed } = await supabase.from('fixed_costs').select('*').eq('month_id', m.id);
        if (oldFixed) await supabase.from('fixed_costs').insert(oldFixed.map(f => ({ category: f.category, amount: f.amount, month_id: newMonth[0].id })));
        setMonths([...months, newMonth[0]]); setActiveMonthId(newMonth[0].id); logAction(`Cloned month: ${newName}`); 
        showToast("Month cloned successfully");
      }
    }});
  };

  const handleAddMonth = () => {
    setDialog({ isOpen: true, type: 'prompt', title: 'New Month', placeholder: 'e.g., May 2026', onConfirm: async (name: string | undefined) => {
      if (!name) return;
      const currentHostel = months.find(m => m.id === activeMonthId);
      const { data: oldRooms } = await supabase.from('roommates').select('*').eq('month_id', activeMonthId);
      const { data: newMonth } = await supabase.from('months').insert([{ name, owner_id: session?.user.id, hostel_id: currentHostel?.hostel_id, security_code: currentHostel?.hostels?.security_code }]).select('*, hostels(id, name, security_code)');
      if (newMonth && oldRooms) { 
        const roomsToInsert = oldRooms.map(r => ({ name: r.name, month_id: newMonth[0].id, user_id: r.user_id }));
        await supabase.from('roommates').insert(roomsToInsert);
        setMonths([...months, newMonth[0]]); setActiveMonthId(newMonth[0].id); logAction(`Added new month: ${name}`); 
        showToast("New month created!");
      }
    }});
  };

  const handleDeleteTimelineMonth = (mId: string) => {
    const monthToDelete = months.find(m => m.id === mId);
    const remainingInHostel = months.filter(m => m.hostels?.id === monthToDelete?.hostels?.id);
    if (remainingInHostel.length <= 1) { showToast("Cannot delete the last remaining month! Create a new one first.", "error"); return; }
    
    setDialog({ isOpen: true, type: 'confirm', title: 'Delete Month', message: `Are you sure you want to permanently delete "${monthToDelete?.name}"?`, isDanger: true, onConfirm: async () => {
      const { error } = await supabase.from('months').delete().eq('id', mId);
      if (!error) {
        const updated = months.filter(m => m.id !== mId);
        setMonths(updated); 
        if (activeMonthId === mId) {
          const freshRemaining = updated.filter(m => m.hostels?.id === monthToDelete?.hostels?.id);
          setActiveMonthId(freshRemaining[freshRemaining.length - 1].id); 
        }
        showToast("Month deleted permanently");
      }
    }});
  };

  const handleDeleteCurrentMonth = () => {
    if (!activeMonthId) return;
    const currentMonth = months.find(m => m.id === activeMonthId);
    const remainingInHostel = months.filter(m => m.hostels?.id === currentMonth?.hostels?.id);
    if (remainingInHostel.length <= 1) { showToast("Cannot delete the last remaining month! Create a new one first.", "error"); return; }
    
    setDialog({ isOpen: true, type: 'confirm', title: 'Delete Month', message: `Delete "${currentMonth?.name}"?`, isDanger: true, onConfirm: async () => {
      const { error } = await supabase.from('months').delete().eq('id', activeMonthId);
      if (!error) {
        const updated = months.filter(m => m.id !== activeMonthId);
        setMonths(updated); const freshRemaining = updated.filter(m => m.hostels?.id === currentMonth?.hostels?.id);
        setActiveMonthId(freshRemaining[freshRemaining.length - 1].id); setIsMenuOpen(false);
        showToast("Month deleted");
      }
    }});
  };

  const handleDeleteHostel = () => {
    const correctCode = currentMonthObj?.hostels?.security_code;
    setDialog({ isOpen: true, type: 'confirm', title: 'DELETE WORKSPACE?', message: 'This cannot be undone. Are you absolutely sure?', isDanger: true, onConfirm: () => {
       setTimeout(() => {
         setDialog({ isOpen: true, type: 'prompt', title: 'Confirm Deletion', message: `Enter Code (${correctCode}) to confirm:`, isDanger: true, onConfirm: async (val: string | undefined) => {
           if (val !== correctCode) { showToast("Incorrect code.", "error"); return; }
           try {
              setLoadingAuth(true);
              await supabase.from('months').delete().eq('owner_id', session?.user?.id).eq('hostel_id', currentMonthObj?.hostel_id);
              if (currentMonthObj?.hostel_id) await supabase.from('hostels').delete().eq('id', currentMonthObj.hostel_id);
              setActiveMonthId(null); await fetchMonthsAndHostels(); setLoadingAuth(false);
              showToast("Workspace deleted");
           } catch (e: any) { showToast("Failed: " + e.message, "error"); setLoadingAuth(false); }
         }});
       }, 300);
    }});
  };

  const handleResetData = () => {
    if (!activeMonthId) return;
    setDialog({ isOpen: true, type: 'confirm', title: 'Reset Month Data', message: 'WARNING: Will delete all expenses/meals/deposits for this month. Proceed?', isDanger: true, onConfirm: async () => {
      try {
        await Promise.all(['expenses', 'daily_meals', 'food_deposits', 'manual_adjustments', 'fixed_costs', 'history_logs', 'bazar_list', 'meal_schedules', 'member_availability'].map(t => supabase.from(t).delete().eq('month_id', activeMonthId)));
        fetchSheetData(); setIsMenuOpen(false);
        showToast("Sheet data reset to zero");
      } catch (e) { console.error(e); }
    }});
  };

  const handleCopyCode = () => {
    const code = currentMonthObj?.hostels?.security_code || '';
    if (code) { navigator.clipboard.writeText(code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); showToast("Code Copied!"); }
  };

  const handleCopyTelegramCode = () => {
    const code = currentMonthObj?.hostels?.telegram_link_code || '';
    if (code) { navigator.clipboard.writeText(`/link ${code}`); setCopiedTelegramCode(true); setTimeout(() => setCopiedTelegramCode(false), 2000); showToast("Telegram command copied! Paste into bot"); }
  };

  const handleRegenerateTelegramCode = async () => {
    const hostelId = currentMonthObj?.hostels?.id;
    if (!hostelId) return;
    setRegeneratingTelegram(true);
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let rand = '';
      for (let i = 0; i < 6; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
      const newCode = `TG-${rand}`;

      const { error } = await supabase
        .from('hostels')
        .update({ telegram_link_code: newCode })
        .eq('id', hostelId);

      if (error) throw error;

      // Disconnect all previous telegram chats linked to this hostel so old connections cannot post
      await supabase
        .from('telegram_connections')
        .delete()
        .eq('hostel_id', hostelId);

      showToast("Telegram Connect Code regenerated! Previous bot connections disconnected.");
      fetchMonthsAndHostels();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to regenerate code", "error");
    } finally {
      setRegeneratingTelegram(false);
    }
  };

  const handleAddExpense = async (ed: Omit<Expense, 'id'>) => {
    if (!activeMonthId) return;
    const { data, error } = await supabase.from('expenses').insert([{ ...ed, amount: Number(ed.amount), month_id: activeMonthId }]).select();
    if (!error && data) { 
      setExpenses(prev => [{ ...data[0], amount: Number(data[0].amount) }, ...prev]); 
      logAction(`Logged expense: ${ed.description} (৳${ed.amount})`); 
      fetchSheetData();
      showToast("Saved successfully");
    }
  };
  const handleDeleteExpense = async (id: string) => {
    if (!activeMonthId) return;
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (!error) {
        setExpenses((prev) => prev.filter((ex) => ex.id !== id));
        fetchSheetData();
        showToast("Entry deleted successfully");
      } else {
        console.error("Error deleting:", error.message);
        showToast("Failed to delete entry", "error");
      }
    } catch (e) {
      console.error("Error:", e);
    }
  };

  const handleDeleteDeposit = async (id: string | number) => {
    if (!activeMonthId) return;
    try {
      const { error } = await supabase
        .from('food_deposits')
        .delete()
        .eq('id', id);

      if (!error) {
        setFoodDeposits((prev) => prev.filter((d) => d.id !== id));
        fetchSheetData();
        showToast("Deposit deleted successfully");
      } else {
        console.error("Error deleting deposit:", error.message);
        showToast("Failed to delete deposit", "error");
      }
    } catch (e) {
      console.error("Error:", e);
    }
  };
  const handleAddDailyMeal = async (date: string, person: string, meals: number) => {
    if (!activeMonthId) return;
    const { data: existing } = await supabase.from('daily_meals').select('*').eq('date', date).eq('month_id', activeMonthId);
    if (existing?.length) {
      const upJSON = { ...existing[0].meals, [person]: (Number(existing[0].meals[person]) || 0) + meals };
      await supabase.from('daily_meals').update({ meals: upJSON }).eq('id', existing[0].id);
    } else {
      await supabase.from('daily_meals').insert([{ date, meals: { [person]: meals }, month_id: activeMonthId }]);
    }
    logAction(`Logged ${meals} meal(s) for ${person}`); fetchSheetData();
    showToast("Meal added!");
  };

  const [broadcastNotice, setBroadcastNotice] = useState<string>(() => {
    return localStorage.getItem('ami_hostel_notice') || '';
  });

  const handleSendNotice = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBroadcastNotice(trimmed);
    localStorage.setItem('ami_hostel_notice', trimmed);
    logAction(`Notice sent: ${trimmed}`);
    showToast(`Notification sent to flatmates!`);

    if (activeMonthId) {
      try {
        await supabase.from('notifications').insert([{
          month_id: activeMonthId,
          message: trimmed,
          target_member_id: null,
        }]);
      } catch (err) {
        console.error('Failed to sync notification to database:', err);
      }
    }
  };

  const handleAddDeposit = async (person: string, amount: number, date: string) => {
    if (!activeMonthId) return;
    const { data, error } = await supabase.from('food_deposits').insert([
      { month_id: activeMonthId, person, amount: Number(amount), date }
    ]).select();
    if (!error && data) {
      setFoodDeposits(prev => [...prev, { ...data[0], amount: Number(data[0].amount) }]);
      logAction(`Logged deposit: ৳${amount} for ${person}`);
      fetchSheetData();
      showToast(`Deposit of ৳${amount} saved for ${person}`);
    } else if (error) {
      showToast(`Failed to save deposit: ${error.message}`, 'error');
    }
  };

  const handleExportMonthPDF = () => {
    const contentHtml = `
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${window.location.origin}/logo.png" style="height: 52px; object-fit: contain; margin-bottom: 8px;" />
        <h1 style="margin: 0; font-size: 22px;">Workspace Summary Report: ${currentMonthObj?.hostels?.name || 'Hostel Mess'}</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">${currentMonthObj?.name || 'Current Month'} • Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>

      <h2>1. Members Account Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Member Name</th>
            <th class="text-right">Total Bill</th>
            <th class="text-right">Total Paid</th>
            <th class="text-right">Net Balance</th>
          </tr>
        </thead>
        <tbody>
          ${calculations.indAccounts.map(a => {
            const totalBill = Object.values(a.expenses).reduce((sum, val) => sum + val, 0) + a.manualAdjustment;
            const bal = totalBill - a.paid;
            return `
              <tr>
                <td><b>${a.name}</b></td>
                <td class="text-right font-mono">৳${totalBill.toFixed(2)}</td>
                <td class="text-right font-mono">৳${a.paid.toFixed(2)}</td>
                <td class="text-right font-mono ${bal > 0 ? 'due' : 'credit'}">${bal > 0 ? 'DUE ৳'+bal.toFixed(2) : 'CR ৳'+Math.abs(bal).toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <h2>2. Fixed Costs</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th class="text-right">Total Amount</th>
            <th class="text-right">Per Person (${roommates.length})</th>
          </tr>
        </thead>
        <tbody>
          ${fixedCosts.map(f => `
            <tr>
              <td>${f.category}</td>
              <td class="text-right font-mono">৳${f.amount.toFixed(2)}</td>
              <td class="text-right font-mono">৳${(f.amount/roommates.length).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>3. Expense History</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Paid By</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map(e => `
            <tr>
              <td>${new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
              <td>${e.description}</td>
              <td>${e.category}</td>
              <td>${e.paidBy}</td>
              <td class="text-right font-mono">৳${Number(e.amount || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>4. Member Meal Count</h2>
      <table>
        <thead>
          <tr>
            <th>Member Name</th>
            <th class="text-right">Total Meals Consumed</th>
          </tr>
        </thead>
        <tbody>
          ${calculations.mealStats.map(s => `
            <tr>
              <td>${s.person}</td>
              <td class="text-right font-mono">${s.meals}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const html = generatePrintableDoc({
      defaultFilename: `Month_Report_${(currentMonthObj?.name || 'CurrentMonth').replace(/\s+/g, '_')}`,
      contentHtml
    });

    openPrintableWindow(html);
  };

  const handleExportMemberPDF = () => {
    const btn = document.getElementById(`download-btn-${registeredName}`);
    if (btn) btn.click();
  };

  const calculations = useMemo(() => {
    const safeNum = (v: any) => parseFloat(v?.toString() || '0') || 0;
    
    // Categorize transactions:
    // 1. Deposits to Meal fund: food_deposits, expenses with category 'Meal', or legacy 'Deposit'
    const mealDepositsFromExpenses = expenses.filter(e => e.category === 'Meal' || e.category === 'Deposit');
    const unifiedMealDeposits = [
      ...foodDeposits,
      ...mealDepositsFromExpenses.map(e => ({ id: e.id, person: e.paidBy, amount: e.amount, date: e.date, category: 'Meal' }))
    ];

    // 2. Deposits to Account (Fixed Costs):
    const accountDeposits = expenses.filter(e => e.category === 'Account' || e.category === 'Fixed Cost');

    // Total Meal Deposits & Group Fund Balance
    const totalDeposits = unifiedMealDeposits.reduce((sum, d) => sum + safeNum(d.amount), 0);
    const groupFundSpent = expenses.filter(e => e.paidBy === 'Meal').reduce((sum, e) => sum + safeNum(e.amount), 0);
    const groupFundBalance = totalDeposits - groupFundSpent;

    // Total Meal Cost: Any expense where paidBy is 'Meal' OR category is 'Grocery'
    const totalMealCost = expenses.filter(e => e.paidBy === 'Meal' || e.category === 'Grocery').reduce((sum, e) => sum + safeNum(e.amount), 0);
    const totalMeals = dailyMeals.reduce((sum, day) => sum + Object.values(day.meals || {}).reduce((s, c) => s + safeNum(c), 0), 0);
    const costPerMeal = totalMeals > 0 ? totalMealCost / totalMeals : 0;
    const count = roommates.length || 1;

    // Helper to get roommate plan ('both' | 'meal' | 'flat')
    const getRoommatePlan = (personName: string): 'both' | 'meal' | 'flat' => {
      try {
        const mapKey = `ami_member_plans_${activeMonthId || 'default'}`;
        const savedMap = JSON.parse(localStorage.getItem(mapKey) || '{}');
        const rm = roommatesData.find(r => r.name.toLowerCase() === personName.toLowerCase());
        const plan = savedMap[personName.toLowerCase()] || (rm ? savedMap[rm.id] : undefined) || 'both';
        return plan;
      } catch {
        return 'both';
      }
    };

    // Calculate members participating in Flat Fixed Costs vs Chef/Meal
    // 'flat' and 'both' members participate in regular fixed flat costs (Rent, WiFi, Gas, etc.)
    // 'meal' and 'both' members participate in Chef fixed cost and Meals/Grocery
    const flatEligibleCount = Math.max(1, roommates.filter(p => {
      const plan = getRoommatePlan(p);
      return plan === 'flat' || plan === 'both';
    }).length);

    const mealEligibleCount = Math.max(1, roommates.filter(p => {
      const plan = getRoommatePlan(p);
      return plan === 'meal' || plan === 'both';
    }).length);

    // Meal stats per roommate (grocery paid by individual roommate counts towards their meal fund contribution!)
    const mealStats = roommates.map(person => {
      const plan = getRoommatePlan(person);
      const isMealMember = plan === 'meal' || plan === 'both';
      const meals = isMealMember ? dailyMeals.reduce((sum, day) => sum + Number(day.meals[person] || 0), 0) : 0;
      const mealCost = meals * costPerMeal;
      const groceryPaid = expenses.filter(e => e.paidBy === person && e.category === 'Grocery').reduce((s, e) => s + Number(e.amount), 0);
      const depositsMade = unifiedMealDeposits.filter(d => d.person === person).reduce((s, d) => s + Number(d.amount), 0);
      const totalCont = groceryPaid + depositsMade;
      return { person, meals, mealCost, groceryPaid, depositsMade, totalContribution: totalCont, balance: totalCont - mealCost, plan };
    });

    // Individual Account ledger:
    // - If member is 'meal': ONLY calculated for Chef fixed cost and Meal/Grocery (no Rent, WiFi, Electricity, etc.)
    // - If member is 'flat': ONLY calculated for fixed costs EXCEPT Chef, and 0 meal/grocery cost
    // - If member is 'both': calculated for all fixed costs, chef, and meals/grocery
    const indAccounts = roommates.map(person => {
      const plan = getRoommatePlan(person);
      const isMealMember = plan === 'meal' || plan === 'both';
      const isFlatMember = plan === 'flat' || plan === 'both';

      const mealDepositsMade = unifiedMealDeposits.filter(d => d.person === person).reduce((s, d) => s + safeNum(d.amount), 0);
      const accountDepositsMade = accountDeposits.filter(e => e.paidBy === person).reduce((s, e) => s + safeNum(e.amount), 0);
      const groceryPaid = expenses.filter(e => e.paidBy === person && e.category === 'Grocery').reduce((s, e) => s + safeNum(e.amount), 0);
      const otherDirectPaid = expenses.filter(e => e.paidBy === person && !['Meal', 'Account', 'Grocery', 'Deposit'].includes(e.category)).reduce((s, e) => s + safeNum(e.amount), 0);
      
      const dynamicExpenses: Record<string, number> = {};
      fixedCosts.forEach(fc => {
        const isChef = fc.category.trim().toLowerCase() === 'chef';
        if (isChef) {
          // Chef is charged only if member is in meal or both
          if (isMealMember) {
            dynamicExpenses[fc.category] = fc.amount / mealEligibleCount;
          }
        } else {
          // General flat costs (Rent, WiFi, etc.) charged only if member is in flat or both
          if (isFlatMember) {
            dynamicExpenses[fc.category] = fc.amount / flatEligibleCount;
          }
        }
      });
      
      // Meals cost charged only if member is in meal or both
      if (isMealMember) {
        const myMeals = dailyMeals.reduce((s, d) => s + Number(d.meals[person] || 0), 0);
        dynamicExpenses['Meal'] = myMeals * costPerMeal;
      }

      const pMealDeposits = unifiedMealDeposits.filter(d => d.person === person).map(d => ({ id: d.id, date: d.date, description: 'Meal Fund Deposit', amount: safeNum(d.amount), type: 'deposit' as const }));
      const pAccountDeposits = accountDeposits.filter(e => e.paidBy === person).map(e => ({ id: e.id, date: e.date, description: e.description || 'Account / Fixed Cost Deposit', amount: safeNum(e.amount), type: 'deposit' as const }));
      const pGrocery = expenses.filter(e => e.paidBy === person && e.category === 'Grocery').map(e => ({ id: e.id, date: e.date, description: e.description, amount: safeNum(e.amount), type: 'expense' as const }));
      const pOtherExps = expenses.filter(e => e.paidBy === person && !['Meal', 'Account', 'Grocery', 'Deposit'].includes(e.category)).map(e => ({ id: e.id, date: e.date, description: e.description, amount: safeNum(e.amount), type: 'expense' as const }));

      const pTransactions = [...pMealDeposits, ...pAccountDeposits, ...pGrocery, ...pOtherExps].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const totalPaid = mealDepositsMade + accountDepositsMade + groceryPaid + otherDirectPaid;

      return { 
        name: person, 
        plan,
        expenses: dynamicExpenses,
        paid: totalPaid, 
        manualAdjustment: manualAdjustments[person] || 0,
        transactions: pTransactions
      };
    });

    return { groupFundBalance, totalDeposits, totalMealCost, costPerMeal, totalMeals, mealStats, indAccounts };
  }, [roommates, roommatesData, expenses, dailyMeals, fixedCosts, foodDeposits, manualAdjustments, activeMonthId]);

  const sortedMealStats = useMemo(() => {
    const stats = [...calculations.mealStats];
    const myIndex = stats.findIndex(s => s.person.toLowerCase() === registeredName.toLowerCase());
    if (myIndex > 0) {
        const [me] = stats.splice(myIndex, 1);
        stats.unshift(me);
    }
    return stats;
  }, [calculations.mealStats, registeredName]);

  const myAccount = calculations.indAccounts.find(a => a.name.toLowerCase() === registeredName.toLowerCase());
  const myTotalBill = myAccount ? Object.values(myAccount.expenses).reduce((a,b)=>a+b,0) + myAccount.manualAdjustment : 0;
  const myBalance = myAccount ? (myTotalBill - myAccount.paid) : 0;
  const myMealStats = calculations.mealStats.find(s => s.person.toLowerCase() === registeredName.toLowerCase());

  const displayedAccounts = effectiveIsManager ? calculations.indAccounts : calculations.indAccounts.filter(a => a.name.toLowerCase() === registeredName.toLowerCase());
  const sortedBazarItems = useMemo(() => { return [...bazarItems].sort((a, b) => { if (a.is_completed === b.is_completed) return a.id - b.id; return a.is_completed ? 1 : -1; }); }, [bazarItems]);
  const visibleBazarItems = showAllBazar || effectiveIsManager ? sortedBazarItems : sortedBazarItems.slice(0, 4);
  const totalIn = availability.filter(a => a.status === 'in').length;
  const totalOut = availability.filter(a => a.status === 'out').length;
  const visibleAvail = showAllAvail ? roommatesData : roommatesData.slice(0, 3);

  const handleDownloadAllReceipts = () => {
    if (!effectiveIsManager) return;
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const hostelName = currentMonthObj?.hostels?.name || "Ami Bachelor Workspace";
   const allReceiptsHTML = displayedAccounts.map((acc, index) => {
  const totalBill = Object.values(acc.expenses).reduce((a, b) => a + b, 0) + acc.manualAdjustment;
  const totalDue = totalBill - acc.paid;
  
  // Create dynamic expense rows
  const expenseRows = Object.entries(acc.expenses).map(([cat, amt]) => 
    `<div class="row"><span class="label">${cat}</span><span class="value"><span class="bengali-font">৳</span>${amt.toFixed(2)}</span></div>`
  ).join('');

  return `<div class="receipt" style="${index !== displayedAccounts.length - 1 ? 'page-break-after: always;' : ''}">
    <div class="header">
      <img src="${window.location.origin}/logo.png" style="width: 64px; height: auto; object-fit: contain; display: block; margin: 0 auto 12px auto;" />
      <h1 class="hostel-name">${hostelName}</h1>
      <p class="meta">Official Account Statement</p>
    </div>
    <div class="row" style="margin-bottom: 24px;">
      <span class="label" style="font-weight: bold; text-transform: uppercase; font-size: 12px;">Member Name</span>
      <span class="value" style="font-family: inherit; font-size: 16px; text-transform: capitalize;">${acc.name}</span>
    </div>
    ${expenseRows}
    ${acc.manualAdjustment !== 0 ? `<div class="row"><span class="label">Manual Adjustment</span><span class="value"><span class="bengali-font">৳</span>${acc.manualAdjustment.toFixed(2)}</span></div>` : ''}
    <div class="divider"></div>
    <div class="row"><span class="label" style="font-weight: 700;">Total Generated Bill</span><span class="value"><span class="bengali-font">৳</span>${totalBill.toFixed(2)}</span></div>
    <div class="row"><span class="label" style="font-weight: 700; color: #22c55e;">Amount Paid/Deposited</span><span class="value" style="color: #22c55e;">- <span class="bengali-font">৳</span>${acc.paid.toFixed(2)}</span></div>
    <div class="divider" style="border-top: 2px dashed #cbd5e1;"></div>
    <div class="total-row"><span>FINAL BALANCE</span><span><span class="bengali-font">৳</span>${Math.abs(totalDue).toFixed(2)}</span></div>
    <div class="status-badge ${totalDue > 0 ? 'status-due' : totalDue < 0 ? 'status-credit' : 'status-settled'}">${totalDue > 0 ? 'PAYMENT DUE' : totalDue < 0 ? 'ACCOUNT IN CREDIT' : 'ACCOUNT SETTLED'}</div>
  </div>`;
}).join('');

    const fullHTML = generatePrintableDoc({
      defaultFilename: `All_Member_Accounts_${(currentMonthObj?.name || 'CurrentMonth').replace(/\s+/g, '_')}`,
      contentHtml: allReceiptsHTML
    });

    openPrintableWindow(fullHTML);
  };

  if (loadingAuth) return <div className="min-h-dvh bg-slate-50 flex items-center justify-center font-black text-slate-400">LOADING...</div>;

  if (!session) {
    const handleGoogleSignIn = async () => {
      try {
        localStorage.setItem('ami_stay_signed_in', staySignedIn ? 'true' : 'false');
        if (!staySignedIn) {
          sessionStorage.setItem('ami_session_active', 'true');
        }
      } catch (e) {
        console.warn("Storage save error:", e);
      }
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
    };

    return (
      <div className="min-h-dvh bg-[#f3f3f1] flex items-center justify-center p-4">
        <div className="w-full max-w-[280px] sm:max-w-[300px] text-center relative mx-auto">
          <img src="/logo.png" alt="Ami Bachelor Logo" className="w-32 h-auto md:w-36 mx-auto object-contain hover:scale-105 transition-transform mb-2" />
          <p className="text-[9px] font-black text-slate-400 opacity-60 uppercase tracking-[0.3em] mb-6">@NURHASAN4421</p>
          
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-[#d6d6d6] bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Mini checkbox & text under sign in with Google */}
          <div className="mt-3 flex items-center justify-center gap-1.5 select-none">
            <input
              type="checkbox"
              id="staySignedIn"
              checked={staySignedIn}
              onChange={(e) => {
                const checked = e.target.checked;
                setStaySignedIn(checked);
                try {
                  localStorage.setItem('ami_stay_signed_in', checked ? 'true' : 'false');
                } catch {}
              }}
              className="w-3 h-3 rounded-[3px] border-[#d6d6d6] text-[#141414] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#141414]"
            />
            <label
              htmlFor="staySignedIn"
              className="text-[11px] font-sf-regular text-[#8e8e8e] hover:text-[#141414] transition-colors cursor-pointer select-none"
            >
              Stay signed in
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50/50 text-slate-900 pb-20 font-sans antialiased text-[14px] md:text-base selection:bg-blue-200 print:bg-white print:text-black">
      
      {/* 🌟 NEW: Custom Apple-Style Global Dialog Modal */}
      <AnimatePresence>
        {dialog && dialog.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
              className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-white/50 text-center"
            >
              <div className="p-6 pb-4">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">{dialog.title}</h3>
                {dialog.message && <p className="text-sm font-medium text-slate-500 mt-2">{dialog.message}</p>}
                
                {dialog.type === 'prompt' && (
                   <input 
                     autoFocus
                     defaultValue={dialog.defaultValue}
                     placeholder={dialog.placeholder}
                     className="mt-4 w-full bg-slate-100 border border-slate-200 p-3 rounded-xl text-center font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                     id="dialog-input"
                   />
                )}
              </div>
              
              <div className="flex border-t border-slate-200/60 bg-slate-50/50">
                <button 
                  onClick={() => setDialog(null)}
                  className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-100/50 transition-colors border-r border-slate-200/60 active:bg-slate-200/50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                     const val = dialog.type === 'prompt' ? (document.getElementById('dialog-input') as HTMLInputElement).value : undefined;
                     dialog.onConfirm(val);
                     setDialog(null);
                  }}
                  className={`flex-1 py-4 text-sm font-black transition-colors hover:bg-slate-100/50 active:bg-slate-200/50 ${dialog.isDanger ? 'text-red-600' : 'text-blue-600'}`}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auto Return to Active Month Prompt for Members */}
      <AnimatePresence>
        {showActiveMonthRedirectDialog && hostelActiveMonth && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
              className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-white/50 text-center"
            >
              <div className="p-6 pb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                  <Clock size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Return to Active Month?</h3>
                <p className="text-xs font-medium text-slate-600 mt-2 leading-relaxed">
                  The hostel manager has set <strong>"{hostelActiveMonth.name}"</strong> as the active month. Would you like to switch to it now?
                </p>
              </div>
              
              <div className="flex border-t border-slate-200/60 bg-slate-50/50">
                <button 
                  onClick={handleWaitActiveMonthRedirect}
                  className="flex-1 py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-100/50 transition-colors border-r border-slate-200/60 active:bg-slate-200/50 cursor-pointer"
                >
                  Wait (3 min)
                </button>
                <button 
                  onClick={handleConfirmActiveMonthRedirect}
                  className="flex-1 py-3.5 text-xs font-black text-red-600 hover:bg-red-50/50 transition-colors active:bg-red-100/50 cursor-pointer"
                >
                  Yes, Switch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification Banner: Mini Unobtrusive Bottom-Center Pill */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 40, opacity: 0, scale: 0.95 }} 
            animate={{ y: 0, opacity: 1, scale: 1 }} 
            exit={{ y: 40, opacity: 0, scale: 0.95 }} 
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-[92vw] pointer-events-none"
          >
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full shadow-xl backdrop-blur-md border text-xs ${
              toast.type === 'error' ? 'bg-red-600/95 text-white border-red-500 shadow-red-600/25' :
              toast.type === 'info' ? 'bg-[#181818]/95 text-white border-[#383838] shadow-black/25' :
              'bg-[#181818]/95 text-white border-[#383838] shadow-black/25'
            }`}>
              {toast.type === 'error' ? (
                <X size={14} strokeWidth={2.5} className="text-red-200 shrink-0" />
              ) : toast.type === 'info' ? (
                <Bell size={14} strokeWidth={2.5} className="text-blue-300 shrink-0" />
              ) : (
                <Check size={14} strokeWidth={2.5} className="text-emerald-400 shrink-0" />
              )}
              <p className="font-sf-medium text-xs tracking-tight select-none">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install / Add to Home Screen Prompt */}
      <InstallPwaPrompt 
        forceOpen={showInstallPwa} 
        onDismiss={() => setShowInstallPwa(false)} 
      />

      {showFlatmatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85dvh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2"><Users size={20} className="text-blue-500"/> Manage Flatmates</h2>
              <button onClick={() => setShowFlatmatesModal(false)} className="p-2 bg-white text-slate-400 hover:text-slate-700 rounded-full shadow-sm"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <RoommateManager 
                roommates={roommatesData} isManager={effectiveIsManager} hostelId={activeHostelId} currentUserId={session?.user?.id}
                onUpdated={() => {
                  fetchSheetData();
                  showToast("Flatmate details updated");
                }}
                onAddRoommate={async (n, userId, requestId, email) => { 
                  const cleanName = n.trim();
                  if (roommates.map(r => r.toLowerCase()).includes(cleanName.toLowerCase())) { showToast("Name exists!", "error"); return; }
                  const today = new Date().toISOString().split('T')[0];
                  await supabase.from('roommates').insert([{ name: cleanName, month_id: activeMonthId, user_id: userId || null, email: email || null, joined_date: today }]); 
                  if (requestId) await supabase.from('join_requests').delete().eq('id', requestId);
                  logAction(`Added flatmate: ${cleanName}`); fetchSheetData();
                  showToast("Flatmate added");
                }} 
                onRemoveRoommate={async (n) => { 
                  await supabase.from('roommates').delete().eq('name', n).eq('month_id', activeMonthId); 
                  logAction(`Removed flatmate: ${n}`); fetchSheetData();
                  showToast("Flatmate removed");
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* If still initially resolving active month, avoid flashing onboarding */}
      {isInitialSyncing ? (
        <div className="min-h-dvh bg-[#f3f3f1] flex items-center justify-center font-sf-medium text-xs text-[#8e8e8e]">
          <div className="flex flex-col items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-9 w-auto object-contain animate-pulse" />
            <span>Loading workspace...</span>
          </div>
        </div>
      ) : activeView === 'super-admin' ? (
        <SuperAdminPage
          currentUserId={session?.user?.id}
          currentUserEmail={session?.user?.email}
          onExitSuperAdmin={() => setActiveView('dashboard')}
          onSelectHostelMonth={(monthId: string) => {
            setActiveMonthId(monthId);
            setActiveView('dashboard');
            fetchSheetData();
          }}
          showToast={showToast}
        />
      ) : !activeMonthId ? (
        <div className="flex flex-col min-h-dvh bg-[#f3f3f1] text-[#141414]">
          <HostelOnboarding
            session={session}
            managedHostels={managedHostels}
            joinedHostels={joinedHostels}
            isSuperAdmin={isSuperAdmin}
            onOpenSuperAdmin={() => setActiveView('super-admin')}
            onLogout={handleLogout}
            onRefreshHostels={fetchMonthsAndHostels}
            onJoined={async (id: string) => {
              setActiveMonthId(id);
              await fetchMonthsAndHostels();
              await fetchSheetData();
            }}
          />
        </div>
      ) : isHostelLocked ? (
        <div className="flex flex-col min-h-dvh bg-[#f3f3f1] text-[#141414] items-center justify-center p-6 text-center select-none">
          <div className="w-full max-w-md space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              currentHostelStatus === 'deactivated' 
                ? 'bg-slate-200 text-slate-700' 
                : currentHostelStatus === 'rejected'
                ? 'bg-red-100 text-red-600'
                : 'bg-amber-100 text-amber-700 animate-pulse'
            }`}>
              {currentHostelStatus === 'deactivated' ? (
                <Power size={32} />
              ) : currentHostelStatus === 'rejected' ? (
                <X size={32} />
              ) : (
                <Clock size={32} />
              )}
            </div>

            <h2 className="font-sf-black text-2xl text-slate-900 tracking-tight">
              {currentHostelStatus === 'deactivated' 
                ? 'Hostel Deactivated' 
                : currentHostelStatus === 'rejected'
                ? 'Request Rejected'
                : 'Verification Pending'}
            </h2>

            <p className="font-sf-medium text-xs text-slate-500 leading-relaxed">
              {currentHostelStatus === 'deactivated' ? (
                <span>
                  <strong>"{currentHostel?.name}"</strong> has been temporarily suspended by the Super Admin. Please contact support or renew verification to restore access.
                </span>
              ) : currentHostelStatus === 'rejected' ? (
                <span>
                  Your request for <strong>"{currentHostel?.name}"</strong> was rejected: <br />
                  <span className="text-red-600 font-bold mt-1 block">{(currentHostel as any)?.rejection_reason || 'Invalid Transaction ID'}</span>
                </span>
              ) : (
                <span>
                  <strong>"{currentHostel?.name}"</strong> is currently pending manual transaction verification by the Super Admin. You will gain access as soon as it is approved.
                </span>
              )}
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveMonthId(null);
                  localStorage.removeItem('activeMonthId');
                  fetchMonthsAndHostels();
                }}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-sf-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
              >
                Back to Setup
              </button>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveView('super-admin')}
                  className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-sf-bold text-xs transition-all cursor-pointer border border-amber-200"
                >
                  Open Super Admin Panel
                </button>
              )}
            </div>
          </div>
        </div>
      ) : activeView === 'dashboard' ? (
        viewMode === 'manager' ? (
          <AdminPage
            onNavigate={handleNavClick}
            activeView={activeView}
            onToggleRole={() => setViewMode('member')}
            registeredName={registeredName}
            hostelName={currentMonthObj?.hostels?.name}
            roommates={roommates}
            calculations={calculations}
            mealSchedule={mealSchedule}
            availability={availability}
            onToggleAvailability={handleToggleAvailability}
            expensesList={expenses}
            foodDeposits={foodDeposits}
            dailyMeals={dailyMeals}
            fixedCosts={fixedCosts}
            broadcastNotice={broadcastNotice}
            onSendNotice={handleSendNotice}
            onAddDailyMeal={handleAddDailyMeal}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onDeleteDeposit={handleDeleteDeposit}
            onAddDeposit={handleAddDeposit}
            onUpdateMealMenu={handleUpdateMealMenu}
            currentUserId={session?.user?.id}
            showToast={showToast}
            onOpenInstallPwa={() => setShowInstallPwa(true)}
            onLogout={handleLogout}
            isSuperAdmin={isSuperAdmin}
            onOpenSuperAdmin={() => setActiveView('super-admin')}
          />
        ) : (
          <MemberPage
            onNavigate={handleNavClick}
            activeView={activeView}
            onToggleRole={() => setViewMode('manager')}
            registeredName={registeredName}
            hostelName={currentMonthObj?.hostels?.name}
            roommates={roommates}
            calculations={calculations}
            mealSchedule={mealSchedule}
            availability={availability}
            onToggleAvailability={handleToggleAvailability}
            expensesList={expenses}
            dailyMeals={dailyMeals}
            fixedCosts={fixedCosts}
            broadcastNotice={broadcastNotice}
            currentUserId={session?.user?.id}
            onOpenInstallPwa={() => setShowInstallPwa(true)}
            onLogout={handleLogout}
            isSuperAdmin={isSuperAdmin}
            onOpenSuperAdmin={() => setActiveView('super-admin')}
          />
        )
      ) : (
        <div className="min-h-dvh overflow-x-hidden bg-[#f3f3f1] text-[#141414] pb-12">
          <DashboardHeader
            current={viewMode === 'manager' ? 'admin' : 'member'}
            activeView={activeView}
            onNavigate={handleNavClick}
            onToggleRole={() => setViewMode(viewMode === 'manager' ? 'member' : 'manager')}
            registeredName={registeredName}
            hostelName={currentMonthObj?.hostels?.name}
            broadcastNotice={broadcastNotice}
            onSendNotice={handleSendNotice}
            onOpenInstallPwa={() => setShowInstallPwa(true)}
            onLogout={handleLogout}
            isSuperAdmin={isSuperAdmin}
            onOpenSuperAdmin={() => setActiveView('super-admin')}
          />

          <main className="dashboard mx-auto flex w-[calc(100%-32px)] flex-col gap-[16px] pb-[32px] lg:max-w-[900px]">
            {/* View: Timeline */}
            {activeView === 'timeline' && (
              <div className="flex flex-col gap-[16px]">
                {/* Hero Month Card */}
                <section className="relative rounded-[24px] bg-[linear-gradient(113.5deg,#212121_0.77%,#000_100%)] p-[20px] text-[#e5e6e1] shadow-xl">
                  <div className="flex flex-col gap-2.5 pr-14 text-left">
                    <h2 className="font-sf-bold text-2xl text-white">
                      {currentMonthObj?.name || 'Current Month'}
                    </h2>
                    {effectiveIsManager && (
                      <div>
                        <button
                          onClick={handleAddMonth}
                          className="inline-flex h-[28px] items-center rounded-full px-[12px] font-sf-medium text-[11px] leading-none transition-all whitespace-nowrap shadow-xs bg-white text-[#141414] hover:bg-slate-100 cursor-pointer"
                        >
                          <span>New Month</span>
                          <span className="ml-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-[3px] text-[10px] font-bold leading-none bg-[#ff0000] text-white">
                            +
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Download button aligned to bottom right, little bigger */}
                  <div className="absolute bottom-4 right-5">
                    <button
                      onClick={handleExportMonthPDF}
                      className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white text-[#141414] hover:bg-slate-100 transition-colors cursor-pointer shadow-md"
                      title="Export Month PDF"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </section>

                {/* Months Directory */}
                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6] space-y-6">
                  {Object.keys(monthsByYear)
                    .sort((a, b) => Number(b) - Number(a))
                    .map((year) => (
                      <div key={year} className="space-y-3">
                        <h4 className="font-sf-bold text-base text-[#141414] border-b border-[#d6d6d6] pb-2 text-left">
                          Year {year}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {monthsByYear[year].map((m: MonthSheet) => {
                            const isSelected = activeMonthId === m.id;
                            const isHostelActive = hostelActiveMonth?.id === m.id;
                            return (
                              <div
                                key={m.id}
                                className={`flex items-center justify-between p-3.5 sm:p-4 rounded-[16px] border transition-all gap-2 ${
                                  isSelected
                                    ? 'bg-white border-red-400 shadow-md ring-1 ring-red-400/30'
                                    : 'bg-[#f3f3f1] border-[#d6d6d6] hover:bg-white'
                                }`}
                              >
                                <div
                                  onClick={() => {
                                    setActiveMonthId(m.id);
                                    showToast(`Viewing data for ${m.name}`);
                                  }}
                                  className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 min-w-0"
                                  title="Click to view this month's data"
                                >
                                  <div
                                    className={`p-2 rounded-[10px] shrink-0 ${
                                      isSelected ? 'bg-red-600 text-white' : 'bg-[#e5e6e1] text-[#626262]'
                                    }`}
                                  >
                                    <Calendar size={18} />
                                  </div>
                                  <div className="min-w-0 flex-1 text-left">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p
                                        className={`font-sf-bold text-sm truncate ${
                                          isSelected ? 'text-[#141414]' : 'text-[#626262]'
                                        }`}
                                      >
                                        {m.name}
                                      </p>
                                      {isHostelActive && (
                                        <span className="text-[8px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-sf-bold shrink-0">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {isSelected && (
                                        <span className="font-sf-bold text-[9px] uppercase tracking-wider text-emerald-600">
                                          ● Viewing Data
                                        </span>
                                      )}
                                      {!isSelected && (
                                        <span className="text-[9px] text-[#8e8e8e]">
                                          Click to preview
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {effectiveIsManager && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {!isHostelActive && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetGlobalActiveMonth(m);
                                        }}
                                        className="px-2.5 py-1 text-[10px] font-sf-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-[8px] transition-colors shadow-xs cursor-pointer shrink-0"
                                        title="Set as current active month for all members"
                                      >
                                        Set Active
                                      </button>
                                    )}
                                    <div className="relative timeline-menu-container">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenTimelineMenuId(openTimelineMenuId === m.id ? null : m.id);
                                        }}
                                        className="p-1.5 text-[#626262] hover:bg-black/5 rounded-[8px] cursor-pointer"
                                      >
                                        <MoreVertical size={16} />
                                      </button>

                                      {openTimelineMenuId === m.id && (
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#d6d6d6] shadow-xl rounded-[12px] z-50 p-1 flex flex-col text-left">
                                          {!isHostelActive && (
                                            <button
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSetGlobalActiveMonth(m);
                                                setOpenTimelineMenuId(null);
                                              }}
                                              className="text-left px-3 py-1.5 text-xs font-sf-bold text-red-600 hover:bg-red-50 rounded-[6px] cursor-pointer"
                                            >
                                              Set as Active for Members
                                            </button>
                                          )}
                                          <button
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              handleRenameMonth(m);
                                              setOpenTimelineMenuId(null);
                                            }}
                                            className="text-left px-3 py-1.5 text-xs font-sf-medium text-[#141414] hover:bg-[#f3f3f1] rounded-[6px] cursor-pointer"
                                          >
                                            Rename
                                          </button>
                                          <button
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              handleCloneMonth(m);
                                              setOpenTimelineMenuId(null);
                                            }}
                                            className="text-left px-3 py-1.5 text-xs font-sf-medium text-[#141414] hover:bg-[#f3f3f1] rounded-[6px] cursor-pointer"
                                          >
                                            Clone Month
                                          </button>
                                          <button
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              handleDeleteTimelineMonth(m.id);
                                              setOpenTimelineMenuId(null);
                                            }}
                                            className="text-left px-3 py-1.5 text-xs font-sf-medium text-red-600 hover:bg-red-50 rounded-[6px] cursor-pointer"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* View: Fixed Costs */}
            {activeView === 'fixed-costs' && (
              <div className="flex flex-col gap-[16px]">
                {/* Hero Summary Card */}
                <section className="flex h-[180px] flex-col justify-between rounded-[24px] bg-[linear-gradient(113.5deg,#212121_0.77%,#000_100%)] px-[23px] py-[19px] text-[#e5e6e1] shadow-xl">
                  <div>
                    <span className="font-sf-regular text-[9px] text-[#8e8e8e] uppercase tracking-wider">
                      Total Monthly Fixed Costs
                    </span>
                    <h2 className="font-sf-bold text-3xl text-white mt-1">
                      ৳{fixedCosts.reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString()}
                    </h2>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="font-sf-regular text-xs text-[#8e8e8e]">
                      Equal split among {roommates.length} flatmates
                    </span>
                    <span className="font-sf-bold text-base text-red-500">
                      ৳
                      {(
                        roommates.length
                          ? fixedCosts.reduce((s, c) => s + Number(c.amount || 0), 0) / roommates.length
                          : 0
                      ).toFixed(0)}{' '}
                      / person
                    </span>
                  </div>
                </section>

                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6]">
                  <FixedCostsManager
                    isManager={effectiveIsManager}
                    fixedCosts={fixedCosts}
                    activeMonthId={activeMonthId!}
                    onUpdateFixedCosts={async (costs) => {
                      if (!activeMonthId) return;
                      try {
                        // 1. Fetch all existing fixed cost ids for this month
                        const { data: existingRows } = await supabase
                          .from('fixed_costs')
                          .select('id, category')
                          .eq('month_id', activeMonthId);

                        const currentCategories = costs.map((c) => c.category);

                        // 2. Delete any removed categories from the database
                        const toDelete = (existingRows || []).filter(
                          (row) => !currentCategories.includes(row.category)
                        );
                        for (const row of toDelete) {
                          await supabase.from('fixed_costs').delete().eq('id', row.id);
                        }

                        // 3. Upsert or insert current categories
                        for (const c of costs) {
                          const existing = (existingRows || []).find((r) => r.category === c.category);
                          if (existing) {
                            await supabase
                              .from('fixed_costs')
                              .update({
                                amount: Number(c.amount) || 0,
                                is_paid: c.is_paid || false,
                                paid_date: c.paid_date || null,
                              })
                              .eq('id', existing.id);
                          } else {
                            await supabase.from('fixed_costs').insert([
                              {
                                category: c.category,
                                amount: Number(c.amount) || 0,
                                is_paid: c.is_paid || false,
                                paid_date: c.paid_date || null,
                                month_id: activeMonthId,
                              },
                            ]);
                          }
                        }

                        // 4. Update state, local backup and refresh
                        const normalizedCosts = costs.map((c) => ({ ...c, amount: Number(c.amount) || 0 }));
                        localStorage.setItem(`ami_fixed_costs_${activeMonthId}`, JSON.stringify(normalizedCosts));
                        setFixedCosts(normalizedCosts);
                        await fetchSheetData();
                        showToast('Fixed costs saved successfully');
                      } catch (err) {
                        console.error('Failed saving fixed costs:', err);
                        showToast('Failed to save fixed costs', 'error');
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* View: Meals Details & Spreadsheet */}
            {activeView === 'meals' && (
              <div className="flex flex-col gap-[16px]">
                {/* Hero Meal Summary */}
                <section className="flex h-[180px] flex-col justify-between rounded-[24px] bg-[linear-gradient(113.5deg,#212121_0.77%,#000_100%)] px-[23px] py-[19px] text-[#e5e6e1] shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-sf-regular text-[9px] text-[#8e8e8e] uppercase tracking-wider">
                        Current Cost Per Meal
                      </span>
                      <h2 className="font-sf-bold text-3xl text-white mt-1">
                        ৳{calculations.costPerMeal.toFixed(2)}
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="font-sf-regular text-[9px] text-[#8e8e8e] uppercase tracking-wider">
                        Total Meals Logged
                      </span>
                      <p className="font-sf-bold text-2xl text-red-500 mt-1">
                        {calculations.totalMeals}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="font-sf-regular text-xs text-[#8e8e8e]">
                      Total Grocery Spent: ৳{(expenses.filter(e => e.category === 'Meal').reduce((s, e) => s + Number(e.amount || 0), 0) || Math.round((Number(calculations?.costPerMeal) || 0) * (Number(calculations?.totalMeals) || 0))).toLocaleString()}
                    </span>
                    <span className="font-sf-bold text-sm text-white">
                      Group Fund: ৳{Number(calculations?.groupFundBalance || 0).toLocaleString()}
                    </span>
                  </div>
                </section>

                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6]">
                  <FoodFundTracker
                    hideAddDeposit={true}
                    isManager={effectiveIsManager}
                    roommates={roommates}
                    mealStats={sortedMealStats}
                    foodDeposits={foodDeposits}
                    registeredName={registeredName}
                    totalRemainingDue={calculations.mealStats.reduce((sum, s) => sum + (s.balance || 0), 0)}
                  />
                </div>

                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6]">
                  <MealSpreadsheet
                    roommates={roommates}
                    dailyMeals={dailyMeals}
                    onAddDailyMeal={handleAddDailyMeal}
                    costPerMeal={calculations.costPerMeal}
                    totalMeals={calculations.totalMeals}
                    isManager={effectiveIsManager}
                    onSaveMeals={async (updatedMeals) => {
                      if (!effectiveIsManager) return;
                      try {
                        for (const day of updatedMeals) {
                          if (day.id) {
                            await supabase.from('daily_meals').update({ meals: day.meals }).eq('id', day.id);
                          } else {
                            await supabase
                              .from('daily_meals')
                              .insert([{ date: day.date, meals: day.meals, month_id: activeMonthId }]);
                          }
                        }
                        showToast('Meal sheet updated!');
                        fetchSheetData();
                      } catch (err) {
                        console.error(err);
                        showToast('Failed to save meals', 'error');
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* View: Recent Expenses & Bazar */}
            {activeView === 'expenses' && (
              <div className="flex flex-col gap-[16px]">
                {/* Hero Expenses Summary */}
                <section className="flex h-[180px] flex-col justify-between rounded-[24px] bg-[linear-gradient(113.5deg,#212121_0.77%,#000_100%)] px-[23px] py-[19px] text-[#e5e6e1] shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-sf-regular text-[9px] text-[#8e8e8e] uppercase tracking-wider">
                        Total Expenses This Month
                      </span>
                      <h2 className="font-sf-bold text-3xl text-white mt-1">
                        ৳{expenses.reduce((s, e) => s + Number(e.amount || 0), 0).toLocaleString()}
                      </h2>
                    </div>
                    <button
                      onClick={handlePrintMasterTransaction}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-[30px] font-sf-semibold text-[11px] transition-colors"
                    >
                      <Download size={13} /> PDF Report
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="font-sf-regular text-xs text-[#8e8e8e]">
                      {expenses.length} Records Logged
                    </span>
                    <span className="font-sf-bold text-sm text-red-500">
                      Grocery & Shared Bills
                    </span>
                  </div>
                </section>

                {/* Today's Grocery List Card */}
                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left">
                      <p className="font-sf-medium text-[11px] text-[#626262]">
                        {new Date(scheduleDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <h3 className="font-sf-bold text-base text-[#141414]">Today's Grocery List</h3>
                    </div>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="text-[11px] font-sf-medium text-[#141414] bg-white px-2 py-1 rounded-[8px] border border-[#d6d6d6] outline-none cursor-pointer"
                    />
                  </div>

                  <form onSubmit={handleAddBazarItem} className="flex gap-2">
                    <input
                      type="text"
                      value={newBazarItem}
                      onChange={(e) => setNewBazarItem(e.target.value)}
                      placeholder="Add grocery item to buy..."
                      className="flex-1 h-[34px] px-3 py-1 bg-white border border-[#d6d6d6] rounded-xl font-sf-medium text-xs text-[#141414] outline-none focus:border-red-500 transition-all placeholder-[#8e8e8e]"
                    />
                    <button
                      type="submit"
                      disabled={!newBazarItem.trim()}
                      className="h-[34px] bg-red-600 text-white px-3.5 rounded-xl font-sf-semibold text-xs hover:bg-red-700 disabled:opacity-40 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> <span>Add</span>
                    </button>
                  </form>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {visibleBazarItems.length > 0 ? (
                      visibleBazarItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-[12px] border transition-all ${
                            item.is_completed
                              ? 'bg-white/50 border-[#d6d6d6] opacity-60'
                              : 'bg-white border-[#d6d6d6]'
                          }`}
                        >
                          <div
                            onClick={() => handleToggleBazarItem(item.id, item.is_completed)}
                            className="flex items-center gap-3 flex-1 cursor-pointer select-none"
                          >
                            <div
                              className={`shrink-0 ${
                                item.is_completed ? 'text-emerald-600' : 'text-[#8e8e8e]'
                              }`}
                            >
                              {item.is_completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </div>
                            <span
                              className={`font-sf-medium text-xs ${
                                item.is_completed ? 'line-through text-[#8e8e8e]' : 'text-[#141414]'
                              }`}
                            >
                              {item.item_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.completed_by && (
                              <span className="font-sf-bold text-[8px] text-[#626262] bg-[#f3f3f1] px-2 py-0.5 rounded-[6px]">
                                {item.completed_by}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteBazarItem(item.id)}
                              className="text-[#8e8e8e] hover:text-red-600 p-1"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center font-sf-regular text-xs text-[#8e8e8e] py-6">
                        No bazar items for this date.
                      </p>
                    )}
                  </div>
                </div>

                {/* Recent Expense History List */}
                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6] space-y-3">
                  <h3 className="font-sf-bold text-base text-[#141414]">Transaction History</h3>
                  <div className="flex flex-col">
                    {expenses.length > 0 ? (
                      expenses.map((exp, idx) => (
                        <div
                          key={exp.id}
                          className={`flex items-center justify-between py-3 px-1 transition-colors ${
                            idx !== expenses.length - 1 ? 'border-b border-[#d6d6d6]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-[#dedfd9] p-2 rounded-[10px] text-red-600">
                              <ReceiptText size={16} />
                            </div>
                            <div>
                              <p className="font-sf-bold text-xs text-[#141414] leading-tight">
                                {exp.description}
                              </p>
                              <p className="font-sf-regular text-[9px] text-[#626262] mt-0.5">
                                <span className="font-sf-bold text-black">{exp.paidBy}</span> •{' '}
                                {exp.category} • {new Date(exp.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="font-sf-bold text-sm text-[#141414]">
                            ৳{Number(exp.amount).toFixed(2)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center font-sf-regular text-xs text-[#8e8e8e] py-6">
                        No expenses logged yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* View: Individual Accounts */}
            {activeView === 'accounts' && (
              <div className="flex flex-col gap-[16px]">
                {/* Top Card */}
                <section className="flex items-center justify-between rounded-[24px] bg-[linear-gradient(113.5deg,#212121_0.77%,#000_100%)] px-[23px] py-[20px] text-[#e5e6e1] shadow-xl">
                  <div>
                    <h2 className="font-sf-bold text-2xl text-white">
                      All accounts
                    </h2>
                    <p className="font-sf-regular text-[11px] text-[#8e8e8e] mt-0.5">
                      {displayedAccounts.length} accounts
                    </p>
                  </div>
                  {effectiveIsManager && (
                    <button
                      onClick={handleDownloadAllReceipts}
                      className="flex h-10 w-10 items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                      title="Download All Statements"
                    >
                      <Download size={18} />
                    </button>
                  )}
                </section>

                <div className="rounded-[24px] bg-[#e5e6e1] border border-[#d6d6d6] overflow-hidden">
                  {displayedAccounts.map((acc) => (
                    <IndividualAccount
                      key={acc.name}
                      name={acc.name}
                      expenses={acc.expenses}
                      paid={acc.paid}
                      manualAdjustment={acc.manualAdjustment}
                      showAllAccounts={false}
                      hostelName={currentMonthObj?.hostels?.name}
                      isManager={effectiveIsManager}
                      transactions={acc.transactions}
                      onManualAdjustment={async (amt) => {
                        const cur = manualAdjustments[acc.name] || 0;
                        const { data } = await supabase
                          .from('manual_adjustments')
                          .select('id')
                          .eq('person', acc.name)
                          .eq('month_id', activeMonthId);
                        if (data?.length)
                          await supabase
                            .from('manual_adjustments')
                            .update({ amount: cur + amt })
                            .eq('id', data[0].id);
                        else
                          await supabase
                            .from('manual_adjustments')
                            .insert([{ person: acc.name, amount: cur + amt, month_id: activeMonthId }]);
                        logAction(`Manual Adjustment: ${amt > 0 ? '+' : ''}${amt} for ${acc.name}`);
                        fetchSheetData();
                        showToast('Adjustment applied');
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* View: Member Availability */}
            {activeView === 'availability' && (
              <div className="flex flex-col gap-[16px]">
                {/* 2 Counters */}
                <div className="grid grid-cols-2 gap-3 h-[90px]">
                  <div className="bg-white rounded-[20px] border border-[#d6d6d6] flex flex-col items-center justify-center">
                    <span className="font-sf-semibold text-[9px] text-[#626262] uppercase tracking-wider">
                      Total IN
                    </span>
                    <span className="font-sf-bold text-3xl text-emerald-600 mt-0.5">
                      {totalIn}
                    </span>
                  </div>
                  <div className="bg-[#ebebeb] rounded-[20px] border border-[#d6d6d6] flex flex-col items-center justify-center">
                    <span className="font-sf-semibold text-[9px] text-[#626262] uppercase tracking-wider">
                      Total OUT
                    </span>
                    <span className="font-sf-bold text-3xl text-red-600 mt-0.5">
                      {totalOut}
                    </span>
                  </div>
                </div>

                {/* Status Toggle Card */}
                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-sf-bold text-base text-[#141414]">My Presence Status</h3>
                      <p className="font-sf-regular text-[10px] text-[#626262]">
                        Choose whether you are having meals today
                      </p>
                    </div>
                    <div className="flex items-center gap-[6px]">
                      <button
                        onClick={() => handleToggleAvailability('in')}
                        className={`flex h-[26px] items-center rounded-full px-[10px] font-sf-medium text-[11px] leading-none transition-all whitespace-nowrap shadow-xs cursor-pointer ${
                          availability.find((a) => a.user_id === session?.user?.id)?.status !== 'out'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white text-[#141414] border border-[#d6d6d6] hover:bg-slate-50'
                        }`}
                      >
                        I'm IN
                      </button>
                      <button
                        onClick={() => handleToggleAvailability('out')}
                        className={`flex h-[26px] items-center rounded-full px-[10px] font-sf-medium text-[11px] leading-none transition-all whitespace-nowrap shadow-xs cursor-pointer ${
                          availability.find((a) => a.user_id === session?.user?.id)?.status === 'out'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-white text-[#141414] border border-[#d6d6d6] hover:bg-slate-50'
                        }`}
                      >
                        I'm OUT
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#d6d6d6]">
                    <p className="font-sf-bold text-[10px] uppercase tracking-wider text-[#626262] mb-2 px-1">
                      Flatmates Status
                    </p>
                    <div className="flex flex-col">
                      {roommatesData.map((r, idx) => {
                        const st = availability.find((a) => a.user_id === r.user_id)?.status || 'in';
                        const isLast = idx === roommatesData.length - 1;
                        return (
                          <div
                            key={r.id}
                            className={`flex items-center justify-between py-3 px-1 transition-colors ${
                              !isLast ? 'border-b border-[#d6d6d6]' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`p-1.5 rounded-[8px] ${
                                  st === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                                }`}
                              >
                                {st === 'in' ? <UserCheck size={16} /> : <UserX size={16} />}
                              </span>
                              <span className="font-sf-bold text-xs text-[#141414] capitalize">
                                {r.name}
                              </span>
                            </div>
                            <span
                              className={`font-sf-bold text-[9px] uppercase px-2.5 py-0.5 rounded-full ${
                                st === 'in'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-600'
                              }`}
                            >
                              {st}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View: Manage Hostel */}
            {activeView === 'manage-hostel' && (
              <div className="flex flex-col gap-[16px]">
                {/* Workspace Switcher */}
                {(managedHostels.length > 0 || joinedHostels.length > 0) && (
                  <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6] space-y-3">
                    <p className="font-sf-bold text-[10px] text-[#626262] uppercase tracking-wider">
                      Switch Workspaces
                    </p>
                    <div className="space-y-2">
                      {managedHostels.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => {
                            setActiveMonthId(h.latestMonthId);
                            handleNavClick('dashboard');
                          }}
                          className={`w-full text-left px-4 py-3 rounded-[12px] font-sf-bold text-xs flex items-center justify-between transition-colors border ${
                            h.id === activeHostelId
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : 'bg-white text-[#141414] border-[#d6d6d6] hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate pr-2">{h.name}</span>
                          <ShieldCheck size={16} className={h.id === activeHostelId ? 'text-red-600' : 'text-[#8e8e8e]'} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flatmates Directory */}
                <div className="rounded-[24px] bg-[#e5e6e1] border border-[#d6d6d6] overflow-hidden">
                  <RoommateManager
                    roommates={roommatesData}
                    isManager={effectiveIsManager}
                    hostelId={activeHostelId}
                    currentUserId={session?.user?.id}
                    onUpdated={() => {
                      fetchSheetData();
                      showToast("Flatmate details updated");
                    }}
                    onAddRoommate={async (n, userId, requestId, email) => {
                      const cleanName = n.trim();
                      if (roommates.map((r) => r.toLowerCase()).includes(cleanName.toLowerCase())) {
                        showToast('Name exists!', 'error');
                        return;
                      }
                      const today = new Date().toISOString().split('T')[0];
                      await supabase.from('roommates').insert([
                        {
                          name: cleanName,
                          month_id: activeMonthId,
                          user_id: userId || null,
                          email: email || null,
                          joined_date: today,
                        },
                      ]);
                      if (requestId) await supabase.from('join_requests').delete().eq('id', requestId);
                      logAction(`Added flatmate: ${cleanName}`);
                      fetchSheetData();
                      showToast('Flatmate added');
                    }}
                    onRemoveRoommate={async (n) => {
                      await supabase.from('roommates').delete().eq('name', n).eq('month_id', activeMonthId);
                      logAction(`Removed flatmate: ${n}`);
                      fetchSheetData();
                      showToast('Flatmate removed');
                    }}
                  />
                </div>
              </div>
            )}

            {/* View: Settings & History */}
            {activeView === 'settings' && (
              <div className="flex flex-col gap-[16px]">
                {/* Workspace Invite Security Code Card */}
                <section className="flex h-[180px] flex-col justify-between rounded-[24px] bg-[linear-gradient(113.5deg,#212121_0.77%,#000_100%)] px-[23px] py-[19px] text-[#e5e6e1] shadow-xl">
                  <div>
                    <span className="font-sf-regular text-[9px] text-[#8e8e8e] uppercase tracking-wider">
                      Workspace Invite Security Code
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-sf-bold text-3xl text-white tracking-[0.2em]">
                        {currentMonthObj?.hostels?.security_code || 'BACH26'}
                      </span>
                      <button
                        onClick={handleCopyCode}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-[10px] transition-colors"
                        title="Copy Code"
                      >
                        {copiedCode ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="font-sf-regular text-xs text-[#8e8e8e]">
                      {roommates.length} Total Flatmates Joined
                    </span>
                    <span className="font-sf-bold text-sm text-red-500">
                      {effectiveIsManager ? 'Manager Controls' : 'Directory'}
                    </span>
                  </div>
                </section>

                {/* Minimalist ManagerBro Section */}
                <div className="relative rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9]">
                        <Bot size={18} />
                      </div>
                      <div>
                        <h4 className="font-sf-bold text-[14px] text-[#141414] flex items-center gap-1.5">
                          ManagerBro
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            currentMonthObj?.hostels?.bot_enabled
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-slate-200 text-slate-600 border border-slate-300'
                          }`}>
                            {currentMonthObj?.hostels?.bot_enabled ? 'Active' : 'Locked'}
                          </span>
                        </h4>
                      </div>
                    </div>

                    {/* (i) Info button for 3-step overlay */}
                    <button
                      type="button"
                      onClick={() => setShowTelegramInfoOverlay(!showTelegramInfoOverlay)}
                      className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 border border-[#d6d6d6] text-[#626262] flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                      title="ManagerBro info"
                    >
                      <Info size={15} />
                    </button>
                  </div>

                  {/* If bot is disabled by Super Admin: Blurry disabled state + contact note */}
                  {!currentMonthObj?.hostels?.bot_enabled ? (
                    <div className="relative rounded-[16px] overflow-hidden p-4 bg-white/50 border border-dashed border-[#c4c4c4]">
                      <div className="opacity-40 filter blur-[1px] pointer-events-none select-none flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#8e8e8e] block uppercase">Connect Code</span>
                          <span className="font-mono text-base font-bold text-slate-600">TG-XXXXXX</span>
                        </div>
                        <button className="px-3 py-1.5 bg-[#229ED9] text-white rounded-lg text-xs font-bold">Copy /link</button>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200 text-center">
                        <p className="text-xs font-sf-bold text-slate-700">
                          Contact <a href="https://t.me/nurhasan4421" target="_blank" rel="noreferrer" className="text-[#229ED9] underline">@nurhasan4421</a> to unlock ManagerBro
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Active Bot Controls in White Card */
                    <div className="relative p-4 bg-white rounded-[16px] border border-[#d6d6d6] text-left">
                      {/* Open Bot at top right with Bot + icon */}
                      <a
                        href="https://t.me/Amibachelorbot"
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-3.5 right-3.5 px-2.5 py-1 bg-[#229ED9]/15 hover:bg-[#229ED9]/25 text-[#229ED9] border border-[#229ED9]/30 rounded-[8px] text-[11px] font-sf-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Bot size={13} />
                        <span>Bot</span>
                        <ArrowRight size={10} className="-rotate-45" />
                      </a>

                      <div>
                        <span className="font-sf-regular text-[9px] text-[#626262] uppercase tracking-wider block mb-1">
                          Bot Connect Code
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-sf-bold text-lg text-[#229ED9] tracking-[0.12em] font-mono">
                            {currentMonthObj?.hostels?.telegram_link_code || 'TG-XXXXXX'}
                          </span>
                          <button
                            onClick={handleCopyTelegramCode}
                            className="p-1.5 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] rounded-[8px] transition-all cursor-pointer"
                            title="Copy code"
                          >
                            {copiedTelegramCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>

                        {effectiveIsManager && (
                          <button
                            onClick={handleRegenerateTelegramCode}
                            disabled={regeneratingTelegram}
                            className="flex items-center gap-1.5 text-[11px] font-sf-medium text-slate-500 hover:text-slate-800 transition-colors mt-2.5 cursor-pointer disabled:opacity-50"
                            title="Generate new connect code"
                          >
                            <RotateCcw size={12} className={regeneratingTelegram ? 'animate-spin' : ''} />
                            <span>New Code</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mini Info Overlay Modal triggered by (i) button */}
                  {showTelegramInfoOverlay && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs"
                        onClick={() => setShowTelegramInfoOverlay(false)}
                      />
                      <div className="absolute right-4 top-14 z-50 w-[290px] rounded-[18px] bg-white p-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-[#141414]">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                          <h5 className="font-sf-bold text-xs flex items-center gap-1.5">
                            <Bot size={14} className="text-[#229ED9]" /> What ManagerBro Does
                          </h5>
                          <button
                            type="button"
                            onClick={() => setShowTelegramInfoOverlay(false)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="space-y-2 text-[11px] text-[#4a4a4a] text-left">
                          <p className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#229ED9] mt-1 shrink-0"></span>
                            <span><strong>1. Connect:</strong> Open <a href="https://t.me/Amibachelorbot" target="_blank" rel="noreferrer" className="text-[#229ED9] font-bold underline">@Amibachelorbot</a> and send <code>/link &lt;CODE&gt;</code></span>
                          </p>
                          <p className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                            <span><strong>2. Meals:</strong> Send e.g. <i>"5 traikh nur 1 meal, ajmain 2, baki 0"</i></span>
                          </p>
                          <p className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0"></span>
                            <span><strong>3. Deposit / Bazar:</strong> Send multi-line items. The bot checks totals, verifies sums, and updates the sheet upon button click!</span>
                          </p>
                        </div>
                        <p className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 text-center">
                          Tap anywhere outside to close
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Account & Mode Control Card */}
                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6] space-y-3.5">
                  <h3 className="font-sf-bold text-base text-[#141414] text-left">Account & Mode Control</h3>
                  <div className="p-3.5 bg-white rounded-[14px] border border-[#d6d6d6] space-y-2.5 text-left">
                    <div>
                      <p className="font-sf-regular text-[9px] text-[#626262] uppercase tracking-wider">
                        Signed In User
                      </p>
                      <p className="font-sf-medium text-xs text-[#141414] truncate">
                        {session?.user?.email || 'nurhasan@gmail.com'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('manager')}
                        className={`px-3 py-1 rounded-[8px] font-sf-bold text-xs h-[30px] flex items-center transition-all cursor-pointer ${
                          viewMode === 'manager'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-[#f3f3f1] text-[#626262] border border-[#d6d6d6]'
                        }`}
                      >
                        Admin Mode
                      </button>
                      <button
                        onClick={() => setViewMode('member')}
                        className={`px-3 py-1 rounded-[8px] font-sf-bold text-xs h-[30px] flex items-center transition-all cursor-pointer ${
                          viewMode === 'member'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-[#f3f3f1] text-[#626262] border border-[#d6d6d6]'
                        }`}
                      >
                        Member Mode
                      </button>
                    </div>
                  </div>

                  {/* Back to Setup Screen button */}
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('activeMonthId');
                      setActiveMonthId(null);
                    }}
                    className="w-full py-2.5 bg-white hover:bg-slate-50 text-[#141414] border border-[#d6d6d6] rounded-[12px] font-sf-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <RotateCcw size={14} className="text-[#626262]" />
                    <span>Back to Setup</span>
                  </button>

                  {/* Logout Account button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-[12px] font-sf-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <LogOut size={14} className="text-red-600" />
                    <span>Logout Account</span>
                  </button>
                </div>

                {/* Audit Trail Logs */}
                {effectiveIsManager && (
                  <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6] space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList size={18} className="text-red-600" />
                      <h3 className="font-sf-bold text-base text-[#141414]">Audit Trail Logs</h3>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-3 bg-white rounded-[12px] border border-[#d6d6d6]"
                          >
                            <div>
                              <p className="font-sf-semibold text-xs text-[#141414]">{log.action}</p>
                              <p className="font-sf-regular text-[9px] text-[#626262]">By {log.person}</p>
                            </div>
                            <span className="font-sf-regular text-[9px] text-[#8e8e8e]">
                              {new Date(log.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-center font-sf-regular text-xs text-[#8e8e8e] py-6">
                          No audit logs recorded.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Danger Zone Collapsible */}
                {effectiveIsManager && (
                  <div className="rounded-[24px] bg-[#dedfd9] p-[20px] border border-red-300">
                    <button
                      type="button"
                      onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
                      className="w-full flex items-center justify-between font-sf-bold text-base text-red-600 cursor-pointer"
                    >
                      <span>Danger Zone</span>
                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-200 ${isDangerZoneOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isDangerZoneOpen && (
                      <div className="space-y-3 pt-3 mt-3 border-t border-red-200">
                        <button
                          onClick={handleResetData}
                          className="w-full py-3 bg-white text-red-600 hover:bg-red-50 border border-red-200 rounded-[12px] font-sf-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                        >
                          <RotateCcw size={15} className="inline mr-2" /> Reset Month Data to Zero
                        </button>
                        {session?.user?.id === currentMonthObj?.owner_id && (
                          <>
                            <button
                              onClick={handleDeleteCurrentMonth}
                              className="w-full py-3 bg-white text-red-600 hover:bg-red-50 border border-red-200 rounded-[12px] font-sf-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                            >
                              <Trash2 size={15} className="inline mr-2" /> Delete Entire Month
                            </button>
                            <button
                              onClick={handleDeleteHostel}
                              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-[12px] font-sf-bold text-xs uppercase tracking-wider shadow-md shadow-red-600/20 transition-all cursor-pointer"
                            >
                              <X size={15} className="inline mr-2" /> Delete Hostel
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* View: About */}
            {activeView === 'about' && (
              <AboutPage onBack={() => handleNavClick('dashboard')} />
            )}
          </main>
        </div>
      )}
    </div>
  );
}