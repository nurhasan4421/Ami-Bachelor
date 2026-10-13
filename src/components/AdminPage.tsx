import React, { useState } from 'react';
import {
  DashboardHeader,
  Icon,
  InfoCard,
  SectionTitle,
  SheetCard,
  type DashboardView,
} from '@/components/DashboardShared';
import {
  ChevronDown,
  Calendar as CalendarIcon,
  Check,
  Plus,
  Trash2,
  X,
  Edit2,
  Users,
  Send,
  Eye,
  TrendingUp,
} from 'lucide-react';

interface AdminPageProps {
  onNavigate: (view: DashboardView) => void;
  activeView?: DashboardView;
  onToggleRole?: () => void;
  registeredName?: string;
  hostelName?: string;
  roommates?: string[];
  calculations?: any;
  mealSchedule?: { breakfast: string; lunch: string; dinner: string };
  availability?: Array<{ id: number; name: string; status: 'in' | 'out'; user_id?: string }>;
  onToggleAvailability?: (status: 'in' | 'out') => void;
  expensesList?: any[];
  foodDeposits?: any[];
  fixedCosts?: Array<{ id: number; category: string; amount: number }>;
  broadcastNotice?: string;
  onSendNotice?: (text: string) => void;
  onAddDailyMeal?: (date: string, person: string, count: number) => void;
  onAddExpense?: (ed: any) => Promise<void>;
  onDeleteExpense?: (id: string) => Promise<void>;
  onAddDeposit?: (person: string, amount: number, date: string) => Promise<void>;
  onUpdateMealMenu?: (type: 'breakfast' | 'lunch' | 'dinner', value: string) => void;
  currentUserId?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AdminPage({
  onNavigate,
  activeView = 'dashboard',
  onToggleRole,
  registeredName = 'NUR H.',
  hostelName = 'AREA 51',
  roommates = ['Nur Hasan', 'Tanvir', 'Siam', 'Rakib'],
  calculations,
  mealSchedule = { breakfast: '4', lunch: '6', dinner: '5' },
  availability = [],
  onToggleAvailability,
  expensesList = [],
  foodDeposits = [],
  fixedCosts = [],
  broadcastNotice = 'Everyone Please send money before Sunday evening...',
  onSendNotice,
  onAddDailyMeal,
  onAddExpense,
  onDeleteExpense,
  onAddDeposit,
  onUpdateMealMenu,
  currentUserId,
  showToast,
}: AdminPageProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Notice Bar State
  const [notificationText, setNotificationText] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  // Recent Expenses Section State
  const [activeLogTab, setActiveLogTab] = useState<'expense' | 'meal'>('expense');
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Meal Log sub-state
  const [selectedMember, setSelectedMember] = useState(roommates[0] || 'Nur Hasan');
  const [mealCount, setMealCount] = useState(1);

  // Deposit / Expense sub-state
  const [expensePayer, setExpensePayer] = useState(roommates[0] || 'Nur Hasan');
  const [expenseCategory, setExpenseCategory] = useState('Grocery');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Expenses Filter State
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'grocery' | 'deposits'>('grocery');

  // Modals state
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<any | null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [editingMealType, setEditingMealType] = useState<'breakfast' | 'lunch' | 'dinner' | null>(null);
  const [mealMenuInput, setMealMenuInput] = useState('');

  // Handle Save Meal
  const handleSaveMeal = () => {
    if (!selectedMember) {
      showToast?.('Please select a member', 'error');
      return;
    }
    if (onAddDailyMeal) {
      onAddDailyMeal(selectedDate, selectedMember, mealCount);
      showToast?.(`Logged ${mealCount} meal(s) for ${selectedMember}`, 'success');
    } else {
      showToast?.(`Saved ${mealCount} meal(s) for ${selectedMember}`);
    }
  };

  // Handle Save Expense or Deposit
  const handleSaveTransaction = async () => {
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      showToast?.('Please enter a valid amount', 'error');
      return;
    }

    if (expenseCategory === 'Deposit') {
      if (onAddDeposit) {
        await onAddDeposit(expensePayer, parseFloat(expenseAmount), selectedDate);
        showToast?.(`Deposit of ৳${expenseAmount} added for ${expensePayer}`, 'success');
        setExpenseAmount('');
        setExpenseDesc('');
      } else {
        showToast?.(`Saved deposit for ${expensePayer}`);
      }
    } else {
      if (!expenseDesc.trim()) {
        showToast?.('Please enter a short description', 'error');
        return;
      }
      if (onAddExpense) {
        await onAddExpense({
          description: expenseDesc.trim(),
          amount: parseFloat(expenseAmount),
          paidBy: expensePayer,
          category: expenseCategory,
          date: selectedDate,
        });
        showToast?.(`Expense of ৳${expenseAmount} added`, 'success');
        setExpenseAmount('');
        setExpenseDesc('');
      } else {
        showToast?.(`Saved expense of ৳${expenseAmount}`);
      }
    }
  };

