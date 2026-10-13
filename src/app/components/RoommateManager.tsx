import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, CheckCircle2, XCircle, ShieldAlert, MoreVertical, ChevronDown, Save, ShieldCheck } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface Roommate {
  id: string;
  name: string;
  user_id: string | null;
  month_id: string;
  role?: string;
  email?: string;
  phone?: string;
  address?: string;
  joined_date?: string;
}

interface JoinRequest {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Props {
  roommates: Roommate[];
  isManager: boolean;
  hostelId?: number;
  currentUserId?: string;
  onAddRoommate: (name: string, userId?: string, reqId?: string, email?: string) => void;
  onRemoveRoommate: (name: string) => void;
}

export function RoommateManager({
  roommates,
  isManager,
  hostelId,
  currentUserId,
  onAddRoommate,
  onRemoveRoommate,
}: Props) {
  const [newName, setNewName] = useState('');
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  useEffect(() => {
    if (isManager && hostelId) {
      supabase
        .from('join_requests')
        .select('*')
        .eq('hostel_id', hostelId)
        .then(({ data }) => {
          if (data) setRequests(data);
        });
    }
  }, [isManager, hostelId]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddRoommate(newName);
      setNewName('');
    }
  };

  const handleRoleChange = async (r: Roommate, newRole: string) => {
    await supabase.from('roommates').update({ role: newRole }).eq('id', r.id);
    window.location.reload();
  };

  const handleTransferOwnership = async (r: Roommate) => {
    if (!window.confirm(`Transfer Workspace Ownership to ${r.name}? You will be demoted to Member.`))
      return;
    const currentMonth = roommates.find((rm) => rm.id === r.id)?.month_id;
    if (hostelId && currentMonth) {
      await supabase.from('hostels').update({ owner_id: r.user_id }).eq('id', hostelId);
      await supabase.from('months').update({ owner_id: r.user_id }).eq('id', currentMonth);
      await supabase.from('roommates').update({ role: 'member' }).eq('user_id', currentUserId);
      window.location.reload();
    }
  };

  const handleSaveProfile = async (id: string) => {
    await supabase.from('roommates').update({ phone: editPhone, address: editAddress }).eq('id', id);
    alert('Profile Updated!');
    window.location.reload();
  };

