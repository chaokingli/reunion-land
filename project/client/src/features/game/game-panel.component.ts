import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-game-panel',
  templateUrl: './game-panel.html',
  styleUrl: './game-panel.scss',
})
export class GamePanelComponent {
  readonly diceText = input('?');
  readonly rolling = input(false);
  readonly diceTitle = input('');
  readonly diceValueLabel = input('');
  readonly diceHint = input('');
  readonly showDiceValue = input(false);
  readonly showBuy = input(false);
  readonly buyLabel = input('');
  readonly skipLabel = input('');
  readonly showRoll = input(false);
  readonly rollLabel = input('');
  readonly animMsg = input('');
  readonly animKind = input<'bonus' | 'info' | 'win' | 'lose'>('info');

  readonly buy = output<void>();
  readonly skip = output<void>();
  readonly roll = output<void>();
}
