'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, MessageCircle, Copy, Check, Sparkles, UtensilsCrossed } from 'lucide-react';
import { Reservation, posApi, PosCategory } from '@/lib/api/services';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation?: Reservation | null;
  customer?: { fullName?: string; name?: string; phone?: string; email?: string } | null;
  hotelName?: string;
  hotelAddress?: string;
  hotelPhone?: string;
  wifiName?: string;
  wifiPassword?: string;
  reviewUrl?: string;
  websiteUrl?: string;
  defaultTemplate?: 'booking' | 'checkout' | 'welcome' | 'menu';
}

export default function WhatsAppModal({
  isOpen,
  onClose,
  reservation,
  customer,
  hotelName = 'Grand Palace Hotel & Resorts',
  hotelAddress = '123 Luxury Boulevard, City Center',
  hotelPhone = '+91 98765 00001',
  wifiName = 'Hotel_Guest_WiFi',
  wifiPassword = 'Welcome2026',
  reviewUrl = 'https://g.page/r/your-hotel-review',
  websiteUrl = 'https://grandpalace.com',
  defaultTemplate = 'welcome'
}: WhatsAppModalProps) {
  const [templateType, setTemplateType] = useState<'booking' | 'checkout' | 'welcome' | 'menu'>(defaultTemplate);
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [menuCategories, setMenuCategories] = useState<PosCategory[]>([]);

  useEffect(() => {
    if (defaultTemplate) {
      setTemplateType(defaultTemplate);
    }
  }, [defaultTemplate]);

  useEffect(() => {
    if (isOpen) {
      fetchMenu();
    }
  }, [isOpen]);

  async function fetchMenu() {
    try {
      const res = await posApi.getMenu();
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        setMenuCategories(res.data);
      }
    } catch {
      setMenuCategories([]);
    }
  }

  useEffect(() => {
    if (reservation || customer) {
      setCustomMessage(generateMessage(templateType));
    }
  }, [reservation, customer, templateType, hotelName, hotelAddress, hotelPhone, wifiName, wifiPassword, reviewUrl, websiteUrl, menuCategories]);

  if (!isOpen || (!reservation && !customer)) return null;

  const targetName = reservation?.customerName || customer?.fullName || customer?.name || 'Guest';
  const targetPhone = reservation?.customerPhone || customer?.phone || '';

  function generateMessage(type: 'booking' | 'checkout' | 'welcome' | 'menu') {
    const name = targetName;
    const guestReviewLink = reviewUrl || websiteUrl || 'https://g.page/r/your-hotel-review';

    if (type === 'menu') {
      let menuText = `Dear *${name}*,\n\nWelcome to *${hotelName}*! 🍽️✨\n\nHere is our In-Room Dining & Restaurant Food Menu:\n\n`;

      if (menuCategories && menuCategories.length > 0) {
        menuCategories.forEach((cat) => {
          if (cat.menuItems && cat.menuItems.length > 0) {
            menuText += `📋 *${cat.name.toUpperCase()}:*\n`;
            cat.menuItems.forEach((item) => {
              menuText += `• ${item.name} - ₹${item.price}\n`;
            });
            menuText += `\n`;
          }
        });
      } else {
        menuText += `📋 *STARTERS & APPETIZERS:*\n• Paneer Tikka Grill - ₹340\n• Crispy Chicken Wings - ₹380\n\n🍛 *MAIN COURSE:*\n• Butter Chicken Special - ₹450\n• Dal Makhani Handi - ₹280\n• Paneer Butter Masala - ₹320\n\n🥤 *BEVERAGES & DESSERTS:*\n• Fresh Lime Soda - ₹90\n• Gulab Jamun (2 Pcs) - ₹120\n\n`;
      }

      menuText += `📞 *To Place Order from Room:*\nPlease dial *9* from your room telephone or reply to this WhatsApp message with your Order & Room Number! 🛎️\n\nBon Appétit! 🙏`;
      return menuText;
    }

    if (reservation) {
      const formattedIn = new Date(reservation.checkInDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const formattedOut = new Date(reservation.checkOutDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      if (type === 'booking') {
        return `Dear *${name}*,

Thank you for choosing *${hotelName}*! 🏨✨

Your reservation is confirmed. Here are your booking details:
📌 *Booking ID:* ${reservation.bookingNumber}
🛏️ *Room Number:* ${reservation.roomNumber} (${reservation.roomTypeName})
📅 *Check-In:* ${formattedIn}
📅 *Check-Out:* ${formattedOut}
💰 *Total Amount:* ₹${reservation.totalAmount?.toLocaleString('en-IN')} (Paid: ₹${reservation.paidAmount?.toLocaleString('en-IN')})
💳 *Balance Due:* ₹${(reservation.dueAmount ?? 0) <= 0 ? '0 (Fully Paid)' : reservation.dueAmount?.toLocaleString('en-IN')}

📍 *Location:* ${hotelAddress}
📞 *Front Desk:* ${hotelPhone}

We look forward to welcoming you for a memorable stay! 🙏`;
      } else if (type === 'checkout') {
        const shortBillUrl = `http://localhost:3000/admin/invoices/print?id=${reservation.bookingNumber || reservation.id}`;
        return `Dear *${name}*,

Thank you for staying with us at *${hotelName}*! 🌟✨

Here is your official checkout receipt summary:
🛏️ *Room:* ${reservation.roomNumber || '101'} (${reservation.roomTypeName || 'Deluxe Room'})
🧾 *Booking ID:* ${reservation.bookingNumber}
📅 *Check-Out Date:* ${formattedOut}
💰 *Total Amount:* ₹${reservation.totalAmount?.toLocaleString('en-IN')}
✅ *Paid Amount:* ₹${reservation.paidAmount?.toLocaleString('en-IN')} (Paid in Full)

📄 *Official Tax Invoice & Receipt:*
👇 *Click link to View & Download Bill:*
${shortBillUrl}

⭐ *Rate Your Experience & Google Review:*
${guestReviewLink}

Have a safe journey home! We look forward to welcoming you back. 🙏✨`;
      } else {
        return `Dear *${name}*,

Welcome to *${hotelName}*! 🏨✨

We are delighted to have you stay in *Room ${reservation.roomNumber}*. 
📶 *WiFi Network:* ${wifiName || 'Hotel_Guest_WiFi'}
🔑 *WiFi Password:* ${wifiPassword || 'Welcome2026'}

If you need any room service, laundry, or assistance, please dial *9* from your room telephone or WhatsApp us back at ${hotelPhone}.

Have a pleasant stay! 😊`;
      }
    } else {
      // Customer Direct Mode
      if (type === 'checkout') {
        return `Dear *${name}*,

Thank you for choosing *${hotelName}*! 🌟✨

We hope you have a wonderful stay. We would love to hear your feedback! Please take a moment to share your 5-star Google review:
${guestReviewLink}

📍 *Location:* ${hotelAddress}
📞 *Front Desk:* ${hotelPhone}

Have a fantastic day! 🙏✨`;
      } else if (type === 'booking') {
        return `Dear *${name}*,

Greetings from *${hotelName}*! 🏨✨

We are reaching out to assist you with your stay inquiries and booking reservations.

📍 *Location:* ${hotelAddress}
📞 *Front Desk:* ${hotelPhone}
🌐 *Website:* ${websiteUrl}

Please let us know how we can assist you today! 🙏`;
      } else {
        return `Dear *${name}*,

Welcome to *${hotelName}*! 🏨✨

Here are your guest WiFi details for complimentary high-speed internet:
📶 *WiFi Network (SSID):* ${wifiName || 'Hotel_Guest_WiFi'}
🔑 *WiFi Password:* ${wifiPassword || 'Welcome2026'}

📍 *Address:* ${hotelAddress}
📞 *Front Desk:* ${hotelPhone}

Please contact us if you need any assistance! 😊`;
      }
    }
  }

  const handleSendWhatsApp = () => {
    let phone = (targetPhone || '').replace(/[^0-9]/g, '');
    if (!phone) {
      alert('Guest phone number is missing');
      return;
    }

    if (phone.length === 10) {
      phone = '91' + phone;
    }

    const encodedText = encodeURIComponent(customMessage);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-auto space-y-4 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">Send WhatsApp Message</h3>
              <p className="text-[11px] text-emerald-200 font-medium">To: {targetName} ({targetPhone})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Template Selector Tabs */}
          <div>
            <label className="block text-slate-500 font-bold uppercase tracking-wider mb-2 text-[10px]">
              Select Message Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('booking')}
                className={`py-2 px-2.5 rounded-xl font-extrabold transition-all text-center border text-[11px] ${
                  templateType === 'booking'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                📌 Booking
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('welcome')}
                className={`py-2 px-2.5 rounded-xl font-extrabold transition-all text-center border text-[11px] ${
                  templateType === 'welcome'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🔑 WiFi Info
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('menu')}
                className={`py-2 px-2.5 rounded-xl font-extrabold transition-all text-center border text-[11px] ${
                  templateType === 'menu'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🍽️ Food Menu
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('checkout')}
                className={`py-2 px-2.5 rounded-xl font-extrabold transition-all text-center border text-[11px] ${
                  templateType === 'checkout'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                🌟 Checkout
              </button>
            </div>
          </div>

          {/* Editable Message Box */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-700 font-bold">Message Preview & Customization</label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-900 font-sans text-xs leading-relaxed focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 outline-none transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all hover:scale-105"
            >
              <Send className="w-4 h-4" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
