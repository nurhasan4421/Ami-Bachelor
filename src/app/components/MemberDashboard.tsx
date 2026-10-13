import React from 'react';

export function MemberDashboard(props: any) {
  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-lg font-black text-slate-800 tracking-tight">Meal</h3>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar">
        {/* Card 1: Count & Cost */}
        <div className="w-[300px] sm:w-[320px] shrink-0 bg-[#f3f3ee] p-6 rounded-[2.5rem] border border-slate-200/80 shadow-sm snap-start flex flex-col justify-between h-[210px] relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-sm font-black text-sm shrink-0">
              ৳
            </div>
            <span className="font-black text-slate-800 text-base">Count & Cost</span>
          </div>

          <div className="flex justify-between items-end mt-auto">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">RATE</span>
              <span className="text-xl font-black text-slate-800">56.38</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">BILL ৳ 8795</span>
              <span className="text-3xl font-black text-slate-900 leading-none">156</span>
            </div>
          </div>
        </div>

        {/* Card 2: Sheet Preview */}
        <div className="w-[300px] sm:w-[320px] shrink-0 bg-[#f3f3ee] p-6 rounded-[2.5rem] border border-slate-200/80 shadow-sm snap-start flex flex-col justify-between h-[210px] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-sm font-black text-sm shrink-0">
                📄
              </div>
              <span className="font-black text-slate-800 text-base">Sheet</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">TOTAL 156</span>
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1 justify-end mt-0.5">👥 12</span>
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-3 mt-auto">
            <div className="grid grid-cols-5 text-center text-[10px] font-black uppercase text-slate-400 mb-1.5">
              <span>AJ</span><span>NR</span><span>MH</span><span>SH</span><span>MR</span>
            </div>
            <div className="grid grid-cols-5 text-center text-xs font-bold text-slate-700 bg-white/70 py-2 rounded-2xl shadow-sm">
              <span>1</span><span>2</span><span>2</span><span>-</span><span>3</span>
            </div>
          </div>
        </div>

        {/* Card 3: Members Deposit */}
        <div className="w-[300px] sm:w-[320px] shrink-0 bg-[#f3f3ee] p-6 rounded-[2.5rem] border border-slate-200/80 shadow-sm snap-start flex flex-col justify-between h-[210px] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-sm font-black text-sm shrink-0">
                💰
              </div>
              <span className="font-black text-slate-800 text-base">Members Deposit</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">TOTAL</span>
              <span className="text-sm font-black text-slate-900">7050</span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-200/60 pt-2.5 mt-auto">
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 bg-white/70 px-3 py-2 rounded-xl shadow-sm">
              <span className="truncate">AJMAIN</span>
              <span className="font-mono font-black shrink-0">৳ 2250</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 bg-white/70 px-3 py-2 rounded-xl shadow-sm">
              <span className="truncate">NUR H.</span>
              <span className="font-mono font-black shrink-0">৳ 2500</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 bg-white/70 px-3 py-2 rounded-xl shadow-sm">
              <span className="truncate">MAHADI HASAN</span>
              <span className="font-mono font-black shrink-0">৳ 2300</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}