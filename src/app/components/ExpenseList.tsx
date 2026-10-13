import { Receipt, Trash2 } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string;
  date: string;
}

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
}

export function ExpenseList({ expenses, onDeleteExpense }: ExpenseListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Receipt size={24} />
        Recent Expenses
      </h2>

      {expenses.length === 0 ? (
        <p className="text-gray-500 text-sm">No expenses added yet</p>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-b-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{expense.description}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {expense.category}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Paid by {expense.paidBy} • {formatDate(expense.date)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg">
                  ${expense.amount.toFixed(2)}
                </span>
                <button
                  onClick={() => onDeleteExpense(expense.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
