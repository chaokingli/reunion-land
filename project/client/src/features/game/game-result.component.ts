import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-game-result',
  templateUrl: './game-result.html',
  styleUrl: './game-result.scss',
})
export class GameResultComponent {
  readonly title = input('');
  readonly playAgainLabel = input('');
  readonly backLabel = input('');
  readonly playAgain = output<void>();
  readonly back = output<void>();
}
