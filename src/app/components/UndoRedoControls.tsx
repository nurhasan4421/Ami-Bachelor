import React from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const UndoRedoControls: React.FC<Props> = ({ canUndo, canRedo, onUndo, onRedo }) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`p-2.5 rounded-xl border transition-all ${
          canUndo 
            ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm' 
            : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
        }`}
        title="Undo"
      >
        <RotateCcw size={18} />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`p-2.5 rounded-xl border transition-all ${
          canRedo 
            ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm' 
            : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
        }`}
        title="Redo"
      >
        <RotateCw size={18} />
      </button>
    </div>
  );
};