import { Component, input } from '@angular/core';
import type { Player } from '../../shared/types';

@Component({
  selector: 'app-game-header',
  templateUrl: './game-header.html',
  styleUrl: './game-header.scss',
})
export class GameHeaderComponent {
  readonly title = input('');
  readonly finished = input(false);
  readonly currentLabel = input('');
  readonly turnName = input('');
  readonly turn = input(0);
  readonly players = input<Player[]>([]);

  protected pieceColor(i: number): string {
    const map = ['var(--pc0)', 'var(--pc1)', 'var(--pc2)', 'var(--pc3)'];
    return map[i % 4] ?? 'var(--pc0)';
  }
}
