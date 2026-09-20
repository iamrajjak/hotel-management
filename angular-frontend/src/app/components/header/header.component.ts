import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-slate-900/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-40">
      <div class="flex items-center gap-4">
        <button
          (click)="onMenuClick.emit()"
          class="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
        >
          ☰
        </button>
        <h2 class="text-lg font-black text-white tracking-tight">{{ title }}</h2>
      </div>

      <div class="flex items-center gap-3">
        <span class="hidden sm:inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          ● System Live
        </span>
        <button class="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700 transition-colors">
          🔔
        </button>
      </div>
    </header>
  `
})
export class HeaderComponent {
  @Input() title = 'Hotel Directory';
  @Output() onMenuClick = new EventEmitter<void>();
}
