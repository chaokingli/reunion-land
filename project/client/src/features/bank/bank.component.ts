import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { API_BASE } from '../../core/config';
import { I18nService } from '../../i18n/i18n.service';

interface BankRow {
  id: number;
  kind: string;
  lang: string;
  difficulty: string;
  title: string;
  options: string[];
  answer: number;
  reward: number;
  penalty: number;
}

@Component({
  selector: 'app-bank',
  imports: [CommonModule, FormsModule],
  templateUrl: './bank.html',
  styleUrl: './bank.scss',
})
export class BankComponent {
  protected router = inject(Router);
  protected i18n = inject(I18nService);

  protected kind = signal<'knowledge' | 'math'>('knowledge');
  protected lang = signal<'zh_CN' | 'en' | 'de'>('zh_CN');
  protected difficulty = signal<'small' | 'medium' | 'big'>('small');
  protected title = signal('');
  protected options = signal(['', '', '']);
  protected answer = signal(0);
  protected reward = signal(10);
  protected penalty = signal(5);
  protected rows = signal<BankRow[]>([]);
  protected msg = signal('');
  protected err = signal('');

  constructor() {
    void this.reload();
  }

  protected setOption(i: number, value: string): void {
    const next = this.options().slice();
    next[i] = value;
    this.options.set(next);
  }

  protected async reload(): Promise<void> {
    const res = await fetch(`${API_BASE}/api/questions?kind=${this.kind()}&lang=${this.lang()}`);
    const data = await res.json();
    this.rows.set(data.questions ?? []);
  }

  protected async save(): Promise<void> {
    this.err.set('');
    this.msg.set('');
    const body = {
      kind: this.kind(),
      lang: this.lang(),
      difficulty: this.difficulty(),
      title: this.title().trim(),
      options: this.options().map((o) => o.trim()).filter((o) => o.length > 0),
      answer: this.answer(),
      reward: Number(this.reward()),
      penalty: Number(this.penalty()),
    };
    const res = await fetch(`${API_BASE}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      this.err.set(this.i18n.getT('common.retry'));
      return;
    }
    this.title.set('');
    this.options.set(['', '', '']);
    this.msg.set(this.i18n.getT('bank.saved'));
    await this.reload();
  }
}
