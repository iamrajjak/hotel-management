import { Routes } from '@angular/router';
import { RoomsComponent } from './pages/rooms/rooms.component';

export const routes: Routes = [
  { path: '', redirectTo: 'admin/rooms', pathMatch: 'full' },
  { path: 'admin/rooms', component: RoomsComponent },
  { path: '**', redirectTo: 'admin/rooms' }
];
