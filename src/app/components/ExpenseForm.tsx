import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, Plus, Calendar, CheckCircle2, Edit3, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpenseData {
  id?: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string;
  date: string;
}

interface Props {
  roommates: string[];
  onAddExpense: (expense: ExpenseData) => void;
  onDeleteExpense?: (id: string) => void;
  currentExpenses?: ExpenseData[];
  fixedCategories?: string[];
}

interface FeedbackCapsule {
  id: number;
  message: string;
  type: 'deposit' | 'expense';
}

export function ExpenseForm({
  roommates,
  onAddExpense,
  onDeleteExpense = () => {},
  currentExpenses = [],
  fixedCategories = [],
}: Props) {
  const categories = ['Account', 'Meal', 'Grocery'];

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackCapsule[]>([]);

  const availablePayers = useMemo(() => {
    return category === 'Grocery' ? [...roommates, 'Meal'] : roommates;
  }, [category, roommates]);

  useEffect(() => {
    if (category !== 'Grocery' && paidBy === 'Meal') {
      setPaidBy('');
    }
  }, [category, paidBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description && amount && category && paidBy && date) {
      const parsedAmount = Number(amount);
      onAddExpense({ description, amount: parsedAmount, category, paidBy, date });

      const isDeposit = category === 'Account' || category === 'Meal';
      const verb = isDeposit ? 'deposited' : 'expended';
      const message = `৳${parsedAmount} ${verb} by ${paidBy} on ${category}`;

      const newFeedback: FeedbackCapsule = {
        id: Date.now(),
        message,
        type: isDeposit ? 'deposit' : 'expense',
      };
      setFeedbacks((prev) => [newFeedback, ...prev]);
      setTimeout(() => setFeedbacks((prev) => prev.filter((f) => f.id !== newFeedback.id)), 3500);

      setDescription('');
      setAmount('');
      setPaidBy('');
    }
  };

  return (
    <div className="h-full flex flex-col relative text-[#141414]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-2.5 rounded-xl text-red-600 border border-red-100">
            <Receipt size={20} />
          </div>
          <div>
            <h3 className="font-sf-bold text-base text-[#141414]">Log Expense / Deposit</h3>
            <p className="font-sf-regular text-[10px] text-[#626262] uppercase tracking-wider">
              Quick Transaction Entry
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {currentExpenses.length > 0 && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-50 text-[#626262] rounded-[10px] transition-colors border border-[#d6d6d6]"
            >
              <Edit3 size={15} />
            </button>
          )}
          <div className="relative flex items-center justify-center w-9 h-9 bg-white text-[#626262] rounded-[10px] border border-[#d6d6d6] cursor-pointer">
            <Calendar size={15} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-sf-medium text-[10px] text-[#626262] uppercase mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#d6d6d6] rounded-[12px] font-sf-medium text-xs text-[#141414] outline-none focus:border-red-500 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'Meal' ? 'Meal [ personal ]' : c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-sf-medium text-[10px] text-[#626262] uppercase mb-1">
                Paid By
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#d6d6d6] rounded-[12px] font-sf-medium text-xs text-[#141414] capitalize outline-none focus:border-red-500 cursor-pointer"
                required
              >
                <option value="" disabled>
                  Select flatmate...
                </option>
                {availablePayers.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-sf-medium text-[10px] text-[#626262] uppercase mb-1">
                Amount (BDT)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-sf-bold text-xs text-[#626262] pointer-events-none">
                  ৳
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full pl-8 pr-3 py-2.5 bg-white border border-[#d6d6d6] rounded-[12px] font-sf-bold text-sm text-[#141414] outline-none focus:border-red-500 transition-all placeholder-[#8e8e8e]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-sf-medium text-[10px] text-[#626262] uppercase mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Potato, rice"
                className="w-full p-2.5 bg-white border border-[#d6d6d6] rounded-[12px] font-sf-medium text-xs text-[#141414] outline-none focus:border-red-500 transition-all placeholder-[#8e8e8e]"
                required
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-2">
          <button
            type="submit"
            disabled={!description || !amount || !paidBy}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-[30px] font-sf-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-600/20 active:scale-[0.98] disabled:opacity-40"
          >
            <Plus size={16} strokeWidth={2.5} /> Save Expense
          </button>

          <div className="absolute top-full left-0 right-0 flex flex-col items-center mt-3 gap-2 pointer-events-none z-50">
            <AnimatePresence mode="popLayout">
              {feedbacks.map((fb) => (
                <motion.div
                  key={fb.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border bg-[#141414] text-white"
                >
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <p className="font-sf-medium text-[11px]">{fb.message}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </form>

      {/* Edit modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#f3f3f1] p-5 rounded-[20px] overflow-hidden flex flex-col border border-[#d6d6d6]"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-sf-bold text-[#141414] text-base">Edit Logged Entries</h4>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 bg-[#e5e6e1] rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {currentExpenses.map((ex, idx) => (
                <div
                  key={ex.id || idx}
                  className="flex items-center justify-between p-3 bg-white border border-[#d6d6d6] rounded-[12px]"
                >
                  <div>
                    <p className="font-sf-bold text-xs text-[#141414]">{ex.description}</p>
                    <p className="font-sf-regular text-[9px] text-[#626262]">
                      ৳{ex.amount} • {ex.paidBy} • {ex.category}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => ex.id && onDeleteExpense(ex.id)}
                    className="text-[#8e8e8e] hover:text-red-600 p-1.5 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}