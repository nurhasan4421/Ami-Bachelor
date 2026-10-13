import { useState } from 'react';
import { Trash2, RotateCcw, Eye, EyeOff, AlertTriangle, Settings, ChevronDown, LogOut } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface Props {
  activeMonthId: string;
  isManager: boolean;
  showActions: boolean;
  onRefresh: () => void;
}

export function ManagerControls({ activeMonthId, isManager, showActions, onRefresh }: Props) {
  // Hard check to prevent rendering if not manager
  if (!isManager) return null;

  const [isOpen, setIsOpen] = useState(false);

  const handleExit = () => {
    localStorage.removeItem('activeMonthId');
    window.location.reload();
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Account Control Button */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
        <button 
          onClick={handleExit}
          className="w-full flex items-center justify-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-black text-slate-700"
        >
          <LogOut size={18} /> Exit to Setup Screen
        </button>
      </div>

      {/* Manager Workspace Settings */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
      >
        <span className="flex items-center gap-2"><Settings size={18} className="text-blue-600" /> Workspace Settings</span>
        <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      

      {isOpen && (
        <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
          {/* Danger Zone */}
          <div className="bg-red-50 p-6 md:p-8 rounded-[2rem] border border-red-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-red-800 font-black text-lg flex items-center gap-2"><AlertTriangle size={20} /> Danger Zone</h3>
              <button onClick={async () => { await supabase.from('months').update({ show_actions_to_members: !showActions }).eq('id', activeMonthId); onRefresh(); }} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-xs font-black uppercase text-blue-600 shadow-sm">
                {showActions ? <Eye size={14} /> : <EyeOff size={14} />} {showActions ? 'History is Public' : 'History is Private'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => { if(confirm("Reset all data?")) { ['expenses', 'daily_meals', 'food_deposits'].forEach(t => supabase.from(t).delete().eq('month_id', activeMonthId)); onRefresh(); } }} className="bg-white text-red-600 border border-red-200 py-4 rounded-2xl font-black shadow-sm active:scale-95"><RotateCcw size={18} className="inline mr-2" /> Reset Data</button>
              <button onClick={async () => { if(confirm("Delete month permanently?")) { ['expenses', 'daily_meals', 'food_deposits', 'roommates'].forEach(t => supabase.from(t).delete().eq('month_id', activeMonthId)); await supabase.from('months').delete().eq('id', activeMonthId); window.location.reload(); } }} className="bg-red-600 text-white py-4 rounded-2xl font-black shadow-md active:scale-95"><Trash2 size={18} className="inline mr-2" /> Delete Month</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}