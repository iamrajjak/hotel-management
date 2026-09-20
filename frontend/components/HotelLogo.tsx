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
  const [dynamicHotelName, setDynamicHotelName] = useState<string>(propHotelName || 'ROYAL STAY');

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

  // Compute initials dynamically from Hotel Name (e.g. "Grand Palace" -> "GP", "Royal Stay" -> "RS")
  const computeInitials = (name: string): string => {
    if (!name) return 'RS';
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
      {/* High-Resolution Dynamic Vector Luxury Hotel Emblem SVG */}
      <div className="relative flex-shrink-0 flex items-center justify-center">
        <svg
          width={dimensions.emblemSize}
          height={dimensions.emblemSize}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          <defs>
            {/* Gold Metallic Gradient */}
            <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="30%" stopColor="#EAB308" />
              <stop offset="70%" stopColor="#CA8A04" />
              <stop offset="100%" stopColor="#A16207" />
            </linearGradient>

            {/* Royal Blue / Indigo Gradient */}
            <linearGradient id="royalIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#312E81" />
              <stop offset="50%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            {/* Inner Glow Filter */}
            <filter id="royalGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Octagonal Luxury Shield Border */}
          <polygon
            points="50,4 88,18 96,50 88,82 50,96 12,82 4,50 12,18"
            fill="url(#royalIndigo)"
            stroke="url(#goldMetallic)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Inner Gold Shield Line */}
          <polygon
            points="50,10 82,22 89,50 82,78 50,90 18,78 11,50 18,22"
            fill="none"
            stroke="url(#goldMetallic)"
            strokeWidth="1.2"
            strokeDasharray="4 2"
            opacity="0.85"
          />

          {/* 5 Luxury Stars Top Arch */}
          <g fill="url(#goldMetallic)">
            <polygon points="50,15 51.5,18.5 55,18.5 52,20.5 53,24 50,22 47,24 48,20.5 45,18.5 48.5,18.5" />
            <polygon points="38,18 39.2,20.8 42,20.8 39.6,22.4 40.4,25 38,23.4 35.6,25 36.4,22.4 34,20.8 36.8,20.8" opacity="0.9" />
            <polygon points="62,18 63.2,20.8 66,20.8 63.6,22.4 64.4,25 62,23.4 59.6,25 60.4,22.4 58,20.8 60.8,20.8" opacity="0.9" />
          </g>

          {/* Royal Crown Emblem */}
          <g fill="url(#goldMetallic)" filter="url(#royalGlow)">
            {/* Crown Base */}
            <path d="M30 52 L34 33 L44 42 L50 28 L56 42 L66 33 L70 52 Z" />
            {/* Crown Jewels */}
            <circle cx="34" cy="31" r="2.2" fill="#FEF08A" />
            <circle cx="50" cy="26" r="2.8" fill="#FEF08A" />
            <circle cx="66" cy="31" r="2.2" fill="#FEF08A" />
            {/* Crown Band */}
            <rect x="30" y="52" width="40" height="5" rx="1.5" fill="url(#goldMetallic)" stroke="#854D0E" strokeWidth="0.8" />
          </g>

          {/* Dynamic Monogram Initials (Auto Generated from Hotel Name) */}
          <text
            x="50"
            y="76"
            textAnchor="middle"
            fill="url(#goldMetallic)"
            fontSize={initials.length > 2 ? "14" : "18"}
            fontWeight="900"
            fontFamily="Georgia, serif"
            letterSpacing="1.5"
          >
            {initials}
          </text>
        </svg>
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
