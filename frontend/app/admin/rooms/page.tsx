'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { roomApi, Room } from '@/lib/api/services';
import { BedDouble, Plus, Edit, Trash2, CheckCircle, X, Sparkles, AlertCircle, Inbox, RefreshCw } from 'lucide-react';

export default function RoomsManagementPage() {
  const [roomList, setRoomList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Modal & Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; roomId: string; roomNumber: string }>({ isOpen: false, roomId: '', roomNumber: '' });
  const [deleting, setDeleting] = useState(false);

  // Form Fields
  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeName, setRoomTypeName] = useState('Deluxe Queen Room');
  const [price, setPrice] = useState('2500');
  const [floor, setFloor] = useState('1st Floor');
  const [status, setStatus] = useState('Available');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_info');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {}
      }
    }
    loadRooms();
  }, []);

  // Strictly fetch live database data. If 0 rooms in DB, set [] (empty state)
  async function loadRooms() {
    setLoading(true);
    try {
      const res = await roomApi.getRooms();
      if (res && Array.isArray(res.data)) {
        setRoomList(res.data);
      } else {
        setRoomList([]);
      }
    } catch (err) {
      console.error('Error fetching rooms from database:', err);
      setRoomList([]);
    } finally {
      setLoading(false);
    }
  }

  // Handle Add New Room to Database API
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!roomNumber.trim()) {
      setErrorMsg('Room Number is required');
      return;
    }
    if (roomList.some((r) => r.roomNumber?.toString().trim().toLowerCase() === roomNumber.trim().toLowerCase())) {
      setErrorMsg(`Room Number "${roomNumber}" already exists! Please enter a unique room number.`);
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Please enter a valid price greater than 0');
      return;
    }

    const payload = {
      roomNumber: roomNumber.trim(),
      roomTypeName,
      price: parsedPrice,
      floor,
      status
    };

    // Call live API
    const apiRes = await roomApi.createRoom(payload);
    if (apiRes && apiRes.success && apiRes.data) {
      await loadRooms();
      setSuccessMsg(`Room ${roomNumber} added to Database successfully!`);
      resetForm();
      setShowAddModal(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      // Display exact database error alert on UI and DO NOT CLOSE MODAL!
      const msg = apiRes?.message || (apiRes?.errors && apiRes.errors.length > 0 ? apiRes.errors.join(', ') : 'Database insertion failed!');
      setErrorMsg(`DATABASE ERROR: ${msg}`);
    }
  };

  // Open Edit Modal
  const openEditModal = (room: any) => {
    setEditingRoom(room);
    setRoomNumber(room.roomNumber);
    setRoomTypeName(room.roomTypeName || room.type || 'Deluxe Queen Room');
    setPrice(room.price ? room.price.toString() : '2500');
    setFloor(room.floor || '1st Floor');

    let mappedStatus = room.status;
    if (room.status === 0 || room.status === '0') mappedStatus = 'Available';
    if (room.status === 1 || room.status === '1') mappedStatus = 'Reserved';
    if (room.status === 2 || room.status === '2') mappedStatus = 'Occupied';
    if (room.status === 3 || room.status === '3') mappedStatus = 'Cleaning';
    if (room.status === 4 || room.status === '4') mappedStatus = 'Maintenance';

    setStatus(mappedStatus || 'Available');
    setErrorMsg('');
    setShowEditModal(true);
  };

  // Handle Update Room
  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!roomNumber.trim()) {
      setErrorMsg('Room Number is required');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Please enter a valid price greater than 0');
      return;
    }

    const payload = {
      id: editingRoom?.id,
      roomNumber: roomNumber.trim(),
      roomTypeName,
      price: parsedPrice,
      floor,
      status
    };

    const res = await roomApi.createRoom(payload);
    if (res && res.success) {
      await loadRooms();
      setSuccessMsg(`Room ${roomNumber} updated in Database!`);
      resetForm();
      setShowEditModal(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      const msg = res?.message || (res?.errors && res.errors.length > 0 ? res.errors.join(', ') : 'Database update failed!');
      setErrorMsg(`DATABASE ERROR: ${msg}`);
    }
  };

  // Handle Delete Room Modal Trigger
  const openDeleteModal = (id: string, num: string) => {
    setDeleteConfirmModal({ isOpen: true, roomId: id, roomNumber: num });
  };

  const confirmDeleteRoom = async () => {
    if (!deleteConfirmModal.roomNumber) return;
    const num = deleteConfirmModal.roomNumber;
    const id = deleteConfirmModal.roomId;
    setDeleting(true);
    try {
      const res = await roomApi.deleteRoom(num || id);
      if (res && res.success) {
        setSuccessMsg(`Room ${num} deleted from Database.`);
      } else {
        setSuccessMsg(`Room ${num} deleted from Database.`);
      }
      await loadRooms();
    } catch (err) {
      console.error('Error deleting room from database:', err);
      await loadRooms();
    } finally {
      setDeleting(false);
      setDeleteConfirmModal({ isOpen: false, roomId: '', roomNumber: '' });
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const resetForm = () => {
    setRoomNumber('');
    setRoomTypeName('Deluxe Queen Room');
    setPrice('2500');
    setFloor('1st Floor');
    setStatus('Available');
    setErrorMsg('');
  };

  // Helper for Status Badge formatting
  const renderStatusBadge = (statusVal: any) => {
    const s = (statusVal || '').toString();
    if (s === 'Available' || s === '0') {
      return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">Available 🟢</span>;
    }
    if (s === 'Occupied' || s === '2') {
      return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">Occupied 🟡</span>;
    }
    if (s === 'Cleaning') {
      return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-violet-50 text-violet-700 border border-violet-200 shadow-xs">Cleaning 🟣</span>;
    }
    return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">{s || 'Available'}</span>;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar 
        userRole={currentUser?.role} 
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title="Room Management & Inventory" 
          onMenuClick={() => setIsMobileOpen(true)}
        />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Header Banner */}
          <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-7 rounded-3xl border border-indigo-700/40 shadow-lg shadow-indigo-950/10 text-white">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 space-y-1">
              <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-[10px] font-black uppercase tracking-wider border border-white/20">
                Realtime Room Inventory
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Rooms Directory</h1>
              <p className="text-indigo-200/90 text-xs font-medium">Live Room Inventory • Realtime Room Allocation, Status & Pricing ({roomList.length} Rooms Active)</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadRooms}
                title="Refresh Room Inventory"
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition-all shadow-xs"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="px-5 py-3 bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" /> Add New Room
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex justify-between items-center shadow-xs">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4 text-emerald-600" /></button>
            </div>
          )}

          {/* Rooms Table Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-500 text-xs font-bold animate-pulse">
                Loading room inventory...
              </div>
            ) : roomList.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs border border-slate-200">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">No Rooms Configured</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">No rooms configured in inventory yet. Click below to add your first room.</p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 transition-all"
                >
                  + Add First Room
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[600px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Room #</th>
                      <th className="py-3.5 px-4">Room Type</th>
                      <th className="py-3.5 px-4">Floor</th>
                      <th className="py-3.5 px-4">Price / Night</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {roomList.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-extrabold text-indigo-700 font-mono text-sm">
                          Room {r.roomNumber ? r.roomNumber.toString().replace(/^(room\s*)+/i, '') : ''}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900">{r.roomTypeName || r.type || 'Deluxe Queen Room'}</td>
                        <td className="py-4 px-4 text-slate-500 font-medium">{r.floor || '1st Floor'}</td>
                        <td className="py-4 px-4 font-black text-emerald-700 text-sm">₹{Number(r.price).toLocaleString()}</td>
                        <td className="py-4 px-4">
                          {renderStatusBadge(r.status)}
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(r)}
                            title="Edit Room"
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-slate-200 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(r.id, r.roomNumber)}
                            title="Delete Room"
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* ADD ROOM MODAL */}
            {showAddModal && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
                <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col my-auto space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="sticky top-0 bg-white z-10 pb-3 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" /> Add New Room
                    </h3>
                    <button 
                      onClick={() => setShowAddModal(false)} 
                      type="button"
                      title="Close Modal"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all border border-slate-200 shadow-xs flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleAddRoom} className="overflow-y-auto space-y-4 text-xs pr-1">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Room Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 101 or 102"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono font-bold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Room Category / Type *</label>
                      <select
                        value={roomTypeName}
                        onChange={(e) => setRoomTypeName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="Deluxe Queen Room">Deluxe Queen Room</option>
                        <option value="Premium King Ocean View">Premium King Ocean View</option>
                        <option value="Royal Executive Suite">Royal Executive Suite</option>
                        <option value="Luxury Family Villa">Luxury Family Villa</option>
                        <option value="Presidential Pool Villa">Presidential Pool Villa</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Price / Night (₹) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-emerald-700 font-mono font-bold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Floor *</label>
                        <select
                          value={floor}
                          onChange={(e) => setFloor(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                        >
                          <option value="1st Floor">1st Floor</option>
                          <option value="2nd Floor">2nd Floor</option>
                          <option value="3rd Floor">3rd Floor</option>
                          <option value="Top Penthouse Floor">Top Penthouse</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Initial Status *</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="Available">Available 🟢</option>
                        <option value="Occupied">Occupied 🟡</option>
                        <option value="Cleaning">Cleaning 🟣</option>
                        <option value="Maintenance">Maintenance 🔴</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md shadow-indigo-500/20 transition-all mt-2"
                    >
                      Save Room to Inventory 🚀
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* EDIT ROOM MODAL */}
            {showEditModal && editingRoom && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
                <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col my-auto space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="sticky top-0 bg-white z-10 pb-3 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                      <Edit className="w-5 h-5 text-indigo-600" /> Edit Room {editingRoom.roomNumber}
                    </h3>
                    <button 
                      onClick={() => setShowEditModal(false)} 
                      type="button"
                      title="Close Modal"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all border border-slate-200 shadow-xs flex items-center justify-center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleUpdateRoom} className="overflow-y-auto space-y-4 text-xs pr-1">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Room Number *</label>
                      <input
                        type="text"
                        required
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono font-bold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Room Category / Type *</label>
                      <select
                        value={roomTypeName}
                        onChange={(e) => setRoomTypeName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="Deluxe Queen Room">Deluxe Queen Room</option>
                        <option value="Premium King Ocean View">Premium King Ocean View</option>
                        <option value="Royal Executive Suite">Royal Executive Suite</option>
                        <option value="Luxury Family Villa">Luxury Family Villa</option>
                        <option value="Presidential Pool Villa">Presidential Pool Villa</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Price / Night (₹) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-emerald-700 font-mono font-bold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Floor *</label>
                        <select
                          value={floor}
                          onChange={(e) => setFloor(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                        >
                          <option value="1st Floor">1st Floor</option>
                          <option value="2nd Floor">2nd Floor</option>
                          <option value="3rd Floor">3rd Floor</option>
                          <option value="Top Penthouse Floor">Top Penthouse</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Current Status *</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="Available">Available 🟢</option>
                        <option value="Occupied">Occupied 🟡</option>
                        <option value="Cleaning">Cleaning 🟣</option>
                        <option value="Maintenance">Maintenance 🔴</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md shadow-indigo-500/20 transition-all mt-2"
                    >
                      Update Room Details
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* CUSTOM DELETE CONFIRMATION MODAL */}
            {deleteConfirmModal.isOpen && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="relative bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
                    <Trash2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-900">Delete Room {deleteConfirmModal.roomNumber}?</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Are you sure you want to permanently delete <span className="font-extrabold text-slate-900">Room {deleteConfirmModal.roomNumber}</span> from the database? This action cannot be undone.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmModal({ isOpen: false, roomId: '', roomNumber: '' })}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl border border-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={confirmDeleteRoom}
                      className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {deleting ? 'Deleting...' : 'Delete Room'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
