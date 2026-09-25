import { Routes } from '@angular/router';
import { LobbyComponent } from '../features/lobby/lobby.component';
import { GameComponent } from '../features/game/game.component';
import { BankComponent } from '../features/bank/bank.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'lobby' },
  { path: 'lobby', component: LobbyComponent },
  { path: 'bank', component: BankComponent },
  { path: 'game', component: GameComponent },
];