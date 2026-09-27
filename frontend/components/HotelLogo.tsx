'use client';

import React, { useEffect, useState } from 'react';

interface HotelLogoProps {
  variant?: 'dark' | 'light' | 'print' | 'emblem-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hotelName?: string;
  subTitle?: string;
  className?: string;
}

export default function HotelLogo({
  variant = 'light',
  size = 'md',
  hotelName: propHotelName,
  subTitle = 'LUXURY HOTEL & RESORTS',
  className = '',
}: HotelLogoProps) {
  const [dynamicHotelName, setDynamicHotelName] = useState<string>(propHotelName || 'HOTEL MANAGEMENT');

  useEffect(() => {
    if (propHotelName) {
      setDynamicHotelName(propHotelName);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_info');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.hotelName) {
            setDynamicHotelName(parsed.hotelName);
          }
        }
      } catch (e) {
        console.error('Error parsing user_info for HotelLogo:', e);
      }
    }
  }, [propHotelName]);

  // Compute initials dynamically from Hotel Name (e.g. "Hotel Management" -> "HM")
  const computeInitials = (name: string): string => {
    if (!name) return 'HM';
    const clean = name.trim();
    // Filter out common filler words for sharper initials
    const words = clean.split(/\s+/).filter(w => !['and', '&', 'the', 'of'].includes(w.toLowerCase()));
    
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  };

  const displayName = dynamicHotelName.toUpperCase();
  const initials = computeInitials(dynamicHotelName);

  // Dimension mappings
  const dimensions = {
    sm: { emblemSize: 32, titleClass: 'text-xs', subClass: 'text-[9px]' },
    md: { emblemSize: 42, titleClass: 'text-base', subClass: 'text-[10px]' },
    lg: { emblemSize: 52, titleClass: 'text-xl', subClass: 'text-xs' },
    xl: { emblemSize: 64, titleClass: 'text-2xl', subClass: 'text-sm' },
  }[size];

  const textColor = {
    dark: 'text-white',
    light: 'text-slate-900',
    print: 'text-slate-950',
    'emblem-only': 'text-slate-900',
  }[variant];

  const subTextColor = {
    dark: 'text-amber-300',
    light: 'text-indigo-600',
    print: 'text-amber-800 font-extrabold',
    'emblem-only': 'text-indigo-600',
  }[variant];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* High-Resolution Luxury Hotel Management Emblem Logo Image */}
      <div className="relative flex-shrink-0 flex items-center justify-center">
        <img
          src="/app-logo.png"
          alt="Hotel Management Logo"
          style={{ width: dimensions.emblemSize, height: dimensions.emblemSize }}
          className="rounded-xl shadow-md border border-amber-400/40 object-cover"
        />
      </div>

      {/* Typography Section */}
      {variant !== 'emblem-only' && (
        <div className="flex flex-col">
          <span
            className={`font-black tracking-widest ${dimensions.titleClass} ${textColor} uppercase leading-tight font-serif`}
          >
            {displayName}
          </span>
          <span
            className={`font-extrabold tracking-widest ${dimensions.subClass} ${subTextColor} uppercase font-sans`}
          >
            {subTitle}
          </span>
        </div>
      )}
    </div>
  );
}
