import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { Building, KeyRound, ArrowLeft, Loader2, Copy, Check, UserCircle, ShieldCheck, Eye, AlertCircle, Trash2, Clock } from 'lucide-react';

interface HostelData { id: number | string; name: string; security_code: string; role: 'manager' | 'member'; latestMonthId: string; }
interface HostelOnboardingProps { session: any; managedHostels?: HostelData[]; joinedHostels?: HostelData[]; onJoined: (id: string) => void; }

const MAX_HOSTELS = 3;

export function HostelOnboarding({ session, managedHostels = [], joinedHostels = [], onJoined }: HostelOnboardingProps) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [hostelName, setHostelName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [createdData, setCreatedData] = useState<{ id: string; code: string } | null>(null);
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
    if (!canCreate) { setError(`You have reached the maximum limit of ${MAX_HOSTELS} managed workspaces.`); return; }
    if (!hostelName.trim() || !managerName.trim()) { setError("Please fill in both the hostel name and your name."); return; }
    setLoading(true);
    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const { data: hostel, error: hError } = await supabase.from('hostels').insert([{ name: hostelName, security_code: generatedCode, owner_id: session.user.id }]).select().single();
      if (hError) throw hError;
      const initialMonthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());
      const { data: month, error: mError } = await supabase.from('months').insert([{ name: initialMonthName, hostel_id: hostel.id, owner_id: session.user.id, security_code: generatedCode }]).select().single();
      if (mError) throw mError;
      
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('roommates').insert([{ name: managerName.trim(), month_id: month.id, user_id: session.user.id, email: session.user.email, joined_date: today }]);
      
      setCreatedData({ id: month.id, code: generatedCode });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canJoin) { setError(`You have reached the maximum limit of ${MAX_HOSTELS} joined workspaces.`); return; }
    const cleanCode = securityCode.trim().toUpperCase();
    const cleanName = memberName.trim();
    if (!cleanCode || !cleanName) { setError("Please fill in both your name and the code."); return; }
    setLoading(true); setError(''); setJoinSuccessMsg('');
    try {
      const { data: hostel, error: hError } = await supabase.from('hostels').select('id, name, owner_id').eq('security_code', cleanCode).maybeSingle();
      if (hError || !hostel) throw new Error("Invalid security code. Please check and try again.");
      if (hostel.owner_id === session.user.id) throw new Error("You are the Manager of this workspace! Please select it from 'Your Workspaces'.");
      const { data: month, error: mError } = await supabase.from('months').select('id').eq('hostel_id', hostel.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (mError || !month) throw new Error("Workspace found, but no active months are available.");

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
        if (cleanName.toLowerCase() !== claimedName.toLowerCase()) throw new Error(`You already joined this workspace previously! You must use your registered name: "${claimedName}".`);
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
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Ami Bachelor Logo" className="w-32 h-auto md:w-40 mx-auto object-contain drop-shadow-md hover:scale-105 transition-transform" />
          <p className="text-[8px] font-black text-slate-400 opacity-60 uppercase tracking-[0.3em] mt-3">@NURHASAN4421</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative min-h-[400px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {mode === 'select' && (
              <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {(managedHostels.length > 0 || joinedHostels.length > 0) && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Your Workspaces</p>
                    {managedHostels.map(h => (
                      <div key={h.id} className="w-full flex items-center justify-between p-2 pl-4 pr-2 bg-slate-50 hover:bg-blue-50 rounded-2xl transition-all border border-slate-100 hover:border-blue-100 group">
                        <button onClick={() => onJoined(h.latestMonthId)} className="flex items-center gap-3 flex-1 text-left">
                          <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><ShieldCheck size={18} /></div>
                          <div><p className="font-black text-sm text-slate-800">{h.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manager</p></div>
                        </button>
                        <button onClick={(e) => handleDeleteWorkspace(h, e)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-100 rounded-xl transition-colors" title="Delete Workspace"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    {joinedHostels.map(h => (
                      <div key={h.id} className="w-full flex items-center justify-between p-2 pl-4 pr-2 bg-slate-50 hover:bg-emerald-50 rounded-2xl transition-all border border-slate-100 hover:border-emerald-100 group">
                        <button onClick={() => onJoined(h.latestMonthId)} className="flex items-center gap-3 flex-1 text-left">
                          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl"><Eye size={18} /></div>
                          <div><p className="font-black text-sm text-slate-800">{h.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member</p></div>
                        </button>
                        <button onClick={(e) => handleDeleteWorkspace(h, e)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-100 rounded-xl transition-colors" title="Leave Workspace"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    <div className="w-full h-px bg-slate-100 my-4"></div>
                  </div>
                )}
                <div className="space-y-4">
                  <button onClick={() => { setMode('join'); setJoinSuccessMsg(''); setError(''); }} disabled={!canJoin} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all">Join Workspace</button>
                  <div className="text-center">
                    <button onClick={() => { setMode('create'); setCreateStep(1); setError(''); }} disabled={!canCreate} className="text-sm font-black text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50">
                      {canCreate ? 'Create New Workspace' : `Create limit reached (${MAX_HOSTELS})`}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {mode === 'create' && (
              <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {!createdData ? (
                  <>
                    <button onClick={() => {setMode('select'); setError('');}} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-6 font-black text-[11px] uppercase tracking-widest transition-colors"><ArrowLeft size={14} /> Back</button>
                    <h2 className="text-2xl font-black mb-6 text-slate-800 text-center">Create Your Hostel</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                      {createStep === 1 ? (
                        <>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Building className="text-slate-400" size={20} /></div>
                            <input type="text" placeholder="Hostel Name (e.g. Villa 40)" value={hostelName} onChange={(e) => setHostelName(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-300 transition-all font-bold text-slate-800 outline-none capitalize" autoFocus />
                          </div>
                          <button type="button" onClick={() => setCreateStep(2)} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black transition-all">Next Step</button>
                        </>
                      ) : (
                        <>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><UserCircle className="text-slate-400" size={20} /></div>
                            <input type="text" placeholder="Your Name (Manager)" value={managerName} onChange={(e) => setManagerName(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-300 transition-all font-bold text-slate-800 outline-none capitalize" />
                          </div>
                          {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-xl flex items-center justify-center gap-1"><AlertCircle size={14} /> {error}</p>}
                          <button type="submit" disabled={!managerName.trim() || loading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin" size={20} /> : 'Generate Security Code'}</button>
                        </>
                      )}
                    </form>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} strokeWidth={3} /></div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Hostel Created!</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Share this code to members</p>
                    <div onClick={copyToClipboard} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 mb-6 cursor-pointer hover:bg-slate-100 hover:border-blue-300 transition-all group relative">
                      <span className="text-4xl font-black tracking-widest text-blue-600 font-mono">{createdData.code}</span>
                      <div className="absolute top-3 right-3 text-slate-400 group-hover:text-blue-500 transition-colors">{copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}</div>
                    </div>
                    <button onClick={() => onJoined(createdData.id)} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all active:scale-95">Enter Manager Dashboard</button>
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