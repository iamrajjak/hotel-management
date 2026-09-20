'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { housekeepingApi, roomApi, HousekeepingTask, Room } from '@/lib/api/services';
import { Broom, Plus, CheckCircle, Clock, Sparkles, UserCheck, AlertTriangle, X } from 'lucide-react';

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Task Form
  const [roomId, setRoomId] = useState('');
  const [assignedTo, setAssignedTo] = useState('Staff');
  const [taskType, setTaskType] = useState('RoutineClean');
  const [priority, setPriority] = useState('Medium');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadHousekeepingData();
  }, []);

  async function loadHousekeepingData() {
    setLoading(true);
    const [tasksRes, roomsRes] = await Promise.all([
      housekeepingApi.getTasks(),
      roomApi.getRooms(),
    ]);

    if (tasksRes.data) setTasks(tasksRes.data);
    if (roomsRes.data) {
      setRooms(roomsRes.data);
      if (roomsRes.data.length > 0) setRoomId(roomsRes.data[0].id);
    }
    setLoading(false);
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const res = await housekeepingApi.createTask({
      roomId,
      assignedTo,
      taskType,
      priority,
      notes,
    });

    if (res.success) {
      setShowAddModal(false);
      setSuccessMsg('Housekeeping task created!');
      setNotes('');
      loadHousekeepingData();
    } else {
      setError(res.message || 'Failed to create task');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setSuccessMsg('');
    const res = await housekeepingApi.completeTask(taskId);
    if (res.success) {
      setSuccessMsg(res.message || 'Task completed!');
      loadHousekeepingData();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Housekeeping & Room Hygiene Matrix" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Executive Dark Teal Housekeeping Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-teal-950 via-cyan-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-cyan-800/40 shadow-xl shadow-cyan-950/10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-cyan-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <Broom className="w-3.5 h-3.5 text-cyan-300" /> Housekeeping & Maid Services
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-400/30">
                  Live Hygiene Matrix
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Room Sanitation & Housekeeping</h1>
                <p className="text-cyan-200/90 text-xs sm:text-sm font-medium mt-1">Assign room cleaning tasks, track maid status, and mark rooms clean & ready for guest check-ins</p>
              </div>

              {/* Task Metric Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-cyan-300 text-[11px] font-bold">Active Tasks:</span>
                  <span className="font-mono font-black text-white text-sm">{tasks.filter(t => t.status !== 'Completed').length} Tasks</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-emerald-300 text-[11px] font-bold">Completed Cleaning:</span>
                  <span className="font-mono font-black text-white text-sm">{tasks.filter(t => t.status === 'Completed').length} Tasks</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="relative z-10 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 self-start lg:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Cleaning Task</span>
            </button>
          </div>

          {/* Feedback Banners */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center justify-between">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Housekeeping Tasks Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-bold text-slate-400 border-b border-slate-800 tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Room</th>
                    <th className="py-4 px-6">Assigned Maid / Staff</th>
                    <th className="py-4 px-6">Task Type</th>
                    <th className="py-4 px-6">Priority</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-500">
                        No housekeeping tasks active.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6 font-extrabold text-white">
                          <p className="text-base">Room {task.roomNumber}</p>
                          <p className="text-[11px] text-slate-400 font-normal">{task.roomTypeName}</p>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-200">
                          <span className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-indigo-400" /> {task.assignedTo || 'Unassigned'}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-300">
                          {task.taskType}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            task.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            task.priority === 'High' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            task.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {task.status !== 'Completed' ? (
                            <button
                              onClick={() => handleCompleteTask(task.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 ml-auto shadow-md transition-all"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Mark Clean & Ready
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 justify-end">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Cleaned
                            </span>
                          )}
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

      {/* Assign Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Assign Housekeeping Task</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <p className="mb-4 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</p>}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Target Room *</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} ({r.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Assigned Staff / Maid Name</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="e.g. Sunita Devi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="RoutineClean">Routine Clean</option>
                    <option value="DeepClean">Deep Clean</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Special Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Extra towels needed..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none h-20"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all mt-4"
              >
                Assign Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
