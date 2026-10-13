import React from 'react';

interface HeaderProps {
  name: string;
  hostelName: string;
  totalPaid: number;
  balance: number;
  avatarUrl?: string;
}

export function DashboardHeader({ name, hostelName, totalPaid, balance, avatarUrl }: HeaderProps) {
  const isDue = balance < 0;

  return (
    <div className="bg-[#000000] p-6 rounded-[32px] text-white shadow-2xl">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" alt={name} />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold">
            {name.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold">{name}</p>
          <h2 className="text-lg font-black tracking-tight">{hostelName}</h2>
        </div>
      </div>
      
      <div className="mt-8 flex justify-between items-end">
        <div>
          <p className="text-[11px] font-bold opacity-50 uppercase tracking-widest mb-1">
            {isDue ? "Due" : "Balance"}
          </p>
          <h1 className={`text-4xl font-black ${isDue ? "text-[#FF0000]" : "text-white"}`}>
            ৳{isDue ? Math.abs(balance).toFixed(2) : balance.toFixed(2)}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest">Total Paid</p>
          <p className="text-sm font-black">+ ৳{totalPaid.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}