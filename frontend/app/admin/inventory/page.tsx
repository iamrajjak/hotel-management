'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { inventoryApi, InventoryItem } from '@/lib/api/services';
import { Boxes, Plus, AlertTriangle, RefreshCw, CheckCircle, Package, X, IndianRupee } from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItem | null>(null);

  // New Item Form
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Linen');
  const [quantity, setQuantity] = useState('50');
  const [unit, setUnit] = useState('pcs');
  const [reorderLevel, setReorderLevel] = useState('15');
  const [unitCost, setUnitCost] = useState('250');

  // Restock Form
  const [additionalQty, setAdditionalQty] = useState('20');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    setLoading(true);
    const res = await inventoryApi.getItems();
    if (res.data) setItems(res.data);
    setLoading(false);
  }

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const res = await inventoryApi.createItem({
      itemName,
      category,
      quantity: parseFloat(quantity) || 0,
      unit,
      reorderLevel: parseFloat(reorderLevel) || 10,
      unitCost: parseFloat(unitCost) || 0,
    });

    if (res.success) {
      setShowAddModal(false);
      setSuccessMsg('Inventory item added!');
      setItemName('');
      loadInventory();
    } else {
      setError(res.message || 'Failed to add item');
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestockItem) return;
    setError('');
    setSuccessMsg('');

    const res = await inventoryApi.restockItem(selectedRestockItem.id, parseFloat(additionalQty) || 0);
    if (res.success) {
      setSelectedRestockItem(null);
      setSuccessMsg(res.message || 'Item restocked successfully!');
      loadInventory();
    } else {
      setError(res.message || 'Failed to restock item');
    }
  };

  const lowStockCount = items.filter((i) => i.isLowStock).length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Inventory Control & Stock Management" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Executive Dark Inventory Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl border border-indigo-800/40 shadow-xl shadow-slate-950/10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <Boxes className="w-3.5 h-3.5 text-indigo-300" /> Stock & Supply Inventory
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-400/30">
                  Reorder Level Alerts
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Hotel Supplies & Inventory Control</h1>
                <p className="text-indigo-200/90 text-xs sm:text-sm font-medium mt-1">Track hotel linen, toiletries, room cleaning supplies, and automatic stock reorder levels</p>
              </div>

              {/* Inventory Metric Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-indigo-300 text-[11px] font-bold">Total Managed Items:</span>
                  <span className="font-mono font-black text-white text-sm">{items.length} Items</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-amber-300 text-[11px] font-bold">Low Stock Reorders:</span>
                  <span className="font-mono font-black text-amber-300 text-sm">{lowStockCount} Items Need Restock</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="relative z-10 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 self-start lg:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock Item</span>
            </button>
          </div>

          {/* Feedback Banners */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center justify-between">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
            </div>
          )}

          {lowStockCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Warning: {lowStockCount} inventory items have fallen below safety reorder levels!</span>
            </div>
          )}

          {/* Inventory Items Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-bold text-slate-400 border-b border-slate-800 tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Item Name</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Stock Level</th>
                    <th className="py-4 px-6">Reorder Threshold</th>
                    <th className="py-4 px-6">Unit Cost</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-500">
                        No inventory stock items tracked yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6 font-bold text-white">
                          <p className="text-base">{item.itemName}</p>
                        </td>
                        <td className="py-4 px-6 font-semibold text-indigo-400 text-xs">
                          {item.category}
                        </td>
                        <td className="py-4 px-6 font-black text-white text-base">
                          {item.quantity} <span className="text-xs font-medium text-slate-400">{item.unit}</span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-400">
                          {item.reorderLevel} {item.unit}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-200">
                          ₹{item.unitCost} / {item.unit}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            item.isLowStock
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {item.isLowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => setSelectedRestockItem(item)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-white text-xs font-bold flex items-center gap-1.5 ml-auto transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Restock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add Stock Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Add Inventory Stock Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <p className="mb-4 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</p>}

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  placeholder="e.g. White Pillow Covers"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Linen">Linen & Bedding</option>
                    <option value="Toiletries">Guest Toiletries</option>
                    <option value="CleaningSupplies">Cleaning Supplies</option>
                    <option value="F&B">Food & Beverage</option>
                    <option value="General">General Stock</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Unit Type</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="pcs, liters, kg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Initial Qty</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all mt-4"
              >
                Save Stock Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {selectedRestockItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Restock Stock Item</h3>
              <button onClick={() => setSelectedRestockItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Restocking: <strong className="text-white">{selectedRestockItem.itemName}</strong> (Current Stock: {selectedRestockItem.quantity} {selectedRestockItem.unit})
            </p>

            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Additional Quantity ({selectedRestockItem.unit})</label>
                <input
                  type="number"
                  value={additionalQty}
                  onChange={(e) => setAdditionalQty(e.target.value)}
                  required
                  placeholder="20"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all mt-2"
              >
                Confirm Restock
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
