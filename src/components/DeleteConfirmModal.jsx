import React, { useState } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, product }) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await onConfirm(product.id);
      onClose();
    } catch (err) {
      console.error('Delete error', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6" />
          </div>
          
          <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Product?</h3>
          <p className="text-sm text-slate-600 mb-4">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-slate-800">"{product.name}"</span> (SKU: {product.sku})?
            This action cannot be undone.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
