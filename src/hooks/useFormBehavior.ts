import { useEffect } from 'react';

export function useFormBehavior() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLInputElement;
      if (e.key !== 'Enter') return;
      if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT') return;
      if (['submit','button','checkbox','radio'].includes(el.type)) return;
      e.preventDefault();
      const focusable = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), select:not([disabled]), textarea:not([disabled])'
        )
      ).filter(el => el.offsetParent !== null);
      const idx = focusable.indexOf(el);
      if (idx >= 0 && idx < focusable.length - 1) {
        const next = focusable[idx + 1] as HTMLInputElement;
        next.focus();
        if (next.select) next.select();
      }
    };
    const handleFocus = (e: FocusEvent) => {
      const el = e.target as HTMLInputElement;
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
      if (['checkbox','radio'].includes(el.type)) return;
      setTimeout(() => el.select(), 0);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focus', handleFocus, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focus', handleFocus, true);
    };
  }, []);
}
