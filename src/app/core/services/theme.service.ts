import {DOCUMENT} from '@angular/common';
import {inject, Injectable, Renderer2, RendererFactory2, signal} from '@angular/core';

const THEME_KEY = 'app-theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private document = inject(DOCUMENT);
  private _isDarkMode = signal(false);

  // Sinal público para que os componentes possam reagir à mudança de tema
  public isDarkMode = this._isDarkMode.asReadonly();

  constructor() {
    const rendererFactory = inject(RendererFactory2);
    this.renderer = rendererFactory.createRenderer(null, null);
    this.loadInitialTheme();
  }

  private loadInitialTheme(): void {
    const savedTheme = localStorage.getItem(THEME_KEY);
    // Prioriza o tema salvo, senão usa a preferência do sistema
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    this.setTheme(useDark);
  }

  private setTheme(isDark: boolean): void {
    this._isDarkMode.set(isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    this.renderer[isDark ? 'addClass' : 'removeClass'](this.document.documentElement, 'dark-theme');
  }

  toggleTheme(): void {
    this.setTheme(!this._isDarkMode());
  }
}
