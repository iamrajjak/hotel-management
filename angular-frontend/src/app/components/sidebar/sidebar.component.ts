import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside
      class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0"
      [ngClass]="{ 'translate-x-0': isOpenMobile, '-translate-x-full': !isOpenMobile }"
    >
      <div class="p-6 space-y-6">
        <!-- Logo Branding -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 text-lg">
            👑
          </div>
          <div>
            <h2 class="font-black text-white text-base tracking-tight leading-none">ROYAL STAY</h2>
            <p class="text-[10px] uppercase tracking-widest font-extrabold text-amber-400 mt-1">SaaS Hotel Platform</p>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="space-y-1.5 text-xs font-bold">
          <a
            routerLink="/admin/dashboard"
            routerLinkActive="bg-amber-500/10 text-amber-300 border-amber-500/30"
            class="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors border border-transparent"
          >
            📊 Dashboard
          </a>

          <a
            routerLink="/admin/rooms"
            routerLinkActive="bg-amber-500/10 text-amber-300 border-amber-500/30"
            class="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors border border-transparent"
          >
            🛏️ Rooms Directory
          </a>

          <a
            routerLink="/admin/reservations"
            routerLinkActive="bg-amber-500/10 text-amber-300 border-amber-500/30"
            class="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors border border-transparent"
          >
            📅 Bookings Desk
          </a>

          <a
            routerLink="/admin/customers"
            routerLinkActive="bg-amber-500/10 text-amber-300 border-amber-500/30"
            class="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors border border-transparent"
          >
            👥 Guest Directory
          </a>
        </nav>
      </div>

      <!-- User Profile Card -->
      <div class="p-4 m-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs flex items-center justify-center border border-amber-500/30">
            R
          </div>
          <div>
            <p class="text-xs font-black text-white leading-none">Rajesh Sharma</p>
            <p class="text-[10px] text-slate-400 font-medium mt-0.5">Hotel Owner</p>
          </div>
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  @Input() isOpenMobile = false;
  @Output() closeMobile = new EventEmitter<void>();
}
