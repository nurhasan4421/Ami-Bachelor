import { useState, useEffect } from 'react';
import { User, ChevronDown, ChevronUp, Download, Receipt, Settings2, History, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'expense' | 'deposit';
}

interface AccountProps {
  name: string;
  expenses: Record<string, number>;
  paid: number;
  manualAdjustment: number;
  showAllAccounts?: boolean;
  hostelName?: string;
  isManager?: boolean;
  transactions?: Transaction[];
  onManualAdjustment: (amount: number) => void;
}

export function IndividualAccount({
  name,
  expenses,
  paid,
  manualAdjustment,
  showAllAccounts = false,
  hostelName = 'AREA 51',
  isManager = false,
  transactions = [],
  onManualAdjustment,
}: AccountProps) {
  const [adjustAmount, setAdjustAmount] = useState('');
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [isLocalExpanded, setIsLocalExpanded] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    setIsLocalExpanded(showAllAccounts);
    if (!showAllAccounts) {
      setShowAdjustment(false);
      setShowTransactions(false);
    }
  }, [showAllAccounts]);

  const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + (val || 0), 0);
  const totalDue = totalExpenses + manualAdjustment - paid;
  const isExpanded = isLocalExpanded || showAllAccounts;

  const handleAddAdjustment = () => {
    const amount = parseFloat(adjustAmount);
    if (!isNaN(amount) && amount !== 0) {
      onManualAdjustment(amount);
      setAdjustAmount('');
      setShowAdjustment(false);
    }
  };

  const handleDownloadReceipt = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const date = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const expenseRows = Object.entries(expenses)
      .map(
        ([cat, amt]) =>
          `<div class="row"><span class="label">${cat}</span><span class="value">৳${amt.toFixed(2)}</span></div>`
      )
      .join('');

    const receiptHTML = `<!DOCTYPE html><html><head><title>Receipt - ${name}</title><style>body { font-family: -apple-system, sans-serif; background-color: #f3f3f1; display: flex; justify-content: center; padding: 40px 20px; color: #141414; } .receipt { background: #ffffff; width: 100%; max-width: 400px; padding: 32px; border-radius: 20px; border: 1px solid #d6d6d6; } .header { text-align: center; border-bottom: 2px dashed #d6d6d6; padding-bottom: 20px; margin-bottom: 20px; } .hostel-name { font-size: 20px; font-weight: 800; margin: 0 0 4px 0; } .meta { font-size: 11px; color: #626262; text-transform: uppercase; letter-spacing: 1px; } .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; } .row .label { color: #626262; } .row .value { font-family: monospace; font-size: 14px; font-weight: 700; } .divider { border-top: 1px solid #d6d6d6; margin: 16px 0; } .total-row { display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 16px; margin-top: 20px; } .status-badge { display: block; padding: 8px; border-radius: 10px; font-size: 12px; font-weight: 800; text-align: center; margin-top: 20px; text-transform: uppercase; } .status-due { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; } .status-credit { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; } .status-settled { background: #f3f3f1; color: #626262; }</style></head><body><div class="receipt"><div class="header"><img src="${window.location.origin}/logo.png" style="width: 50px; height: auto; display: block; margin: 0 auto 10px auto;" /><h1 class="hostel-name">${hostelName}</h1><p class="meta">Account Statement</p><p class="meta">${date} • ${time}</p></div><div class="row" style="margin-bottom: 18px;"><span class="label" style="font-weight: bold;">MEMBER NAME</span><span class="value" style="font-size: 15px; text-transform: capitalize;">${name}</span></div>${expenseRows}${manualAdjustment !== 0 ? `<div class="row"><span class="label">Manual Adjustment</span><span class="value">৳${manualAdjustment.toFixed(2)}</span></div>` : ''}<div class="divider"></div><div class="row"><span class="label" style="font-weight: 700;">Total Bill</span><span class="value">৳${totalExpenses.toFixed(2)}</span></div><div class="row"><span class="label" style="font-weight: 700; color: #16a34a;">Paid / Deposited</span><span class="value" style="color: #16a34a;">- ৳${paid.toFixed(2)}</span></div><div class="divider" style="border-top: 2px dashed #d6d6d6;"></div><div class="total-row"><span>FINAL BALANCE</span><span>৳${Math.abs(totalDue).toFixed(2)}</span></div><div class="status-badge ${totalDue > 0 ? 'status-due' : totalDue < 0 ? 'status-credit' : 'status-settled'}">${totalDue > 0 ? 'DUE' : totalDue < 0 ? 'CREDIT' : 'SETTLED'}</div></div></body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 800);
    }
  };

  return (
    <div className="group relative border-b border-[#d6d6d6] last:border-b-0 transition-all duration-200">
      <div
        onClick={() => !showAllAccounts && setIsLocalExpanded(!isLocalExpanded)}
        className={`px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
          isExpanded ? 'bg-black/5' : 'hover:bg-black/5'
        }`}
      >
        {/* Name and Balance */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="bg-[#2b2b2b] h-8 w-8 rounded-full text-white font-sf-bold text-xs shrink-0 flex items-center justify-center">
            {name.charAt(0)}
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h3 className="font-sf-bold text-sm text-[#141414] capitalize truncate">{name}</h3>
            {totalDue > 0 ? (
              <span className="font-sf-bold text-[11px] text-red-600 bg-red-100/80 px-2 py-0.5 rounded-md whitespace-nowrap inline-flex items-center gap-1">
                <ArrowDownRight size={12} strokeWidth={2.5} />
                ৳{totalDue.toFixed(0)}
              </span>
            ) : totalDue < 0 ? (
              <span className="font-sf-bold text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md whitespace-nowrap inline-flex items-center gap-1">
                <ArrowUpRight size={12} strokeWidth={2.5} />
                ৳{Math.abs(totalDue).toFixed(0)}
              </span>
            ) : (
              <span className="font-sf-bold text-[10px] text-[#626262] bg-[#dedfd9] px-2 py-0.5 rounded-md whitespace-nowrap">
                SETTLED
              </span>
            )}
          </div>
        </div>

        {/* Right side: Download Icon and Drop Icon in 1 line inline */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleDownloadReceipt}
            className="p-1.5 text-[#626262] hover:text-red-600 hover:bg-black/5 rounded-full transition-colors cursor-pointer"
            title="Download Statement"
          >
            <Download size={16} />
          </button>
          {!showAllAccounts && (
            <button
              onClick={() => setIsLocalExpanded(!isLocalExpanded)}
              className="p-1.5 text-[#626262] hover:text-[#141414] hover:bg-black/5 rounded-full transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 md:p-5 space-y-4">
          {isManager && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAdjustment(!showAdjustment)}
                className={`flex items-center gap-1.5 font-sf-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-[30px] transition-colors border ${
                  showAdjustment
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white text-[#141414] border-[#d6d6d6] hover:bg-slate-50'
                }`}
              >
                <Settings2 size={13} /> Adjust Balance
              </button>
            </div>
          )}

          {showAdjustment && isManager && (
            <div className="p-4 bg-[linear-gradient(113.5deg,#212121_0.77%,#000_100%)] rounded-[16px] text-white">
              <label className="block font-sf-medium text-[10px] text-[#8e8e8e] uppercase mb-2">
                Apply Manual Adjustment
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Amount (+/- e.g. 100 or -50)"
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-[10px] font-sf-medium text-xs text-white outline-none focus:border-red-500 placeholder-white/40"
                />
                <button
                  onClick={handleAddAdjustment}
                  className="bg-red-600 text-white px-4 py-2 rounded-[10px] font-sf-semibold text-xs hover:bg-red-700 transition-colors shadow-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Expense Breakdown */}
          <div className="py-2 space-y-1.5 border-t border-[#d6d6d6]">
            <p className="font-sf-bold text-[10px] uppercase text-[#626262] tracking-wider mb-2">
              Cost Share Breakdown
            </p>
            {Object.entries(expenses).map(([category, amount]) => (
              <div key={category} className="flex justify-between py-1 text-xs font-sf-medium border-b border-[#d6d6d6]/40 last:border-b-0">
                <span className="capitalize text-[#626262]">{category}</span>
                <span className="font-sf-bold text-[#141414]">৳{amount.toFixed(2)}</span>
              </div>
            ))}
            {manualAdjustment !== 0 && (
              <div className="flex justify-between items-center text-xs pt-1.5 border-t border-dashed border-[#d6d6d6]">
                <span className="text-[#626262] font-sf-semibold">Manual Adjustment</span>
                <span
                  className={`font-sf-bold ${
                    manualAdjustment > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {manualAdjustment > 0 ? '+' : ''}৳{manualAdjustment.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-[#d6d6d6]">
            <div className="flex justify-between items-center px-1">
              <span className="font-sf-regular text-[10px] text-[#626262] uppercase tracking-wider">
                Total Generated Bill
              </span>
              <span className="font-sf-bold text-sm text-[#141414]">
                ৳{totalExpenses.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="font-sf-semibold text-[10px] text-emerald-700 uppercase tracking-wider">
                Total Paid / Deposited
              </span>
              <span className="font-sf-bold text-sm text-emerald-700">
                - ৳{paid.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center px-1 pt-2 border-t border-[#d6d6d6]">
              <span
                className={`font-sf-bold text-[11px] uppercase tracking-wider ${
                  totalDue > 0
                    ? 'text-red-600'
                    : totalDue < 0
                    ? 'text-emerald-700'
                    : 'text-[#626262]'
                }`}
              >
                {totalDue > 0 ? 'Remaining Due' : totalDue < 0 ? 'Account Credit' : 'Balance Settled'}
              </span>
              <span
                className={`font-sf-bold text-xl ${
                  totalDue > 0
                    ? 'text-red-600'
                    : totalDue < 0
                    ? 'text-emerald-700'
                    : 'text-[#141414]'
                }`}
              >
                ৳{Math.abs(totalDue).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Transactions section */}
          <div className="pt-2 border-t border-[#d6d6d6]">
            <button
              onClick={() => setShowTransactions(!showTransactions)}
              className="w-full flex items-center justify-between p-2.5 bg-white/70 hover:bg-white rounded-[10px] transition-colors border border-[#d6d6d6]"
            >
              <div className="flex items-center gap-2 text-[#626262]">
                <History size={14} />
                <span className="font-sf-semibold text-[10px] uppercase tracking-wider">
                  Transaction History
                </span>
              </div>
              {showTransactions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showTransactions && (
              <div className="mt-2 bg-white rounded-[12px] border border-[#d6d6d6] overflow-hidden p-2">
                {transactions.length > 0 ? (
                  transactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 border-b last:border-0 border-[#f0f0f0]"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-[6px] ${
                            t.type === 'deposit'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {t.type === 'deposit' ? (
                            <ArrowDownRight size={12} />
                          ) : (
                            <ArrowUpRight size={12} />
                          )}
                        </div>
                        <div>
                          <p className="font-sf-semibold text-xs text-[#141414] leading-tight">
                            {t.description}
                          </p>
                          <p className="font-sf-regular text-[9px] text-[#8e8e8e]">
                            {new Date(t.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="font-sf-bold text-xs text-[#141414]">৳{t.amount.toFixed(2)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center font-sf-regular text-xs text-[#8e8e8e] py-3">
                    No transactions recorded.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}