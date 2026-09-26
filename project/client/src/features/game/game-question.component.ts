import { Component, input, output } from '@angular/core';
import type { PendingQuestion } from '../../shared/types';

@Component({
  selector: 'app-game-question',
  templateUrl: './game-question.html',
  styleUrl: './game-question.scss',
})
export class GameQuestionComponent {
  readonly question = input.required<PendingQuestion>();
  readonly options = input<string[]>([]);
  readonly hintUsed = input(false);
  readonly askMath = input('');
  readonly askRiddle = input('');
  readonly askKnowledge = input('');
  readonly rewardLabel = input('');
  readonly penaltyLabel = input('');
  readonly hintLabel = input('');

  readonly answered = output<number>();
  readonly hinted = output<void>();
}