  // Handle Send Notice
  const handleSendNotice = () => {
    const trimmed = notificationText.trim();
    if (!trimmed) return;
    if (onSendNotice) {
      onSendNotice(trimmed);
    } else {
      showToast?.(`Notification sent to flatmates: "${trimmed}"`);
    }
    setSentNotice(true);
    setTimeout(() => {
      setSentNotice(false);
      setNotificationText('');
    }, 1500);
  };

  // Dynamic calculations or fallbacks
  const totalMealDeposited = calculations?.totalDeposits || 3500;
  const groupFundBalance = calculations?.groupFundBalance !== undefined ? calculations.groupFundBalance : -5715;
  const isDue = groupFundBalance < 0;

  const costPerMeal = calculations?.costPerMeal ? Number(calculations.costPerMeal).toFixed(2) : '56.38';
  const totalMeals = calculations?.totalMeals || 156;
  const totalMealCost = (calculations?.costPerMeal && calculations?.totalMeals)
    ? Math.round(Number(calculations.costPerMeal) * Number(calculations.totalMeals))
    : (calculations?.totalMealCost || 8795);

  // Availability calculations
  const totalIn = availability.filter((a) => a.status === 'in').length || 4;
  const totalOut = availability.filter((a) => a.status === 'out').length || 2;
  const myAvailRecord = availability.find((a) => a.user_id === currentUserId || a.name.toLowerCase() === registeredName.toLowerCase());
  const myCurrentStatus = myAvailRecord?.status || 'in';

