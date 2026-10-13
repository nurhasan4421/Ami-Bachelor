import React, { useState, useEffect, useRef } from 'react';
import { Bell, Send, Trash2, X, Check } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface NotiProps {
  isManager: boolean;
  roommates: string[];
  sessionUserId?: string;
  activeMonthId?: string | null;
  registeredName?: string;
}

interface NotificationItem {
  id: string;
  message: string;
  created_at: string;
  target_member_id: string | null;
}

export function NotificationBar({ isManager, roommates, sessionUserId, activeMonthId, registeredName }: NotiProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  // Selection states for target members
  const [showMemberList, setShowMemberList] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
const longPressTimer = useRef<any>(null);
  const isLongPress = useRef(false);

  const fetchNotifications = async () => {
    if (!activeMonthId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      if (isManager) {
        setNotifications(data);
      } else {
        setNotifications(data.filter(n => !n.target_member_id || n.target_member_id === sessionUserId));
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isManager, sessionUserId, activeMonthId]);

  // Toggle member selection on/off for targeted notification
  const handleToggleMember = (mem: string) => {
    setSelectedMembers(prev => 
      prev.includes(mem) ? prev.filter(m => m !== mem) : [...prev, mem]
    );
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeMonthId) return;

    if (selectedMembers.length > 0) {
      // Send separate notification entries or targeted records for each selected member
      for (const mem of selectedMembers) {
        await supabase.from('notifications').insert([{
          month_id: activeMonthId,
          message: newMessage.trim(),
          target_member_id: mem,
        }]);
      }
      await supabase.from('history_logs').insert([{
        month_id: activeMonthId,
        person: registeredName || 'Manager',
        action: `Sent targeted notification to members: ${selectedMembers.join(', ')}`
      }]);
    } else {
      // Broadcast to all if no member is specifically selected
      await supabase.from('notifications').insert([{
        month_id: activeMonthId,
        message: newMessage.trim(),
        target_member_id: null,
      }]);
      await supabase.from('history_logs').insert([{
        month_id: activeMonthId,
        person: registeredName || 'Manager',
        action: `Broadcasted notification to all members`
      }]);
    }

    setNewMessage('');
    setSelectedMembers([]);
    setShowMemberList(false);
    fetchNotifications();
  };

  const handleMouseDown = () => {
    if (!isManager) return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowMemberList(true);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleClickSendButton = () => {
    if (!isManager) return;
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    handleSend();
  };

  const handleDelete = async (id: string) => {
    if (!isManager) return;
    await supabase.from('notifications').delete().eq('id', id);
    fetchNotifications();
  };

  return (
    <>
      <div className="flex items-center gap-3 w-full">
        {/* Input Container Pill */}
        <div className="flex-1 bg-white border border-slate-200/90 px-4 py-2 rounded-full shadow-sm flex items-center gap-3 relative">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse ml-1"></span>
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type to send as notification to mem.."
            disabled={!isManager}
            className="flex-1 bg-transparent text-xs md:text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
          />
          {isManager && (
            <div className="relative">
              <button 
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                onClick={handleClickSendButton}
                title="Click to send to all, Press & Hold to select members"
                className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer shadow-sm"
              >
                <Send size={14} className="rotate-45 translate-x-[-1px]" />
              </button>

              {/* Floating member list with multi-select support */}
              {showMemberList && (
                <div className="absolute right-0 bottom-full mb-3 w-60 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 animate-in zoom-in-95 duration-150">
                  <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {selectedMembers.length > 0 ? `${selectedMembers.length} Selected` : 'Select Members:'}
                    </span>
                    <button onClick={() => setShowMemberList(false)} className="text-slate-400 hover:text-slate-700"><X size={14}/></button>
                  </div>
                  
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {roommates.map((mem) => {
                      const isSelected = selectedMembers.includes(mem);
                      return (
                        <div 
                          key={mem} 
                          onClick={() => handleToggleMember(mem)}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer font-bold text-xs transition-colors ${
                            isSelected ? 'bg-red-50 text-red-600 font-black' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{mem}</span>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300'}`}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={handleSend}
                    className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all"
                  >
                    Send {selectedMembers.length > 0 ? `(${selectedMembers.length})` : 'to All'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bell Button */}
        <button 
          onClick={() => setIsOpen(true)}
          className="w-11 h-11 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 text-red-400 flex items-center justify-center shadow-sm relative shrink-0 transition-all hover:scale-105"
        >
          <Bell size={17} />
          {notifications.length > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>
      </div>

      {/* Floating Scrollable Feed Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md max-h-[75vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2 rounded-xl text-red-500"><Bell size={18} /></div>
                <h3 className="text-lg font-black text-slate-800">Notifications Feed</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-white text-slate-400 hover:text-slate-700 rounded-full shadow-sm">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-3 flex-1 custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 leading-relaxed">{n.message}</p>
                      <p className="text-[9px] font-black uppercase text-slate-400">
                        {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {isManager && (
                      <button 
                        onClick={() => handleDelete(n.id)}
                        className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-xs font-bold text-slate-400 py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No notifications available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}