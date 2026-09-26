// 运行时 i18n 字典服务（JSON 直导入，运行时可切语言）
import { Injectable, signal, computed, inject } from '@angular/core';
import zh from './zh_CN.json';
import en from './en.json';
import de from './de.json';

export type Locale = 'zh_CN' | 'en' | 'de';

const DICTS: Record<Locale, any> = { zh_CN: zh, en: en, de: de };

const KEY: symbol = Symbol('key');

export interface I18n {
  get(key: string): string;
  getT(key: string, vars?: Record<string, string>): string;
}

@Injectable({ providedIn: 'root' })
export class I18nService implements I18n {
  readonly locale = signal<Locale>('zh_CN');
  // 运行时切换语言
  setLocale(l: Locale) { this.locale.set(l); }
  current(): Locale { return this.locale(); }

  // 按 locale 取出字典
  #dict(): any { return DICTS[this.locale()]; }

  // 取文案，支持 {var} 占位
  getT(key: string, vars: Record<string, string> = {}): string {
    const parts = key.split('.');
    let cur: any = this.#dict();
    for (const p of parts) {
      cur = cur?.[p];
      if (cur == null) return key;
    }
    if (typeof cur !== 'string') return key;
    return cur.replace(/\{(\w+)\}/g, (whole, name) => (vars[name] ?? whole));
  }

  // 简写：取字符串
  get(key: string): string { return this.getT(key); }
}
