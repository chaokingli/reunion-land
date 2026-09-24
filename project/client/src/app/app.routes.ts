import { Routes } from '@angular/router';
import { LobbyComponent } from '../features/lobby/lobby.component';
import { GameComponent } from '../features/game/game.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'lobby' },
  { path: 'lobby', component: LobbyComponent },
  { path: 'game', component: GameComponent },
];