  const openProfile = (r: Roommate) => {
    if (expandedId === r.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(r.id);
    setEditPhone(r.phone || '');
    setEditAddress(r.address || '');
  };

  return (
    <div className="text-[#141414]">
      {/* Join Requests & Add Flatmate Form */}
      {(isManager || requests.length > 0) && (
        <div className="p-4 sm:p-5 border-b border-[#d6d6d6] space-y-4">
          {/* Join Requests */}
          {isManager && requests.length > 0 && (
            <div className="bg-[#dedfd9] border border-red-200 rounded-[18px] p-4">
              <p className="font-sf-bold text-[10px] text-red-600 uppercase tracking-wider mb-3">
                Pending Join Requests
              </p>
              <div className="space-y-2">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between bg-white p-3 rounded-[12px] border border-[#d6d6d6]"
                  >
                    <div>
                      <p className="font-sf-bold text-xs text-[#141414]">{req.name}</p>
                      <p className="font-sf-regular text-[9px] text-[#8e8e8e]">Waiting for approval</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRequests((prev) => prev.filter((r) => r.id !== req.id));
                          onAddRoommate(req.name, req.user_id, req.id, req.email);
                        }}
                        className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-[8px]"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button
                        onClick={async () => {
                          setRequests((prev) => prev.filter((r) => r.id !== req.id));
                          await supabase.from('join_requests').delete().eq('id', req.id);
                        }}
                        className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-[8px]"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Add Input */}
          {isManager && (
            <form onSubmit={handleManualAdd} className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Add new flatmate name..."
                className="flex-1 px-4 py-2.5 bg-white border border-[#d6d6d6] rounded-[30px] font-sf-medium text-xs text-[#141414] outline-none focus:border-red-500 transition-all placeholder-[#8e8e8e]"
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="bg-red-600 text-white px-5 py-2.5 rounded-[30px] font-sf-semibold text-xs hover:bg-red-700 disabled:opacity-40 transition-all shadow-md shadow-red-600/20 cursor-pointer"
              >
                <UserPlus size={16} className="inline mr-1" /> Add
              </button>
            </form>
          )}
        </div>
      )}

      {/* Flatmates Directory */}
      <div>
        {roommates.map((r, i) => (
          <div
            key={i}
            className="border-b border-[#d6d6d6] last:border-b-0 transition-all"
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-black/5 transition-colors">
              <div
                onClick={() => openProfile(r)}
                className="flex items-center gap-3 flex-1 cursor-pointer select-none"
              >
                <div className="bg-[#2b2b2b] h-8 w-8 rounded-full text-white font-sf-bold text-xs shrink-0 flex items-center justify-center">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-sf-bold text-xs text-[#141414] capitalize flex items-center gap-1.5">
                    {r.name}
                    {(r.role === 'supervisor' || r.role === 'manager') && (
                      <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.2 rounded-full uppercase tracking-wider font-sf-bold">
                        {r.role}
                      </span>
                    )}
                  </p>
                  <p className="font-sf-regular text-[9px] text-[#626262] mt-0.5">
                    {r.phone || 'No phone number'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openProfile(r)}
                  className="p-1.5 text-[#626262] hover:bg-black/5 rounded-full transition-transform cursor-pointer"
                  title={expandedId === r.id ? 'Collapse' : 'Expand'}
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${expandedId === r.id ? 'rotate-180' : ''}`}
                  />
                </button>
                {isManager && r.user_id !== currentUserId && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === r.id ? null : r.id);
                      }}
                      className="p-1.5 text-[#626262] hover:bg-black/5 rounded-full transition-colors cursor-pointer"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === r.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#d6d6d6] shadow-xl rounded-[12px] z-50 p-1 flex flex-col">
                        {r.role !== 'supervisor' && (
                          <button
                            onClick={() => handleRoleChange(r, 'supervisor')}
                            className="text-left px-3 py-1.5 font-sf-medium text-xs text-[#141414] hover:bg-[#f3f3f1] rounded-[6px]"
                          >
                            Make Supervisor
                          </button>
                        )}
                        {r.role === 'supervisor' && (
                          <button
                            onClick={() => handleRoleChange(r, 'member')}
                            className="text-left px-3 py-1.5 font-sf-medium text-xs text-[#141414] hover:bg-[#f3f3f1] rounded-[6px]"
                          >
                            Demote to Member
                          </button>
                        )}
                        <button
                          onClick={() => handleTransferOwnership(r)}
                          className="text-left px-3 py-1.5 font-sf-medium text-xs text-orange-600 hover:bg-orange-50 rounded-[6px]"
                        >
                          Transfer Ownership
                        </button>
                        <button
                          onClick={() => onRemoveRoommate(r.name)}
                          className="text-left px-3 py-1.5 font-sf-medium text-xs text-red-600 hover:bg-red-50 rounded-[6px]"
                        >
                          Remove Flatmate
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {expandedId === r.id && (
              <div className="px-4 sm:px-5 py-4 bg-black/5 border-t border-[#d6d6d6] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-[10px] border border-[#d6d6d6]">
                    <p className="font-sf-bold text-[8px] text-[#8e8e8e] uppercase tracking-wider mb-0.5">
                      Email
                    </p>
                    <p className="font-sf-medium text-xs text-[#141414] truncate">
                      {r.email || 'Not Provided'}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-[10px] border border-[#d6d6d6]">
                    <p className="font-sf-bold text-[8px] text-[#8e8e8e] uppercase tracking-wider mb-0.5">
                      Joined Date
                    </p>
                    <p className="font-sf-medium text-xs text-[#141414] truncate">
                      {r.joined_date || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="font-sf-bold text-[8px] text-[#8e8e8e] uppercase tracking-wider block mb-0.5">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      disabled={!isManager}
                      placeholder="Add phone..."
                      className="w-full p-2 bg-white border border-[#d6d6d6] rounded-[8px] font-sf-medium text-xs text-[#141414] outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="font-sf-bold text-[8px] text-[#8e8e8e] uppercase tracking-wider block mb-0.5">
                      Address
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      disabled={!isManager}
                      placeholder="Add address..."
                      className="w-full p-2 bg-white border border-[#d6d6d6] rounded-[8px] font-sf-medium text-xs text-[#141414] outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {isManager && (
                  <button
                    onClick={() => handleSaveProfile(r.id)}
                    className="w-full bg-red-600 text-white p-2.5 rounded-[8px] font-sf-semibold text-xs hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save size={14} /> Save Profile
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}