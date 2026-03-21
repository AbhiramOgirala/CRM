import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAccessibilityStore = create(
  persist(
    (set) => ({
      fontSize: 16, // base 16px
      highContrast: false,

      increaseFontSize: () => set((state) => {
        const newSize = Math.min(state.fontSize + 2, 20);
        document.documentElement.style.fontSize = `${newSize}px`;
        return { fontSize: newSize };
      }),
      decreaseFontSize: () => set((state) => {
        const newSize = Math.max(state.fontSize - 2, 12);
        document.documentElement.style.fontSize = `${newSize}px`;
        return { fontSize: newSize };
      }),
      resetFontSize: () => set(() => {
        document.documentElement.style.fontSize = '16px';
        return { fontSize: 16 };
      }),

      toggleHighContrast: () => set((state) => {
        const newVal = !state.highContrast;
        if (newVal) {
          document.documentElement.setAttribute('data-theme', 'high-contrast');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
        return { highContrast: newVal };
      }),
      
      // Called primarily on init to re-apply any saved styling
      initAccessibility: () => set((state) => {
        document.documentElement.style.fontSize = `${state.fontSize}px`;
        if (state.highContrast) {
          document.documentElement.setAttribute('data-theme', 'high-contrast');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
        return state;
      })
    }),
    {
      name: 'accessibility-storage',
    }
  )
);

export default useAccessibilityStore;
