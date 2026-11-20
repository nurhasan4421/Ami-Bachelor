import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { Building, KeyRound, ArrowLeft, Loader2, Copy, Check, UserCircle, ShieldCheck, Eye, AlertCircle, Trash2, Clock } from 'lucide-react';

interface HostelData { 
  id: number | string; 
  name: string; 
  security_code: string; 
  role: 'manager' | 'member'; 
  latestMonthId: string;
  status?: 'active' | 'pending' | 'deactivated' | 'rejected';
  rejection_reason?: string;
  transaction_id?: string;
}
interface HostelOnboardingProps { session: any; managedHostels?: HostelData[]; joinedHostels?: HostelData[]; onJoined: (id: string) => void; }

const MAX_HOSTELS = 3;

export function HostelOnboarding({ session, managedHostels = [], joinedHostels = [], onJoined }: HostelOnboardingProps) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [hostelName, setHostelName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [memberName, setMemberName] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [createdData, setCreatedData] = useState<{ id: string; code: string; isPending?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinSuccessMsg, setJoinSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const canCreate = managedHostels.length < MAX_HOSTELS;
  const canJoin = joinedHostels.length < MAX_HOSTELS;

  const handleDeleteWorkspace = async (h: HostelData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (h.role === 'manager') {
      if (window.confirm(`☢️ Are you sure you want to completely DELETE "${h.name}"? This removes ALL data for everyone and cannot be undone.`)) {
        await supabase.from('hostels').delete().eq('id', h.id);
        window.location.reload();
      }
    } else {
      if (window.confirm(`🚪 Are you sure you want to LEAVE "${h.name}"? You will lose access until the manager re-approves you.`)) {
        const { data: months } = await supabase.from('months').select('id').eq('hostel_id', h.id);
        if (months) {
          const monthIds = months.map(m => m.id);
          await supabase.from('roommates').delete().in('month_id', monthIds).eq('user_id', session.user.id);
        }
        await supabase.from('join_requests').delete().eq('hostel_id', h.id).eq('user_id', session.user.id);
        window.location.reload();
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) { setError(`You have reached the maximum limit of ${MAX_HOSTELS} managed hostels.`); return; }
    if (!hostelName.trim() || !managerName.trim()) { setError("Please fill in both the hostel name and your name."); return; }
    if (!transactionId.trim()) { setError("Please enter your payment Transaction ID (TrxID)."); return; }
    setLoading(true);
    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const { data: hostel, error: hError } = await supabase.from('hostels').insert([{ 
        name: hostelName.trim(), 
        security_code: generatedCode, 
        owner_id: session.user.id,
        status: 'pending',
        transaction_id: transactionId.trim().toUpperCase(),
        payment_method: paymentMethod,
        payment_phone: paymentPhone.trim() || null
      }]).select().single();
      if (hError) throw hError;

      const initialMonthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());
      const { data: month, error: mError } = await supabase.from('months').insert([{ 
        name: initialMonthName, 
        hostel_id: hostel.id, 
        owner_id: session.user.id, 
        security_code: generatedCode 
      }]).select().single();
      if (mError) throw mError;
      
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('roommates').insert([{ 
        name: managerName.trim(), 
        month_id: month.id, 
        user_id: session.user.id, 
        email: session.user.email, 
        joined_date: today,
        role: 'manager'
      }]);
      
      setCreatedData({ id: month.id, code: generatedCode, isPending: true });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canJoin) { setError(`You have reached the maximum limit of ${MAX_HOSTELS} joined hostels.`); return; }
    const cleanCode = securityCode.trim().toUpperCase();
    const cleanName = memberName.trim();
    if (!cleanCode || !cleanName) { setError("Please fill in both your name and the code."); return; }
    setLoading(true); setError(''); setJoinSuccessMsg('');
    try {
      const { data: lookupData, error: lookupErr } = await supabase.rpc('lookup_hostel_by_security_code', { p_code: cleanCode });
      const hostel = lookupData && lookupData.length > 0 ? lookupData[0] : null;
      if (lookupErr || !hostel) throw new Error("Invalid security code. Please check and try again.");
      if (hostel.owner_id === session.user.id) throw new Error("You are the Manager of this hostel! Please select it from 'Your Hostels'.");
      const month = { id: hostel.latest_month_id };
      if (!month.id) throw new Error("Hostel found, but no active months are available.");

      const { data: allMonths } = await supabase.from('months').select('id').eq('hostel_id', hostel.id);
      if (allMonths && allMonths.length > 0) {
          const monthIds = allMonths.map(m => m.id);
          const { data: pastHistory } = await supabase.from('roommates').select('name').in('month_id', monthIds).eq('user_id', session.user.id).limit(1);
          if (pastHistory && pastHistory.length > 0) {
              const requiredName = pastHistory[0].name;
              if (cleanName.toLowerCase() !== requiredName.toLowerCase()) {
                   throw new Error(`Welcome back! You must rejoin using your previously registered name: "${requiredName}".`);
              }
          }
      }

      const { data: myRecords } = await supabase.from('roommates').select('*').eq('month_id', month.id).eq('user_id', session.user.id);
      if (myRecords && myRecords.length > 0) {
        const claimedName = myRecords[0].name;
        if (cleanName.toLowerCase() !== claimedName.toLowerCase()) throw new Error(`You already joined this hostel previously! You must use your registered name: "${claimedName}".`);
        else { onJoined(month.id); return; }
      } 
      const { data: pendingReq } = await supabase.from('join_requests').select('*').eq('hostel_id', hostel.id).eq('user_id', session.user.id).maybeSingle();
      if (pendingReq) throw new Error(`You already have a pending request sent as "${pendingReq.name}". Please ask the manager to approve you.`);
      const { data: nameInRoommates } = await supabase.from('roommates').select('*').eq('month_id', month.id).ilike('name', cleanName).maybeSingle();
      if (nameInRoommates && nameInRoommates.user_id !== session.user.id) throw new Error(`The name "${cleanName}" is already taken by another member. Please choose a different name.`);
      const { data: nameInReqs } = await supabase.from('join_requests').select('*').eq('hostel_id', hostel.id).ilike('name', cleanName).maybeSingle();
      if (nameInReqs && nameInReqs.user_id !== session.user.id) throw new Error(`The name "${cleanName}" is currently pending approval by another user.`);
      
      const { error: insertErr } = await supabase.from('join_requests').insert([{ hostel_id: hostel.id, user_id: session.user.id, name: cleanName, email: session.user.email }]);
      if (insertErr) throw insertErr;
      setJoinSuccessMsg(`Success! Request sent to "${hostel.name}". The manager must approve you in their Flatmates tab before you can enter.`);
      setMemberName(''); setSecurityCode('');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const copyToClipboard = () => {
    if (createdData) { navigator.clipboard.writeText(createdData.code); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Ami Bachelor Logo" className="w-36 h-auto md:w-44 mx-auto object-contain hover:scale-105 transition-transform" />
          <p className="text-[9px] font-black text-slate-400 opacity-60 uppercase tracking-[0.3em] mt-2 mb-4">@NURHASAN4421</p>
        </div>

        <div className="w-full relative min-h-[360px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {mode === 'select' && (
              <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {(managedHostels.length > 0 || joinedHostels.length > 0) && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Your Hostels</p>
                    {managedHostels.map(h => {
                      const isPending = h.status === 'pending';
                      const isRejected = h.status === 'rejected';
                      const isDeactivated = h.status === 'deactivated';

                      return (
                        <div key={h.id} className={`w-full flex items-center justify-between p-2 pl-4 pr-2 rounded-2xl transition-all border ${
                          isPending 
                            ? 'bg-amber-50/70 border-amber-200' 
                            : isRejected 
                            ? 'bg-red-50/70 border-red-200' 
                            : isDeactivated
                            ? 'bg-slate-100/80 border-slate-200 opacity-75'
                            : 'bg-white hover:bg-blue-50 border-slate-200 hover:border-blue-200'
                        } group`}>
                          <button 
                            disabled={isPending || isDeactivated}
                            onClick={() => onJoined(h.latestMonthId)} 
                            className="flex items-center gap-3 flex-1 text-left disabled:cursor-not-allowed"
                          >
                            <div className={`p-2 rounded-xl ${
                              isPending 
                                ? 'bg-amber-100 text-amber-700' 
                                : isRejected
                                ? 'bg-red-100 text-red-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {isPending ? <Clock size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-sm text-slate-800">{h.name}</p>
                                {isPending && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 animate-pulse">
                                    Under Verification
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-red-200 text-red-800">
                                    Rejected
                                  </span>
                                )}
                                {isDeactivated && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                                    Deactivated
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {isPending ? 'Awaiting Super Admin Approval' : isRejected ? `Rejected: ${h.rejection_reason || 'Invalid TxID'}` : 'Manager'}
                              </p>
                            </div>
                          </button>
                          <button onClick={(e) => handleDeleteWorkspace(h, e)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-100 rounded-xl transition-colors cursor-pointer" title="Delete Hostel"><Trash2 size={16} /></button>
                        </div>
                      );
                    })}
                    {joinedHostels.map(h => (
                      <div key={h.id} className="w-full flex items-center justify-between p-2 pl-4 pr-2 bg-white hover:bg-emerald-50 rounded-2xl transition-all border border-slate-200 hover:border-emerald-200 group">
                        <button onClick={() => onJoined(h.latestMonthId)} className="flex items-center gap-3 flex-1 text-left cursor-pointer">
                          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl"><Eye size={18} /></div>
                          <div><p className="font-black text-sm text-slate-800">{h.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member</p></div>
                        </button>
                        <button onClick={(e) => handleDeleteWorkspace(h, e)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-100 rounded-xl transition-colors cursor-pointer" title="Leave Hostel"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    <div className="w-full h-px bg-slate-200 my-4"></div>
                  </div>
                )}
                <div className="space-y-4">
                  <button onClick={() => { setMode('join'); setJoinSuccessMsg(''); setError(''); }} disabled={!canJoin} className="w-full py-4.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-base shadow-lg shadow-slate-900/10 active:scale-98 transition-all cursor-pointer">Join Hostel</button>
                  <div className="text-center">
                    <button onClick={() => { setMode('create'); setError(''); }} disabled={!canCreate} className="text-sm font-black text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 cursor-pointer">
                      {canCreate ? 'Create New Hostel' : `Create limit reached (${MAX_HOSTELS})`}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {mode === 'create' && (
              <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {!createdData ? (
                  <>
                    <button onClick={() => {setMode('select'); setError('');}} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-6 font-black text-[11px] uppercase tracking-widest transition-colors cursor-pointer"><ArrowLeft size={14} /> Back</button>
                    <h2 className="text-2xl font-black mb-6 text-slate-800 text-center">Create New Hostel</h2>

                    <form onSubmit={handleCreate} className="space-y-3.5">
                      {/* Field 1: Hostel Name */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Building className="text-slate-400" size={18} /></div>
                        <input 
                          type="text" 
                          placeholder="Hostel Name (e.g. Villa 40)" 
                          value={hostelName} 
                          onChange={(e) => setHostelName(e.target.value)} 
                          className="w-full pl-11 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-bold text-slate-800 outline-none capitalize text-sm" 
                          autoFocus 
                        />
                      </div>

                      {/* Field 2: Your Name (Manager) */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><UserCircle className="text-slate-400" size={18} /></div>
                        <input 
                          type="text" 
                          placeholder="Your Name (Manager)" 
                          value={managerName} 
                          onChange={(e) => setManagerName(e.target.value)} 
                          className="w-full pl-11 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-bold text-slate-800 outline-none capitalize text-sm" 
                        />
                      </div>

                      {/* Divider */}
                      <div className="w-full h-px bg-slate-200 my-2" />

                      {/* Mini Payment Method Selector */}
                      <div className="flex gap-2">
                        {(['bKash', 'Nagad', 'Rocket'] as const).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] uppercase tracking-wider border transition-all cursor-pointer ${
                              paymentMethod === method
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>

                      {/* Field 3: Transaction ID */}
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Transaction ID (TrxID) *" 
                          value={transactionId} 
                          onChange={(e) => setTransactionId(e.target.value.toUpperCase())} 
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-mono font-bold text-slate-800 outline-none uppercase tracking-wider text-sm" 
                        />
                      </div>

                      {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-xl flex items-center justify-center gap-1"><AlertCircle size={14} /> {error}</p>}

                      <button 
                        type="submit" 
                        disabled={!hostelName.trim() || !managerName.trim() || !transactionId.trim() || loading} 
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 active:scale-98"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create Hostel'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="bg-amber-100 text-amber-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><Clock size={32} strokeWidth={2.5} /></div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Submitted for Verification!</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Awaiting Super Admin Approval</p>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 text-xs text-slate-600 space-y-2 text-left">
                      <p><strong>Hostel:</strong> {hostelName}</p>
                      <p><strong>Method:</strong> <span className="font-bold text-slate-800">{paymentMethod}</span></p>
                      <p><strong>Transaction ID:</strong> <span className="font-mono text-blue-600 font-bold">{transactionId}</span></p>
                      <p><strong>Security Code:</strong> <span className="font-mono font-bold">{createdData.code}</span></p>
                      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">The Super Admin will check the transaction statement and activate your hostel soon.</p>
                    </div>
                    <button onClick={() => { setCreatedData(null); setMode('select'); }} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm shadow-lg shadow-slate-900/10 transition-all active:scale-95 cursor-pointer">Back to Setup</button>
                  </div>
                )}
              </motion.div>
            )}

            {mode === 'join' && (
              <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => { setMode('select'); setError(''); setJoinSuccessMsg(''); }} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-6 font-black text-[11px] uppercase tracking-widest transition-colors"><ArrowLeft size={14} /> Back</button>
                <h2 className="text-2xl font-black mb-6 text-slate-800 text-center">Join Your Room</h2>
                {joinSuccessMsg ? (
                  <div className="text-center py-4 animate-in zoom-in duration-300">
                    <div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><Clock size={32} strokeWidth={2.5} /></div>
                    <h3 className="text-lg font-black text-slate-800 mb-2">Request Sent!</h3>
                    <p className="text-sm font-bold text-slate-500 leading-relaxed mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">{joinSuccessMsg}</p>
                    <button onClick={() => { setMode('select'); setJoinSuccessMsg(''); }} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black transition-all">Return Home</button>
                  </div>
                ) : (
                  <form onSubmit={handleJoin} className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><UserCircle className="text-slate-400" size={20} /></div>
                      <input type="text" placeholder="Your Full Name" value={memberName} onChange={(e) => setMemberName(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all font-bold text-slate-800 outline-none capitalize" autoFocus />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><KeyRound className="text-slate-400" size={20} /></div>
                      <input type="text" placeholder="6-DIGIT CODE" value={securityCode} onChange={(e) => setSecurityCode(e.target.value.toUpperCase())} maxLength={6} className="w-full pl-12 pr-5 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all font-black text-center text-xl tracking-[0.3em] text-slate-800 outline-none uppercase placeholder:tracking-normal placeholder:font-medium placeholder:text-left" />
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-xl flex items-center justify-center gap-1"><AlertCircle size={14} /> {error}</p>}
                    <div className="pt-2"><button type="submit" disabled={securityCode.length < 4 || !memberName.trim() || loading} className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 active:scale-95">{loading ? <Loader2 className="animate-spin" size={20} /> : 'Request Access'}</button></div>
                  </form>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}