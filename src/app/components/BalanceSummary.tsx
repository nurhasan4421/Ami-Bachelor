import { DollarSign } from 'lucide-react';

interface Balance {
  name: string;
  paid: number;
  owes: number;
  balance: number;
}

interface BalanceSummaryProps {
  balances: Balance[];
  totalExpenses: number;
}

export function BalanceSummary({ balances, totalExpenses }: BalanceSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <DollarSign size={24} />
        Balance Summary
      </h2>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <div className="text-sm text-gray-600">Total Expenses</div>
        <div className="text-2xl font-bold text-blue-600">
          ${totalExpenses.toFixed(2)}
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
              <div className="font-semibold mb-2">{balance.name}</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-gray-600">Paid</div>
                  <div className="font-medium text-green-600">
                    ${balance.paid.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Share</div>
                  <div className="font-medium">
                    ${balance.owes.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Balance</div>
                  <div
                    className={`font-semibold ${
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
