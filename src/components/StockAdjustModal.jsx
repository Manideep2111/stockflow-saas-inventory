import React, { useState, useEffect } from 'react';
import { X, ArrowUpDown, Plus, Minus, AlertCircle, Check } from 'lucide-react';

export default function StockAdjustModal({ isOpen, onClose, onAdjust, product = null }) {
  const [mode, setMode] = useState('add'); // 'add' or 'subtract'
  const [units, setUnits] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUnits('1');
    setNote('');
    setError('');
    setMode('add');
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const currentQty = product.quantity_on_hand ?? 0;
  const parsedUnits = parseInt(units, 10) || 0;
  const delta = mode === 'add' ? parsedUnits : -parsedUnits;
  const newQty = currentQty + delta;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (parsedUnits <= 0) {
      setError('Please enter a valid unit quantity greater than 0.');
      return;
    }

    if (newQty < 0) {
      setError(`Cannot remove ${parsedUnits} units. Current stock is only ${currentQty}.`);
      return;
    }

    setSubmitting(true);
    try {
      await onAdjust(product.id, delta, note);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Adjust Stock</h3>
              <p className="text-xs text-slate-500 truncate max-w-[220px]">
                {product.name} ({product.sku})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Stock vs New Stock Preview Card */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-100 rounded-xl border border-slate-200/80 text-center">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                Current Stock
              </span>
              <span className="text-2xl font-black text-slate-800">{currentQty}</span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                New Stock Preview
              </span>
              <span
                className={`text-2xl font-black ${
                  newQty < 0 ? 'text-rose-600' : 'text-indigo-600'
                }`}
              >
                {newQty}
              </span>
            </div>
          </div>

          {/* Direction toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                  mode === 'add'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                Add Units (+)
              </button>
              <button
                type="button"
                onClick={() => setMode('subtract')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                  mode === 'subtract'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Minus className="w-4 h-4 text-rose-600" />
                Remove Units (-)
              </button>
            </div>
          </div>

          {/* Number of units */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Number of Units
            </label>
            <input
              type="number"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              min="1"
              step="1"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Adjustment Reason/Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason / Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Supplier delivery, Inventory count check, Damage write-off"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || newQty < 0}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Applying...' : 'Apply Stock Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
