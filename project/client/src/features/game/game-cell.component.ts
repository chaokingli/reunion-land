import { Component, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { I18nService } from '../../i18n/i18n.service';
import type { TileDef } from '../../shared/board';
import type { Player } from '../../shared/types';
import { CELL_SVGS } from './game-icons';
import { PIECE_SVGS } from './game-pieces';

export interface BoardCellView {
  id: string;
  row: number;
  col: number;
  tiles: TileDef[];
  tileIdx: number[];
  pcs: Player[];
}

@Component({
  selector: 'app-game-cell',
  templateUrl: './game-cell.html',
  styleUrl: './game-cell.scss',
})
export class GameCellComponent {
  private sanitizer = inject(DomSanitizer);
  private i18n = inject(I18nService);
  private pieceHtml: SafeHtml[] | null = null;

  readonly cell = input.required<BoardCellView>();
  readonly turn = input(0);
  readonly landedIds = input<number[]>([]);
  readonly hop = input<Record<number, 'a' | 'b' | ''>>({});
  readonly players = input<Player[]>([]);
  readonly lanternOwners = input<Record<number, number>>({});

  protected kindClass(): string {
    const kind = this.cell().tiles[0]?.kind;
    return kind ? 'kind-' + kind : '';
  }

  protected tileLabel(t: TileDef): string {
    const key = 'tiles.' + t.kind;
    const tr = this.i18n.get(key);
    return tr === key ? t.label : tr;
  }

  protected tileSvg(kind: string | undefined): SafeHtml {
    if (!kind || !CELL_SVGS[kind]) return '';
    return this.sanitizer.bypassSecurityTrustHtml(CELL_SVGS[kind]);
  }

  protected pieceColor(i: number): string {
    const map = ['var(--pc0)', 'var(--pc1)', 'var(--pc2)', 'var(--pc3)'];
    return map[i % 4] ?? 'var(--pc0)';
  }

  protected pieceSvg(i: number): SafeHtml {
    if (!this.pieceHtml) this.pieceHtml = PIECE_SVGS.map((svg) => this.sanitizer.bypassSecurityTrustHtml(svg));
    return this.pieceHtml[i % 4] ?? this.pieceHtml[0];
  }

  protected owner(tile: number): Player | null {
    const id = this.lanternOwners()[tile];
    if (id === undefined) return null;
    return this.players().find((p) => p.id === id) ?? null;
  }
}
