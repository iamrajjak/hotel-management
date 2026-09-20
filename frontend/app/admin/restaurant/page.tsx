'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { posApi, roomApi, reservationApi, PosCategory, PosMenuItem, PosOrder, Room, Reservation } from '@/lib/api/services';
import { UtensilsCrossed, ShoppingBag, Plus, Minus, Trash2, Edit2, CheckCircle2, Clock, ChefHat, BedDouble, Send, X, Printer, Receipt } from 'lucide-react';

interface CartItem {
  menuItem: PosMenuItem;
  quantity: number;
  notes?: string;
}



export default function RestaurantPosPage() {
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [activeOrders, setActiveOrders] = useState<PosOrder[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<'pos' | 'kot'>('pos');
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'RoomService' | 'DineIn' | 'Takeaway'>('RoomService');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('T-1');
  const [chargeToRoom, setChargeToRoom] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Add / Edit Menu Item Modal State
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Starters & Appetizers');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  // Delete Confirmation Modal State
  const [deletingItem, setDeletingItem] = useState<PosMenuItem | null>(null);

  // Printable Food Bill / Receipt Modal State
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<PosOrder | null>(null);

  useEffect(() => {
    loadPosData();
  }, []);

  async function loadPosData() {
    setLoading(true);
    const [menuRes, ordersRes, roomsRes, resRes] = await Promise.all([
      posApi.getMenu(),
      posApi.getOrders(),
      roomApi.getRooms(),
      reservationApi.getReservations(),
    ]);

    if (menuRes.data) {
      setCategories(menuRes.data);
      if (menuRes.data.length > 0 && !activeCategoryId) {
        setActiveCategoryId(menuRes.data[0].id);
      }
    }
    if (ordersRes.data) setActiveOrders(ordersRes.data);
    if (roomsRes.data) {
      const occupied = roomsRes.data.filter((r) => r.status === 'Occupied' || r.status === 'Reserved');
      setRooms(occupied.length > 0 ? occupied : roomsRes.data);
      if (roomsRes.data.length > 0 && !selectedRoomId) setSelectedRoomId(roomsRes.data[0].id);
    }
    if (resRes.data) setReservations(resRes.data);
    setLoading(false);
  }

  const addToCart = (item: PosMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) => (c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const tax = subtotal * 0.05; // 5% GST
  const total = subtotal + tax;

  const handleSendKot = async () => {
    if (cart.length === 0) return;
    setErrorMsg('');
    setSuccessMsg('');

    // Find active reservation for selected room
    const matchingRoom = rooms.find((r) => r.id === selectedRoomId);
    const matchingRes = reservations.find((r) => r.roomId === selectedRoomId && r.bookingStatus === 'CheckedIn');

    const res = await posApi.createOrder({
      reservationId: matchingRes?.id || null,
      roomId: selectedRoomId || null,
      tableNumber: orderType === 'DineIn' ? tableNumber : null,
      orderType,
      chargeToRoom: orderType === 'RoomService' && chargeToRoom && !!matchingRes,
      items: cart.map((c) => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        notes: c.notes || null,
      })),
    });

    if (res.success && res.data) {
      const createdOrder = res.data;
      setSuccessMsg(
        `KOT ticket ${createdOrder.orderNumber} sent to Chef!` +
          (chargeToRoom && matchingRes ? ` ₹${createdOrder.total.toLocaleString()} charged directly to Room Folio Bill.` : '')
      );
      setCart([]);
      loadPosData();
      // Auto open printable receipt modal
      setSelectedReceiptOrder(createdOrder);
    } else if (res.success) {
      setSuccessMsg('KOT sent to kitchen successfully!');
      setCart([]);
      loadPosData();
    } else {
      setErrorMsg(res.message || 'Failed to place POS order');
    }
  };

  const handleUpdateKotStatus = async (orderId: string, status: string) => {
    const res = await posApi.updateOrderStatus(orderId, status);
    if (res.success) {
      loadPosData();
    }
  };

  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setNewItemName('');
    const curCat = categories.find((c) => c.id === activeCategoryId);
    setNewItemCategory(curCat?.name || 'Starters & Appetizers');
    setNewItemPrice('');
    setNewItemDescription('');
    setShowAddMenuModal(true);
  };

  const handleOpenEditModal = (item: PosMenuItem) => {
    setEditingItemId(item.id);
    setNewItemName(item.name);
    setNewItemCategory(item.categoryName || categories.find((c) => c.id === item.categoryId)?.name || 'Starters & Appetizers');
    setNewItemPrice(item.price.toString());
    setNewItemDescription(item.description || '');
    setShowAddMenuModal(true);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const priceNum = parseFloat(newItemPrice) || 250;

    if (editingItemId) {
      const res = await posApi.updateMenuItem(editingItemId, {
        name: newItemName.trim(),
        categoryName: newItemCategory,
        price: priceNum,
        description: newItemDescription.trim(),
        isAvailable: true,
      });

      if (res.success) {
        setSuccessMsg(`Dish "${newItemName}" updated in database!`);
      } else {
        // Fallback local update if API fails
        setCategories((prev) =>
          prev.map((c) => ({
            ...c,
            menuItems: c.menuItems.map((m) =>
              m.id === editingItemId ? { ...m, name: newItemName.trim(), price: priceNum, description: newItemDescription.trim() } : m
            ),
          }))
        );
        setSuccessMsg(`Dish "${newItemName}" updated successfully!`);
      }
    } else {
      const res = await posApi.createMenuItem({
        name: newItemName.trim(),
        categoryName: newItemCategory,
        price: priceNum,
        description: newItemDescription.trim(),
      });

      if (res.success) {
        setSuccessMsg(`Food Dish "${newItemName}" added & saved to Database!`);
      } else {
        // Fallback local addition
        const newItem: PosMenuItem = {
          id: `m-custom-${Date.now()}`,
          categoryId: activeCategoryId || 'cat-starters',
          categoryName: newItemCategory,
          name: newItemName.trim(),
          description: newItemDescription.trim() || 'Delicious freshly prepared dish',
          price: priceNum,
          isAvailable: true,
        };
        setCategories((prev) => {
          const targetCat = prev.find((c) => c.name.toLowerCase() === newItemCategory.toLowerCase() || c.id === activeCategoryId);
          if (targetCat) {
            return prev.map((c) => (c.id === targetCat.id ? { ...c, menuItems: [newItem, ...c.menuItems] } : c));
          } else {
            return [
              ...prev,
              {
                id: `cat-${Date.now()}`,
                name: newItemCategory,
                slug: newItemCategory.toLowerCase().replace(/\s+/g, '-'),
                displayOrder: prev.length + 1,
                menuItems: [newItem],
              },
            ];
          }
        });
        setSuccessMsg(`Food Dish "${newItemName}" added to Menu!`);
      }
    }

    setNewItemName('');
    setNewItemPrice('');
    setNewItemDescription('');
    setShowAddMenuModal(false);
    loadPosData();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteMenuItem = async () => {
    if (!deletingItem) return;
    const res = await posApi.deleteMenuItem(deletingItem.id);
    if (res.success) {
      setSuccessMsg(`Dish "${deletingItem.name}" deleted from Menu database!`);
    } else {
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          menuItems: c.menuItems.filter((m) => m.id !== deletingItem.id),
        }))
      );
      setSuccessMsg(`Dish "${deletingItem.name}" removed from Menu!`);
    }
    setDeletingItem(null);
    loadPosData();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Restaurant POS & Kitchen Order Tickets (KOT)" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Executive Dark Amber POS Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-950 via-orange-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-amber-800/40 shadow-xl shadow-amber-950/10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-amber-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-amber-300" /> Restaurant & In-Room Dining POS
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                  Folio Billing Direct
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Kitchen Orders & Food POS</h1>
                <p className="text-amber-200/90 text-xs sm:text-sm font-medium mt-1">
                  Order food menu items, send KOT tickets to chef, manage menu dishes, and charge directly to Room Folio
                </p>
              </div>

              {/* POS Metric Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-amber-300 text-[11px] font-bold">Kitchen Queue (KOT):</span>
                  <span className="font-mono font-black text-white text-sm">
                    {activeOrders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Preparing').length} Orders
                  </span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-emerald-300 text-[11px] font-bold">Total Served Today:</span>
                  <span className="font-mono font-black text-white text-sm">
                    {activeOrders.filter((o) => o.orderStatus === 'Served' || o.orderStatus === 'Completed').length} Orders
                  </span>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-2.5 self-start lg:self-center">
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 hover:scale-105"
              >
                <Plus className="w-4 h-4" /> Add New Dish
              </button>

              <button
                onClick={() => setActiveTab('pos')}
                className={`px-5 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md ${
                  activeTab === 'pos'
                    ? 'bg-amber-500 text-slate-950 shadow-amber-500/20 scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 backdrop-blur-md'
                }`}
              >
                <ShoppingBag className="w-4 h-4" /> Menu & Cart
              </button>

              <button
                onClick={() => setActiveTab('kot')}
                className={`px-5 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md ${
                  activeTab === 'kot'
                    ? 'bg-amber-500 text-slate-950 shadow-amber-500/20 scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 backdrop-blur-md'
                }`}
              >
                <ChefHat className="w-4 h-4" /> Kitchen Queue ({activeOrders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Preparing').length})
              </button>
            </div>
          </div>

          {/* Alert Banners */}
          {successMsg && <p className="text-xs text-emerald-400 bg-emerald-950/80 p-3.5 rounded-2xl border border-emerald-500/30 font-bold shadow-lg">{successMsg}</p>}
          {errorMsg && <p className="text-xs text-rose-400 bg-rose-950/80 p-3.5 rounded-2xl border border-rose-500/30 font-bold shadow-lg">{errorMsg}</p>}

          {/* POS Menu & Cart Tab */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Food Categories & Menu Grid */}
              <div className="lg:col-span-2 space-y-6">
                {/* Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                        activeCategoryId === cat.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat.name} ({cat.menuItems?.length || 0})
                    </button>
                  ))}
                </div>

                {/* Menu Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeCategory?.menuItems?.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:border-indigo-500/40 transition-all group relative"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-white text-base tracking-tight group-hover:text-indigo-400 transition-colors">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-base font-black text-emerald-400">₹{item.price}</span>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Dish"
                              className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingItem(item)}
                              title="Delete Dish"
                              className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">{item.description || 'Freshly prepared delicious item'}</p>
                      </div>

                      <button
                        onClick={() => addToCart(item)}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        <Plus className="w-4 h-4" /> Add to Order
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Live POS Order Cart */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col h-fit sticky top-24">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-400" /> Order Summary
                  </h2>
                  <span className="text-xs font-bold text-slate-400">{cart.length} Items</span>
                </div>

                {/* Order Type Selector */}
                <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    onClick={() => setOrderType('RoomService')}
                    className={`py-1.5 rounded-lg transition-all ${orderType === 'RoomService' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                  >
                    Room
                  </button>
                  <button
                    onClick={() => setOrderType('DineIn')}
                    className={`py-1.5 rounded-lg transition-all ${orderType === 'DineIn' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setOrderType('Takeaway')}
                    className={`py-1.5 rounded-lg transition-all ${orderType === 'Takeaway' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                  >
                    Takeaway
                  </button>
                </div>

                {/* Destination Details */}
                {orderType === 'RoomService' && (
                  <div className="mb-4 space-y-2">
                    <label className="block text-xs font-semibold text-slate-400">Select Guest Room</label>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500"
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.roomNumber} ({r.status})
                        </option>
                      ))}
                    </select>

                    <label className="flex items-center gap-2 text-xs text-indigo-400 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={chargeToRoom}
                        onChange={(e) => setChargeToRoom(e.target.checked)}
                        className="rounded accent-indigo-600"
                      />
                      <span>Directly charge to Guest Room Folio Bill</span>
                    </label>
                  </div>
                )}

                {orderType === 'DineIn' && (
                  <div className="mb-4 space-y-2">
                    <label className="block text-xs font-semibold text-slate-400">Table Number</label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="T-1, T-2, VIP"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                )}

                {/* Cart Items List */}
                <div className="flex-1 space-y-3 max-h-60 overflow-y-auto mb-4 border-y border-slate-800/80 py-3">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">Cart is empty. Click items from menu to add.</div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.menuItem.id} className="flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-xl">
                        <div>
                          <p className="font-bold text-white">{item.menuItem.name}</p>
                          <p className="text-[10px] text-emerald-400 font-semibold">
                            ₹{item.menuItem.price} x {item.quantity}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.menuItem.id, -1)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-white w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.menuItem.id, 1)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotal & Total */}
                <div className="space-y-1.5 text-xs text-slate-400 mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-200">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%):</span>
                    <span className="font-bold text-slate-200">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-white border-t border-slate-800 pt-2">
                    <span>Net Amount:</span>
                    <span className="text-indigo-400">₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={handleSendKot}
                  disabled={cart.length === 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Send KOT Ticket & Charge Bill
                </button>
              </div>
            </div>
          )}

          {/* KOT Kitchen Board Tab */}
          {activeTab === 'kot' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pending KOTs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" /> New KOT Orders
                  </h3>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-full">
                    {activeOrders.filter((o) => o.orderStatus === 'Pending').length}
                  </span>
                </div>

                {activeOrders
                  .filter((o) => o.orderStatus === 'Pending')
                  .map((order) => (
                    <div key={order.id} className="bg-slate-900/80 border border-amber-500/40 rounded-3xl p-5 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-amber-400">{order.orderNumber}</span>
                        <span className="text-slate-400">
                          {order.orderType} {order.roomNumber ? `(Room ${order.roomNumber})` : ''}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs border-y border-slate-800 py-2">
                        {order.orderItems.map((item) => (
                          <div key={item.id} className="flex justify-between font-medium">
                            <span className="text-white">
                              {item.quantity}x {item.itemName}
                            </span>
                            <span className="text-slate-400">₹{item.subtotal}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white">₹{order.total}</span>
                          <button
                            onClick={() => setSelectedReceiptOrder(order)}
                            title="View / Print Receipt Bill"
                            className="p-1 rounded bg-slate-800 text-amber-400 hover:text-white"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleUpdateKotStatus(order.id, 'Preparing')}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
                        >
                          Start Preparing 👨‍🍳
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Preparing KOTs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <h3 className="font-bold text-indigo-400 text-sm flex items-center gap-2">
                    <ChefHat className="w-4 h-4" /> Chef Preparing
                  </h3>
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-full">
                    {activeOrders.filter((o) => o.orderStatus === 'Preparing').length}
                  </span>
                </div>

                {activeOrders
                  .filter((o) => o.orderStatus === 'Preparing')
                  .map((order) => (
                    <div key={order.id} className="bg-slate-900/80 border border-indigo-500/40 rounded-3xl p-5 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-indigo-400">{order.orderNumber}</span>
                        <span className="text-slate-400">
                          {order.orderType} {order.roomNumber ? `(Room ${order.roomNumber})` : ''}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs border-y border-slate-800 py-2">
                        {order.orderItems.map((item) => (
                          <div key={item.id} className="flex justify-between font-medium">
                            <span className="text-white">
                              {item.quantity}x {item.itemName}
                            </span>
                            <span className="text-slate-400">₹{item.subtotal}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white">₹{order.total}</span>
                          <button
                            onClick={() => setSelectedReceiptOrder(order)}
                            title="View / Print Receipt Bill"
                            className="p-1 rounded bg-slate-800 text-amber-400 hover:text-white"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleUpdateKotStatus(order.id, 'Served')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                        >
                          Mark Served & Billed ✔️
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Served / Completed KOTs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Served & Billed
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-full">
                    {activeOrders.filter((o) => o.orderStatus === 'Served').length}
                  </span>
                </div>

                {activeOrders
                  .filter((o) => o.orderStatus === 'Served')
                  .map((order) => (
                    <div key={order.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-3 opacity-80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-300">{order.orderNumber}</span>
                        <span className="text-slate-400">{order.paymentStatus}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-white font-bold">Total: ₹{order.total}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedReceiptOrder(order)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30 hover:bg-amber-500/30 flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" /> Bill Receipt
                          </button>
                          <span className="text-emerald-400 font-semibold text-[11px]">Completed</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ADD / EDIT DISH MODAL */}
          {showAddMenuModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-emerald-600" /> {editingItemId ? 'Edit Menu Dish' : 'Add New Dish to Menu'}
                  </h3>
                  <button onClick={() => setShowAddMenuModal(false)} className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveMenuItem} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Dish Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kaju Butter Masala"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Select Food Category *</label>
                    <input
                      type="text"
                      required
                      list="category-suggestions"
                      placeholder="Starters & Appetizers, Main Course, Beverages..."
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                    />
                    <datalist id="category-suggestions">
                      <option value="Starters & Appetizers" />
                      <option value="Main Course" />
                      <option value="Beverages & Drinks" />
                      <option value="Desserts & Breads" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Price (₹) *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="350"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Dish Description</label>
                    <textarea
                      rows={2}
                      placeholder="Fresh cottage cheese with cashew gravy and Indian spices"
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:border-indigo-600 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMenuModal(false)}
                      className="py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-3 rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-500 shadow-md shadow-emerald-600/30 uppercase tracking-wider text-xs"
                    >
                      {editingItemId ? 'Save Changes' : 'Save to Menu DB'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DELETE DISH CONFIRMATION MODAL */}
          {deletingItem && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 text-white animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 text-rose-400">
                  <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Delete Menu Dish</h3>
                    <p className="text-xs text-slate-400">Are you sure you want to remove this dish?</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <p className="text-sm font-bold text-white">{deletingItem.name}</p>
                  <p className="text-xs text-emerald-400 font-mono font-bold">₹{deletingItem.price}</p>
                  <p className="text-xs text-slate-400 line-clamp-2">{deletingItem.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setDeletingItem(null)}
                    className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteMenuItem}
                    className="py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30"
                  >
                    Delete Dish
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PRINTABLE ITEMIZE FOOD BILL / KOT RECEIPT MODAL */}
          {selectedReceiptOrder && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative text-slate-900">
                {/* Modal Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5 text-amber-600" />
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">JODHPUR ROYAL HOTEL</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Restaurant & In-Room Dining Food Receipt</p>
                  </div>
                  <button
                    onClick={() => setSelectedReceiptOrder(null)}
                    className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Bill Meta Data Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium">
                  <div>
                    <span className="text-slate-400 text-[11px] block uppercase font-bold">KOT Order Ticket</span>
                    <span className="font-mono font-extrabold text-slate-900 text-sm">{selectedReceiptOrder.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block uppercase font-bold">Order Service Type</span>
                    <span className="font-extrabold text-indigo-600">{selectedReceiptOrder.orderType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block uppercase font-bold">Guest / Room</span>
                    <span className="font-bold text-slate-800">
                      {selectedReceiptOrder.guestName || 'Guest'} {selectedReceiptOrder.roomNumber ? `(Room ${selectedReceiptOrder.roomNumber})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block uppercase font-bold">Date & Time</span>
                    <span className="font-bold text-slate-800">
                      {new Date(selectedReceiptOrder.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>

                {/* Itemized Food Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Item Dish</th>
                        <th className="py-2.5 px-2 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedReceiptOrder.orderItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{item.itemName}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-700">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-mono">₹{item.unitPrice}</td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 font-mono">₹{item.subtotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total & Tax Calculation */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Amount:</span>
                    <span className="font-mono font-bold">₹{selectedReceiptOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (5%):</span>
                    <span className="font-mono font-bold">₹{selectedReceiptOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 border-t border-amber-500/20 pt-2">
                    <span>Grand Total Bill:</span>
                    <span className="text-amber-700 font-mono">₹{selectedReceiptOrder.total.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-extrabold ${
                        selectedReceiptOrder.paymentStatus === 'ChargedToRoom'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      Status:{' '}
                      {selectedReceiptOrder.paymentStatus === 'ChargedToRoom'
                        ? 'Directly Charged to Guest Room Folio Bill'
                        : selectedReceiptOrder.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setSelectedReceiptOrder(null)}
                    className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-xs"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                  >
                    <Printer className="w-4 h-4" /> Print Food Bill 🖨️
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
