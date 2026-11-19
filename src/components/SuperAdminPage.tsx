import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldAlert, 
  ShieldCheck, 
  Power, 
  RefreshCw, 
  ArrowLeft,
  Mail,
  Receipt,
  Eye,
  SlidersHorizontal,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

export interface SuperAdminHostel {
  id: number | string;
  name: string;
  security_code: string;
  status: 'active' | 'pending' | 'deactivated' | 'rejected';
  bot_enabled?: boolean;
  owner_id?: string;
  created_at: string;
  last_active_at?: string;
  transaction_id?: string;
  payment_method?: string;
  payment_phone?: string;
  rejection_reason?: string;
  approved_at?: string;
  approved_by?: string;
  // Aggregated data
  managerName?: string;
  managerEmail?: string;
  totalMembers?: number;
  totalMonths?: number;
  months?: Array<{ id: string; name: string; created_at: string }>;
  members?: Array<{ id: string; name: string; email?: string; role?: string; joined_date?: string }>;
}

interface SuperAdminPageProps {
  currentUserId?: string;
  currentUserEmail?: string;
  onExitSuperAdmin: () => void;
  onSelectHostelMonth?: (monthId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SuperAdminPage({
  currentUserId,
  currentUserEmail,
  onExitSuperAdmin,
  onSelectHostelMonth,
  showToast
}: SuperAdminPageProps) {
  const [hostels, setHostels] = useState<SuperAdminHostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'deactivated' | 'rejected'>('all');
  const [expandedHostelId, setExpandedHostelId] = useState<string | number | null>(null);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  // Rejection modal state
  const [rejectingHostel, setRejectingHostel] = useState<SuperAdminHostel | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchHostelsData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all hostels
      const { data: hostelsRes, error: hErr } = await supabase
        .from('hostels')
        .select('*')
        .order('created_at', { ascending: false });

      if (hErr) throw hErr;
      const rawHostels = hostelsRes || [];

      // 2. Fetch all months
      const { data: monthsRes } = await supabase
        .from('months')
        .select('id, name, hostel_id, created_at')
        .order('created_at', { ascending: false });
      const monthsList = monthsRes || [];

      // 3. Fetch all roommates to aggregate members and manager emails
      const { data: roommatesRes } = await supabase
        .from('roommates')
        .select('id, name, email, role, joined_date, month_id, user_id');
      const roommatesList = roommatesRes || [];

      // Aggregate info per hostel
      const aggregated: SuperAdminHostel[] = rawHostels.map((h: any) => {
        const hostelMonths = monthsList.filter((m: any) => m.hostel_id === h.id);
        const monthIds = new Set(hostelMonths.map((m: any) => m.id));
        
        // Members in this hostel
        const hostelRoommates = roommatesList.filter((r: any) => monthIds.has(r.month_id));
        
        // Distinct members by user_id or name
        const uniqueMembersMap = new Map<string, any>();
        hostelRoommates.forEach((r: any) => {
          const key = (r.email || r.name).toLowerCase();
          if (!uniqueMembersMap.has(key)) {
            uniqueMembersMap.set(key, r);
          }
        });
        const distinctMembers = Array.from(uniqueMembersMap.values());

        // Find manager
        const manager = distinctMembers.find((m: any) => m.role === 'manager' || m.user_id === h.owner_id) || distinctMembers[0];

        return {
          id: h.id,
          name: h.name,
          security_code: h.security_code,
          status: h.status || 'active',
          owner_id: h.owner_id,
          created_at: h.created_at,
          last_active_at: h.last_active_at || h.created_at,
          transaction_id: h.transaction_id,
          payment_method: h.payment_method || 'bKash',
          payment_phone: h.payment_phone,
          rejection_reason: h.rejection_reason,
          approved_at: h.approved_at,
          approved_by: h.approved_by,
          managerName: manager?.name || 'Manager',
          managerEmail: manager?.email || 'N/A',
          totalMembers: distinctMembers.length,
          totalMonths: hostelMonths.length,
          months: hostelMonths,
          members: distinctMembers
        };
      });

      setHostels(aggregated);
    } catch (err: any) {
      console.error('Error fetching admin hostels:', err);
      if (showToast) showToast(err.message || 'Failed to load hostels', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostelsData();
  }, []);

  // Filtered hostels
  const filteredHostels = useMemo(() => {
    return hostels.filter((h) => {
      const matchesSearch = 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.security_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.managerName && h.managerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.managerEmail && h.managerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.transaction_id && h.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' ? true : h.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [hostels, searchQuery, statusFilter]);

  // Counts
  const stats = useMemo(() => {
    const total = hostels.length;
    const pending = hostels.filter((h) => h.status === 'pending').length;
    const active = hostels.filter((h) => h.status === 'active').length;
    const deactivated = hostels.filter((h) => h.status === 'deactivated').length;
    const totalUsers = hostels.reduce((sum, h) => sum + (h.totalMembers || 0), 0);
    return { total, pending, active, deactivated, totalUsers };
  }, [hostels]);

  // Actions
  const handleApprove = async (hostel: SuperAdminHostel) => {
    setActionLoadingId(hostel.id);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('hostels')
        .update({
          status: 'active',
          approved_at: now,
          approved_by: currentUserEmail || 'super-admin',
          rejection_reason: null
        })
        .eq('id', hostel.id);

      if (error) throw error;

      setHostels((prev) =>
        prev.map((h) =>
          h.id === hostel.id
            ? { ...h, status: 'active', approved_at: now, approved_by: currentUserEmail }
            : h
        )
      );

      if (showToast) showToast(`"${hostel.name}" approved and activated!`, 'success');
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to approve', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReject = (hostel: SuperAdminHostel) => {
    setRejectingHostel(hostel);
    setRejectionReason('Transaction ID not found in statements or amount mismatch.');
  };

  const handleConfirmReject = async () => {
    if (!rejectingHostel) return;
    setActionLoadingId(rejectingHostel.id);
    try {
      const { error } = await supabase
        .from('hostels')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          approved_by: currentUserEmail || 'super-admin'
        })
        .eq('id', rejectingHostel.id);

      if (error) throw error;

      setHostels((prev) =>
        prev.map((h) =>
          h.id === rejectingHostel.id
            ? { ...h, status: 'rejected', rejection_reason: rejectionReason.trim() }
            : h
        )
      );

      if (showToast) showToast(`"${rejectingHostel.name}" has been rejected.`, 'info');
      setRejectingHostel(null);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to reject', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActive = async (hostel: SuperAdminHostel) => {
    const newStatus = hostel.status === 'active' ? 'deactivated' : 'active';
    setActionLoadingId(hostel.id);
    try {
      const { error } = await supabase
        .from('hostels')
        .update({ status: newStatus })
        .eq('id', hostel.id);

      if (error) throw error;

      setHostels((prev) =>
        prev.map((h) => (h.id === hostel.id ? { ...h, status: newStatus } : h))
      );

      if (showToast) {
        showToast(
          `"${hostel.name}" is now ${newStatus === 'active' ? 'Active' : 'Deactivated'}`,
          newStatus === 'active' ? 'success' : 'info'
        );
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to change status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleBot = async (hostel: SuperAdminHostel) => {
    const nextState = !Boolean(hostel.bot_enabled);
    setActionLoadingId(`bot-${hostel.id}`);
    try {
      const { error } = await supabase
        .from('hostels')
        .update({ bot_enabled: nextState })
        .eq('id', hostel.id);

      if (error) throw error;

      setHostels((prev) =>
        prev.map((h) => (h.id === hostel.id ? { ...h, bot_enabled: nextState } : h))
      );

      if (showToast) {
        showToast(
          `Telegram Bot ${nextState ? 'Unlocked & Enabled' : 'Disabled'} for "${hostel.name}"`,
          nextState ? 'success' : 'info'
        );
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to toggle bot', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxId(id);
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-dvh bg-[#f3f3f1] text-[#141414] pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#d6d6d6] bg-[#f3f3f1]">
        <div className="mx-auto flex h-[64px] w-[calc(100%-32px)] items-center justify-between lg:max-w-[1100px]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onExitSuperAdmin}
              className="flex h-[36px] items-center gap-1.5 rounded-full border border-[#d6d6d6] bg-white px-3 font-sf-bold text-xs text-[#141414] hover:bg-slate-50 transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
            >
              <ArrowLeft size={16} /> <span className="hidden sm:inline">Exit to </span>Hostel
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
              <h1 className="font-sf-bold text-sm sm:text-base md:text-lg tracking-tight text-[#141414] truncate">
                <span className="hidden sm:inline">Platform Control & </span>Super Admin
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHostelsData}
              disabled={loading}
              className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-[#d6d6d6] bg-white text-[#141414] hover:bg-slate-50 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-red-600' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 w-[calc(100%-32px)] flex flex-col gap-6 lg:max-w-[1100px]">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-[20px] bg-white border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-sf-bold uppercase tracking-wider">Total Hostels</span>
              <Building2 size={16} className="text-slate-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-sf-black text-slate-900">{stats.total}</div>
          </div>

          <div className="rounded-[20px] bg-amber-50/60 border border-amber-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-[11px] font-sf-bold uppercase tracking-wider">Pending Review</span>
              <Clock size={16} className="text-amber-600 animate-bounce" />
            </div>
            <div className="text-2xl sm:text-3xl font-sf-black text-amber-900">{stats.pending}</div>
          </div>

          <div className="rounded-[20px] bg-emerald-50/60 border border-emerald-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-[11px] font-sf-bold uppercase tracking-wider">Active Hostels</span>
              <ShieldCheck size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-sf-black text-emerald-900">{stats.active}</div>
          </div>

          <div className="rounded-[20px] bg-white border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-sf-bold uppercase tracking-wider">Total Members</span>
              <Users size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-sf-black text-slate-900">{stats.totalUsers}</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-[20px] border border-slate-200/80 shadow-xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by hostel, code, manager, email, or TrxID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-[12px] font-sf-medium text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {(['all', 'pending', 'active', 'deactivated', 'rejected'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-[10px] font-sf-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st} {st === 'pending' && stats.pending > 0 && `(${stats.pending})`}
              </button>
            ))}
          </div>
        </div>

        {/* Hostels List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-[24px] border border-slate-200 p-12 text-center text-slate-400 font-sf-medium text-sm flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-red-600" />
              <span>Loading all workspaces and transactions...</span>
            </div>
          ) : filteredHostels.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-slate-200 p-12 text-center text-slate-500 font-sf-medium text-sm">
              No hostels matching your criteria found.
            </div>
          ) : (
            filteredHostels.map((hostel) => {
              const isExpanded = expandedHostelId === hostel.id;
              const isPending = hostel.status === 'pending';
              const isRejected = hostel.status === 'rejected';
              const isDeactivated = hostel.status === 'deactivated';
              const isLoadingThis = actionLoadingId === hostel.id;

              return (
                <div
                  key={hostel.id}
                  className={`bg-white rounded-[20px] border transition-all overflow-hidden ${
                    isPending
                      ? 'border-amber-300 shadow-amber-500/10 shadow-md'
                      : isDeactivated
                      ? 'border-slate-200 opacity-80'
                      : 'border-slate-200/90 shadow-xs'
                  }`}
                >
                  {/* Top Card Row */}
                  <div
                    onClick={() => setExpandedHostelId(isExpanded ? null : hostel.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                  >
                    {/* Left: Info */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isPending
                            ? 'bg-amber-100 text-amber-700'
                            : isRejected
                            ? 'bg-red-100 text-red-600'
                            : isDeactivated
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <Building2 size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-sf-black text-base text-slate-900 truncate">
                            {hostel.name}
                          </h3>

                          {/* Status Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-sf-black uppercase tracking-wider ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                : isRejected
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : isDeactivated
                                ? 'bg-slate-100 text-slate-600 border border-slate-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {hostel.status}
                          </span>

                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border border-slate-200">
                            CODE: {hostel.security_code}
                          </span>
                        </div>

                        {/* Meta details */}
                        <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-sf-medium flex-wrap">
                          <span>
                            Manager: <strong className="text-slate-800">{hostel.managerName}</strong> ({hostel.managerEmail})
                          </span>
                          <span>•</span>
                          <span>Created: {formatDate(hostel.created_at)}</span>
                          <span>•</span>
                          <span>Members: <strong>{hostel.totalMembers}</strong></span>
                          <span>•</span>
                          <span>Months: <strong>{hostel.totalMonths}</strong></span>
                        </div>

                        {/* Payment details pill if present */}
                        {hostel.transaction_id && (
                          <div className="mt-2 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-sf-medium">
                            <span className="font-sf-bold text-slate-700">{hostel.payment_method || 'bKash'}:</span>
                            <span className="font-mono font-bold text-blue-600">{hostel.transaction_id}</span>
                            {hostel.payment_phone && (
                              <span className="text-slate-500">({hostel.payment_phone})</span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(hostel.transaction_id!, `tx-${hostel.id}`);
                              }}
                              className="text-slate-400 hover:text-blue-600 p-0.5 transition-colors cursor-pointer"
                              title="Copy TrxID"
                            >
                              {copiedTxId === `tx-${hostel.id}` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            disabled={isLoadingThis}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(hostel);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[12px] font-sf-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <CheckCircle2 size={16} /> Accept & Activate
                          </button>
                          <button
                            type="button"
                            disabled={isLoadingThis}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReject(hostel);
                            }}
                            className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-[12px] font-sf-bold text-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <XCircle size={16} /> Reject
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Telegram Bot Toggle */}
                          <button
                            type="button"
                            disabled={actionLoadingId === `bot-${hostel.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleBot(hostel);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-[12px] font-sf-bold text-xs border transition-all cursor-pointer active:scale-95 ${
                              hostel.bot_enabled
                                ? 'bg-[#229ED9]/15 text-[#1b7fae] border-[#229ED9]/40 hover:bg-[#229ED9]/25'
                                : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                            }`}
                            title={hostel.bot_enabled ? 'Disable Telegram Bot for this hostel' : 'Enable Telegram Bot for this hostel'}
                          >
                            <Bot size={14} className={hostel.bot_enabled ? 'text-[#229ED9]' : 'text-slate-400'} />
                            <span>Bot: {hostel.bot_enabled ? 'ON' : 'OFF'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={isLoadingThis}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(hostel);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-[12px] font-sf-bold text-xs border transition-all cursor-pointer active:scale-95 ${
                              isDeactivated
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                            }`}
                            title={isDeactivated ? 'Activate this workspace' : 'Temporarily deactivate workspace'}
                          >
                            <Power size={14} />
                            <span>{isDeactivated ? 'Activate' : 'Deactivate'}</span>
                          </button>
                        </>
                      )}

                      <div className="p-2 text-slate-400">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-100 bg-slate-50/70 p-5 space-y-6"
                      >
                        {/* Transaction & Verification Record */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                          <h4 className="font-sf-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <Receipt size={14} className="text-blue-500" /> Payment & Verification Record
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-slate-400 font-sf-medium">Payment Method</p>
                              <p className="font-sf-bold text-slate-800">{hostel.payment_method || 'bKash'}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-sf-medium">Transaction ID</p>
                              <div className="flex items-center gap-1.5">
                                <p className="font-mono font-black text-blue-600">{hostel.transaction_id || 'None Provided'}</p>
                                {hostel.transaction_id && (
                                  <button
                                    onClick={() => copyToClipboard(hostel.transaction_id!, `detail-${hostel.id}`)}
                                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                  >
                                    {copiedTxId === `detail-${hostel.id}` ? <Check size={12} className="text-emerald-600"/> : <Copy size={12} />}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-slate-400 font-sf-medium">Sender Number</p>
                              <p className="font-sf-bold text-slate-800">{hostel.payment_phone || 'N/A'}</p>
                            </div>
                            {hostel.approved_at && (
                              <div>
                                <p className="text-slate-400 font-sf-medium">Approved Date</p>
                                <p className="font-sf-bold text-emerald-700">{formatDate(hostel.approved_at)} by {hostel.approved_by || 'Admin'}</p>
                              </div>
                            )}
                            {hostel.rejection_reason && (
                              <div className="sm:col-span-2">
                                <p className="text-red-400 font-sf-medium">Rejection Reason</p>
                                <p className="font-sf-bold text-red-600">{hostel.rejection_reason}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Months Timeline */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                          <h4 className="font-sf-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <Calendar size={14} className="text-red-500" /> Active & Past Months ({hostel.months?.length || 0})
                          </h4>
                          {hostel.months && hostel.months.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {hostel.months.map((m) => (
                                <div
                                  key={m.id}
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sf-bold text-slate-800"
                                >
                                  <span>{m.name}</span>
                                  {onSelectHostelMonth && (
                                    <button
                                      onClick={() => onSelectHostelMonth(m.id)}
                                      className="text-blue-600 hover:underline text-[11px] font-sf-medium flex items-center gap-0.5 cursor-pointer ml-1"
                                      title="Open this month in sheet view"
                                    >
                                      Inspect <ExternalLink size={11} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 font-sf-medium">No months recorded yet.</p>
                          )}
                        </div>

                        {/* Members Roster */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                          <h4 className="font-sf-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <Users size={14} className="text-blue-500" /> Registered Flatmates ({hostel.members?.length || 0})
                          </h4>
                          {hostel.members && hostel.members.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {hostel.members.map((mem) => (
                                <div
                                  key={mem.id}
                                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-sf-bold text-xs text-slate-900">{mem.name}</span>
                                    <span
                                      className={`text-[9px] font-sf-bold uppercase px-2 py-0.5 rounded-full ${
                                        mem.role === 'manager' || mem.role === 'supervisor'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {mem.role || 'Member'}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-[11px] text-slate-500 truncate flex items-center gap-1">
                                    <Mail size={12} className="shrink-0 text-slate-400" />
                                    <span className="truncate">{mem.email || 'No email registered'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 font-sf-medium">No members enrolled yet.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectingHostel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-[24px] border border-slate-200 p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <ShieldAlert size={22} />
              <h3 className="font-sf-bold text-lg text-slate-900">Reject Hostel Request</h3>
            </div>
            <p className="text-xs text-slate-500 font-sf-medium mb-4">
              Rejecting <strong>"{rejectingHostel.name}"</strong> with transaction ID <strong>{rejectingHostel.transaction_id || 'N/A'}</strong>. Enter a reason so the user knows what to correct:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sf-medium text-slate-800 outline-none focus:border-red-500 focus:bg-white transition-all resize-none"
              placeholder="e.g. Transaction ID not found or invalid sender number."
            />
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRejectingHostel(null)}
                className="px-4 py-2 text-xs font-sf-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-sf-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
