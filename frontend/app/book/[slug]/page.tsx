'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { hotelApi, roomApi, reservationApi, Hotel, Room, RoomType } from '@/lib/api/services';
import { 
  Crown, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar as CalendarIcon, 
  Users, 
  BedDouble, 
  CheckCircle, 
  Star, 
  ShieldCheck, 
  Wifi, 
  Coffee, 
  Tv, 
  Sparkles, 
  Printer, 
  X, 
  Menu,
  ArrowRight,
  CreditCard,
  Building,
  UtensilsCrossed,
  Waves,
  Car,
  Clock,
  ChevronRight,
  Maximize,
  Heart,
  Send,
  MessageSquare
} from 'lucide-react';

export default function RoyalStayCustomerWebsite() {
  const params = useParams();
  const slug = (params?.slug as string) || 'royal-stay';

  const [hotelData, setHotelData] = useState<Hotel | null>(null);
  const [dbRooms, setDbRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const [activeTab, setActiveTab] = useState<'home' | 'rooms' | 'details' | 'booking' | 'confirmation' | 'gallery' | 'about' | 'reviews' | 'contact'>('home');
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [galleryCategory, setGalleryCategory] = useState<string>('All');
  const [currentHeroSlide, setCurrentHeroSlide] = useState<number>(0);

  useEffect(() => {
    async function fetchPublicHotelAndRooms() {
      setLoadingRooms(true);
      try {
        const [hotelRes, roomsRes] = await Promise.all([
          hotelApi.getHotelBySlug(slug),
          roomApi.getRooms(),
        ]);
        if (hotelRes.data) setHotelData(hotelRes.data);
        if (roomsRes.data && roomsRes.data.length > 0) {
          setDbRooms(roomsRes.data);
        }
      } catch (err) {
        console.error('Error fetching public room catalog:', err);
      } finally {
        setLoadingRooms(false);
      }
    }
    fetchPublicHotelAndRooms();
  }, [slug]);

  // Auto-rotate Hero Slides every 4 seconds
  const heroSlides = [
    {
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80',
      title: 'Luxury Stay, Unforgettable Experience',
      subtitle: 'Experience comfort and elegance like never before. Perfect stay for your perfect gateway.'
    },
    {
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=80',
      title: 'Private Beachfront Villas & Sunset Views',
      subtitle: 'Step into paradise with private infinity pools and 24/7 personal butler service.'
    },
    {
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1920&q=80',
      title: 'World-Class Hospitality & Fine Dining',
      subtitle: 'Indulge in award-winning multi-cuisine delicacies prepared by Michelin-starred chefs.'
    },
    {
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80',
      title: 'Serene Spa & Wellness Sanctuary',
      subtitle: 'Rejuvenate your body and mind with authentic Ayurvedic therapy and holistic wellness.'
    }
  ];

  React.useEffect(() => {
    if (activeTab !== 'home') return;
    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Mobile Menu Drawer state
  const [isWebMobileMenuOpen, setIsWebMobileMenuOpen] = useState(false);

  // Search Bar state
  const [checkIn, setCheckIn] = useState('2026-09-01');
  const [checkOut, setCheckOut] = useState('2026-09-04');
  const [guests, setGuests] = useState('2 Guests');

  // Booking Form State & Real-time Validations
  const [guestName, setGuestName] = useState('Rahul Sharma');
  const [guestEmail, setGuestEmail] = useState('rahul@example.com');
  const [guestPhone, setGuestPhone] = useState('9876543210');
  const [bookingId, setBookingId] = useState('RES123456');
  const [paymentChoice, setPaymentChoice] = useState<'PayAtHotel' | 'PayOnlineNow'>('PayAtHotel');
  const [onlineMethod, setOnlineMethod] = useState<'UPI' | 'Card' | 'NetBanking' | 'BankTransfer'>('UPI');
  const [txnRef, setTxnRef] = useState('');

  // Validation Error States
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');

  // Validate Phone Number (Exact 10 Digits starting with 6,7,8,9)
  const validatePhone = (val: string) => {
    setGuestPhone(val);
    const regex = /^[6-9]\d{9}$/;
    if (!val.trim()) {
      setPhoneError('Mobile number is required');
    } else if (!regex.test(val.trim())) {
      setPhoneError('Enter valid 10-digit mobile number (e.g. 9876543210)');
    } else {
      setPhoneError('');
    }
  };

  // Validate Email Address
  const validateEmail = (val: string) => {
    setGuestEmail(val);
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!val.trim()) {
      setEmailError('Email address is required');
    } else if (!regex.test(val.trim())) {
      setEmailError('Enter valid email address (e.g. rahul@example.com)');
    } else {
      setEmailError('');
    }
  };

  // Room Catalog (Live Database Rooms + Luxury Room Types Catalog)
  const defaultRoomsList = [
    {
      id: 'deluxe',
      name: 'Deluxe Queen Room',
      type: 'Deluxe',
      price: 2500,
      image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80',
      specs: '2 Guests • 1 Queen Bed • 250 sq.ft',
      description: 'A cozy and comfortable room perfect for couples with modern luxury decor.',
      rating: 4.8,
      reviewsCount: 120
    },
    {
      id: 'premium',
      name: 'Premium King Ocean View',
      type: 'Premium',
      price: 3500,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      specs: '2 Guests • 1 King Bed • 320 sq.ft',
      description: 'Spacious room with modern amenities, sea view balcony, and rain shower.',
      rating: 4.9,
      reviewsCount: 95
    },
    {
      id: 'suite',
      name: 'Royal Executive Suite',
      type: 'Suite',
      price: 5000,
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
      specs: '4 Guests • 1 King Bed • 450 sq.ft',
      description: 'Luxurious suite with separate living area, Jacuzzi bath, and premium facilities.',
      rating: 5.0,
      reviewsCount: 150
    },
    {
      id: 'family',
      name: 'Luxury Family Villa',
      type: 'Family',
      price: 4000,
      image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      specs: '4 Guests • 2 Double Beds • 400 sq.ft',
      description: 'Ideal for families with extra space, children play corner, and garden access.',
      rating: 4.7,
      reviewsCount: 88
    },
    {
      id: 'presidential',
      name: 'Presidential Pool Villa',
      type: 'Presidential',
      price: 8500,
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
      specs: '4 Guests • Private Infinity Pool • 650 sq.ft',
      description: 'Ultra-exclusive villa featuring a private plunge pool, sun loungers, and 24/7 butler.',
      rating: 5.0,
      reviewsCount: 210
    },
    {
      id: 'honeymoon',
      name: 'Honeymoon Beachfront Cottage',
      type: 'Honeymoon',
      price: 6500,
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
      specs: '2 Guests • King Bed & Jacuzzi • 500 sq.ft',
      description: 'Romantic beachfront cottage with private bathtub, candle light terrace, and beach view.',
      rating: 4.9,
      reviewsCount: 180
    },
    {
      id: 'penthouse',
      name: 'Penthouse Sunset Suite',
      type: 'Penthouse',
      price: 12000,
      image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
      specs: '6 Guests • Panoramic Balcony • 850 sq.ft',
      description: 'Top floor penthouse offering 360-degree ocean views, private bar, and master dining.',
      rating: 5.0,
      reviewsCount: 95
    },
    {
      id: 'bungalow',
      name: 'Heritage Garden Bungalow',
      type: 'Bungalow',
      price: 5500,
      image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
      specs: '3 Guests • Private Garden Deck • 480 sq.ft',
      description: 'Charming Portuguese heritage style bungalow surrounded by tropical lush palm gardens.',
      rating: 4.8,
      reviewsCount: 115
    }
  ];

  const rooms = dbRooms.length > 0
    ? dbRooms.map((r: any) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        name: r.roomTypeName ? `Room ${r.roomNumber} - ${r.roomTypeName}` : `Room ${r.roomNumber}`,
        type: r.roomTypeName || 'Deluxe',
        price: r.price || 2500,
        image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80',
        specs: `Floor: ${r.floor || '1st Floor'} • Status: ${r.status}`,
        description: `Room ${r.roomNumber} available for booking in database.`,
        rating: 4.9,
        reviewsCount: 100
      }))
    : defaultRoomsList;

  const galleryImages = [
    { src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80', title: 'Grand Resort Pool', category: 'Swimming Pool' },
    { src: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80', title: 'Deluxe Suite Bedroom', category: 'Rooms' },
    { src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', title: 'Multi-Cuisine Restaurant', category: 'Restaurant' },
    { src: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80', title: 'Presidential Suite Living', category: 'Rooms' },
    { src: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', title: 'Exterior Evening Lighting', category: 'Hotel' },
    { src: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80', title: 'Luxury Bathroom', category: 'Rooms' },
    { src: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80', title: 'Private Plunge Pool', category: 'Swimming Pool' },
    { src: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80', title: 'Honeymoon Cottage Deck', category: 'Rooms' },
    { src: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80', title: 'Penthouse Sunset Terrace', category: 'Hotel' },
    { src: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80', title: 'Heritage Tropical Garden', category: 'Hotel' },
    { src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80', title: 'Premium Sea View Balcony', category: 'Rooms' },
    { src: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80', title: 'Family Suite Lounge', category: 'Rooms' }
  ];

  const handleBookNow = (room: any) => {
    setSelectedRoom(room);
    setActiveTab('details');
  };

  const handleProceedToBooking = () => {
    setActiveTab('booking');
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    let isValid = true;

    if (!guestName.trim() || guestName.trim().length < 2) {
      setNameError('Full name must be at least 2 characters');
      isValid = false;
    } else {
      setNameError('');
    }

    if (!phoneRegex.test(guestPhone.trim())) {
      setPhoneError('Enter valid 10-digit mobile number (e.g. 9876543210)');
      isValid = false;
    } else {
      setPhoneError('');
    }

    if (!emailRegex.test(guestEmail.trim())) {
      setEmailError('Enter valid email address (e.g. rahul@example.com)');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!isValid) return;

    try {
      const payload = {
        customerName: guestName.trim(),
        customerPhone: guestPhone.trim(),
        customerEmail: guestEmail.trim(),
        roomNumber: selectedRoom?.roomNumber || '101',
        roomId: selectedRoom?.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        bookingStatus: 'Confirmed'
      };

      const res = await reservationApi.createPublicReservation(payload);

      if (res.success && res.data) {
        setBookingId(res.data.bookingNumber || res.data.id || ('RES' + Math.floor(100000 + Math.random() * 900000)));
      } else {
        // Fallback create reservation
        const fallbackRes = await reservationApi.createReservation(payload);
        if (fallbackRes.data) {
          setBookingId(fallbackRes.data.bookingNumber || fallbackRes.data.id);
        } else {
          setBookingId('RES' + Math.floor(100000 + Math.random() * 900000));
        }
      }
    } catch (err) {
      console.error('Error saving public booking into database:', err);
      setBookingId('RES' + Math.floor(100000 + Math.random() * 900000));
    }

    setActiveTab('confirmation');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* 1. ROYAL STAY TOP HEADER BAR */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => setActiveTab('home')} className="flex items-center gap-2.5 text-left group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Crown className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider text-white uppercase leading-none">ROYAL STAY</h1>
              <p className="text-[10px] text-amber-400 font-bold tracking-widest uppercase mt-0.5">HOTELS & RESORTS</p>
            </div>
          </button>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-300">
            {[
              { id: 'home', label: 'Home' },
              { id: 'rooms', label: 'Rooms' },
              { id: 'gallery', label: 'Gallery' },
              { id: 'about', label: 'About' },
              { id: 'reviews', label: 'Reviews' },
              { id: 'contact', label: 'Contact' }
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => setActiveTab(nav.id as any)}
                className={`transition-colors py-1 border-b-2 ${
                  activeTab === nav.id ? 'text-amber-400 border-amber-400 font-extrabold' : 'border-transparent hover:text-white'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* CTA Button */}
            <button
              onClick={() => setActiveTab('rooms')}
              className="px-4 sm:px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
            >
              Book Now
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsWebMobileMenuOpen(!isWebMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {isWebMobileMenuOpen ? <X className="w-6 h-6 text-amber-400" /> : <Menu className="w-6 h-6 text-slate-300" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav Menu */}
        {isWebMobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-b border-slate-800 px-6 py-4 space-y-2 animate-in slide-in-from-top duration-200">
            {[
              { id: 'home', label: 'Home' },
              { id: 'rooms', label: 'Rooms' },
              { id: 'gallery', label: 'Gallery' },
              { id: 'about', label: 'About' },
              { id: 'reviews', label: 'Reviews' },
              { id: 'contact', label: 'Contact' }
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => {
                  setActiveTab(nav.id as any);
                  setIsWebMobileMenuOpen(false);
                }}
                className={`block w-full text-left py-2 px-3 rounded-xl text-xs font-bold uppercase ${
                  activeTab === nav.id ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 2. SCREEN 1: HOME PAGE */}
      {activeTab === 'home' && (
        <div className="space-y-16">
          {/* Hero Resort Banner with Auto-Rotating Smooth Fade Slider */}
          <section 
            className="relative h-[600px] bg-slate-900 flex items-center justify-center overflow-hidden bg-cover bg-center transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.50)), url('${heroSlides[currentHeroSlide].image}')`
            }}
          >
            <div className="relative z-10 max-w-4xl text-center px-6 text-white space-y-5 transition-all duration-500">
              <span className="px-4 py-1.5 rounded-full bg-slate-900/60 border border-amber-400/60 text-amber-300 text-xs font-black uppercase tracking-widest backdrop-blur-md shadow-lg">
                5-STAR LUXURY RESORT
              </span>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] transition-all duration-700">
                {heroSlides[currentHeroSlide].title}
              </h1>
              <p className="text-sm sm:text-base text-slate-100 font-semibold max-w-2xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                {heroSlides[currentHeroSlide].subtitle}
              </p>
              <button
                onClick={() => setActiveTab('rooms')}
                className="mt-4 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-2xl transition-all hover:scale-105"
              >
                Check Availability
              </button>
            </div>

            {/* Slide Dot Indicators */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentHeroSlide(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    currentHeroSlide === idx ? 'w-8 bg-amber-400' : 'w-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </section>

          {/* Search Filter Bar */}
          <div className="max-w-5xl mx-auto -mt-24 relative z-20 px-6">
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Guests</label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="1 Guest">1 Guest</option>
                  <option value="2 Guests">2 Guests</option>
                  <option value="3 Guests">3 Guests</option>
                  <option value="4 Guests">4 Guests</option>
                </select>
              </div>

              <button
                onClick={() => setActiveTab('rooms')}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all"
              >
                Check Availability
              </button>
            </div>
          </div>

          {/* 5 Highlights Bar */}
          <section className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Best Price Guarantee', icon: ShieldCheck },
                { label: 'Free Wi-Fi', icon: Wifi },
                { label: 'Swimming Pool & Spa', icon: Waves },
                { label: 'Restaurant Multi Cuisine', icon: UtensilsCrossed },
                { label: '24/7 Front Desk Service', icon: Clock }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm text-center flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Popular Rooms Showcase */}
          <section className="max-w-7xl mx-auto px-6 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Popular Rooms</h2>
              <p className="text-xs text-slate-500 font-medium">Discover our most loved rooms</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all group">
                  <div className="relative h-48 w-full overflow-hidden">
                    <img src={room.image} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-base">{room.name}</h3>
                    </div>
                    <p className="text-xs font-black text-amber-600">₹{room.price.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ night</span></p>
                    <button
                      onClick={() => handleBookNow(room)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Hotel Facilities */}
          <section className="max-w-7xl mx-auto px-6 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Hotel Facilities</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[
                { name: 'Swimming Pool', icon: Waves },
                { name: 'Spa & Wellness', icon: Sparkles },
                { name: 'Restaurant', icon: UtensilsCrossed },
                { name: 'Fitness Center', icon: Coffee },
                { name: 'Free Parking', icon: Car },
                { name: 'Room Service', icon: Clock }
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 text-center flex flex-col items-center gap-2 shadow-sm">
                    <Icon className="w-6 h-6 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">{f.name}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Testimonials - What Our Guests Say */}
          <section className="bg-slate-900 text-white py-16 px-6">
            <div className="max-w-7xl mx-auto space-y-10">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-tight">What Our Guests Say</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: 'Rahul Sharma', text: 'Amazing stay! The rooms were clean, spacious and the staff was very friendly.' },
                  { name: 'Priya Mehta', text: 'The best hotel experience we had with our family. Highly recommended!' },
                  { name: 'Jatin Verma', text: 'Great location, beautiful property and excellent food.' }
                ].map((t, i) => (
                  <div key={i} className="bg-slate-800/90 border border-slate-700 p-6 rounded-3xl space-y-3">
                    <div className="flex gap-1 text-amber-400">
                      {[...Array(5)].map((_, s) => <Star key={s} className="w-4 h-4 fill-amber-400" />)}
                    </div>
                    <p className="text-xs text-slate-300 italic">"{t.text}"</p>
                    <p className="text-xs font-bold text-white">- {t.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-slate-950 text-slate-400 py-12 px-6 border-t border-slate-800">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white font-black text-base">
                  <Crown className="w-5 h-5 text-amber-400" /> ROYAL STAY
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Experience luxury and comfort at Royal Stay Hotels & Resorts. Unforgettable memories for every guest.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white uppercase mb-3">Quick Links</h4>
                <ul className="space-y-2">
                  {['Home', 'Rooms', 'Gallery', 'About', 'Contact'].map((l) => (
                    <li key={l}><button onClick={() => setActiveTab(l.toLowerCase() as any)} className="hover:text-amber-400">{l}</button></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white uppercase mb-3">Our Services</h4>
                <ul className="space-y-2">
                  <li>Room Service</li>
                  <li>Spa & Wellness</li>
                  <li>Restaurant</li>
                  <li>Airport Transfer</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white uppercase mb-3">Contact Us</h4>
                <p>123, Beach Road, Goa - 403001</p>
                <p className="mt-1">+91 98765 43210</p>
                <p>info@royalstay.com</p>
              </div>
            </div>

            <div className="max-w-7xl mx-auto border-t border-slate-900 mt-8 pt-6 text-center text-[11px] text-slate-600">
              © 2026 Royal Stay Hotels & Resorts. All rights reserved.
            </div>
          </footer>
        </div>
      )}

      {/* 3. SCREEN 2: ROOMS PAGE */}
      {activeTab === 'rooms' && (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Check-in</label>
                <span className="font-bold text-xs">{checkIn}</span>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Check-out</label>
                <span className="font-bold text-xs">{checkOut}</span>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase">Guests</label>
                <span className="font-bold text-xs">{guests}</span>
              </div>
            </div>

            <button className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase rounded-xl">
              Check Availability
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-lg flex flex-col sm:flex-row group">
                <div className="relative w-full sm:w-1/2 h-56 sm:h-auto overflow-hidden">
                  <img src={room.image} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-6 sm:w-1/2 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-600 font-bold text-[10px] uppercase rounded-full">
                      {room.type}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">{room.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">{room.specs}</p>
                    <p className="text-xs text-slate-400 mt-2">{room.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-lg font-black text-slate-900">₹{room.price.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ night</span></p>
                    <button
                      onClick={() => handleBookNow(room)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SCREEN 3: ROOM DETAILS PAGE */}
      {activeTab === 'details' && selectedRoom && (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">{selectedRoom.name}</h1>
              <div className="flex items-center gap-2 text-xs text-amber-500 font-bold mt-1">
                <Star className="w-4 h-4 fill-amber-500" /> {selectedRoom.rating} ({selectedRoom.reviewsCount} reviews)
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-900">₹{selectedRoom.price.toLocaleString()}</span>
              <span className="text-xs text-slate-400"> / night</span>
            </div>
          </div>

          {/* Photo Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-96">
            <div className="md:col-span-2 relative rounded-3xl overflow-hidden shadow-md">
              <img src={selectedRoom.image} alt={selectedRoom.name} className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-rows-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden shadow-sm">
                <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" alt="Resort Pool" className="w-full h-full object-cover" />
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-sm">
                <img src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80" alt="Room Interior" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Room Specs & Amenities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-lg text-slate-900">Experience comfort and relaxation</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {selectedRoom.description} Perfect blend of elegance and convenience with high speed internet, air conditioning, and 24/7 room service.
                </p>
                <div className="flex gap-6 text-xs text-slate-600 font-bold pt-2 border-t border-slate-100">
                  <span>👥 {selectedRoom.specs.split('•')[0]}</span>
                  <span>🛏️ {selectedRoom.specs.split('•')[1]}</span>
                  <span>📐 {selectedRoom.specs.split('•')[2]}</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-lg text-slate-900">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-700 font-semibold">
                  {['Free Wi-Fi', 'Room Service', 'Air Conditioning', 'Tea / Coffee Maker', 'TV', 'Safe Locker', 'Mini Bar'].map((a) => (
                    <div key={a} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> {a}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Check Availability Card */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl h-fit space-y-4">
              <h3 className="font-bold text-lg">Check Availability</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-bold uppercase">Check-in</label>
                  <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white mt-1" />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase">Check-out</label>
                  <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white mt-1" />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase">Guests</label>
                  <select value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white mt-1">
                    <option value="2 Guests">2 Guests</option>
                    <option value="4 Guests">4 Guests</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleProceedToBooking}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SCREEN 4: BOOKING FORM */}
      {activeTab === 'booking' && selectedRoom && (
        <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
          {/* Header Title with Step Pill */}
          <div className="text-center space-y-2">
            <span className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-black uppercase tracking-widest">
              Step 2 of 2 • Reservation & Payment
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">Complete Your Booking</h1>
            <p className="text-xs text-slate-500 font-medium">Enter your details and select your preferred payment mode</p>
          </div>

          {/* Main Card Container */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8">
            {/* Selected Room Banner Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-16 rounded-xl overflow-hidden shadow-md">
                  <img src={selectedRoom.image} alt={selectedRoom.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase">
                    {selectedRoom.type}
                  </span>
                  <h3 className="font-bold text-white text-base mt-1">{selectedRoom.name}</h3>
                  <p className="text-xs text-slate-300 font-medium">{selectedRoom.specs}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-amber-400">₹{selectedRoom.price.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 block">/ night</span>
              </div>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-6">
              {/* Personal Info Group */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Users className="w-4 h-4 text-amber-600" /> Guest Details
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input 
                    type="text" 
                    value={guestName} 
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      if (e.target.value.trim().length >= 2) setNameError('');
                    }} 
                    required 
                    className={`w-full bg-slate-50 border rounded-xl p-3.5 text-xs text-slate-900 font-semibold focus:outline-none transition-all ${
                      nameError ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-300 focus:ring-2 focus:ring-amber-500'
                    }`} 
                    placeholder="Enter your full name"
                  />
                  {nameError && <p className="text-[11px] text-rose-600 font-bold mt-1">⚠️ {nameError}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <input 
                      type="email" 
                      value={guestEmail} 
                      onChange={(e) => validateEmail(e.target.value)} 
                      required 
                      className={`w-full bg-slate-50 border rounded-xl p-3.5 text-xs text-slate-900 font-semibold focus:outline-none transition-all ${
                        emailError ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-300 focus:ring-2 focus:ring-amber-500'
                      }`} 
                      placeholder="e.g. rahul@example.com"
                    />
                    {emailError && <p className="text-[11px] text-rose-600 font-bold mt-1">⚠️ {emailError}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (10 Digits) *</label>
                    <input 
                      type="text" 
                      value={guestPhone} 
                      onChange={(e) => validatePhone(e.target.value)} 
                      required 
                      maxLength={10}
                      className={`w-full bg-slate-50 border rounded-xl p-3.5 text-xs text-slate-900 font-semibold focus:outline-none transition-all ${
                        phoneError ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-300 focus:ring-2 focus:ring-amber-500'
                      }`} 
                      placeholder="e.g. 9876543210"
                    />
                    {phoneError && <p className="text-[11px] text-rose-600 font-bold mt-1">⚠️ {phoneError}</p>}
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" /> Select Payment Option
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Pay at Hotel */}
                  <div 
                    onClick={() => setPaymentChoice('PayAtHotel')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      paymentChoice === 'PayAtHotel'
                        ? 'border-amber-500 bg-amber-500/10 shadow-lg ring-1 ring-amber-500/30'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                        <Building className="w-4 h-4 text-amber-600" /> Pay at Hotel Desk
                      </span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        paymentChoice === 'PayAtHotel' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                      }`}>
                        {paymentChoice === 'PayAtHotel' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Pay cash, UPI, or card upon check-in at reception desk.</p>
                    <span className="inline-block mt-3 px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 text-[10px] font-bold">
                      No Advance Required
                    </span>
                  </div>

                  {/* Option B: Pay Online Now */}
                  <div 
                    onClick={() => setPaymentChoice('PayOnlineNow')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      paymentChoice === 'PayOnlineNow'
                        ? 'border-indigo-600 bg-indigo-50/90 shadow-lg ring-1 ring-indigo-600/30'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" /> Pay Online Now (Instant)
                      </span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        paymentChoice === 'PayOnlineNow' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}>
                        {paymentChoice === 'PayOnlineNow' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Instant 100% online confirmation via GPay, Bank & Cards.</p>
                    <span className="inline-block mt-3 px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                      ⚡ Instant Confirmation
                    </span>
                  </div>
                </div>

                {/* Razorpay & MakeMyTrip Style Industry-Standard Payment Gateway */}
                {paymentChoice === 'PayOnlineNow' && (
                  <div className="p-6 sm:p-8 bg-slate-900 text-white rounded-3xl space-y-6 border border-slate-800 shadow-2xl">
                    {/* Security Badge Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <h4 className="font-extrabold text-white text-sm sm:text-base">Razorpay & Unified Payment Gateway</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Choose your preferred instant 100% online payment option</p>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-mono text-emerald-400 font-bold self-start sm:self-auto">
                        <span>🔒 256-Bit SSL Encrypted</span>
                      </div>
                    </div>

                    {/* Method Selector Tabs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'UPI', label: '📱 GPay / UPI', badge: 'Instant' },
                        { id: 'Card', label: '💳 Credit / Debit', badge: 'Visa/MC' },
                        { id: 'NetBanking', label: '🌐 NetBanking', badge: 'All Banks' },
                        { id: 'BankTransfer', label: '🏦 Bank Transfer', badge: 'IMPS/NEFT' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setOnlineMethod(m.id as any)}
                          className={`p-3 rounded-2xl text-left transition-all relative ${
                            onlineMethod === m.id
                              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-[1.02]'
                              : 'bg-slate-950 text-slate-300 hover:bg-slate-800/80 border border-slate-800/80'
                          }`}
                        >
                          <span className="block text-xs font-extrabold truncate">{m.label}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider block mt-1 ${
                            onlineMethod === m.id ? 'text-slate-900 opacity-80' : 'text-amber-400'
                          }`}>
                            {m.badge}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* 1. UPI & QR CODE GATEWAY TAB */}
                    {onlineMethod === 'UPI' && (
                      <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex flex-col sm:flex-row items-center gap-5">
                          {/* QR Code Container */}
                          <div className="p-3 bg-white rounded-2xl shadow-xl border border-amber-400/50 flex flex-col items-center flex-shrink-0">
                            <div className="w-32 h-32 bg-slate-900 p-2 rounded-xl flex items-center justify-center text-center">
                              {/* Stylized QR SVG representation */}
                              <svg className="w-full h-full text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm1 1h1v1h-1v-1zm-1 1h1v1h-1v-1zm-2 0h1v1h-1v-1zm0 2h1v1h-1v-1zm2 0h1v1h-1v-1zm1-3h1v1h-1v-1zm-4-1h1v1h-1v-1zm0 4h1v1h-1v-1z"/>
                              </svg>
                            </div>
                            <span className="text-[10px] font-extrabold text-slate-900 mt-2">Scan with any App</span>
                          </div>

                          <div className="space-y-3 text-center sm:text-left flex-1">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                              <span className="px-2.5 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-[10px] font-extrabold border border-blue-500/30">Google Pay</span>
                              <span className="px-2.5 py-1 bg-purple-600/20 text-purple-400 rounded-lg text-[10px] font-extrabold border border-purple-500/30">PhonePe</span>
                              <span className="px-2.5 py-1 bg-sky-600/20 text-sky-400 rounded-lg text-[10px] font-extrabold border border-sky-500/30">Paytm</span>
                              <span className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg text-[10px] font-extrabold border border-emerald-500/30">BHIM UPI</span>
                            </div>

                            <div>
                              <span className="text-[11px] text-slate-400 block">Official Hotel UPI VPA ID:</span>
                              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                                <code className="font-mono text-sm font-black text-amber-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                                  royalstay@hdfcbank
                                </code>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard?.writeText('royalstay@hdfcbank')}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200"
                                >
                                  Copy
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. CREDIT / DEBIT CARD TAB */}
                    {onlineMethod === 'Card' && (
                      <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold text-slate-300">Accepted Card Networks:</span>
                          <span className="text-[10px] font-extrabold text-amber-400">Visa • MasterCard • RuPay • Amex</span>
                        </div>

                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">Card Number</label>
                            <input
                              type="text"
                              placeholder="4532 •••• •••• 8901"
                              maxLength={19}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">Expiry Date</label>
                              <input
                                type="text"
                                placeholder="MM / YY"
                                maxLength={5}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">CVV / CVC</label>
                              <input
                                type="password"
                                placeholder="•••"
                                maxLength={4}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. NETBANKING TAB */}
                    {onlineMethod === 'NetBanking' && (
                      <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                        <span className="text-xs font-bold text-slate-300 block mb-2">Select Your Bank:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          {[
                            '🏦 HDFC Bank',
                            '🏦 ICICI Bank',
                            '🏦 State Bank of India (SBI)',
                            '🏦 Axis Bank',
                            '🏦 Kotak Mahindra',
                            '🏦 IndusInd Bank'
                          ].map((b, i) => (
                            <button
                              key={i}
                              type="button"
                              className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-left font-bold transition-all text-[11px]"
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. DIRECT HOTEL BANK TRANSFER TAB */}
                    {onlineMethod === 'BankTransfer' && (
                      <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs font-mono">
                        <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
                          <span>Bank Name:</span>
                          <span className="font-bold text-white">HDFC Bank Ltd (Panjim Main Branch)</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
                          <span>Account Holder:</span>
                          <span className="font-bold text-amber-400">ROYAL STAY HOTELS & RESORTS PVT LTD</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
                          <span>Account Number:</span>
                          <span className="font-bold text-emerald-400 text-sm">50200084920194</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>IFSC Code:</span>
                          <span className="font-bold text-white">HDFC0000240</span>
                        </div>
                      </div>
                    )}

                    {/* Optional UTR Ref Input */}
                    <div className="pt-2 border-t border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        UTR / Transaction Reference No. (Optional)
                      </label>
                      <input
                        type="text"
                        value={txnRef}
                        onChange={(e) => setTxnRef(e.target.value)}
                        placeholder="Enter 12-digit UTR or Payment Reference after payment"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Price Summary Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white p-6 rounded-2xl space-y-3 text-xs shadow-xl border border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span>Room Charge (₹{selectedRoom.price.toLocaleString()} x 2 Nights):</span>
                  <span className="font-bold text-white">₹{(selectedRoom.price * 2).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>GST Taxes & Resort Fees (15%):</span>
                  <span className="font-bold text-white">₹{((selectedRoom.price * 2) * 0.15).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-white font-black text-base pt-3 border-t border-slate-800">
                  <span className="uppercase tracking-wider">Total Payable Amount:</span>
                  <span className="text-xl text-amber-400">₹{((selectedRoom.price * 2) * 1.15).toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                {paymentChoice === 'PayOnlineNow' ? 'Proceed to Pay Online ⚡' : 'Confirm Booking (Pay at Hotel Desk)'} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. SCREEN 5: BOOKING CONFIRMATION */}
      {activeTab === 'confirmation' && (
        <div className="max-w-xl mx-auto px-6 py-16 text-center space-y-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-300 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <CheckCircle className="w-10 h-10 fill-slate-950" />
          </div>

          <div>
            <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest border border-emerald-200">
              Booking Confirmed 🎉
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">Reservation Confirmed!</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Thank you for booking with Royal Stay Hotels & Resorts</p>
          </div>

          {/* Official E-Voucher Pass Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-left space-y-5 text-xs shadow-2xl relative overflow-hidden">
            {/* Top Royal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="font-extrabold text-slate-900 text-sm tracking-wider uppercase">ROYAL STAY PASSPORT</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-400 font-mono font-bold text-[11px]">
                {bookingId}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Guest Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{guestName}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Selected Room</span>
                <span className="font-extrabold text-indigo-600 text-sm">{selectedRoom?.name || 'Deluxe Room'}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Check-in</span>
                  <span className="font-extrabold text-slate-900 text-xs">{checkIn}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Check-out</span>
                  <span className="font-extrabold text-slate-900 text-xs">{checkOut}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100 pt-3">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Payment Option</span>
                <span className="font-bold text-slate-800">
                  {paymentChoice === 'PayOnlineNow' ? `Paid Online (${onlineMethod})` : 'Pay at Hotel Desk'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Payment Status</span>
                <span className={`font-black px-3 py-1 rounded-full text-[10px] uppercase shadow-sm ${
                  paymentChoice === 'PayOnlineNow' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {paymentChoice === 'PayOnlineNow' ? 'Paid Online ⚡' : 'Pay at Hotel Desk 🏨'}
                </span>
              </div>
              <div className="flex justify-between items-center border-t-2 border-dashed border-slate-200 pt-4 font-black text-base">
                <span className="text-slate-900 uppercase tracking-wider text-xs">Total Amount</span>
                <span className="text-xl text-emerald-600">₹{((selectedRoom?.price || 2500) * 2 * 1.15).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => window.print()} 
              className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Printer className="w-4 h-4 text-amber-400" /> Download PDF Voucher
            </button>
            <button 
              onClick={() => setActiveTab('home')} 
              className="px-6 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-2xl transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* 7. SCREEN 6: GALLERY */}
      {activeTab === 'gallery' && (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
          <div className="text-center space-y-2">
            <span className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-black uppercase tracking-widest">
              Visual Experience • Resort Gallery
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">Explore Royal Stay</h1>
            <p className="text-xs text-slate-500 font-medium">Discover our luxury suites, infinity pools, fine dining & gardens</p>
          </div>

          {/* Gallery Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {['All', 'Rooms', 'Swimming Pool', 'Restaurant', 'Hotel'].map((cat) => (
              <button
                key={cat}
                onClick={() => setGalleryCategory(cat)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                  galleryCategory === cat 
                    ? 'bg-slate-900 text-amber-400 shadow-xl shadow-slate-900/20 scale-105 border border-slate-800' 
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Gallery Image Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {galleryImages
              .filter((img) => galleryCategory === 'All' || img.category === galleryCategory)
              .map((img, i) => (
                <div key={i} className="relative h-72 rounded-3xl overflow-hidden shadow-xl group border border-slate-200/80">
                  <img src={img.src} alt={img.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 inset-x-0 p-5 flex items-center justify-between text-white">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase">
                        {img.category}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-1">{img.title}</h4>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Maximize className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 8. SCREEN 7: ABOUT */}
      {activeTab === 'about' && (
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 group">
              <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80" alt="About Royal Stay" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white flex items-center gap-3">
                <Crown className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-300">5-Star Luxury Heritage</h4>
                  <p className="text-[11px] text-slate-300">Awarded India's Leading Beachfront Resort 2025</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 font-black text-xs uppercase tracking-widest rounded-full">
                About Royal Stay
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Where Luxury Meets Unmatched Comfort
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Royal Stay Hotels & Resorts is an oasis of luxury located in the heart of Goa. We offer world-class hospitality, award-winning multi-cuisine dining, serene infinity pools, and opulent suite rooms. Whether you are here for a romantic getaway or family vacation, we promise unforgettable memories.
              </p>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
                  <p className="text-2xl font-black text-slate-900">50+</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Luxury Suites</p>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
                  <p className="text-2xl font-black text-slate-900">10+</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Years Experience</p>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
                  <p className="text-2xl font-black text-indigo-600">5000+</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Happy Guests</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { title: 'Michelin Star Dining', desc: 'Curated multi-cuisine dishes prepared by global master chefs.', icon: UtensilsCrossed },
              { title: 'Infinity Swimming Pool', desc: 'Temperature-controlled infinity pool overlooking the ocean.', icon: Waves },
              { title: 'Royal Wellness Spa', desc: 'Authentic Ayurvedic therapies and holistic body massage.', icon: Sparkles },
              { title: '24/7 Personal Butler', desc: 'Round-the-clock dedicated guest concierge and room service.', icon: Clock }
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-lg space-y-3 hover:shadow-2xl transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{f.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. SCREEN 8: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
          <div className="text-center space-y-2">
            <span className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-black uppercase tracking-widest">
              Guest Feedback • Verified Ratings
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">What Our Guests Say</h1>
            <p className="text-xs text-slate-500 font-medium">Real reviews from verified guests who stayed at Royal Stay</p>
          </div>

          {/* Rating Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white p-8 sm:p-10 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center gap-8 border border-slate-800">
            <div className="text-center md:border-r md:border-slate-800 md:pr-10">
              <span className="text-6xl font-black text-amber-400">4.5</span>
              <div className="flex gap-1 text-amber-400 mt-2 justify-center">
                {[...Array(5)].map((_, s) => <Star key={s} className="w-5 h-5 fill-amber-400" />)}
              </div>
              <p className="text-[11px] text-slate-400 font-bold mt-2 uppercase tracking-wider">Based on 150 Verified Reviews</p>
            </div>

            <div className="flex-1 space-y-2.5 text-xs w-full">
              {[
                { stars: 5, pct: '70%' },
                { stars: 4, pct: '20%' },
                { stars: 3, pct: '7%' },
                { stars: 2, pct: '2%' },
                { stars: 1, pct: '1%' }
              ].map((r) => (
                <div key={r.stars} className="flex items-center gap-3">
                  <span className="w-14 font-bold text-slate-300">{r.stars} Star</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" style={{ width: r.pct }}></div>
                  </div>
                  <span className="w-10 text-right text-amber-400 font-bold">{r.pct}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Guest Reviews Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Rahul Sharma', location: 'Mumbai', rating: 5, comment: 'Amazing stay! The room view was breathtaking, staff was super hospitable and food was 10/10.', date: '18 May 2026' },
              { name: 'Priya Mehta', location: 'Delhi', rating: 5, comment: 'The best resort experience we had with family. Infinity pool and spa therapies are top-tier!', date: '19 May 2026' },
              { name: 'Amit Verma', location: 'Bangalore', rating: 4, comment: 'Great property, luxurious rooms and fast room service. Highly recommended for couples.', date: '17 May 2026' }
            ].map((t, i) => (
              <div key={i} className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-4 shadow-lg flex flex-col justify-between hover:shadow-2xl transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 text-amber-400">
                      {[...Array(t.rating)].map((_, s) => <Star key={s} className="w-4 h-4 fill-amber-400" />)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{t.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic">"{t.comment}"</p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center shadow-md">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{t.name}</h5>
                    <p className="text-[10px] text-slate-400">{t.location} • Verified Guest</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. SCREEN 9: CONTACT */}
      {activeTab === 'contact' && (
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
          <div className="text-center space-y-2">
            <span className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-black uppercase tracking-widest">
              24/7 Front Desk • Reach Us
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">Get In Touch</h1>
            <p className="text-xs text-slate-500 font-medium">Have questions or need assistance with your booking? Contact our team</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Royal Contact Info Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white p-8 sm:p-10 rounded-3xl space-y-8 shadow-2xl border border-slate-800">
              <div>
                <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase">
                  Direct Contact
                </span>
                <h3 className="font-extrabold text-2xl text-white mt-2">Royal Stay Front Desk</h3>
                <p className="text-xs text-slate-300 mt-1">Our concierge team is available 24 hours a day to assist you.</p>
              </div>

              <div className="space-y-5 text-xs text-slate-200">
                <div className="flex items-center gap-4 p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone / WhatsApp</span>
                    <span className="font-bold text-sm text-white">+91 98765 43210</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Email Address</span>
                    <span className="font-bold text-sm text-white">info@royalstay.com</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Resort Location</span>
                    <span className="font-bold text-xs text-white">123 Beach Road, North Goa, India - 403001</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Message Form Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
              <h3 className="font-extrabold text-xl text-slate-900">Send Us a Message</h3>
              <form className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Name</label>
                  <input type="text" placeholder="Enter your full name" className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Email</label>
                  <input type="email" placeholder="Enter your email" className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Message</label>
                  <textarea placeholder="How can we help you?" className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 font-semibold h-28 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>

                <button type="button" className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

