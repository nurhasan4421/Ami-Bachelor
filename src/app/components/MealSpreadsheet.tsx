import React, { useState, useMemo, useEffect } from 'react';
import { Utensils, Edit3, Save } from 'lucide-react';

interface DailyMeal {
  id?: string;
  date: string;
  meals: { [person: string]: number };
}

interface Props {
  roommates: string[];
  dailyMeals: DailyMeal[];
  onAddDailyMeal?: (date: string, person: string, meals: number) => void;
  costPerMeal: number;
  totalMeals: number;
  isManager: boolean;
  onSaveMeals?: (updatedMeals: DailyMeal[]) => void;
}

export function MealSpreadsheet({
  roommates,
  dailyMeals,
  costPerMeal,
  totalMeals,
  isManager,
  onSaveMeals,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftMeals, setDraftMeals] = useState<DailyMeal[]>(dailyMeals);

  useEffect(() => {
    setDraftMeals(dailyMeals);
  }, [dailyMeals]);

  const sortedDates = useMemo(() => {
    return [...new Set(draftMeals.map((m) => m.date))].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [draftMeals]);

  const totals = useMemo(() => {
    const personTotals: Record<string, number> = {};
    roommates.forEach((r) => (personTotals[r] = 0));
    draftMeals.forEach((d) =>
      Object.entries(d.meals).forEach(
        ([name, val]) => (personTotals[name] = (personTotals[name] || 0) + Number(val))
      )
    );
    return personTotals;
  }, [draftMeals, roommates]);

  const updateDraftMeal = (date: string, name: string, val: string) => {
    const num = Number(val) || 0;
    setDraftMeals((prev) =>
      prev.map((d) => (d.date === date ? { ...d, meals: { ...d.meals, [name]: num } } : d))
    );
  };

  const handleSave = () => {
    if (onSaveMeals) {
      onSaveMeals(draftMeals);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-[#141414]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-2.5 rounded-xl text-red-600 border border-red-100">
            <Utensils size={20} />
          </div>
          <div>
            <h2 className="font-sf-bold text-lg text-[#141414]">Daily Meal Sheet</h2>
            <p className="font-sf-regular text-[10px] text-[#626262] uppercase tracking-wider">
              {totalMeals} Total Meals • ৳{costPerMeal.toFixed(2)} / Meal
            </p>
          </div>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-[12px] border border-[#d6d6d6] transition-all cursor-pointer ${
                isEditing
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-[#e5e6e1] text-[#141414] hover:bg-[#dedfd9]'
              }`}
              title={isEditing ? 'Cancel Edit' : 'Edit Meal Cells'}
            >
              <Edit3 size={16} />
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-[30px] font-sf-semibold text-[11px] hover:bg-red-700 transition-colors shadow-md shadow-red-600/20 cursor-pointer"
              >
                <Save size={14} /> Save Changes
              </button>
            )}
          </div>
        )}
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto rounded-[16px] border border-[#d6d6d6] bg-[#e5e6e1] card-rail">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#d6d6d6] bg-black/5">
              <th className="p-3 font-sf-bold text-[#626262] uppercase text-[10px] tracking-wider sticky left-0 bg-[#dedfd9]">
                Date
              </th>
              {roommates.map((r) => (
                <th
                  key={r}
                  className="p-3 font-sf-bold text-[#141414] text-center min-w-[70px] uppercase text-[10px]"
                >
                  {r}
                </th>
              ))}
              <th className="p-3 font-sf-bold text-red-600 text-center uppercase text-[10px] tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedDates.length === 0 ? (
              <tr>
                <td
                  colSpan={roommates.length + 2}
                  className="p-6 text-center text-[#626262] font-sf-regular"
                >
                  No meals recorded yet.
                </td>
              </tr>
            ) : (
              sortedDates.map((date) => {
                const dayRecord = draftMeals.find((d) => d.date === date);
                const dayTotal = roommates.reduce(
                  (sum, r) => sum + (Number(dayRecord?.meals[r]) || 0),
                  0
                );

                return (
                  <tr
                    key={date}
                    className="border-b border-[#d6d6d6]/60 hover:bg-black/5 transition-colors"
                  >
                    <td className="p-3 font-sf-medium text-[#141414] whitespace-nowrap sticky left-0 bg-[#e5e6e1]">
                      {new Date(date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        weekday: 'short',
                      })}
                    </td>
                    {roommates.map((r) => {
                      const count = dayRecord?.meals[r] || 0;
                      return (
                        <td key={r} className="p-2 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={count}
                              onChange={(e) => updateDraftMeal(date, r, e.target.value)}
                              className="w-12 mx-auto p-1 text-center bg-white border border-[#d6d6d6] rounded-[6px] font-sf-bold text-xs focus:border-red-500 outline-none"
                            />
                          ) : (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-[6px] font-sf-bold ${
                                count > 0
                                  ? 'bg-white text-[#141414] shadow-xs'
                                  : 'text-[#8e8e8e]'
                              }`}
                            >
                              {count > 0 ? count : '-'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-sf-bold text-red-600">
                      {dayTotal}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#d6d6d6] bg-black/5 font-sf-bold">
              <td className="p-3 uppercase text-[10px] text-[#626262] sticky left-0 bg-[#dedfd9]">
                Total Meals
              </td>
              {roommates.map((r) => (
                <td key={r} className="p-3 text-center text-[#141414] font-sf-bold text-sm">
                  {totals[r] || 0}
                </td>
              ))}
              <td className="p-3 text-center text-red-600 text-sm font-sf-bold">
                {Object.values(totals).reduce((a, b) => a + b, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}