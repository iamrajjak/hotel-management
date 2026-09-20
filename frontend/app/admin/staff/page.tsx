'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { staffApi } from '@/lib/api/services';
import { 
  Users, 
  UserPlus, 
  CalendarCheck, 
  Clock, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search, 
  Shield, 
  Plus, 
  X,
  IndianRupee,
  Briefcase,
  Building,
  Eye
} from 'lucide-react';

interface StaffMember {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  roleTitle?: string;
  role?: string;
  email?: string;
  phoneNumber?: string;
  mobile?: string;
  joiningDate?: string;
  monthlySalary?: number;
  salary?: number;
  status: string;
}

interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  roleTitle?: string;
  staffDepartment?: string;
  attendanceDate?: string;
  date?: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
}

export default function StaffPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'attendance' | 'monthly'>('members');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [monthlySummaryList, setMonthlySummaryList] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);

  // --- STAFF ATTENDANCE DETAIL VIEW MODAL STATE ---
  const [selectedStaffAttendanceView, setSelectedStaffAttendanceView] = useState<any | null>(null);
  const [staffDetailAttendanceLogs, setStaffDetailAttendanceLogs] = useState<any[]>([]);
  const [fetchingStaffLogs, setFetchingStaffLogs] = useState(false);

  const openStaffAttendanceViewModal = async (summaryItem: any) => {
    setSelectedStaffAttendanceView(summaryItem);
    setFetchingStaffLogs(true);
    try {
      const sId = summaryItem.staffId || summaryItem.StaffId || '';
      const res = await staffApi.getAttendance(undefined, sId);
      const logs = Array.isArray(res) ? res : (res?.data || []);
      
      const filteredLogs = logs.filter((att: any) => {
        const targetStaffName = summaryItem.staffName || summaryItem.StaffName || '';
        const matchStaff = att.staffId === sId || (att.staffName && targetStaffName && att.staffName.toLowerCase() === targetStaffName.toLowerCase());
        if (!matchStaff) return false;
        
        const rawDate = att.attendanceDate || att.date;
        if (!rawDate) return true;
        const attDate = new Date(rawDate);
        if (isNaN(attDate.getTime())) return true;
        return (attDate.getMonth() + 1) === filterMonth && attDate.getFullYear() === filterYear;
      });

      setStaffDetailAttendanceLogs(filteredLogs);
    } catch (err) {
      console.error('Error loading staff attendance details:', err);
      setStaffDetailAttendanceLogs([]);
    } finally {
      setFetchingStaffLogs(false);
    }
  };

  // Add Staff Form
  const [fullName, setFullName] = useState('');
  const [roleTitle, setRoleTitle] = useState('Front Desk Executive');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Attendance Form
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('18:00');
  const [attendanceStatus, setAttendanceStatus] = useState('Present');
  const [attendanceNotes, setAttendanceNotes] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_info');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {}
      }
    }
    loadStaffData();
  }, [filterMonth, filterYear]);

  async function loadStaffData() {
    setLoading(true);
    try {
      const [staffRes, attRes, monthlyRes] = await Promise.all([
        staffApi.getStaff(),
        staffApi.getAttendance(),
        staffApi.getMonthlySummary(filterMonth, filterYear),
      ]);

      const staffData = Array.isArray(staffRes) ? staffRes : (staffRes?.data || []);
      const attData = Array.isArray(attRes) ? attRes : (attRes?.data || []);
      const monthlyData = Array.isArray(monthlyRes) ? monthlyRes : (monthlyRes?.data || []);

      if (staffData.length === 0) {
        setStaffList([]);
        setAttendanceList([]);
        setMonthlySummaryList([]);
        setSelectedStaffId('');
      } else {
        setStaffList(staffData);
        setAttendanceList(attData);
        setMonthlySummaryList(monthlyData);

        if (!selectedStaffId || !staffData.some((s: any) => s.id === selectedStaffId)) {
          setSelectedStaffId(staffData[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading staff data:', err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusName(status: any): string {
    if (status === 'Present' || status === 0 || status === '0') return 'Present';
    if (status === 'Absent' || status === 1 || status === '1') return 'Absent';
    if (status === 'HalfDay' || status === 2 || status === '2') return 'HalfDay';
    if (status === 'Leave' || status === 3 || status === '3') return 'Leave';
    return String(status || 'Present');
  }

  const isHotelOwner = currentUser?.role === 'HotelOwner' || currentUser?.role === 'SuperAdmin' || currentUser?.isSuperAdmin;

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full name is required');
      return;
    }

    const cleanMobile = phoneNumber.trim();
    if (!cleanMobile) {
      setErrorMsg('Mobile number is required');
      return;
    }

    if (!/^\d{10}$/.test(cleanMobile)) {
      setErrorMsg('Mobile number must be exactly 10 digits');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Email address is required');
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Staff';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      const res = await staffApi.createStaff({
        firstName,
        lastName,
        mobile: cleanMobile,
        email: cleanEmail,
        role: roleTitle,
        department: 'General',
        joiningDate: joiningDate ? new Date(joiningDate).toISOString() : new Date().toISOString(),
        salary: monthlySalary ? parseFloat(monthlySalary) : 0,
        status: 'Active',
      });

      if (res.success) {
        setSuccessMsg('Staff member registered successfully!');
        setShowAddModal(false);
        setFullName('');
        setEmail('');
        setPhoneNumber('');
        setMonthlySalary('');
        loadStaffData();
      } else {
        setErrorMsg(res.message || (res.errors && res.errors.length > 0 ? res.errors.join(', ') : 'Failed to add staff member'));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error saving staff member');
    }
  };

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedStaffId) {
      setErrorMsg('Please select a staff member');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (attendanceDate < todayStr) {
      setErrorMsg('Attendance cannot be marked for past dates. Only today or future dates are allowed.');
      return;
    }

    try {
      const res = await staffApi.recordAttendance({
        staffId: selectedStaffId,
        attendanceDate: attendanceDate ? `${attendanceDate}T12:00:00` : new Date().toISOString(),
        checkInTime: checkInTime || '09:00',
        checkOutTime: checkOutTime || '18:00',
        status: attendanceStatus,
        notes: attendanceNotes || null,
      });

      if (res.success) {
        setSuccessMsg(`Attendance marked as ${attendanceStatus} successfully!`);
        setAttendanceNotes('');
        loadStaffData();
      } else {
        setErrorMsg(res.message || 'Failed to record attendance');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error');
    }
  };

  const handleQuickStatusChange = async (staffId: string, newStatus: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    const todayStr = new Date().toISOString().split('T')[0];
    if (attendanceDate < todayStr) {
      setErrorMsg('Attendance cannot be marked for past dates. Only today or future dates are allowed.');
      return;
    }

    try {
      const res = await staffApi.recordAttendance({
        staffId,
        attendanceDate: attendanceDate ? `${attendanceDate}T12:00:00` : new Date().toISOString(),
        checkInTime: '09:00',
        checkOutTime: '18:00',
        status: newStatus,
        notes: `Quick updated: ${newStatus}`,
      });
      if (res.success) {
        setSuccessMsg(`Attendance status updated to ${newStatus}!`);
        loadStaffData();
      } else {
        setErrorMsg(res.message || 'Failed to update attendance status');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error updating attendance status');
    }
  };

  const handleDeleteStaff = (staff: StaffMember) => {
    setStaffToDelete(staff);
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    setIsDeletingStaff(true);
    setErrorMsg('');
    try {
      const res = await staffApi.deleteStaff(staffToDelete.id);
      if (res.success) {
        setSuccessMsg(`Staff member '${staffToDelete.fullName || staffToDelete.firstName || 'Employee'}' removed successfully.`);
        setStaffToDelete(null);
        loadStaffData();
      } else {
        setErrorMsg(res.message || 'Failed to remove staff member');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error removing staff member');
    } finally {
      setIsDeletingStaff(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar userRole={currentUser?.role || 'HotelOwner'} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Staff Directory & Attendance Tracking" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Executive Dark Violet Staff Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-violet-950 via-purple-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-violet-800/40 shadow-xl shadow-violet-950/10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-violet-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <Users className="w-3.5 h-3.5 text-violet-300" /> Human Resource & Team Management
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold border border-violet-400/30">
                  {isHotelOwner ? 'Full Owner Access' : 'Staff Manager Operational View'}
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Hotel Staff Directory & Shift Roster</h1>
                <p className="text-violet-200/90 text-xs sm:text-sm font-medium mt-1">Manage staff team profiles, record daily attendance, and oversee hotel shifts</p>
              </div>

              {/* Summary Metric Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-violet-300 text-[11px] font-bold">Total Active Staff:</span>
                  <span className="font-mono font-black text-white text-sm">{staffList.length} Members</span>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
                  <span className="text-emerald-300 text-[11px] font-bold">Today Present:</span>
                  <span className="font-mono font-black text-white text-sm">
                    {attendanceList.filter(a => getStatusName(a.status) === 'Present').length} Present
                  </span>
                </div>
              </div>
            </div>

            {isHotelOwner && (
              <button
                onClick={() => setShowAddModal(true)}
                className="relative z-10 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold text-xs tracking-wide uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-violet-600/30 transition-all hover:scale-105 active:scale-95 self-start lg:self-center"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>

          {/* Feedback Banners */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4 text-emerald-600" /></button>
            </div>
          )}

          {/* Tab Controls */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/80 pb-3">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                activeTab === 'members'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Users className="w-4 h-4 text-violet-400" /> Staff Members Directory ({staffList.length})
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                activeTab === 'attendance'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-emerald-400" /> Daily Attendance Log
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                activeTab === 'monthly'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Building className="w-4 h-4 text-amber-400" /> Monthly Attendance Summary & Statistics
            </button>
          </div>

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="py-4 px-6">Staff Name</th>
                      <th className="py-4 px-6">Role / Position</th>
                      <th className="py-4 px-6">Contact Info</th>
                      <th className="py-4 px-6">Joining Date</th>
                      {isHotelOwner && <th className="py-4 px-6">Monthly Salary</th>}
                      <th className="py-4 px-6">Status</th>
                      {isHotelOwner && <th className="py-4 px-6 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan={isHotelOwner ? 7 : 5} className="text-center py-16 text-slate-400 font-bold animate-pulse">
                          Loading staff list...
                        </td>
                      </tr>
                    ) : staffList.length === 0 ? (
                      <tr>
                        <td colSpan={isHotelOwner ? 7 : 5} className="text-center py-16 text-slate-500">
                          No staff members currently registered.
                        </td>
                      </tr>
                    ) : (
                      staffList.map((staff) => (
                        <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-900 text-sm flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-extrabold flex items-center justify-center border border-violet-200">
                              {(staff.fullName || staff.firstName || 'S').charAt(0)}
                            </div>
                            <span>{staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                              {staff.role || staff.roleTitle || 'Staff'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-600">
                            <p className="font-semibold text-slate-800">{staff.mobile || staff.phoneNumber || '-'}</p>
                            <p className="text-[11px] text-slate-500">{staff.email || '-'}</p>
                          </td>
                          <td className="py-4 px-6 font-mono text-slate-600">{staff.joiningDate ? staff.joiningDate.toString().split('T')[0] : '-'}</td>
                          {isHotelOwner && (
                            <td className="py-4 px-6 font-black text-emerald-600 font-mono text-sm">
                              {staff.salary || staff.monthlySalary ? `₹${(staff.salary || staff.monthlySalary || 0).toLocaleString()}` : '-'}
                            </td>
                          )}
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase">
                              {staff.status || 'Active'}
                            </span>
                          </td>
                          {isHotelOwner && (
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => handleDeleteStaff(staff)}
                                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                                title="Remove Staff Member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Record Attendance Box */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-emerald-600" /> Record Daily Attendance
                </h3>

                <form onSubmit={handleRecordAttendance} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Staff Member *</label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-900"
                    >
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName || `${s.firstName} ${s.lastName}`} ({s.role || 'Staff'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Attendance Date *</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Attendance Status *</label>
                    <select
                      value={attendanceStatus}
                      onChange={(e) => setAttendanceStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-900"
                    >
                      <option value="Present">Present ✔️</option>
                      <option value="Absent">Absent ❌</option>
                      <option value="HalfDay">Half Day ⏳</option>
                      <option value="Leave">On Leave 🏖️</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Check-In Time</label>
                      <input
                        type="text"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        placeholder="09:00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Check-Out Time</label>
                      <input
                        type="text"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        placeholder="18:00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Notes / Shift Details</label>
                    <input
                      type="text"
                      value={attendanceNotes}
                      onChange={(e) => setAttendanceNotes(e.target.value)}
                      placeholder="Morning shift / Late checkin"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-emerald-600/25 transition-all mt-2"
                  >
                    Save Attendance Entry
                  </button>
                </form>
              </div>

              {/* Attendance Log Table */}
              <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Recent Attendance Records</h4>
                  <span className="text-xs text-slate-500 font-mono">{attendanceList.length} Records</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Role / Dept</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Quick Mark Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {attendanceList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                            No attendance records logged for today yet.
                          </td>
                        </tr>
                      ) : (
                        attendanceList.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-mono text-slate-600">{(att.attendanceDate || att.date)?.toString().split('T')[0]}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{att.staffName}</td>
                            <td className="py-3 px-4 text-slate-600">{att.staffDepartment || att.roleTitle || 'General'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                getStatusName(att.status) === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                getStatusName(att.status) === 'Absent' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                getStatusName(att.status) === 'HalfDay' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}>
                                {getStatusName(att.status)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleQuickStatusChange(att.staffId, 'Present')}
                                  title="Mark Present"
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                    getStatusName(att.status) === 'Present' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 border-slate-200'
                                  }`}
                                >
                                  Present ✔️
                                </button>
                                <button
                                  onClick={() => handleQuickStatusChange(att.staffId, 'Absent')}
                                  title="Mark Absent"
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                    getStatusName(att.status) === 'Absent' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-100 text-slate-700 hover:bg-rose-50 border-slate-200'
                                  }`}
                                >
                                  Absent ❌
                                </button>
                                <button
                                  onClick={() => handleQuickStatusChange(att.staffId, 'HalfDay')}
                                  title="Mark Half Day"
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                    getStatusName(att.status) === 'HalfDay' ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-100 text-slate-700 hover:bg-amber-50 border-slate-200'
                                  }`}
                                >
                                  HalfDay ⏳
                                </button>
                                <button
                                  onClick={() => handleQuickStatusChange(att.staffId, 'Leave')}
                                  title="Mark On Leave"
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                    getStatusName(att.status) === 'Leave' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 border-slate-200'
                                  }`}
                                >
                                  Leave 🏖️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Attendance Analytics Tab */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">
              {/* Month & Year Filter Bar */}
              <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-amber-500" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Monthly Attendance Analytics & Roster Report</h3>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <label className="font-bold text-slate-600">Select Month:</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-900"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(parseInt(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-900"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => loadStaffData()}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition-all shadow-xs"
                  >
                    Refresh Report
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <p className="text-[10px] uppercase font-extrabold text-emerald-600 tracking-wider">Total Present Days</p>
                  <p className="text-2xl font-black mt-1">{monthlySummaryList.reduce((acc, item) => acc + (item.presentDays ?? item.PresentDays ?? 0), 0)} Days</p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
                  <p className="text-[10px] uppercase font-extrabold text-rose-600 tracking-wider">Total Absent Days</p>
                  <p className="text-2xl font-black mt-1">{monthlySummaryList.reduce((acc, item) => acc + (item.absentDays ?? item.AbsentDays ?? 0), 0)} Days</p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                  <p className="text-[10px] uppercase font-extrabold text-amber-600 tracking-wider">Total Half Days</p>
                  <p className="text-2xl font-black mt-1">{monthlySummaryList.reduce((acc, item) => acc + (item.halfDays ?? item.HalfDays ?? 0), 0)} Days</p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900">
                  <p className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-wider">Total Leaves Taken</p>
                  <p className="text-2xl font-black mt-1">{monthlySummaryList.reduce((acc, item) => acc + (item.leaveDays ?? item.LeaveDays ?? 0), 0)} Days</p>
                </div>
              </div>

              {/* Monthly Summary Table */}
              <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Staff Monthly Attendance Breakdown</h4>
                  <span className="text-xs text-slate-500 font-mono">{monthlySummaryList.length} Employees Analyzed</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-4 px-6">Employee Name</th>
                        <th className="py-4 px-6">Role & Department</th>
                        <th className="py-4 px-6 text-emerald-700">Present (✔️)</th>
                        <th className="py-4 px-6 text-rose-700">Absent (❌)</th>
                        <th className="py-4 px-6 text-amber-700">Half Day (⏳)</th>
                        <th className="py-4 px-6 text-indigo-700">Leave (🏖️)</th>
                        <th className="py-4 px-6">Attendance Rate %</th>
                        <th className="py-4 px-6 text-right">Date-wise Log</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-slate-400 font-bold animate-pulse">
                            Calculating monthly attendance statistics...
                          </td>
                        </tr>
                      ) : monthlySummaryList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                            No monthly attendance records found for this period.
                          </td>
                        </tr>
                      ) : (
                        monthlySummaryList.map((item, idx) => {
                          const pDays = item.presentDays ?? item.PresentDays ?? 0;
                          const aDays = item.absentDays ?? item.AbsentDays ?? 0;
                          const hDays = item.halfDays ?? item.HalfDays ?? 0;
                          const lDays = item.leaveDays ?? item.LeaveDays ?? 0;
                          const rate = item.attendancePercentage ?? item.AttendancePercentage ?? 0;

                          return (
                            <tr key={item.staffId || idx} className="hover:bg-slate-50/80">
                              <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                                {item.staffName || item.StaffName || 'Employee'}
                              </td>
                              <td className="py-4 px-6 text-slate-600">
                                <p className="font-semibold text-slate-800">{item.role || item.Role || 'Staff'}</p>
                                <p className="text-[11px] text-slate-500">{item.department || item.Department || 'General'}</p>
                              </td>
                              <td className="py-4 px-6 font-mono font-bold text-emerald-700">{pDays} Days</td>
                              <td className="py-4 px-6 font-mono font-bold text-rose-700">{aDays} Days</td>
                              <td className="py-4 px-6 font-mono font-bold text-amber-700">{hDays} Days</td>
                              <td className="py-4 px-6 font-mono font-bold text-indigo-700">{lDays} Days</td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                                    rate >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    rate >= 75 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {rate}% Rate
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => openStaffAttendanceViewModal(item)}
                                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs flex items-center gap-1.5 ml-auto transition-all shadow-xs"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-400" /> View Roster Log
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE STAFF MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-violet-600" /> Add New Staff Member
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 font-bold">{errorMsg}</p>}

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role / Position *</label>
                <select
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-900"
                >
                  <option value="Front Desk Executive">Front Desk Executive / Receptionist</option>
                  <option value="StaffManager">Staff / Property Manager</option>
                  <option value="Housekeeping Staff">Housekeeping Staff</option>
                  <option value="Head Chef">Head Chef / Kitchen Cook</option>
                  <option value="Waiter Server">Waiter / Restaurant Server</option>
                  <option value="Security Guard">Security Guard</option>
                  <option value="Accountant">Accountant / Cashier</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    placeholder="9876543210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@hotel.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    placeholder="e.g. 22000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-emerald-600 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-extrabold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-violet-600/25 transition-all mt-4"
              >
                Register Staff Member
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM GLASSMORPHIC DELETE CONFIRMATION MODAL FOR STAFF */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-rose-100 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-100/80 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-7 h-7 animate-pulse" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Remove Staff Member?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Are you sure you want to remove <strong className="text-slate-800">{staffToDelete.fullName || `${staffToDelete.firstName || ''} ${staffToDelete.lastName || ''}`}</strong> ({staffToDelete.role || staffToDelete.roleTitle || 'Staff'})? This action will remove their profile from the roster.
              </p>
            </div>

            <div className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-2xl text-xs space-y-1 text-left">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Staff Member:</span>
                <span className="font-mono text-slate-900">{staffToDelete.fullName || staffToDelete.firstName || '-'}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-700">
                <span>Role / Position:</span>
                <span className="text-slate-900">{staffToDelete.role || staffToDelete.roleTitle || 'Staff'}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-700">
                <span>Contact Info:</span>
                <span className="text-slate-900">{staffToDelete.mobile || staffToDelete.phoneNumber || '-'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                disabled={isDeletingStaff}
                onClick={() => setStaffToDelete(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingStaff}
                onClick={confirmDeleteStaff}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isDeletingStaff ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Remove Staff</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF DATE-WISE ATTENDANCE ROSTER DETAIL MODAL */}
      {selectedStaffAttendanceView && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
                    Roster Detail View
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][filterMonth - 1]} {filterYear}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedStaffAttendanceView.staffName || selectedStaffAttendanceView.StaffName}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Role: <span className="font-bold text-slate-800">{selectedStaffAttendanceView.role || selectedStaffAttendanceView.Role || 'Staff'}</span> • Department: <span className="font-bold text-slate-800">{selectedStaffAttendanceView.department || selectedStaffAttendanceView.Department || 'General'}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedStaffAttendanceView(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all border border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Chips inside Modal */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <p className="text-[10px] uppercase font-black text-emerald-600">Present</p>
                <p className="text-lg font-black text-emerald-800 mt-0.5">{selectedStaffAttendanceView.presentDays ?? selectedStaffAttendanceView.PresentDays ?? 0} Days</p>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                <p className="text-[10px] uppercase font-black text-rose-600">Absent</p>
                <p className="text-lg font-black text-rose-800 mt-0.5">{selectedStaffAttendanceView.absentDays ?? selectedStaffAttendanceView.AbsentDays ?? 0} Days</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-[10px] uppercase font-black text-amber-600">Half Day</p>
                <p className="text-lg font-black text-amber-800 mt-0.5">{selectedStaffAttendanceView.halfDays ?? selectedStaffAttendanceView.HalfDays ?? 0} Days</p>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                <p className="text-[10px] uppercase font-black text-indigo-600">Leave</p>
                <p className="text-lg font-black text-indigo-800 mt-0.5">{selectedStaffAttendanceView.leaveDays ?? selectedStaffAttendanceView.LeaveDays ?? 0} Days</p>
              </div>
            </div>

            {/* Detailed Date-wise Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Attendance Date</th>
                      <th className="py-3 px-4">Check-In</th>
                      <th className="py-3 px-4">Check-Out</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Shift / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {fetchingStaffLogs ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400 font-bold animate-pulse">
                          Loading date-wise attendance roster...
                        </td>
                      </tr>
                    ) : staffDetailAttendanceLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                          No date-wise attendance records logged for this employee in selected month.
                        </td>
                      </tr>
                    ) : (
                      staffDetailAttendanceLogs.map((log: any, idx: number) => {
                        const statusStr = getStatusName(log.status);
                        return (
                          <tr key={log.id || idx} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                              {log.attendanceDate?.toString().split('T')[0] || log.date}
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-mono">{log.checkInTime || '09:00'}</td>
                            <td className="py-3 px-4 text-slate-700 font-mono">{log.checkOutTime || '18:00'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                statusStr === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                statusStr === 'Absent' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                statusStr === 'HalfDay' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}>
                                {statusStr === 'Present' ? 'Present 🟢' : statusStr === 'Absent' ? 'Absent 🔴' : statusStr === 'HalfDay' ? 'Half Day 🟡' : 'Leave 🔵'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">{log.notes || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStaffAttendanceView(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm hover:bg-slate-800 transition-all"
              >
                Close Detail View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