  // Filtered Expenses List
  const allTransactionItems = [
    ...expensesList.map((e) => ({
      id: e.id,
      title: e.description,
      person: e.paidBy,
      category: e.category || 'Expense',
      date: e.date,
      dateFormatted: new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      amount: Number(e.amount),
      isDeposit: false,
    })),
    ...foodDeposits.map((d) => ({
      id: d.id,
      title: 'Food Fund Deposit',
      person: d.person,
      category: 'Deposit',
      date: d.date,
      dateFormatted: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      amount: Number(d.amount),
      isDeposit: true,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const displayedExpenses = allTransactionItems.filter((item) => {
    if (expenseFilter === 'grocery') return item.category === 'Grocery' || item.category === 'Meal';
    if (expenseFilter === 'deposits') return item.isDeposit;
    return true;
  });

  const displayedTotalSum = displayedExpenses.reduce((s, item) => s + item.amount, 0);

  // Dynamic Members Deposit Rail Data
  const memberDepositList = (calculations?.indAccounts || []).length > 0
    ? calculations.indAccounts.slice(0, 4).map((a: any) => ({
        person: a.name,
        amount: Number(a.paid || 0),
      }))
    : [
        { person: 'AJMAIN', amount: 2250 },
        { person: 'NUR H.', amount: 2500 },
        { person: 'MAHADI HASAN', amount: 2300 },
      ];

  const totalDepositRailSum = memberDepositList.reduce((s: number, d: any) => s + Number(d.amount), 0);

  // Dynamic Rent & Utilities calculations
  const totalFixedCosts = fixedCosts.reduce((s, fc) => s + Number(fc.amount || 0), 0) || 12000;
  const fixedExpensesPaid = expensesList
    .filter((e) => fixedCosts.some((f) => f.category.toLowerCase() === e.category?.toLowerCase()))
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const fixedDueToPay = Math.max(0, totalFixedCosts - fixedExpensesPaid) || 4000;
  const fixedCollected = Math.min(totalFixedCosts, totalFixedCosts - fixedDueToPay + 1000) || 8500;
  const fixedToBeCollected = Math.max(0, totalFixedCosts - fixedCollected) || 3500;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f3f3f1] text-[#141414]">
      <DashboardHeader
        current="admin"
        activeView={activeView}
        onNavigate={onNavigate}
        onToggleRole={onToggleRole}
        registeredName={registeredName}
        hostelName={hostelName}
        broadcastNotice={broadcastNotice}
        onSendNotice={onSendNotice}
      />

      <main className="dashboard mx-auto flex w-[calc(100%-32px)] flex-col gap-[16px] pb-[32px] lg:max-w-[900px]">
        {/* Dark Hero Card */}
        <section className="flex h-[201px] flex-col justify-between rounded-[24px] bg-[linear-gradient(112.83deg,#212121_0.77%,#000_100%)] px-[23px] py-[19px] text-[#e5e6e1] shadow-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-[8px]">
              <Icon
                className="h-[42px] w-[42px] rounded-full"
                name="65557.png"
                alt={registeredName}
              />
              <div className="flex h-[42px] flex-col justify-center gap-[2px] font-sf-medium">
                <p className="text-[12px] uppercase">
                  {registeredName}{' '}
                  <span className="text-[9px] bg-red-600/80 px-1.5 py-0.5 rounded-full font-sf-bold text-white ml-1">
                    Manager
                  </span>
                </p>
                <p className="text-[20px] leading-normal">{hostelName}</p>
              </div>
            </div>
            <div className="flex h-[42px] items-start font-sf-semibold text-[20px] text-[#8e8e8e] gap-1">
              <span>{roommates.length}</span>
              <Icon className="h-[24px] w-[26px]" name="149c5.svg" />
            </div>
          </div>

          <div className="flex flex-col gap-[5px] text-right">
            <p className="font-sf-regular text-[6px] text-[#8e8e8e] uppercase">
              TOTAL MEAL DEPOSITED
            </p>
            <p className="font-sf-regular text-[14px] text-[#8e8e8e]">
              + {totalMealDeposited.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-sf-regular text-[14px] text-[#8e8e8e]">
              Meal Balance
            </span>
            <span className="font-sf-bold text-[18px]">
              ৳{' '}
              <span className={isDue ? 'text-red-600' : 'text-emerald-400'}>
                {groupFundBalance > 0 ? `+${groupFundBalance.toFixed(2)}` : groupFundBalance.toFixed(2)}
              </span>
            </span>
          </div>
        </section>

        {/* Recent Expenses Section */}
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Recent Expenses</SectionTitle>

          <div className="rounded-[20px] bg-[#e5e6e1] p-[16px] shadow-sm flex flex-col gap-[16px]">
            {/* Top controls: Deposit / Expense [+] | Meal Log [+] | ✏ | 📅 */}
            <div className="flex items-center justify-end gap-[6px]">
              <button
                type="button"
                onClick={() => setActiveLogTab('expense')}
                className={`flex h-[26px] items-center rounded-full px-[10px] font-sf-medium text-[11px] leading-none transition-all whitespace-nowrap shadow-xs ${
                  activeLogTab === 'expense'
                    ? 'bg-white text-[#141414]'
                    : 'bg-[#d8d9d4]/70 text-[#555] hover:bg-[#d0d1cc]'
                }`}
              >
                <span>Deposit / Expense</span>
                <span
                  className={`ml-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-[3px] text-[10px] font-bold leading-none ${
                    activeLogTab === 'expense' ? 'bg-[#ff0000] text-white' : 'bg-black text-white'
                  }`}
                >
                  +
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLogTab('meal')}
                className={`flex h-[26px] items-center rounded-full px-[10px] font-sf-medium text-[11px] leading-none transition-all whitespace-nowrap shadow-xs ${
                  activeLogTab === 'meal'
                    ? 'bg-white text-[#141414]'
                    : 'bg-[#d8d9d4]/70 text-[#555] hover:bg-[#d0d1cc]'
                }`}
              >
                <span>Meal Log</span>
                <span
                  className={`ml-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-[3px] text-[10px] font-bold leading-none ${
                    activeLogTab === 'meal' ? 'bg-[#ff0000] text-white' : 'bg-black text-white'
                  }`}
                >
                  +
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('expenses')}
                title="Edit / View Expenses"
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-white text-[#333] shadow-xs hover:bg-slate-50 transition-colors"
              >
                <Edit2 size={13} />
              </button>

              <div
                title={`Date: ${selectedDate}`}
                className="relative flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-white text-[#333] shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <CalendarIcon size={14} />
                {selectedDate !== todayStr && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-[#e5e6e1]" />
                )}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {activeLogTab === 'expense' ? (
              /* Frame 621: DEPOSIT / EXPENSE FORM */
              <div className="flex flex-col gap-[14px]">
                <div className="grid grid-cols-2 gap-x-[12px] gap-y-[12px]">
                  {/* Paid By */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="font-sf-medium text-[12px] text-[#141414]">Paid By</label>
                    <div className="relative">
                      <select
                        value={expensePayer}
                        onChange={(e) => setExpensePayer(e.target.value)}
                        className="h-[38px] w-full appearance-none rounded-[10px] bg-[#f5f5f5] px-[12px] font-sf-medium text-[13px] text-[#141414] outline-none border border-transparent focus:border-red-500 cursor-pointer"
                      >
                        {roommates.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                        <option value="Meal">Meal</option>
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e8e]"
                      />
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="font-sf-medium text-[12px] text-[#141414]">Amount</label>
                    <input
                      type="number"
                      placeholder="500"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="h-[38px] w-full rounded-[10px] bg-[#f5f5f5] px-[12px] font-sf-medium text-[13px] text-[#141414] placeholder:text-[#8e8e8e] outline-none border border-transparent focus:border-red-500"
                    />
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="font-sf-medium text-[12px] text-[#141414]">Category</label>
                    <div className="relative">
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        className="h-[38px] w-full appearance-none rounded-[10px] bg-[#f5f5f5] px-[12px] font-sf-medium text-[13px] text-[#141414] outline-none border border-transparent focus:border-red-500 cursor-pointer"
                      >
                        <option value="Grocery">Grocery</option>
                        <option value="Deposit">Deposit</option>
                        <option value="Flat Rent">Flat Rent</option>
                        <option value="Water Bill">Water Bill</option>
                        <option value="WiFi">WiFi</option>
                        <option value="Electricity">Electricity</option>
                        <option value="Gas">Gas</option>
                        <option value="Others">Others</option>
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e8e]"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="font-sf-medium text-[12px] text-[#141414]">Description</label>
                    <input
                      type="text"
                      placeholder="Potato, tomato,rice"
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      className="h-[38px] w-full rounded-[10px] bg-[#f5f5f5] px-[12px] font-sf-medium text-[13px] text-[#141414] placeholder:text-[#8e8e8e] outline-none border border-transparent focus:border-red-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTransaction}
                  className="h-[40px] w-full rounded-[10px] bg-[#ff0000] font-sf-semibold text-[14px] text-white hover:bg-red-700 active:scale-[0.99] transition-all shadow-md shadow-red-600/20"
                >
                  Save
                </button>
              </div>
            ) : (
              /* Frame 2147228100: MEAL LOG FORM */
              <div className="flex flex-col gap-[14px]">
                <div className="grid grid-cols-2 gap-[12px] items-end">
                  {/* Member */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="font-sf-medium text-[12px] text-[#141414]">Member</label>
                    <div className="relative">
                      <select
                        value={selectedMember}
                        onChange={(e) => setSelectedMember(e.target.value)}
                        className="h-[38px] w-full appearance-none rounded-[10px] bg-[#f5f5f5] px-[12px] font-sf-medium text-[13px] text-[#141414] outline-none border border-transparent focus:border-red-500 cursor-pointer"
                      >
                        <option value="" disabled>Select Member...</option>
                        {roommates.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e8e]"
                      />
                    </div>
                  </div>

                  {/* Meal Count */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="font-sf-medium text-[12px] text-[#141414]">Meal Count</label>
                    <div className="grid grid-cols-[38px_1fr_38px] gap-[8px]">
                      <button
                        type="button"
                        onClick={() => setMealCount(Math.max(0, mealCount - 1))}
                        className="flex h-[38px] items-center justify-center rounded-[10px] bg-[#f5f5f5] font-sf-bold text-[16px] text-[#141414] hover:bg-[#eaeaea] active:scale-95 transition-all"
                      >
                        -
                      </button>
                      <div className="flex h-[38px] items-center justify-center rounded-[10px] bg-[#f5f5f5] font-sf-bold text-[14px] text-[#141414]">
                        {mealCount}
                      </div>
                      <button
                        type="button"
                        onClick={() => setMealCount(mealCount + 1)}
                        className="flex h-[38px] items-center justify-center rounded-[10px] bg-[#f5f5f5] font-sf-bold text-[16px] text-[#141414] hover:bg-[#eaeaea] active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveMeal}
                  className="h-[40px] w-full rounded-[10px] bg-[#ff0000] font-sf-semibold text-[14px] text-white hover:bg-red-700 active:scale-[0.99] transition-all shadow-md shadow-red-600/20"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Meal Cards Rail (Figma Frame 141-3406) */}
        <section className="flex flex-col gap-[14px]">
          <div className="flex items-center justify-between">
            <SectionTitle>Meal</SectionTitle>
          </div>
          <div className="card-rail flex gap-[8px] overflow-x-auto pb-1">
            {/* Card 1: Count & Cost */}
            <article
              onClick={() => onNavigate('meals')}
              className="flex h-[128px] w-[160px] shrink-0 cursor-pointer flex-col justify-between rounded-[16px] bg-[#e5e6e1] px-[10px] py-[8px] hover:bg-[#dedfd9] transition-colors"
              tabIndex={0}
            >
              <div className="flex items-center gap-[6px]">
                <div className="relative flex h-[20px] w-[20px] items-center justify-center rounded-[5px] bg-[#ff0000] text-white shrink-0 shadow-xs">
                  <TrendingUp className="h-[13px] w-[13px] stroke-[2.5]" />
                  <span className="absolute -top-1 -right-1 flex h-[10px] w-[10px] items-center justify-center rounded-full bg-white text-[#ff0000] text-[7.5px] font-bold shadow-xs">
                    ৳
                  </span>
                </div>
                <span className="font-sf-medium text-[13px] text-[#141414]">Count &amp; Cost</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="font-sf-regular text-[8px] text-[#626262] uppercase tracking-wider">RATE</p>
                  <p className="font-sf-bold text-[11px] text-[#141414]">{costPerMeal}</p>
                </div>
                <div className="text-right">
                  <p className="font-sf-regular text-[9px] text-[#626262]">
                    BILL <span className="text-[7.5px] align-super">৳</span>{Number(totalMealCost).toLocaleString()}
                  </p>
                  <p className="font-sf-bold text-[22px] text-[#141414] leading-tight mt-0.5">
                    {totalMeals}
                  </p>
                </div>
              </div>
            </article>

            {/* Card 2: Sheet */}
            <SheetCard
              showPeople={true}
              peopleCount={roommates?.length || 12}
              total={String(totalMeals)}
              onClick={() => onNavigate('meals')}
            />

            {/* Card 3: Members Deposit */}
            <article
              onClick={() => onNavigate('accounts')}
              className="flex h-[128px] w-[205px] shrink-0 cursor-pointer flex-col justify-between rounded-[16px] bg-[#e5e6e1] px-[10px] py-[8px] hover:bg-[#dedfd9] transition-colors"
              tabIndex={0}
            >
              {/* Header row: Icon + Title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[6px]">
                  <div className="flex h-[19px] w-[17px] items-center justify-center shrink-0">
                    <svg className="h-[19px] w-[17px]" viewBox="0 0 17 20" fill="none">
                      <path d="M0 3.5C0 1.567 1.567 0 3.5 0H11L17 6V16.5C17 18.433 15.433 20 13.5 20H3.5C1.567 20 0 18.433 0 16.5V3.5Z" fill="#ff0000" />
                      <path d="M11 0V4.5C11 5.328 11.672 6 12.5 6H17L11 0Z" fill="#ff3333" opacity="0.8" />
                      <rect x="2.5" y="6" width="3.5" height="2.2" rx="0.8" fill="white" />
                      <rect x="7" y="6" width="3.5" height="2.2" rx="0.8" fill="white" />
                      <rect x="2.5" y="10" width="3.5" height="2.2" rx="0.8" fill="white" />
                      <rect x="7" y="10" width="3.5" height="2.2" rx="0.8" fill="white" />
                      <rect x="2.5" y="14" width="3.5" height="2.2" rx="0.8" fill="white" />
                      <rect x="7" y="14" width="3.5" height="2.2" rx="0.8" fill="white" />
                    </svg>
                  </div>
                  <span className="font-sf-medium text-[13px] text-[#141414] whitespace-nowrap">Members Deposit</span>
                </div>
              </div>

              {/* Sub-header & list */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-end text-[10px] font-sf-bold text-[#141414]">
                  <span>TOTAL&nbsp;&nbsp;{totalDepositRailSum.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-[3px] text-[10px] font-sf-medium">
                  {memberDepositList.slice(0, 3).map((d: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-[#141414]">
                      <span className="text-[#626262] text-[9.5px] font-sf-medium tracking-wide uppercase truncate max-w-[105px]">
                        {d.person}
                      </span>
                      <span className="font-sf-bold text-[10px] shrink-0">
                        ৳ {Number(d.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Expense History */}
        <section className="flex flex-col gap-[14px]">
          <div className="flex items-center justify-between">
            <SectionTitle>Expense History</SectionTitle>
            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                onClick={() => setExpenseFilter('deposits')}
                className={`flex h-[26px] items-center justify-center rounded-full px-[10px] font-sf-medium text-[11px] leading-none transition-all whitespace-nowrap shadow-xs ${
                  expenseFilter === 'deposits'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-[#626262] border border-[#d6d6d6] hover:bg-slate-50'
                }`}
              >
                Deposits
              </button>
              <button
                type="button"
                onClick={() => setExpenseFilter('grocery')}
                className={`flex h-[26px] items-center justify-center rounded-full px-[10px] font-sf-medium text-[11px] leading-none transition-all whitespace-nowrap shadow-xs ${
                  expenseFilter === 'grocery'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-[#626262] border border-[#d6d6d6] hover:bg-slate-50'
                }`}
              >
                Grocery
              </button>
            </div>
          </div>

          <div className="flex min-h-[186px] flex-col rounded-[24px] bg-[#e5e6e1] px-[12px] py-[12px]">
            <div className="max-h-[152px] overflow-y-auto overscroll-contain pr-1 divide-y divide-[#d6d6d6]/70 mini-card-scroll">
              {displayedExpenses.map((item) => (
                <div
                  onClick={() => setSelectedExpenseDetail(item)}
                  className="flex h-[42px] cursor-pointer items-center justify-between px-[6px] hover:bg-black/5 transition-colors"
                  key={item.id + item.title}
                >
                  <div className="min-w-0 font-sf-semibold">
                    <p className="truncate text-[11px] text-[#141414]">{item.title}</p>
                    <p className="truncate text-[8px] text-[#6d6d6d]">
                      <span className="text-black font-sf-bold">{item.person}</span> • {item.category} • {item.dateFormatted}
                    </p>
                  </div>
                  <span className="w-[74px] shrink-0 text-right font-sf-semibold text-[11px] text-black">
                    ৳ {item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {displayedExpenses.length === 0 && (
                <p className="py-6 text-center text-xs text-[#8e8e8e]">No records found for this filter.</p>
              )}
            </div>
            <div className="mt-auto flex justify-end items-center pt-2 font-sf-semibold text-[12px] border-t border-[#d6d6d6]/60">
              <div className="flex gap-[16px] pr-[6px]">
                <span className="text-[#626262]">Total</span>
                <span className="text-black font-sf-bold">৳ {displayedTotalSum.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Rent & Utilities */}
        <section className="flex flex-col gap-[14px]">
          <div className="flex items-center justify-between">
            <SectionTitle>Rent &amp; Utilities</SectionTitle>
            <button
              onClick={() => onNavigate('fixed-costs')}
              className="text-[10px] font-sf-semibold text-red-600 hover:underline"
            >
              Configure
            </button>
          </div>
          <div className="card-rail flex gap-[8px] overflow-x-auto pb-1">
            <InfoCard due title="Due to Pay" width="130px">
              <div className="ml-auto flex w-full flex-col items-end font-sf-medium">
                <p className="font-sf-regular text-[8px] text-[#626262]">
                  TOTAL&nbsp;&nbsp;৳ {totalFixedCosts.toLocaleString()}
                </p>
                <p className="font-sf-regular text-[8px] text-[#626262]">
                  PAID&nbsp;&nbsp;৳ {fixedExpensesPaid.toLocaleString()}
                </p>
                <p className="mt-[4px] text-[20px] text-red-600 font-sf-bold">৳ {fixedDueToPay.toLocaleString()}</p>
              </div>
            </InfoCard>

            <InfoCard title="Fund Collection" width="180px">
              <div className="ml-auto flex w-full flex-col gap-[4px] font-sf-medium text-[10px]">
                <p className="flex justify-between text-[#626262]">
                  <span>Collected</span>
                  <span className="font-sf-bold text-black">৳ {fixedCollected.toLocaleString()}</span>
                </p>
                <p className="flex justify-between text-[#626262]">
                  <span>To be collected</span>
                  <span>
                    ৳ <b className="text-red-600">{fixedToBeCollected.toLocaleString()}</b>
                  </span>
                </p>
                <p className="flex justify-between border-t border-[#d6d6d6]/60 pt-1">
                  <span>Target</span>
                  <span className="font-sf-bold text-black">৳ {totalFixedCosts.toLocaleString()}</span>
                </p>
              </div>
            </InfoCard>

            <InfoCard title="Fixed Costs" width="233px">
              <div
                onClick={() => onNavigate('fixed-costs')}
                className="ml-auto flex w-full flex-col gap-[4px] font-sf-medium text-[10px] text-[#626262] cursor-pointer"
              >
                {fixedCosts.slice(0, 4).map((fc) => (
                  <p key={fc.id} className="flex justify-between">
                    <span>{fc.category}</span>
                    <span className="font-sf-bold text-black">৳ {Number(fc.amount).toLocaleString()}</span>
                  </p>
                ))}
                {fixedCosts.length === 0 && (
                  <p className="text-center py-2 text-[#8e8e8e]">Click to add fixed costs</p>
                )}
              </div>
            </InfoCard>
          </div>
        </section>

        {/* Member Availability */}
        <section className="flex flex-col gap-[14px]">
          <div className="flex items-center justify-between">
            <SectionTitle>Member Availability</SectionTitle>
            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                onClick={() => onToggleAvailability?.('in')}
                className={`flex h-[26px] items-center rounded-full px-[10px] font-sf-medium text-[11px] leading-none transition-all whitespace-nowrap shadow-xs cursor-pointer ${
                  myCurrentStatus === 'in'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-[#141414] hover:bg-slate-50'
                }`}
              >
                I'm IN
              </button>
              <button
                type="button"
                onClick={() => onToggleAvailability?.('out')}
                className={`flex h-[26px] items-center rounded-full px-[10px] font-sf-medium text-[11px] leading-none transition-all whitespace-nowrap shadow-xs cursor-pointer ${
                  myCurrentStatus === 'out'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-[#141414] hover:bg-slate-50'
                }`}
              >
                I'm OUT
              </button>
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(true)}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-white text-[#333] shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
                title="View All Members"
              >
                <Users size={13} />
              </button>
            </div>
          </div>
          <div className="grid h-[60px] grid-cols-2 overflow-hidden rounded-[16px] border border-[#d6d6d6]">
            <button
              type="button"
              onClick={() => onToggleAvailability?.('in')}
              className={`flex flex-col items-center justify-center gap-[2px] transition-colors cursor-pointer ${
                myCurrentStatus === 'in' ? 'bg-white ring-1 ring-emerald-500/50' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <span className="font-sf-semibold text-[9px] text-[#626262]">
                Total IN
              </span>
              <span className="font-sf-bold text-[18px] text-emerald-600 leading-tight">{totalIn}</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleAvailability?.('out')}
              className={`flex flex-col items-center justify-center gap-[2px] border-l border-[#d6d6d6] transition-colors cursor-pointer ${
                myCurrentStatus === 'out' ? 'bg-[#ebebeb] ring-1 ring-red-500/50' : 'bg-[#ebebeb] hover:bg-[#e2e2e2]'
              }`}
            >
              <span className="font-sf-semibold text-[9px] text-[#626262]">
                Total OUT
              </span>
              <span className="font-sf-bold text-[18px] text-red-600 leading-tight">{totalOut}</span>
            </button>
          </div>
        </section>

        {/* Meals To Cook */}
        <section className="flex flex-col gap-[14px]">
          <div className="flex items-center justify-between">
            <SectionTitle>Meals To Cook</SectionTitle>
            <span className="text-[10px] text-[#8e8e8e] font-sf-medium">Tap meal to edit today's menu</span>
          </div>
          <div className="flex h-[76px] items-center justify-center gap-[24px] rounded-[16px] bg-[#e5e6e1] p-[10px]">
            {[
              { type: 'breakfast' as const, label: 'BREAKFAST', value: mealSchedule.breakfast && mealSchedule.breakfast !== '0' ? mealSchedule.breakfast : 'Roti + Dal' },
              { type: 'lunch' as const, label: 'LUNCH', value: mealSchedule.lunch && mealSchedule.lunch !== '0' ? mealSchedule.lunch : 'Rice + Fish' },
              { type: 'dinner' as const, label: 'DINNER', value: mealSchedule.dinner && mealSchedule.dinner !== '0' ? mealSchedule.dinner : 'Rice + Chicken' },
            ].map(({ type, label, value }) => (
              <button
                type="button"
                onClick={() => {
                  setEditingMealType(type);
                  setMealMenuInput(value);
                }}
                className="flex w-[80px] flex-col items-center gap-[4px] hover:scale-105 transition-transform"
                key={label}
              >
                <span className="font-sf-semibold text-[8px] text-[#626262] uppercase tracking-wider">
                  {label}
                </span>
                <span className="flex h-[28px] w-full items-center justify-center rounded-[6px] bg-[#f3f3f1] font-sf-bold text-[11px] text-red-600 border border-[#d6d6d6] px-1 truncate">
                  {value}
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* MODAL: Edit Meal Menu Slot */}
      {editingMealType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl border border-[#d6d6d6] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-sf-bold text-base text-[#141414] uppercase">
                Update {editingMealType} Menu
              </h3>
              <button
                onClick={() => setEditingMealType(null)}
                className="p-1 rounded-full text-[#8e8e8e] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Khichuri + Egg, Rice + Fish..."
              value={mealMenuInput}
              onChange={(e) => setMealMenuInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-[12px] border border-[#d6d6d6] text-sm font-sf-medium outline-none focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingMealType(null)}
                className="flex-1 py-2.5 rounded-[12px] bg-slate-100 font-sf-semibold text-xs text-[#626262]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onUpdateMealMenu && editingMealType) {
                    onUpdateMealMenu(editingMealType, mealMenuInput.trim() || 'Standard');
                    showToast?.(`Updated ${editingMealType} menu`);
                  }
                  setEditingMealType(null);
                }}
                className="flex-1 py-2.5 rounded-[12px] bg-red-600 font-sf-semibold text-xs text-white shadow-md shadow-red-600/20"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View/Delete Expense Detail */}
      {selectedExpenseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl border border-[#d6d6d6] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sf-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {selectedExpenseDetail.category}
              </span>
              <button
                onClick={() => setSelectedExpenseDetail(null)}
                className="p-1 rounded-full text-[#8e8e8e] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <h3 className="font-sf-bold text-lg text-[#141414]">{selectedExpenseDetail.title}</h3>
              <p className="font-sf-regular text-xs text-[#626262] mt-1">
                Paid by <b className="text-black">{selectedExpenseDetail.person}</b> on {selectedExpenseDetail.dateFormatted}
              </p>
              <p className="font-sf-bold text-2xl text-red-600 mt-3">
                ৳ {selectedExpenseDetail.amount.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              {!selectedExpenseDetail.isDeposit && onDeleteExpense && (
                <button
                  onClick={async () => {
                    await onDeleteExpense(selectedExpenseDetail.id);
                    setSelectedExpenseDetail(null);
                  }}
                  className="flex-1 py-2.5 rounded-[12px] bg-red-50 text-red-600 border border-red-200 font-sf-semibold text-xs hover:bg-red-100 flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={14} /> Delete Entry
                </button>
              )}
              <button
                onClick={() => setSelectedExpenseDetail(null)}
                className="flex-1 py-2.5 rounded-[12px] bg-slate-100 font-sf-semibold text-xs text-[#141414]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Member Availability Overview */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl border border-[#d6d6d6] space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-red-600" />
                <h3 className="font-sf-bold text-base text-[#141414]">Member Availability</h3>
              </div>
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="p-1 rounded-full text-[#8e8e8e] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-1 flex flex-col">
              {roommates.map((name, idx) => {
                const rec = availability.find((a) => a.name.toLowerCase() === name.toLowerCase());
                const status = rec?.status || 'in';
                const isLast = idx === roommates.length - 1;
                return (
                  <div
                    key={name}
                    className={`flex items-center justify-between py-3 px-1 ${
                      !isLast ? 'border-b border-[#d6d6d6]' : ''
                    }`}
                  >
                    <span className="font-sf-semibold text-xs text-[#141414]">{name}</span>
                    <span
                      className={`px-3 py-1 rounded-full font-sf-bold text-[10px] uppercase ${
                        status === 'in'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {status === 'in' ? 'IN' : 'OUT'}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => onNavigate('availability')}
              className="w-full py-2.5 rounded-[12px] bg-red-600 text-white font-sf-semibold text-xs shadow-md shadow-red-600/20"
            >
              Open Full Availability Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
