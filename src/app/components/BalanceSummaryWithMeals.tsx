import { DollarSign } from 'lucide-react';

interface Balance {
  name: string;
  paidTotal: number;
  foodShare: number;
  otherShare: number;
  totalOwes: number;
  balance: number;
  mealCount: number;
}

interface BalanceSummaryWithMealsProps {
  balances: Balance[];
  totalExpenses: number;
  foodExpenses: number;
  costPerMeal: number;
  totalMeals: number;
}

export function BalanceSummaryWithMeals({
  balances,
  totalExpenses,
  foodExpenses,
  costPerMeal,
  totalMeals,
}: BalanceSummaryWithMealsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <DollarSign size={24} />
        Balance Summary
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-600">Total Expenses</div>
          <div className="text-2xl font-bold text-blue-600">
            ${totalExpenses.toFixed(2)}
          </div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-sm text-gray-600">Food Expenses</div>
          <div className="text-2xl font-bold text-green-600">
            ${foodExpenses.toFixed(2)}
          </div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-sm text-gray-600">Cost per Meal</div>
          <div className="text-2xl font-bold text-purple-600">
            {totalMeals > 0 ? `$${costPerMeal.toFixed(2)}` : '$0.00'}
          </div>
        </div>
      </div>

      {balances.length === 0 ? (
        <p className="text-gray-500 text-sm">Add flatmates to see balance</p>
      ) : (
        <div className="space-y-3">
          {balances.map((balance) => (
            <div
              key={balance.name}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-lg">{balance.name}</div>
                <div className="text-sm text-gray-600">
                  {balance.mealCount} meals
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>
                  <div className="text-gray-600">Paid</div>
                  <div className="font-medium text-green-600">
                    ${balance.paidTotal.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Food Share</div>
                  <div className="font-medium">
                    ${balance.foodShare.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Other Share</div>
                  <div className="font-medium">
                    ${balance.otherShare.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Total Owes</div>
                  <div className="font-medium">
                    ${balance.totalOwes.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Balance</div>
                  <div
                    className={`font-semibold text-lg ${
                      balance.balance > 0
                        ? 'text-green-600'
                        : balance.balance < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {balance.balance > 0 ? '+' : ''}${balance.balance.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
