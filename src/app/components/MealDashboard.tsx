import React from 'react';
import { Utensils, ClipboardList, TrendingUp } from 'lucide-react';

export function MealDashboard({ balance, roommates, dailyMeals, rate, totalMeals, totalCost }: any) {
  // Logic to slice or rotate names if > 5
  const displayedNames = roommates.slice(0, 5); 

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {/* Card 1: Balance */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</p>
        <h3 className={`text-xl font-black mt-2 ${balance < 0 ? 'text-[#FF0000]' : 'text-slate-800'}`}>
          {balance < 0 ? `Due ৳${Math.abs(balance).toFixed(0)}` : `৳${balance.toFixed(0)}`}
        </h3>
      </div>

      {/* Card 2: Sheet Preview */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sheet</p>
            <p className="text-[10px] font-black text-slate-800">TOTAL {totalMeals}</p>
        </div>
        <div className="text-[10px] font-bold text-slate-600 space-y-0.5">
            {displayedNames.map((name: string) => <div key={name}>{name}</div>)}
        </div>
      </div>

      {/* Card 3: Count & Cost (This will take full width or be swipeable) */}
      <div className="col-span-2 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
        <div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
             <TrendingUp size={12}/> Count & Cost
           </p>
           <p className="text-xs font-bold text-slate-500 mt-1">RATE {rate.toFixed(2)}</p>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400">BILL ৳{totalCost.toFixed(0)}</p>
            <h3 className="text-3xl font-black">{totalMeals}</h3>
        </div>
      </div>
    </div>
  );
}