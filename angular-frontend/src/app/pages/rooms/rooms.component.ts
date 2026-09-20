import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../core/services/room.service';
import { Room, CreateRoomRequest } from '../../core/models/room.model';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <app-sidebar [isOpenMobile]="isMobileOpen" (closeMobile)="isMobileOpen = false"></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0">
        <app-header title="Room Management & Inventory" (onMenuClick)="isMobileOpen = true"></app-header>

        <main class="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          <!-- Header Banner -->
          <div class="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-6 sm:p-7 rounded-3xl border border-slate-800/90 shadow-2xl backdrop-blur-xl">
            <div class="relative z-10 space-y-1">
              <span class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                Turso Live Database Synchronization (Angular Frontend)
              </span>
              <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Rooms Directory</h1>
              <p class="text-slate-400 text-xs font-medium">
                Strict Database Table View • {{ roomList.length }} records in DB = {{ roomList.length }} records shown
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                (click)="loadRooms()"
                title="Refresh Database Table"
                class="p-3 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-2xl border border-slate-700 transition-all"
              >
                🔄
              </button>

              <button
                (click)="openAddModal()"
                class="px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all hover:scale-105"
              >
                + Add New Room
              </button>
            </div>
          </div>

          <!-- Success Alert -->
          <div *ngIf="successMsg" class="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold flex items-center justify-between shadow-lg">
            <span>✅ {{ successMsg }}</span>
            <button (click)="successMsg = ''">✕</button>
          </div>

          <!-- Rooms Table Card -->
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div *ngIf="loading" class="text-center py-12 text-slate-400 text-xs font-bold animate-pulse">
              Fetching records directly from Turso Database table via ASP.NET Core API...
            </div>

            <div *ngIf="!loading && roomList.length === 0" class="text-center py-16 space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-inner text-xl">
                📥
              </div>
              <h3 class="font-extrabold text-white text-base">No Rooms Found in Turso Database</h3>
              <p class="text-xs text-slate-400 max-w-sm mx-auto">Your database \`rooms\` table currently has 0 rows. Click below to insert your first room record.</p>
              <button
                (click)="openAddModal()"
                class="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
              >
                + Add First Room to DB
              </button>
            </div>

            <div *ngIf="!loading && roomList.length > 0" class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-300 min-w-[600px]">
                <thead class="bg-slate-950 text-[10px] uppercase font-black text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Room #</th>
                    <th className="py-3.5 px-4">Room Type</th>
                    <th className="py-3.5 px-4">Floor</th>
                    <th className="py-3.5 px-4">Price / Night</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/80 font-medium">
                  <tr *ngFor="let r of roomList" class="hover:bg-slate-800/50 transition-colors">
                    <td class="py-4 px-4 font-extrabold text-amber-400 font-mono text-sm">Room {{ r.roomNumber }}</td>
                    <td class="py-4 px-4 font-bold text-white">{{ r.roomTypeName || 'Deluxe Queen Room' }}</td>
                    <td class="py-4 px-4 text-slate-400 font-medium">{{ r.floor || '1st Floor' }}</td>
                    <td class="py-4 px-4 font-black text-emerald-400 text-sm">₹{{ r.price | number }}</td>
                    <td class="py-4 px-4">
                      <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm">
                        {{ getStatusText(r.status) }} 🟢
                      </span>
                    </td>
                    <td class="py-4 px-4 text-right space-x-2">
                      <button
                        (click)="deleteRoom(r.id, r.roomNumber)"
                        title="Delete Room"
                        class="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Add Room Modal -->
          <div *ngIf="showAddModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
              <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 class="text-base font-black text-white flex items-center gap-2">✨ Add New Room (Angular)</h3>
                <button (click)="showAddModal = false" class="text-slate-400 hover:text-white font-bold text-sm">✕</button>
              </div>

              <div *ngIf="errorMsg" class="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl">
                ⚠️ {{ errorMsg }}
              </div>

              <form (ngSubmit)="handleAddRoom()" class="space-y-4 text-xs">
                <div>
                  <label class="block text-slate-400 font-bold mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    name="roomNumber"
                    [(ngModel)]="roomNumber"
                    placeholder="e.g. 101 or 102"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label class="block text-slate-400 font-bold mb-1">Room Category / Type *</label>
                  <select
                    name="roomTypeName"
                    [(ngModel)]="roomTypeName"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="Deluxe Queen Room">Deluxe Queen Room</option>
                    <option value="Premium King Ocean View">Premium King Ocean View</option>
                    <option value="Royal Executive Suite">Royal Executive Suite</option>
                    <option value="Luxury Family Villa">Luxury Family Villa</option>
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-slate-400 font-bold mb-1">Price / Night (₹) *</label>
                    <input
                      type="number"
                      required
                      name="price"
                      [(ngModel)]="price"
                      class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label class="block text-slate-400 font-bold mb-1">Floor *</label>
                    <select
                      name="floor"
                      [(ngModel)]="floor"
                      class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="1st Floor">1st Floor</option>
                      <option value="2nd Floor">2nd Floor</option>
                      <option value="3rd Floor">3rd Floor</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  class="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-amber-500/20 transition-all mt-2"
                >
                  Insert Record into Turso Database 🚀
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  `
})
export class RoomsComponent implements OnInit {
  roomList: Room[] = [];
  loading = true;
  isMobileOpen = false;
  showAddModal = false;

