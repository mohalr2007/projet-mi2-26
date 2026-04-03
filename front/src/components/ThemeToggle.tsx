// made by larabi
'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';

type ThemePreference = 'light' | 'dark' | 'system';

function applyTheme(preference: ThemePreference, withAnimation = false) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = preference === 'dark' || (preference === 'system' && prefersDark);

  if (withAnimation) {
    document.documentElement.classList.add('theme-animate');
    window.setTimeout(() => {
      document.documentElement.classList.remove('theme-animate');
    }, 180);
  }

  document.documentElement.classList.toggle('dark', useDark);
  document.documentElement.style.colorScheme = useDark ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get('embed') === '1';

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const initialPreference: ThemePreference =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';

    // Mode auto activé par défaut.
    if (!stored) {
      localStorage.setItem('theme', 'system');
    }

    applyTheme(initialPreference);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = () => {
      const current = localStorage.getItem('theme') ?? 'system';
      if (current === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    const stored = localStorage.getItem('theme');
    const currentPreference: ThemePreference =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    const isDarkNow = document.documentElement.classList.contains('dark');

    const nextPreference: ThemePreference =
      currentPreference === 'system'
        ? (isDarkNow ? 'light' : 'dark')
        : (currentPreference === 'dark' ? 'light' : 'dark');

    localStorage.setItem('theme', nextPreference);
    applyTheme(nextPreference, true);
  };

  if (isEmbedded) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button
        onClick={toggleTheme}
        title="Basculer le thème (Auto système activé par défaut)"
        className="p-4 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.05)] bg-white dark:bg-slate-900 text-slate-900 dark:text-yellow-400 hover:scale-105 active:scale-95 transition-all duration-300 border border-slate-200 dark:border-slate-800 flex items-center justify-center group"
        aria-label="Dark Mode Toggle"
      >
        <div className="relative w-6 h-6 flex items-center justify-center">
          <Sun size={24} className="hidden dark:block transform rotate-0 scale-100 transition-all duration-500 group-hover:rotate-45" />
          <Moon size={24} className="block dark:hidden transform rotate-0 scale-100 transition-all duration-500 group-hover:-rotate-12" />
        </div>
      </button>
    </div>
  );
}
// made by larabi
