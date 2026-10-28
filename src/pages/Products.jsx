import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowUpDown, 
  AlertTriangle, 
  CheckCircle2, 
  Filter,
  DollarSign,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import ProductModal from '../components/ProductModal';
import StockAdjustModal from '../components/StockAdjustModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function Products() {
  const { organization, addToast } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' or 'low_stock'

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  const fetchProducts = async () => {
    try {
      let url = '/api/products';
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (filterType === 'low_stock') params.append('filter', 'low_stock');
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.products || []);
      } else {
        addToast('Failed to load products', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, filterType]);

  const handleSaveProduct = async (formData, productId) => {
    const isEdit = !!productId;
    const url = isEdit ? `/api/products/${productId}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save product');
    }

    addToast(data.message, 'success');
    fetchProducts();
  };

  const handleAdjustStock = async (productId, delta, note) => {
    const res = await fetch(`/api/products/${productId}/adjust-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, note })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to adjust stock');
    }

    addToast(data.message, 'success');
    fetchProducts();
  };

  const handleDeleteProduct = async (productId) => {
    const res = await fetch(`/api/products/${productId}`, {
      method: 'DELETE'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete product');
    }

    addToast('Product deleted successfully', 'success');
    fetchProducts();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">
            Product Inventory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your store's catalog, stock quantities, and SKU pricing.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Product Name or SKU..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setFilterType('low_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'low_stock'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Only</span>
          </button>
          <button
            onClick={fetchProducts}
            title="Refresh list"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800">No Products Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
              {searchTerm
                ? `No products matching "${searchTerm}". Try adjusting your search query.`
                : 'Your organization product catalog is currently empty. Add your first inventory item to get started!'}
            </p>
            <button
              onClick={() => {
                setEditingProduct(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Product</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/75 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Product & Details</th>
                  <th className="py-3.5 px-6">SKU</th>
                  <th className="py-3.5 px-6">Quantity on Hand</th>
                  <th className="py-3.5 px-6">Stock Status</th>
                  <th className="py-3.5 px-6">Selling Price</th>
                  <th className="py-3.5 px-6">Cost Price</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Name & description */}
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </td>

                    {/* SKU */}
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {item.sku}
                      </span>
                    </td>

                    {/* Quantity on Hand */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900">
                          {item.quantity_on_hand}
                        </span>
                        <button
                          onClick={() => setAdjustingProduct(item)}
                          title="Quick Restock / Adjust"
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Alert at &le; {item.effective_threshold} units
                      </span>
                    </td>

                    {/* Low Stock Indicator */}
                    <td className="py-4 px-6">
                      {item.is_low_stock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>In Stock</span>
                        </span>
                      )}
                    </td>

                    {/* Selling Price */}
                    <td className="py-4 px-6 font-bold text-slate-800">
                      {item.selling_price !== null && item.selling_price !== undefined
                        ? `$${Number(item.selling_price).toFixed(2)}`
                        : '—'}
                    </td>

                    {/* Cost Price */}
                    <td className="py-4 px-6 text-slate-500 font-medium text-xs">
                      {item.cost_price !== null && item.cost_price !== undefined
                        ? `$${Number(item.cost_price).toFixed(2)}`
                        : '—'}
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setAdjustingProduct(item)}
                          className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Quick stock +/- adjustment"
                        >
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(item);
                            setModalOpen(true);
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit product"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(item)}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
      />

      <StockAdjustModal
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        onAdjust={handleAdjustStock}
        product={adjustingProduct}
      />

      <DeleteConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
        product={deletingProduct}
      />
    </div>
  );
}