  roomNumber = '';
  roomTypeName = 'Deluxe Queen Room';
  price = 2500;
  floor = '1st Floor';
  status = 'Available';

  errorMsg = '';
  successMsg = '';

  constructor(private roomService: RoomService) {}

  ngOnInit() {
    this.loadRooms();
  }

  loadRooms() {
    this.loading = true;
    this.roomService.getRooms().subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.data)) {
          this.roomList = res.data;
        } else {
          this.roomList = [];
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching rooms from Turso DB:', err);
        this.roomList = [];
        this.loading = false;
      }
    });
  }

  openAddModal() {
    this.roomNumber = '';
    this.roomTypeName = 'Deluxe Queen Room';
    this.price = 2500;
    this.floor = '1st Floor';
    this.status = 'Available';
    this.errorMsg = '';
    this.showAddModal = true;
  }

  handleAddRoom() {
    this.errorMsg = '';
    if (!this.roomNumber.trim()) {
      this.errorMsg = 'Room Number is required';
      return;
    }

    const payload: CreateRoomRequest = {
      roomNumber: this.roomNumber.trim(),
      roomTypeName: this.roomTypeName,
      price: this.price,
      floor: this.floor,
      status: this.status
    };

    this.roomService.createRoom(payload).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.successMsg = `Room ${this.roomNumber} added to Database successfully!`;
          this.showAddModal = false;
          this.loadRooms();
          setTimeout(() => this.successMsg = '', 3000);
        } else {
          this.errorMsg = `DATABASE ERROR: ${res.message || 'Insertion failed'}`;
        }
      },
      error: (err) => {
        this.errorMsg = `DATABASE ERROR: ${err.message || 'API failed'}`;
      }
    });
  }

  deleteRoom(id: string, num: string) {
    if (confirm(`Are you sure you want to delete Room ${num} from Database?`)) {
      this.roomService.deleteRoom(id).subscribe({
        next: (res) => {
          this.successMsg = `Room ${num} deleted from Database.`;
          this.loadRooms();
          setTimeout(() => this.successMsg = '', 3000);
        },
        error: (err) => {
          console.error('Error deleting room:', err);
        }
      });
    }
  }

  getStatusText(st: any): string {
    if (st === 0 || st === '0' || st === 'Available') return 'Available';
    if (st === 1 || st === '1' || st === 'Reserved') return 'Reserved';
    if (st === 2 || st === '2' || st === 'Occupied') return 'Occupied';
    return st || 'Available';
  }
}
