import { useState, useEffect } from 'react';
import { Banknote, Save, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface FixedCost {
  category: string;
  amount: number;
  is_paid?: boolean;
  paid_date?: string;
}

interface Props {
  isManager: boolean;
  fixedCosts: FixedCost[];
  onUpdateFixedCosts: (costs: FixedCost[]) => void;
  activeMonthId: string;
}

export function FixedCostsManager({
  isManager,
  fixedCosts,
  onUpdateFixedCosts,
  activeMonthId,
}: Props) {
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    let initial = fixedCosts.length > 0 ? [...fixedCosts] : [
      { category: 'Rent', amount: 0, is_paid: false },
      { category: 'Chef', amount: 0, is_paid: false }
    ];
    // Ensure Chef category is present if not already added
    if (!initial.some(c => c.category.toLowerCase() === 'chef')) {
      initial.push({ category: 'Chef', amount: 0, is_paid: false });
    }
    setCosts(initial);
  }, [fixedCosts]);

  const handleUpdate = (index: number, field: keyof FixedCost, value: any) => {
    const updated = [...costs];
    updated[index] = { ...updated[index], [field]: value };
    setCosts(updated);
  };

  const addCategory = () => {
    if (newCatName.trim()) {
      setCosts([...costs, { category: newCatName.trim(), amount: 0, is_paid: false }]);
      setNewCatName('');
    }
  };

  const deleteCategory = async (index: number) => {
    const catToDelete = costs[index].category;
    const { count } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('month_id', activeMonthId)
      .eq('category', catToDelete);

    if (count && count > 0) {
      if (
        !confirm(
          `WARNING: Category "${catToDelete}" has ${count} expense entries. Deleting will remove these from calculations. Proceed?`
        )
      )
        return;
    }
    setCosts(costs.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onUpdateFixedCosts(costs);
    setIsEditing(false);
  };

  const total = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  return (
    <div className="flex flex-col h-full text-[#141414]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-2.5 rounded-xl text-red-600 border border-red-100">
            <Banknote size={20} />
          </div>
          <div>
            <h3 className="font-sf-bold text-lg text-[#141414]">Fixed Monthly Cost</h3>
            <p className="font-sf-regular text-[10px] text-[#626262] uppercase tracking-wider">
              Recurring Flat Expenses
            </p>
          </div>
        </div>

        {isManager && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-[12px] transition-all border border-[#d6d6d6] ${
                isEditing
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-[#e5e6e1] text-[#141414] hover:bg-[#dedfd9]'
              }`}
              title={isEditing ? 'Cancel editing' : 'Edit fixed costs'}
            >
              <Pencil size={16} />
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-[30px] font-sf-semibold text-[11px] hover:bg-red-700 transition-colors shadow-md shadow-red-600/20"
              >
                <Save size={14} /> Save
              </button>
            )}
          </div>
        )}
      </div>

      {/* Categories List */}
      <div className="space-y-3 flex-1">
        {costs.map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3.5 bg-[#e5e6e1] border border-[#d6d6d6] rounded-[16px] gap-2"
          >
            {isEditing ? (
              <input
                value={c.category}
                onChange={(e) => handleUpdate(i, 'category', e.target.value)}
                className="w-28 p-2 rounded-[8px] bg-white border border-[#d6d6d6] font-sf-semibold text-xs focus:border-red-500 outline-none"
              />
            ) : (
              <span className="font-sf-semibold text-sm text-[#141414] w-28 truncate">
                {c.category}
              </span>
            )}

            <div className="flex items-center gap-2 flex-1 justify-end">
              <div className="flex items-center bg-white/70 px-2 py-1 rounded-[8px] border border-[#d6d6d6]/60">
                <span className="font-sf-bold text-xs text-[#626262] mr-1">৳</span>
                <input
                  type="number"
                  disabled={!isEditing}
                  value={c.amount || ''}
                  onChange={(e) => handleUpdate(i, 'amount', e.target.value)}
                  className={`w-24 text-right font-sf-bold text-sm outline-none transition-all ${
                    isEditing ? 'bg-transparent text-black' : 'bg-transparent cursor-default text-black'
                  }`}
                />
              </div>

              {isEditing && (
                <button
                  onClick={() => deleteCategory(i)}
                  className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}

        {isEditing && (
          <div className="flex gap-2 mt-3">
            <input
              placeholder="Add new category (e.g. Maid, Cleaner)..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 p-3 rounded-[12px] bg-white border border-dashed border-[#d6d6d6] font-sf-medium text-xs outline-none focus:border-red-500"
            />
            <button
              onClick={addCategory}
              className="bg-red-600 text-white px-4 rounded-[12px] hover:bg-red-700 transition-colors shadow-sm"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Footer Total */}
      <div className="mt-6 pt-5 border-t border-[#d6d6d6] flex justify-between items-center px-1">
        <span className="font-sf-regular text-xs text-[#626262] uppercase tracking-wider">
          Total Fixed Cost
        </span>
        <span className="font-sf-bold text-2xl text-[#141414]">৳{total.toFixed(2)}</span>
      </div>
    </div>
  );
}