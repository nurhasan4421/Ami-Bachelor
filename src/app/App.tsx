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

import { KeyRound, LogOut, Plus, History, ReceiptText, Home, Utensils, RotateCcw, ChevronDown, X, Eye, ShieldCheck, Users, Wallet, UserCircle, ClipboardList, Copy, Check, ShoppingBag, CheckCircle2, Circle, Settings, Banknote, Trash2, UserCheck, UserX, Download, ArrowRight, ArrowLeft, Calendar, MoreVertical, Bell } from 'lucide-react';

interface HostelData { id: number; name: string; security_code: string; role: 'manager' | 'member'; latestMonthId: string; }
interface MonthSheet { id: string; name: string; owner_id?: string; security_code?: string; hostel_id?: number; hostels?: { id: number; name: string; security_code: string; }; }
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

type ViewState = 'dashboard' | 'timeline' | 'fixed-costs' | 'meals' | 'expenses' | 'accounts' | 'manage-hostel' | 'settings' | 'availability';
const StatusBadge = ({ balance }: { balance: number }) => {
  if (Math.abs(balance) < 1) return <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[9px] font-black uppercase">Paid</span>;
  if (balance > 0) return <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[9px] font-black uppercase">CR ৳{balance.toFixed(0)}</span>;
  return <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-[9px] font-black uppercase">Due ৳{Math.abs(balance).toFixed(0)}</span>;
};
export default function App() {
  const [session, setSession] = useState<any>({ user: { id: 'manager-user-001', email: 'nurhasan@gmail.com' } });
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [months, setMonths] = useState<MonthSheet[]>([]);
  const [activeMonthId, setActiveMonthId] = useState<string | null>(() => localStorage.getItem('activeMonthId') || 'month-current');
  
  const [activeView, setActiveView] = useState<ViewState>(() => {
    const saved = localStorage.getItem('ami_active_view') as ViewState;
    const validViews: ViewState[] = ['dashboard', 'timeline', 'fixed-costs', 'meals', 'expenses', 'accounts', 'manage-hostel', 'settings', 'availability'];
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
  const [viewMode, setViewMode] = useState<'manager' | 'member'>('manager');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [showAllAccounts, setShowAllAccounts] = useState(false); 
  const [showAllAvail, setShowAllAvail] = useState(false);
  const [openTimelineMenuId, setOpenTimelineMenuId] = useState<string | null>(null);

  // 🌟 NEW: Apple-Style Notification Banner & Dialog States
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoadingAuth(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); setLoadingAuth(false); });
    return () => subscription.unsubscribe();
  }, []);

  const logAction = async (action: string) => {
    if (!activeMonthId) return;
    try { await supabase.from('history_logs').insert([{ month_id: activeMonthId, person: registeredName || 'Manager', action }]); fetchSheetData(); } 
    catch (e) { console.error("Logging error", e); }
  };

  const fetchMonthsAndHostels = useCallback(async () => {
    if (!session) return;
    const { data: managedRes } = await supabase.from('months').select('*, hostels(id, name, security_code)').eq('owner_id', session.user.id).order('created_at', { ascending: false });
    const { data: myRooms } = await supabase.from('roommates').select('month_id').eq('user_id', session.user.id);
    let joinedRes: MonthSheet[] = [];
    if (myRooms && myRooms.length > 0) {
      const monthIds = [...new Set(myRooms.map(r => r.month_id))];
      const { data } = await supabase.from('months').select('*, hostels(id, name, security_code)').in('id', monthIds).order('created_at', { ascending: false });
      if (data) joinedRes = data;
    }
    const managedM = managedRes || [];
    const joinedM = joinedRes;
    const allAccessibleMonths = [...managedM, ...joinedM].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    setMonths(allAccessibleMonths);
    if (!activeMonthId && allAccessibleMonths.length > 0) {
      setActiveMonthId(allAccessibleMonths[0].id);
    } else if (activeMonthId && !allAccessibleMonths.some(m => m.id === activeMonthId)) {
      setActiveMonthId(allAccessibleMonths[0]?.id || null);
    }
    const mHostelsMap = new Map<number, HostelData>();
    managedM.forEach(m => { if (m.hostels && !mHostelsMap.has(m.hostels.id)) mHostelsMap.set(m.hostels.id, { ...m.hostels, role: 'manager', latestMonthId: m.id }); });
    const jHostelsMap = new Map<number, HostelData>();
    joinedM.forEach(m => { if (m.hostels && !mHostelsMap.has(m.hostels.id) && !jHostelsMap.has(m.hostels.id)) jHostelsMap.set(m.hostels.id, { ...m.hostels, role: 'member', latestMonthId: m.id }); });
    setManagedHostels(Array.from(mHostelsMap.values()));
    setJoinedHostels(Array.from(jHostelsMap.values()));
  }, [session, activeMonthId]);

  useEffect(() => { fetchMonthsAndHostels(); }, [fetchMonthsAndHostels]);

  const activeHostelId = months.find(m => m.id === activeMonthId)?.hostels?.id;
  const visibleMonthsInHostel = months.filter(m => m.hostels?.id === activeHostelId);
  const currentMonthObj = months.find(m => m.id === activeMonthId);

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
  
  const handlePrintMasterTransaction = () => { window.print(); };

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

  const handleSendNotice = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBroadcastNotice(trimmed);
    localStorage.setItem('ami_hostel_notice', trimmed);
    logAction(`Notice sent: ${trimmed}`);
    showToast(`Notification sent to flatmates!`);
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
    const html = `<!DOCTYPE html><html><head><title>Month Report - ${currentMonthObj?.name}</title><style>body { font-family: -apple-system, sans-serif; padding: 40px; color: #1e293b; } table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; font-size: 14px; } th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; } th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 12px; color: #64748b; } h1, h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; } .text-right { text-align: right; } .font-mono { font-family: monospace; font-size: 16px; font-weight: bold; } .credit { color: #16a34a; } .due { color: #dc2626; }</style></head><body><div style="text-align: center; margin-bottom: 40px;"><img src="${window.location.origin}/logo.png" style="height: 60px; object-fit: contain; margin-bottom: 10px;" /><h1 style="margin:0; border:none;">Workspace Report: ${currentMonthObj?.hostels?.name}</h1><p style="color: #64748b; margin-top: 5px;">${currentMonthObj?.name} • Generated ${new Date().toLocaleDateString()}</p></div><h2>1. Members Account Summary</h2><table><tr><th>Name</th><th class="text-right">Total Bill</th><th class="text-right">Total Paid</th><th class="text-right">Net Balance</th></tr>${calculations.indAccounts.map(a => { const totalBill = Object.values(a.expenses).reduce((sum, val) => sum + val, 0) + a.manualAdjustment; const bal = totalBill - a.paid; return `<tr><td><b>${a.name}</b></td><td class="text-right font-mono">৳${totalBill.toFixed(2)}</td><td class="text-right font-mono">৳${a.paid.toFixed(2)}</td><td class="text-right font-mono ${bal > 0 ? 'due' : 'credit'}">${bal > 0 ? 'DUE ৳'+bal.toFixed(2) : 'CR ৳'+Math.abs(bal).toFixed(2)}</td></tr>`; }).join('')}</table><h2>2. Fixed Costs</h2><table><tr><th>Category</th><th class="text-right">Total Amount</th><th class="text-right">Per Person (${roommates.length})</th></tr>${fixedCosts.map(f => `<tr><td>${f.category}</td><td class="text-right font-mono">৳${f.amount.toFixed(2)}</td><td class="text-right font-mono">৳${(f.amount/roommates.length).toFixed(2)}</td></tr>`).join('')}</table><h2>3. Expense History</h2><table><tr><th>Date</th><th>Description</th><th>Category</th><th>Paid By</th><th class="text-right">Amount</th></tr>${expenses.map(e => `<tr><td>${new Date(e.date).toLocaleDateString()}</td><td>${e.description}</td><td>${e.category}</td><td>${e.paidBy}</td><td class="text-right font-mono">৳${e.amount.toFixed(2)}</td></tr>`).join('')}</table><h2>4. Member Meal Count</h2><table><tr><th>Name</th><th class="text-right">Total Meals Consumed</th></tr>${calculations.mealStats.map(s => `<tr><td>${s.person}</td><td class="text-right font-mono">${s.meals}</td></tr>`).join('')}</table></body></html>`;
    const printWindow = window.open('', '_blank');
    if(printWindow) { printWindow.document.write(html); printWindow.document.close(); setTimeout(() => printWindow.print(), 800); }
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
    const fullHTML = `<!DOCTYPE html><html><head><title>All Member Accounts</title><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700;900&display=swap" rel="stylesheet"><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 20px; color: #0f172a; } .bengali-font { font-family: 'Noto Sans Bengali', sans-serif; } .receipt { width: 100%; max-width: 400px; margin: 0 auto 40px auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 16px; } .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; } .hostel-name { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; margin: 0 0 8px 0; } .meta { font-size: 12px; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 1px; } .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; } .row .label { color: #475569; } .row .value { font-family: monospace; font-size: 15px; font-weight: 600; } .divider { border-top: 1px solid #e2e8f0; margin: 16px 0; } .total-row { display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 18px; margin-top: 24px; } .status-badge { display: inline-block; padding: 6px 12px; border-radius: 8px; font-size: 14px; font-weight: 800; text-align: center; margin-top: 24px; width: calc(100% - 24px); } .status-due { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; } .status-credit { background: #f0fdf4; color: #22c55e; border: 1px solid #bbf7d0; } .status-settled { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; } @media print { body { padding: 0; } .receipt { border: none; padding: 20px; margin: 0 auto; box-shadow: none; max-width: 100%; } }</style></head><body>${allReceiptsHTML}</body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(fullHTML); printWindow.document.close(); setTimeout(() => { printWindow.print(); }, 800); }
  };

  if (loadingAuth) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-slate-400">LOADING...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] border border-slate-200 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <img src="/logo.png" alt="Ami Bachelor Logo" className="w-32 h-auto md:w-40 mx-auto object-contain hover:scale-105 transition-transform mb-6" />
          <p className="text-[8px] font-black text-slate-300 opacity-60 uppercase tracking-[0.3em] mt-2 mb-6">@NURHASAN4421</p>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={['google']} onlyThirdPartyProviders={true} redirectTo={`${window.location.origin}/`} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 pb-20 font-sans antialiased text-[14px] md:text-base selection:bg-blue-200 print:bg-white print:text-black">
      
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

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: -100, opacity: 0, scale: 0.95 }} 
            animate={{ y: 24, opacity: 1, scale: 1 }} 
            exit={{ y: -100, opacity: 0, scale: 0.95 }} 
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md pointer-events-none"
          >
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border ${
              toast.type === 'error' ? 'bg-red-500/90 text-white border-red-400/50 shadow-red-500/20' :
              toast.type === 'info' ? 'bg-blue-500/90 text-white border-blue-400/50 shadow-blue-500/20' :
              'bg-slate-900/90 text-white border-slate-700 shadow-slate-900/20'
            }`}>
              {toast.type === 'error' ? <X size={20} strokeWidth={3} /> : toast.type === 'info' ? <Bell size={20} strokeWidth={3}/> : <Check size={20} strokeWidth={3} />}
              <p className="text-sm font-bold tracking-wide">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showFlatmatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2"><Users size={20} className="text-blue-500"/> Manage Flatmates</h2>
              <button onClick={() => setShowFlatmatesModal(false)} className="p-2 bg-white text-slate-400 hover:text-slate-700 rounded-full shadow-sm"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <RoommateManager 
                roommates={roommatesData} isManager={effectiveIsManager} hostelId={activeHostelId} currentUserId={session?.user?.id}
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

      {!activeMonthId ? (
        <div className="flex flex-col min-h-screen bg-[#f3f3f1] text-[#141414]">
          <div className="p-6 flex justify-end">
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-xs font-sf-bold rounded-[30px] border border-red-200 hover:bg-red-100 transition-all"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
          <HostelOnboarding
            session={session}
            managedHostels={managedHostels}
            joinedHostels={joinedHostels}
            onJoined={async (id: string) => {
              setActiveMonthId(id);
              await fetchMonthsAndHostels();
              await fetchSheetData();
            }}
          />
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
            onAddDeposit={handleAddDeposit}
            onUpdateMealMenu={handleUpdateMealMenu}
            currentUserId={session?.user?.id}
            showToast={showToast}
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
          />

          <main className="dashboard mx-auto flex w-[calc(100%-32px)] flex-col gap-[16px] pb-[32px] lg:max-w-[900px]">
            {/* View: Timeline */}
            {activeView === 'timeline' && (
              <div className="flex flex-col gap-[16px]">
                {/* Hero Month Card */}
                <section className="flex items-center justify-between rounded-[24px] bg-[linear-gradient(113.5deg,#212121_0.77%,#000_100%)] px-[23px] py-[20px] text-[#e5e6e1] shadow-xl">
                  <h2 className="font-sf-bold text-2xl text-white">
                    {currentMonthObj?.name || 'Current Month'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {effectiveIsManager && (
                      <button
                        onClick={handleAddMonth}
                        className="flex h-[26px] items-center rounded-full px-[10px] font-sf-medium text-[11px] leading-none transition-all whitespace-nowrap shadow-xs bg-white text-[#141414] hover:bg-slate-100 cursor-pointer"
                      >
                        <span>New Month</span>
                        <span className="ml-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-[3px] text-[10px] font-bold leading-none bg-[#ff0000] text-white">
                          +
                        </span>
                      </button>
                    )}
                    <button
                      onClick={handleExportMonthPDF}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white text-[#141414] hover:bg-slate-100 transition-colors cursor-pointer shadow-xs"
                      title="Export Month PDF"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </section>

                {/* Months Directory */}
                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6] space-y-6">
                  {Object.keys(monthsByYear)
                    .sort((a, b) => Number(b) - Number(a))
                    .map((year) => (
                      <div key={year} className="space-y-3">
                        <h4 className="font-sf-bold text-base text-[#141414] border-b border-[#d6d6d6] pb-2">
                          Year {year}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {monthsByYear[year].map((m: MonthSheet) => {
                            const isSelected = activeMonthId === m.id;
                            return (
                              <div
                                key={m.id}
                                className={`flex items-center justify-between p-4 rounded-[16px] border transition-all ${
                                  isSelected
                                    ? 'bg-white border-red-400 shadow-md ring-1 ring-red-400/30'
                                    : 'bg-[#f3f3f1] border-[#d6d6d6] hover:bg-white'
                                }`}
                              >
                                <div
                                  onClick={() => setActiveMonthId(m.id)}
                                  className="flex items-center gap-3 cursor-pointer flex-1"
                                >
                                  <div
                                    className={`p-2 rounded-[10px] ${
                                      isSelected ? 'bg-red-600 text-white' : 'bg-[#e5e6e1] text-[#626262]'
                                    }`}
                                  >
                                    <Calendar size={18} />
                                  </div>
                                  <div>
                                    <p
                                      className={`font-sf-bold text-sm ${
                                        isSelected ? 'text-[#141414]' : 'text-[#626262]'
                                      }`}
                                    >
                                      {m.name}
                                    </p>
                                    {isSelected && (
                                      <span className="font-sf-bold text-[9px] uppercase tracking-wider text-red-600">
                                        Current Active
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {effectiveIsManager && (
                                  <div className="relative timeline-menu-container">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenTimelineMenuId(openTimelineMenuId === m.id ? null : m.id);
                                      }}
                                      className="p-1.5 text-[#626262] hover:bg-black/5 rounded-[8px]"
                                    >
                                      <MoreVertical size={16} />
                                    </button>

                                    {openTimelineMenuId === m.id && (
                                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#d6d6d6] shadow-xl rounded-[12px] z-50 p-1 flex flex-col">
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            setActiveMonthId(m.id);
                                            setOpenTimelineMenuId(null);
                                          }}
                                          className="text-left px-3 py-1.5 text-xs font-sf-medium text-[#141414] hover:bg-[#f3f3f1] rounded-[6px]"
                                        >
                                          Set Active
                                        </button>
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleRenameMonth(m);
                                            setOpenTimelineMenuId(null);
                                          }}
                                          className="text-left px-3 py-1.5 text-xs font-sf-medium text-[#141414] hover:bg-[#f3f3f1] rounded-[6px]"
                                        >
                                          Rename
                                        </button>
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleCloneMonth(m);
                                            setOpenTimelineMenuId(null);
                                          }}
                                          className="text-left px-3 py-1.5 text-xs font-sf-medium text-[#141414] hover:bg-[#f3f3f1] rounded-[6px]"
                                        >
                                          Clone Month
                                        </button>
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleDeleteTimelineMonth(m.id);
                                            setOpenTimelineMenuId(null);
                                          }}
                                          className="text-left px-3 py-1.5 text-xs font-sf-medium text-red-600 hover:bg-red-50 rounded-[6px]"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
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

                {/* Today's Bazar Checklist Card */}
                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-50 p-2 rounded-[10px] text-red-600">
                        <ShoppingBag size={18} />
                      </div>
                      <div>
                        <h3 className="font-sf-bold text-base text-[#141414]">Today's Bazar Checklist</h3>
                        <p className="font-sf-regular text-[10px] text-[#626262]">
                          {new Date(scheduleDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                    </div>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="text-xs font-sf-medium text-[#141414] bg-white p-2 rounded-[10px] border border-[#d6d6d6] outline-none"
                    />
                  </div>

                  <form onSubmit={handleAddBazarItem} className="flex gap-2">
                    <input
                      type="text"
                      value={newBazarItem}
                      onChange={(e) => setNewBazarItem(e.target.value)}
                      placeholder="Add grocery item to buy..."
                      className="flex-1 px-4 py-2.5 bg-white border border-[#d6d6d6] rounded-[30px] font-sf-medium text-xs text-[#141414] outline-none focus:border-red-500 placeholder-[#8e8e8e]"
                    />
                    <button
                      type="submit"
                      disabled={!newBazarItem.trim()}
                      className="bg-red-600 text-white px-5 py-2.5 rounded-[30px] font-sf-semibold text-xs hover:bg-red-700 disabled:opacity-40 transition-all shadow-md shadow-red-600/20"
                    >
                      <Plus size={16} className="inline mr-1" /> Add
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
                {/* Hero Access Credentials Card */}
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
                {/* Account & Mode Control Card */}
                <div className="rounded-[24px] bg-[#e5e6e1] p-[20px] border border-[#d6d6d6] space-y-4">
                  <h3 className="font-sf-bold text-base text-[#141414]">Account & Mode Control</h3>
                  <div className="p-3 bg-white rounded-[14px] border border-[#d6d6d6] flex items-center justify-between">
                    <div>
                      <p className="font-sf-regular text-[9px] text-[#626262] uppercase tracking-wider">
                        Signed In User
                      </p>
                      <p className="font-sf-bold text-sm text-[#141414]">
                        {session?.user?.email || 'nurhasan@gmail.com'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('manager')}
                        className={`px-3 py-1.5 rounded-[30px] font-sf-bold text-xs transition-all ${
                          viewMode === 'manager'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-[#f3f3f1] text-[#626262] border border-[#d6d6d6]'
                        }`}
                      >
                        Admin Mode
                      </button>
                      <button
                        onClick={() => setViewMode('member')}
                        className={`px-3 py-1.5 rounded-[30px] font-sf-bold text-xs transition-all ${
                          viewMode === 'member'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-[#f3f3f1] text-[#626262] border border-[#d6d6d6]'
                        }`}
                      >
                        Member Mode
                      </button>
                    </div>
                  </div>
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

                {/* Danger Zone */}
                {effectiveIsManager && (
                  <div className="rounded-[24px] bg-[#dedfd9] p-[20px] border border-red-300 space-y-3">
                    <h3 className="font-sf-bold text-base text-red-600">Danger Zone</h3>
                    <button
                      onClick={handleResetData}
                      className="w-full py-3 bg-white text-red-600 hover:bg-red-50 border border-red-200 rounded-[12px] font-sf-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                    >
                      <RotateCcw size={15} className="inline mr-2" /> Reset Month Data to Zero
                    </button>
                    {session?.user?.id === currentMonthObj?.owner_id && (
                      <>
                        <button
                          onClick={handleDeleteCurrentMonth}
                          className="w-full py-3 bg-white text-red-600 hover:bg-red-50 border border-red-200 rounded-[12px] font-sf-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                        >
                          <Trash2 size={15} className="inline mr-2" /> Delete Entire Month
                        </button>
                        <button
                          onClick={handleDeleteHostel}
                          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-[12px] font-sf-bold text-xs uppercase tracking-wider shadow-md shadow-red-600/20 transition-all"
                        >
                          <X size={15} className="inline mr-2" /> Delete Workspace
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}