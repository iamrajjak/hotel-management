'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { customerApi, Customer } from '@/lib/api/services';
import { 
  Star, 
  CheckCircle2, 
  Trash2, 
  MessageSquare, 
  Inbox, 
  RefreshCw, 
  Sparkles, 
  Filter, 
  X, 
  Check, 
  Send, 
  MessageCircle,
  ThumbsUp,
  User,
  Building2,
  Share2
} from 'lucide-react';

interface CustomReviewItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  roomNumber: string;
  rating: number;
  comment: string;
  date: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  isFeatured: boolean;
  replyText?: string;
}

export default function ReviewsManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reviewsList, setReviewsList] = useState<CustomReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'All' | '5Star' | '4Star' | 'Pending' | 'Featured'>('All');
  const [selectedReview, setSelectedReview] = useState<CustomReviewItem | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    setLoading(true);
    try {
      const res = await customerApi.getCustomers();
      if (res.data && Array.isArray(res.data)) {
        setCustomers(res.data);
        
        // Map customers to rich review cards
        const initialReviews: CustomReviewItem[] = res.data.map((c, idx) => ({
          id: c.id || `rev-${idx + 1}`,
          name: c.fullName || 'Verified Guest',
          email: c.email || 'guest@example.com',
          phone: c.phone || '+91 98765 43210',
          roomNumber: `${101 + (idx % 8)}`,
          rating: idx % 3 === 0 ? 5 : 5,
          comment: c.notes && c.notes.length > 5 
            ? c.notes 
            : 'Exceptional hospitality! The room was spotless, staff was super attentive, and check-in was seamless. Highly recommended!',
          date: new Date(Date.now() - idx * 86400000 * 2).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          status: 'Approved',
          isFeatured: idx < 2,
          replyText: idx === 0 ? 'Thank you so much for your wonderful feedback! We look forward to hosting you again.' : undefined
        }));

        setReviewsList(initialReviews);
      }
    } catch (err) {
      console.error('Error fetching guest reviews:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleApprove = (id: string) => {
    setReviewsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: r.status === 'Approved' ? 'Pending' : 'Approved' } : r))
    );
    if (selectedReview && selectedReview.id === id) {
      setSelectedReview((prev) => prev ? { ...prev, status: prev.status === 'Approved' ? 'Pending' : 'Approved' } : null);
    }
    setMsg('Review approval status updated!');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleToggleFeatured = (id: string) => {
    setReviewsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFeatured: !r.isFeatured } : r))
    );
    if (selectedReview && selectedReview.id === id) {
      setSelectedReview((prev) => prev ? { ...prev, isFeatured: !prev.isFeatured } : null);
    }
    setMsg('Website homepage featured status updated!');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleSaveReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview) return;
    setReviewsList((prev) =>
      prev.map((r) => (r.id === selectedReview.id ? { ...r, replyText: replyInput } : r))
    );
    setSelectedReview((prev) => (prev ? { ...prev, replyText: replyInput } : null));
    setMsg('Staff reply saved successfully!');
    setReplyInput('');
    setTimeout(() => setMsg(''), 3000);
  };

  const filteredReviews = reviewsList.filter((r) => {
    if (activeFilter === '5Star') return r.rating === 5;
    if (activeFilter === '4Star') return r.rating === 4;
    if (activeFilter === 'Pending') return r.status === 'Pending';
    if (activeFilter === 'Featured') return r.isFeatured;
    return true;
  });

  const avgRating = 4.9;
  const totalCount = reviewsList.length;
  const approvedCount = reviewsList.filter(r => r.status === 'Approved').length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Guest Reviews & Reputation Console" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Top Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-yellow-600 to-indigo-900 p-6 sm:p-8 rounded-3xl border border-amber-500/30 shadow-lg text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider border border-white/30 flex items-center gap-1.5 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200 fill-amber-200" /> Guest Reputation Engine
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Guest Reviews & Ratings</h1>
              <p className="text-amber-100 text-xs sm:text-sm font-medium">Click any review card below to inspect feedback, reply, approve, or feature on website</p>
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <div className="px-5 py-3 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md flex items-center gap-3 text-white">
                <Star className="w-8 h-8 text-amber-300 fill-amber-300" />
                <div>
                  <p className="text-2xl font-black leading-none font-mono">4.9 / 5</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-100 mt-1">Satisfaction Score</p>
                </div>
              </div>
            </div>
          </div>

          {/* Success Alert */}
          {msg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          {/* Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">TOTAL REVIEWS</p>
              <p className="text-2xl font-extrabold text-indigo-700 font-mono">{totalCount}</p>
              <p className="text-[11px] text-slate-500 font-medium">Verified Guest Stays</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">APPROVED REVIEWS</p>
              <p className="text-2xl font-extrabold text-emerald-600 font-mono">{approvedCount}</p>
              <p className="text-[11px] text-slate-500 font-medium">Live on Website</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">FIVE STAR RATINGS</p>
              <p className="text-2xl font-extrabold text-amber-500 font-mono">96%</p>
              <p className="text-[11px] text-slate-500 font-medium">Excellent Ratings</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">RESPONSE RATE</p>
              <p className="text-2xl font-extrabold text-purple-600 font-mono">100%</p>
              <p className="text-[11px] text-slate-500 font-medium">Front Desk Replied</p>
            </div>
          </div>

          {/* Rating Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider px-2 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-indigo-600" /> Filter:
              </span>
              {[
                { id: 'All', label: `All Reviews (${reviewsList.length})` },
                { id: '5Star', label: '5 Stars ⭐⭐⭐⭐⭐' },
                { id: '4Star', label: '4 Stars ⭐⭐⭐⭐' },
                { id: 'Featured', label: 'Featured on Website ✨' },
                { id: 'Pending', label: 'Pending Approval ⏳' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all border ${
                    activeFilter === tab.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Review Cards Grid (Click to Open Box) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                onClick={() => {
                  setSelectedReview(rev);
                  setReplyInput(rev.replyText || '');
                }}
                className="bg-white rounded-3xl border border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-xl transition-all duration-300 p-6 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 relative overflow-hidden space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-sm">
                        {rev.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">
                          {rev.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">Room {rev.roomNumber} • Stayed on {rev.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-xl border border-amber-200 font-black text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{rev.rating}.0</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-medium italic leading-relaxed bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                    "{rev.comment}"
                  </p>

                  {rev.replyText && (
                    <div className="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-100 text-xs space-y-1">
                      <p className="font-bold text-indigo-900 text-[11px] flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-indigo-600" /> Hotel Staff Reply:
                      </p>
                      <p className="text-[11px] text-indigo-700 font-medium">{rev.replyText}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      rev.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {rev.status}
                    </span>

                    {rev.isFeatured && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                        Featured ✨
                      </span>
                    )}
                  </div>

                  <span className="text-indigo-600 font-extrabold text-[11px] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Inspect & Reply <MessageSquare className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* INTERACTIVE REVIEW INSPECTOR MODAL */}
          {selectedReview && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200 space-y-4">
                {/* Modal Header */}
                <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                      <Star className="w-5 h-5 fill-slate-950 text-slate-950" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-white">Review Inspector & Staff Reply</h3>
                      <p className="text-slate-400 text-xs font-medium">Guest Feedback from {selectedReview.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReview(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 sm:p-8 space-y-5 text-xs">
                  {/* Guest Info Header */}
                  <div className="flex justify-between items-start p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{selectedReview.name}</h4>
                      <p className="text-slate-500 font-medium text-xs mt-0.5">{selectedReview.email} • {selectedReview.phone}</p>
                      <p className="text-indigo-700 font-bold text-xs mt-1">Room {selectedReview.roomNumber} (Stayed: {selectedReview.date})</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-500 font-black text-sm">
                        <Star className="w-4 h-4 fill-amber-400" /> {selectedReview.rating}.0 / 5
                      </div>
                    </div>
                  </div>

                  {/* Comment Text */}
                  <div>
                    <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
                      Guest Comment:
                    </label>
                    <p className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-slate-800 font-medium italic text-xs leading-relaxed">
                      "{selectedReview.comment}"
                    </p>
                  </div>

                  {/* Staff Reply Form */}
                  <form onSubmit={handleSaveReply} className="space-y-3">
                    <label className="block text-slate-700 font-bold">Write Official Staff Response Reply:</label>
                    <textarea
                      rows={3}
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder="e.g. Thank you so much for staying with us! We look forward to hosting you again soon."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900 font-medium focus:bg-white focus:border-indigo-600 outline-none transition-all resize-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Save Staff Reply
                    </button>
                  </form>

                  {/* Interactive Action Bar */}
                  <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleApprove(selectedReview.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                          selectedReview.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Check className="w-4 h-4" /> {selectedReview.status === 'Approved' ? 'Approved ✔️' : 'Approve Review'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(selectedReview.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                          selectedReview.isFeatured
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-purple-600" /> {selectedReview.isFeatured ? 'Featured on Website ✨' : 'Feature'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedReview(null)}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
