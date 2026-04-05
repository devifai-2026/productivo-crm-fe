import { create } from 'zustand';

const getSystemTheme = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

const getInitialTheme = () => {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return getSystemTheme();
};

const applyTheme = (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const useThemeStore = create((set) => {
  const isDark = getInitialTheme();
  applyTheme(isDark);

  return {
    isDark,
    mode: localStorage.getItem('theme') || 'system',

    toggle: () =>
      set((state) => {
        const newDark = !state.isDark;
        localStorage.setItem('theme', newDark ? 'dark' : 'light');
        applyTheme(newDark);
        return { isDark: newDark, mode: newDark ? 'dark' : 'light' };
      }),

    setMode: (mode) =>
      set(() => {
        let isDark;
        if (mode === 'system') {
          isDark = getSystemTheme();
          localStorage.setItem('theme', 'system');
        } else {
          isDark = mode === 'dark';
          localStorage.setItem('theme', mode);
        }
        applyTheme(isDark);
        return { isDark, mode };
      }),
  };
});

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      applyTheme(e.matches);
      useThemeStore.setState({ isDark: e.matches });
    }
  });
}

export default useThemeStore;
