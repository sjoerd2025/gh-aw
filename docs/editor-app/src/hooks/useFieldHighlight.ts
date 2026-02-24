import { useEffect } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';

/**
 * Watches `highlightFieldPath` in the store. When set, finds the element
 * with a matching `data-field-path` attribute, scrolls it into view,
 * applies the `.field-highlight` CSS animation, and clears the state
 * after the animation completes.
 */
export function useFieldHighlight() {
  const highlightFieldPath = useWorkflowStore((s) => s.highlightFieldPath);
  const setHighlightFieldPath = useWorkflowStore((s) => s.setHighlightFieldPath);

  useEffect(() => {
    if (!highlightFieldPath) return;

    // Small delay to allow the panel to render after node selection
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-field-path="${CSS.escape(highlightFieldPath)}"]`,
      );
      if (!el) {
        setHighlightFieldPath(null);
        return;
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('field-highlight');

      const onEnd = () => {
        el.classList.remove('field-highlight');
        el.removeEventListener('animationend', onEnd);
      };
      el.addEventListener('animationend', onEnd);

      // Fallback: clear after 2.5s if animationend doesn't fire
      const timer = setTimeout(() => {
        el.classList.remove('field-highlight');
        el.removeEventListener('animationend', onEnd);
      }, 2500);

      setHighlightFieldPath(null);

      return () => {
        clearTimeout(timer);
        el.classList.remove('field-highlight');
        el.removeEventListener('animationend', onEnd);
      };
    });

    return () => cancelAnimationFrame(raf);
  }, [highlightFieldPath, setHighlightFieldPath]);
}
