import { useState } from 'react';
import { Utensils, Plus } from 'lucide-react';

interface MealEntry {
  id: string;
  person: string;
  date: string;
  meals: number;
}

interface MealTrackerProps {
  roommates: string[];
  mealEntries: MealEntry[];
  onAddMealEntry: (entry: Omit<MealEntry, 'id'>) => void;
}

export function MealTracker({ roommates, mealEntries, onAddMealEntry }: MealTrackerProps) {
  const [selectedPerson, setSelectedPerson] = useState(roommates[0] || '');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [mealCount, setMealCount] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !mealCount) return;

    onAddMealEntry({
      person: selectedPerson,
      date: selectedDate,
      meals: parseInt(mealCount),
    });
  };

  const getMealStats = () => {
    const stats: { [key: string]: number } = {};
    roommates.forEach((roommate) => {
      stats[roommate] = mealEntries
        .filter((entry) => entry.person === roommate)
        .reduce((sum, entry) => sum + entry.meals, 0);
    });
    return stats;
  };

  const mealStats = getMealStats();
  const totalMeals = Object.values(mealStats).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Utensils size={24} />
        Meal Tracker
      </h2>

      {roommates.length === 0 ? (
        <p className="text-gray-500 text-sm">Add flatmates first to track meals</p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Person
              </label>
              <select
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {roommates.map((roommate) => (
                  <option key={roommate} value={roommate}>
                    {roommate}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Meals
              </label>
              <select
                value={mealCount}
                onChange={(e) => setMealCount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1 (Lunch or Dinner)</option>
                <option value="2">2 (Lunch and Dinner)</option>
                <option value="3">3 (Breakfast, Lunch, Dinner)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Meal Entry
            </button>
          </form>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Meal Summary</h3>
            <div className="space-y-2">
              {roommates.map((roommate) => (
                <div
                  key={roommate}
                  className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-md"
                >
                  <span>{roommate}</span>
                  <span className="font-semibold text-green-600">
                    {mealStats[roommate] || 0} meals
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Meals</span>
                <span className="text-xl font-bold text-green-600">
                  {totalMeals}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
