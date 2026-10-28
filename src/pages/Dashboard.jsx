import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Layers, 
  AlertTriangle, 
  DollarSign, 
  ArrowUpRight, 
  Plus, 
  Boxes, 
  TrendingDown,
  CheckCircle,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import StockAdjustModal from '../components/StockAdjustModal';
import ProductModal from '../components/ProductModal';

export default function Dashboard({ onNavigateToProducts }) {
  const { user, organization, addToast } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        addToast('Failed to load dashboard data', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error loading dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAdjustStock = async (productId, delta, note) => {
    const res = await fetch(`/api/products/${productId}/adjust-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, note })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to adjust stock');
    }
    addToast(result.message, 'success');
    fetchDashboardData();
  };

  const handleCreateProduct = async (formData) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to create product');
    }
    addToast('Product added successfully!', 'success');
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading dashboard metrics...
          </p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalProducts: 0,
    totalQuantityOnHand: 0,
    lowStockCount: 0,
    totalInventoryValue: 0,
    defaultLowStockThreshold: 5
  };

  const lowStockItems = data?.lowStockItems || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-700/50">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-3">
            <span>Tenant Workspace: {organization?.name}</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Inventory Overview
          </h2>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            Real-time stock tracking, product metrics, and instant threshold alerts for your store.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-2xl shadow-lg transition-all text-sm shrink-0"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Add Product</span>
          </button>
          <button
            onClick={fetchDashboardData}
            title="Refresh metrics"
            className="p-3 bg-indigo-700/50 hover:bg-indigo-700 text-white rounded-2xl border border-indigo-500/40 transition-colors shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Products */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Products
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{stats.totalProducts}</span>
            <span className="text-xs text-slate-400 font-medium">SKUs cataloged</span>
          </div>
        </div>

        {/* Sum of Quantity on Hand */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Units on Hand
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{stats.totalQuantityOnHand}</span>
            <span className="text-xs text-emerald-600 font-medium font-semibold">Physical items</span>
          </div>
        </div>

        {/* Low Stock Items Section */}
        <div className={`rounded-2xl p-5 border shadow-xs hover:shadow-md transition-shadow ${
          stats.lowStockCount > 0 
            ? 'bg-amber-50/70 border-amber-300' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              stats.lowStockCount > 0 ? 'text-amber-800' : 'text-slate-500'
            }`}>
              Low Stock Items
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              stats.lowStockCount > 0 
                ? 'bg-amber-500 text-white animate-pulse' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-3xl font-extrabold ${
              stats.lowStockCount > 0 ? 'text-amber-900' : 'text-slate-900'
            }`}>
              {stats.lowStockCount}
            </span>
            <span className={`text-xs font-semibold ${
              stats.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-400'
            }`}>
              {stats.lowStockCount > 0 ? 'Needs reordering' : 'Stock levels healthy'}
            </span>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Est. Retail Value
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              ${Number(stats.totalInventoryValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-400 font-medium">Selling value</span>
          </div>
        </div>
      </div>

      {/* FR-6: Low Stock Items Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                Low Stock Items Alert
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {lowStockItems.length} items
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Products with Quantity on Hand &le; their designated Low Stock Threshold (or Org Default: {stats.defaultLowStockThreshold}).
            </p>
          </div>

          <button
            onClick={onNavigateToProducts}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-colors"
          >
            <span>View All Products</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Low Stock Items!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All inventory levels are currently above their minimum alert thresholds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/75 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Product Name</th>
                  <th className="py-3 px-6">SKU</th>
                  <th className="py-3 px-6">Quantity on Hand</th>
                  <th className="py-3 px-6">Threshold</th>
                  <th className="py-3 px-6">Selling Price</th>
                  <th className="py-3 px-6 text-right">Quick Stock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                          Low Stock
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-600 font-semibold">
                      {item.sku}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 font-bold text-rose-600 text-base">
                        <TrendingDown className="w-4 h-4" />
                        {item.quantity_on_hand}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">
                      &le; {item.effective_threshold} units
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-700">
                      {item.selling_price ? `$${Number(item.selling_price).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setAdjustProduct(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors border border-indigo-200/80"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>Restock / Adjust</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <StockAdjustModal
        isOpen={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        onAdjust={handleAdjustStock}
        product={adjustProduct}
      />

      <ProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleCreateProduct}
      />
    </div>
  );
}
