import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Building2, AlertTriangle, Save, ShieldCheck, Check } from 'lucide-react';

export default function Settings() {
  const { organization, updateOrgState, addToast } = useAuth();
  const [defaultThreshold, setDefaultThreshold] = useState(5);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const json = await res.json();
          setDefaultThreshold(json.organization.defaultLowStockThreshold ?? 5);
          setOrgName(json.organization.name || '');
        }
      } catch (err) {
        console.error(err);
        addToast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          defaultLowStockThreshold: defaultThreshold
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      updateOrgState(data.organization);
      addToast('Organization settings updated successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Error updating settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">
          Organization Settings
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure default inventory alert parameters for your tenant organization.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 lg:p-8 space-y-6">
          {/* Organization Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              The display name for your multi-tenant workspace.
            </span>
          </div>

          {/* FR-7: Default Low Stock Threshold */}
          <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-2 text-indigo-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <label className="text-xs font-bold uppercase tracking-wider">
                Default Low Stock Threshold (units)
              </label>
            </div>
            
            <input
              type="number"
              value={defaultThreshold}
              onChange={(e) => setDefaultThreshold(e.target.value)}
              min="0"
              step="1"
              required
              className="w-full max-w-xs px-4 py-2.5 bg-white border border-indigo-300 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all mb-2"
            />

            <p className="text-xs text-indigo-950/80 leading-relaxed">
              <strong>PRD FR-7 Global Settings Logic:</strong> If an individual product's low stock threshold is left empty, this default value (<span className="font-semibold text-indigo-700">{defaultThreshold} units</span>) is automatically used across the Dashboard and Product tables to identify items requiring restock.
            </p>
          </div>

          {/* Multi-Tenant Scoping Info */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Tenant Data Isolation:</strong> All inventory records, custom SKU codes, and thresholds are strictly bounded by your Organization ID (<code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">{organization?.id}</code>). Cross-tenant queries are prevented by database-enforced scopes.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 lg:px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
