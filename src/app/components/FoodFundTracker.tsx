import React from 'react';
import { Utensils, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface MealStat {
  person: string;
  meals: number;
  mealCost: number;
  groceryPaid: number;
  depositsMade: number;
  totalContribution: number;
  balance: number;
}

interface Props {
  roommates: string[];
  mealStats: MealStat[];
  foodDeposits: any[];
  totalRemainingDue: number;
  isManager: boolean;
  registeredName: string;
  hideAddDeposit?: boolean;
}

export function FoodFundTracker({
  mealStats,
  totalRemainingDue,
  isManager,
  registeredName,
}: Props) {
  const visibleStats = mealStats;

  return (
    <div className="flex flex-col h-full text-[#141414]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-2.5 rounded-xl text-red-600 border border-red-100 shrink-0">
            <Utensils size={20} />
          </div>
          <div>
            <h2 className="font-sf-bold text-lg text-[#141414]">Meal Fund Tracker</h2>
            <p className="font-sf-regular text-[10px] text-[#626262] uppercase tracking-wider">
              Individual Food Balances
            </p>
          </div>
        </div>

        {isManager && (
          <div className="bg-[#e5e6e1] px-4 py-2 rounded-[14px] border border-[#d6d6d6] flex sm:flex-col items-center sm:items-end justify-between">
            <p className="font-sf-regular text-[9px] text-[#626262] uppercase tracking-wider">
              {totalRemainingDue < 0 ? 'Group Debt' : 'Fund Balance'}
            </p>
            <p
              className={`font-sf-bold text-lg ${
                totalRemainingDue < 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {totalRemainingDue < 0 ? '-' : '+'}৳{Math.abs(totalRemainingDue).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Clean member list with simple dividers */}
      <div className="flex flex-col">
        {visibleStats.map((stat, idx) => {
          const isMe = stat.person.toLowerCase() === registeredName.toLowerCase();
          const isLast = idx === visibleStats.length - 1;

          return (
            <div
              key={stat.person}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3.5 px-1 transition-colors ${
                !isLast ? 'border-b border-[#d6d6d6]' : ''
              }`}
            >
              {/* Member Name + meals count */}
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="font-sf-bold text-[#141414] text-sm capitalize flex items-center gap-1.5">
                  {stat.person}
                  {isMe && (
                    <span className="bg-red-600 text-white text-[8px] font-sf-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      You
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-[#626262] font-sf-medium">
                  {stat.meals} meals • ৳{stat.mealCost.toFixed(0)}
                </span>
              </div>

              {/* Deposited & Balance Status */}
              <div className="flex items-center justify-between sm:justify-end gap-5 text-xs">
                <div className="text-left sm:text-right">
                  <span className="text-[9px] uppercase tracking-wider text-[#8e8e8e] block">
                    Deposited
                  </span>
                  <span className="font-sf-bold text-[#141414]">
                    ৳{stat.totalContribution.toFixed(0)}
                  </span>
                </div>

                <div className="text-right min-w-[100px]">
                  <span
                    className={`font-sf-bold px-2.5 py-1 rounded-[6px] text-[10px] uppercase tracking-wide inline-flex items-center gap-1 ${
                      stat.balance < 0
                        ? 'bg-red-50 text-red-600'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {stat.balance < 0 ? (
                      <ArrowDownRight size={12} strokeWidth={2.5} />
                    ) : (
                      <ArrowUpRight size={12} strokeWidth={2.5} />
                    )}
                    ৳{Math.abs(stat.balance).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}