import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  DashboardHeader,
  Icon,
  InfoCard,
  SectionTitle,
  SheetCard,
  type DashboardView,
} from '@/components/DashboardShared';
import { Users, X, Bell, ChevronDown, Clock, Utensils, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemberPageProps {
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
  fixedCosts?: Array<{ id: number; category: string; amount: number }>;
  broadcastNotice?: string;
  currentUserId?: string;
}

export default function MemberPage({
  onNavigate,
  activeView = 'dashboard',
  onToggleRole,
  registeredName = 'NUR H.',
  hostelName = 'AREA 51',
  roommates = ['Nur Hasan', 'Tanvir', 'Siam', 'Rakib'],
  calculations,
  mealSchedule = { breakfast: 'Roti + Dal', lunch: 'Rice + Fish', dinner: 'Rice + Chicken' },
  availability = [],
  onToggleAvailability,
  expensesList = [],
  fixedCosts = [],
  broadcastNotice = 'Everyone Please send money before Sunday evening...',
  currentUserId,
}: MemberPageProps) {
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);

  // Prevent background scrolling when modal overlays are active
  useEffect(() => {
    if (showNoticeModal || showAvailabilityModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showNoticeModal, showAvailabilityModal]);

  // Live calculation values or design defaults
  const myAccount = calculations?.indAccounts?.find(
    (a: any) => a.name.toLowerCase() === registeredName.toLowerCase()
  ) || calculations?.indAccounts?.[0];

  const totalPaid = myAccount ? Number(myAccount.paid || 0) : 3500;
  const totalBill = myAccount?.expenses
    ? Object.values(myAccount.expenses).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) + (Number(myAccount.manualAdjustment) || 0)
    : (myAccount?.totalBill ?? 9215);
  const rawBalance = totalPaid - totalBill;
  const balance = isNaN(rawBalance) ? -5715 : rawBalance;
  const isDue = balance < 0;

  const costPerMeal = calculations?.costPerMeal && !isNaN(Number(calculations.costPerMeal))
    ? Number(calculations.costPerMeal).toFixed(2)
    : '56.38';

  const myMeals = calculations?.mealStats?.find(
    (s: any) => s.person?.toLowerCase() === registeredName.toLowerCase()
  )?.meals || myAccount?.mealsCount || 19;

  const myMealCost = (myAccount?.expenses?.['Meal'] !== undefined && !isNaN(Number(myAccount.expenses['Meal'])))
    ? Math.round(Number(myAccount.expenses['Meal']))
    : (myAccount?.mealCost || 1304);

  // Availability
  const totalIn = availability.filter((a) => a.status === 'in').length || 3;
  const totalOut = availability.filter((a) => a.status === 'out').length || 1;
  const myAvailRecord = availability.find(
    (a) => a.user_id === currentUserId || a.name.toLowerCase() === registeredName.toLowerCase()
  );
  const myCurrentStatus = myAvailRecord?.status || 'in';

  // Recent Grocery
  const groceryExpenses = expensesList.filter(
    (e) => e.category === 'Grocery' || e.category === 'Meal'
  );

  const recentExpenses =
    groceryExpenses.length > 0
      ? groceryExpenses.map((e) => [
          e.description,
          e.paidBy,
          new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          `৳ ${Number(e.amount).toLocaleString()}`,
        ])
      : [
          ['Morning Groceries', 'Rakib', '08 Oct', '৳ 600'],
          ['Vegetables & Oil', 'Tanvir', '06 Oct', '৳ 1,150'],
          ['Fish & Meat', 'Nur Hasan', '04 Oct', '৳ 2,400'],
          ['Monthly Rice & Spices', 'Meal', '02 Oct', '৳ 4,800'],
          ['Eggs & Milk', 'Siam', '29 Sep', '৳ 420'],
          ['Chicken & Masala', 'Nur Hasan', '27 Sep', '৳ 1,350'],
        ];

  const monthGroceryTotal =
    expensesList
      .filter((e) => e.category === 'Grocery' || e.category === 'Meal')
      .reduce((s, e) => s + Number(e.amount || 0), 0) || 10720;

  // Fixed Costs - personal share
  const roommateCount = roommates.length || 1;
  const myShareRent = Math.round((fixedCosts.find((f) => f.category.toLowerCase().includes('rent'))?.amount || 9000) / roommateCount);
  const myShareWater = Math.round((fixedCosts.find((f) => f.category.toLowerCase().includes('water'))?.amount || 480) / roommateCount);
  const myShareWifi = Math.round((fixedCosts.find((f) => f.category.toLowerCase().includes('wifi'))?.amount || 480) / roommateCount);

  // Month-long notification history list (latest 6+ messages with exact date & time)
  const messNotifications = [
    {
      id: 'notif-1',
      title: 'Notice from Manager',
      message: broadcastNotice,
      dateStr: '11 Oct 26',
      timeStr: '10:30 AM',
      sender: 'Manager (Nur Hasan)',
      category: 'Announcement',
      unread: true,
    },
    {
      id: 'notif-2',
      title: 'Meal Schedule Updated',
      message: 'Dinner menu has been updated to Rice + Chicken. Please turn off your meal before 4:00 PM if you won\'t be having dinner tonight.',
      dateStr: '10 Oct 26',
      timeStr: '03:45 PM',
      sender: 'Manager (Nur Hasan)',
      category: 'Meal',
      unread: true,
    },
    {
      id: 'notif-3',
      title: 'WiFi & Electricity Bill Generated',
      message: 'Monthly WiFi bill (৳480) and Electricity bill (৳1,200) have been generated. Kindly clear dues before the 15th of this month.',
      dateStr: '09 Oct 26',
      timeStr: '11:15 AM',
      sender: 'Manager (Nur Hasan)',
      category: 'Rent & Bills',
      unread: false,
    },
    {
      id: 'notif-4',
      title: 'Weekly Grocery Deposit Confirmation',
      message: 'Deposit received from all 4 roommates. Current grocery balance is ৳7,200. Fresh vegetables, cooking oil, and fish purchased today.',
      dateStr: '7 Aug 26',
      timeStr: '08:20 PM',
      sender: 'Manager (Nur Hasan)',
      category: 'Deposit',
      unread: false,
    },
    {
      id: 'notif-5',
      title: 'Friday Mess Cleaning Duties',
      message: 'Reminder for general mess cleaning this Friday: Kitchen and common dining area cleaning duties are assigned to Room 2.',
      dateStr: '5 Aug 26',
      timeStr: '09:00 AM',
      sender: 'Manager (Nur Hasan)',
      category: 'General',
      unread: false,
    },
    {
      id: 'notif-6',
      title: 'Gas Cylinder Refill Notice',
      message: 'New LP gas cylinder (৳1,450) was delivered and installed this afternoon. The cost has been added to shared utilities.',
      dateStr: '3 Aug 26',
      timeStr: '04:10 PM',
      sender: 'Manager (Nur Hasan)',
      category: 'Rent & Bills',
      unread: false,
    },
    {
      id: 'notif-7',
      title: 'Monthly Flat Rent Payment Reminder',
      message: 'Flat rent (৳23,880) must be handed over to the landlord by the 5th of this month. Please send your personal share to the mess fund.',
      dateStr: '1 Aug 26',
      timeStr: '01:30 PM',
      sender: 'Manager (Nur Hasan)',
      category: 'Rent & Bills',
      unread: false,
    },
    {
      id: 'notif-8',
      title: 'Water Motor Maintenance Complete',
      message: 'The overhead water tank and pump motor have been serviced by the technician. Regular water supply is now fully restored.',
      dateStr: '28 Jul 26',
      timeStr: '11:00 AM',
      sender: 'Manager (Nur Hasan)',
      category: 'General',
      unread: false,
    },
    {
      id: 'notif-9',
      title: 'Welcome to New Mess Cycle',
      message: 'Welcome to this month at Ami Bachelor Mess! All daily calculations, meal rates, and balances have been reset for the cycle.',
      dateStr: '25 Jul 26',
      timeStr: '12:00 PM',
      sender: 'Manager (Nur Hasan)',
      category: 'General',
      unread: false,
    },
  ];

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f3f3f1] text-[#141414]">
      <DashboardHeader
        current="member"
        activeView={activeView}
        onNavigate={onNavigate}
        onToggleRole={onToggleRole}
        registeredName={registeredName}
        hostelName={hostelName}
        onOpenNoticeModal={() => setShowNoticeModal(true)}
      />

      <main className="dashboard mx-auto flex w-[calc(100%-32px)] flex-col gap-[16px] pb-[32px] lg:max-w-[900px]">
        {/* Dark Hero Card */}
        <section className="flex h-[201px] flex-col justify-between rounded-[24px] bg-[linear-gradient(113.5deg,#212121_0.77%,#000_100%)] px-[23px] py-[19px] text-[#e5e6e1] shadow-xl">
          <div className="flex items-center gap-[8px]">
            <Icon
              className="h-[42px] w-[42px] rounded-full"
              name="65557.png"
              alt={registeredName}
            />
            <div className="flex h-[42px] flex-col justify-center gap-[2px] font-sf-medium">
              <p className="text-[12px] uppercase">{registeredName}</p>
              <p className="text-[20px] leading-normal">{hostelName}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-[5px]">
            <p className="font-sf-regular text-[6px] text-[#8e8e8e] uppercase">TOTAL PAID</p>
            <p className="font-sf-regular text-[14px] text-[#8e8e8e]">+ {totalPaid.toLocaleString()}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-sf-regular text-[14px] text-[#8e8e8e]">Balance</span>
            <span className="font-sf-bold text-[18px]">
              ৳{' '}
              <span className={isDue ? 'text-red-600' : 'text-emerald-400'}>
                {balance > 0 ? `+${balance.toFixed(2)}` : balance.toFixed(2)}
              </span>
            </span>
          </div>
        </section>

        {/* Meal Cards Rail (Figma Frame 141-3114) */}
        <section className="flex flex-col gap-[14px]">
          <div className="flex items-center justify-between">
            <SectionTitle>Meal</SectionTitle>
          </div>
          <div className="card-rail flex gap-[8px] overflow-x-auto pb-1">
            {/* Card 1: Balance */}
            <article
              onClick={() => onNavigate('meals')}
              className="flex h-[128px] w-[160px] shrink-0 cursor-pointer flex-col justify-between rounded-[16px] bg-[#e5e6e1] px-[10px] py-[8px] hover:bg-[#dedfd9] transition-colors"
              tabIndex={0}
            >
              <div className="flex items-center gap-[6px]">
                <div className="relative flex h-[20px] w-[20px] items-center justify-center shrink-0">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 18 18" fill="none">
                    {/* Fork */}
                    <path
                      d="M3 2v4a2 2 0 0 0 2 2v8h1.5V8a2 2 0 0 0 2-2V2H7v3.5h-.75V2h-1v3.5H4.5V2H3z"
                      fill="#ff0000"
                    />
                    {/* Knife */}
                    <path
                      d="M12.5 2c0 0-2 2-2 6 0 1.5 1 2 2 2v6h1.5V2h-1.5z"
                      fill="#ff0000"
                    />
                  </svg>
                  <span className="absolute -top-1 -right-1 flex h-[10px] w-[10px] items-center justify-center rounded-full bg-white text-[#ff0000] text-[7.5px] font-bold shadow-xs">
                    ৳
                  </span>
                </div>
                <span className="font-sf-medium text-[13px] text-[#141414]">Balance</span>
              </div>
              <div className="ml-auto flex flex-col items-end">
                <p className="font-sf-regular text-[9px] text-[#626262]">
                  PAID <span className="text-[7.5px] align-super">৳</span>{totalPaid}
                </p>
                <p className="font-sf-bold text-[22px] text-[#141414] leading-tight mt-0.5">
                  <span className="text-[17px] font-sf-medium mr-0.5">৳</span>{Math.abs(balance).toFixed(0)}
                </p>
              </div>
            </article>

            {/* Card 2: Sheet */}
            <SheetCard
              onClick={() => onNavigate('meals')}
              total={String(calculations?.totalMeals || '53')}
            />

            {/* Card 3: Count & Cost */}
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
                    BILL <span className="text-[7.5px] align-super">৳</span>{Number(myMealCost).toFixed(0)}
                  </p>
                  <p className="font-sf-bold text-[22px] text-[#141414] leading-tight mt-0.5">
                    {myMeals}
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Recent Grocery */}
        <section className="flex flex-col gap-[14px]">
          <div className="flex items-center justify-between">
            <SectionTitle>Recent Grocery</SectionTitle>
            <button
              onClick={() => onNavigate('expenses')}
              className="text-[10px] font-sf-semibold text-red-600 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex min-h-[186px] flex-col rounded-[24px] bg-[#e5e6e1] px-[12px] py-[12px]">
            <div className="max-h-[152px] overflow-y-auto overscroll-contain pr-1 divide-y divide-[#d6d6d6]/70 mini-card-scroll">
              {recentExpenses.map(([title, person, date, amount], idx) => (
                <div
                  className="flex h-[42px] items-center justify-between px-[6px] text-left hover:bg-black/5 transition-colors"
                  key={title + idx}
                >
                  <span className="min-w-0 font-sf-semibold">
                    <span className="block truncate text-[11px] text-[#141414]">{title}</span>
                    <span className="block truncate text-[8px] text-[#6d6d6d]">
                      <span className="text-black font-sf-bold">{person}</span> • Grocery • {date}
                    </span>
                  </span>
                  <span className="w-[74px] shrink-0 text-right font-sf-semibold text-[11px]">
                    {amount}
                  </span>
                </div>
              ))}
              {recentExpenses.length === 0 && (
                <p className="py-6 text-center text-xs text-[#8e8e8e]">No grocery records found.</p>
              )}
            </div>
            <div className="mt-auto flex justify-end gap-[16px] pr-[6px] pt-2 font-sf-semibold text-[12px] border-t border-[#d6d6d6]/60">
              <span className="text-[#626262]">Month total</span>
              <span className="text-black font-sf-bold">৳ {monthGroceryTotal.toLocaleString()}</span>
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
              Manage
            </button>
          </div>
          <div className="card-rail flex gap-[8px] overflow-x-auto pb-1">
            <InfoCard due title="Due" width="130px">
              <div className="ml-auto flex w-full flex-col items-end gap-[4px] font-sf-medium">
                <p className="font-sf-regular text-[8px] text-[#626262]">PAID ৳ {totalPaid}</p>
                <p className="text-[20px] text-red-600 font-sf-bold">৳ 700</p>
              </div>
            </InfoCard>
            <InfoCard title="Expenses" width="233px">
              <div
                onClick={() => onNavigate('fixed-costs')}
                className="ml-auto flex w-full flex-col gap-[5px] font-sf-medium text-[10px] text-[#626262] cursor-pointer"
              >
                <p className="flex justify-between">
                  <span>Flat Rent</span>
                  <span className="font-sf-semibold text-black">৳ {myShareRent.toLocaleString()}</span>
                </p>
                <p className="flex justify-between">
                  <span>Water Bill</span>
                  <span className="font-sf-semibold text-black">৳ {myShareWater.toLocaleString()}</span>
                </p>
                <p className="flex justify-between">
                  <span>Internet Wifi</span>
                  <span className="font-sf-semibold text-black">৳ {myShareWifi.toLocaleString()}</span>
                </p>
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
          <SectionTitle>Meals To Cook</SectionTitle>
          <div className="flex h-[76px] items-center justify-center gap-[24px] rounded-[16px] bg-[#e5e6e1] p-[10px]">
            {[
              ['BREAKFAST', mealSchedule.breakfast && mealSchedule.breakfast !== '0' ? mealSchedule.breakfast : 'Roti + Dal'],
              ['LUNCH', mealSchedule.lunch && mealSchedule.lunch !== '0' ? mealSchedule.lunch : 'Rice + Fish'],
              ['DINNER', mealSchedule.dinner && mealSchedule.dinner !== '0' ? mealSchedule.dinner : 'Rice + Chicken'],
            ].map(([label, value]) => (
              <div
                className="flex w-[80px] flex-col items-center gap-[4px]"
                key={label}
              >
                <span className="font-sf-semibold text-[8px] text-[#626262] uppercase tracking-wider">
                  {label}
                </span>
                <span className="flex h-[28px] w-full items-center justify-center rounded-[6px] bg-[#f3f3f1] font-sf-bold text-[11px] text-red-600 border border-[#d6d6d6] px-1 truncate">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* MODAL: Member Availability Overview */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl border border-[#d6d6d6] space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-red-600" />
                <h3 className="font-sf-bold text-base text-[#141414]">Flatmate Availability</h3>
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
                const isMe = name.toLowerCase() === registeredName.toLowerCase();
                const isLast = idx === roommates.length - 1;
                return (
                  <div
                    key={name}
                    className={`flex items-center justify-between py-3 px-1 ${
                      !isLast ? 'border-b border-[#d6d6d6]' : ''
                    }`}
                  >
                    <span className="font-sf-semibold text-xs text-[#141414]">
                      {name} {isMe && <b className="text-red-600 font-bold">(You)</b>}
                    </span>
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

      {/* Notification Messages Popup Overlay UI */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showNoticeModal && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overscroll-contain select-none"
                onClick={() => setShowNoticeModal(false)}
                onTouchMove={(e) => {
                  if (e.target === e.currentTarget) {
                    e.preventDefault();
                  }
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 16 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="relative flex w-[calc(100%-16px)] sm:w-full max-w-[420px] max-h-[82vh] flex-col rounded-[22px] sm:rounded-[24px] bg-[#f8f8f6] p-4 sm:p-5 shadow-2xl border border-[#e5e6e1] overflow-hidden select-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#e5e6e1] shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-red-600/10 text-red-600 shrink-0">
                        <Bell className="h-5 w-5 fill-red-600 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-sf-bold text-[15px] sm:text-[16px] text-[#141414] leading-tight">
                          Mess Notifications
                        </h3>
                        <p className="font-sf-regular text-[11px] text-[#8e8e8e] mt-0.5">
                          Recent updates & announcements
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowNoticeModal(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5e6e1] text-[#626262] hover:bg-[#d8d9d4] hover:text-black transition-colors shrink-0 cursor-pointer"
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Notifications List: Directly inside overlay card */}
                  <div className="mt-2.5 flex-1 overflow-y-auto divide-y divide-[#e5e6e1] overscroll-contain pr-1 -mr-1">
                    {messNotifications.map((notif) => {
                      const isExpanded = expandedNoticeId === notif.id;
                      return (
                        <div
                          key={notif.id}
                          onClick={() => setExpandedNoticeId(isExpanded ? null : notif.id)}
                          className={`group cursor-pointer py-3.5 px-1.5 transition-colors ${
                            isExpanded ? 'bg-black/[0.02]' : 'hover:bg-black/[0.015]'
                          }`}
                        >
                          {/* Top Meta Row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {notif.unread && (
                                <span className="h-2 w-2 rounded-full bg-red-600 shrink-0 animate-pulse" />
                              )}
                              <span className="rounded-full bg-[#e5e6e1] px-2 py-0.5 text-[9px] font-sf-semibold uppercase tracking-wider text-[#626262]">
                                {notif.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-sf-medium text-[#8e8e8e] shrink-0">
                              <Clock size={11} className="text-[#8e8e8e]" />
                              <span>{notif.dateStr}</span>
                              <span className="text-[#c0c0c0]">•</span>
                              <span>{notif.timeStr}</span>
                              <ChevronDown
                                size={14}
                                className={`ml-1 text-[#8e8e8e] transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-red-600' : ''
                                }`}
                              />
                            </div>
                          </div>

                          {/* Title & Preview */}
                          <div className="mt-1.5">
                            <h4 className="font-sf-semibold text-[13px] text-[#141414] leading-snug">
                              {notif.title}
                            </h4>
                            {!isExpanded && (
                              <p className="mt-0.5 truncate font-sf-regular text-[11.5px] text-[#626262]">
                                {notif.message}
                              </p>
                            )}
                          </div>

                          {/* Dropdown Motion Expanded Content */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2.5 border-t border-[#e5e6e1]/60 pt-2 text-[12.5px] leading-relaxed text-[#2c2c2c]">
                                  <p className="whitespace-pre-wrap font-sf-regular">{notif.message}</p>
                                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#8e8e8e] border-t border-[#e5e6e1]/40 pt-1.5">
                                    <span>
                                      Sender: <strong className="text-black font-sf-medium">{notif.sender}</strong>
                                    </span>
                                    <span className="font-sf-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                      {notif.dateStr}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
