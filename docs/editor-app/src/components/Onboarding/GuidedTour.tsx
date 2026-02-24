import { useEffect, useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

interface TourStep {
  target: string;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '.app-canvas',
    title: 'Your Workflow Canvas',
    description:
      'This is your workflow canvas. Each card represents a part of your AI workflow.',
  },
  {
    target: '[data-tour-target="templates"]',
    title: 'Start with a Template',
    description:
      'Start with a template or build from scratch. Templates give you a working workflow in seconds.',
  },
  {
    target: '[data-tour-target="trigger"]',
    title: 'Choose Your Trigger',
    description:
      'Choose when your workflow runs — on issues, pull requests, schedules, or commands.',
  },
  {
    target: '[data-tour-target="engine"]',
    title: 'Pick an AI Engine',
    description: 'Pick your AI assistant. Each engine has different strengths.',
  },
  {
    target: '[data-tour-target="tools"]',
    title: 'Tools & Instructions',
    description:
      'Give your AI tools to work with and clear instructions for what to do.',
  },
  {
    target: '[data-tour-target="export"]',
    title: 'Export Your Workflow',
    description:
      "When you're done, export your workflow as a .md file and add it to your repository.",
  },
];

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 12;
const VIEWPORT_PADDING = 16;

function getTooltipPosition(rect: DOMRect): React.CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const estimatedHeight = 220;

  // Prefer placing below the spotlight
  let top: number;
  if (rect.bottom + SPOTLIGHT_PADDING + TOOLTIP_GAP + estimatedHeight < viewportHeight) {
    top = rect.bottom + SPOTLIGHT_PADDING + TOOLTIP_GAP;
  } else {
    top = rect.top - SPOTLIGHT_PADDING - TOOLTIP_GAP - estimatedHeight;
  }

  // Horizontal: center on target, clamped to viewport
  let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, viewportWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING),
  );
  top = Math.max(VIEWPORT_PADDING, top);

  return { top, left };
}

export function GuidedTour() {
  const step = useUIStore((s) => s.guidedTourStep);
  const setStep = useUIStore((s) => s.setGuidedTourStep);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef(0);

  const currentStep = step !== null && step >= 0 && step < TOUR_STEPS.length
    ? TOUR_STEPS[step]
    : null;

  const measureTarget = useCallback(() => {
    if (!currentStep) {
      setRect(null);
      return;
    }
    const el = document.querySelector(currentStep.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // Small delay so scroll settles before measuring
      rafRef.current = requestAnimationFrame(() => {
        setRect(el.getBoundingClientRect());
      });
    } else {
      setRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    measureTarget();
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
      cancelAnimationFrame(rafRef.current);
    };
  }, [measureTarget]);

  // Keyboard navigation
  useEffect(() => {
    if (step === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStep(null);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (step < TOUR_STEPS.length - 1) setStep(step + 1);
        else setStep(null);
      } else if (e.key === 'ArrowLeft') {
        if (step > 0) setStep(step - 1);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [step, setStep]);

  if (step === null || !currentStep) return null;

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setStep(null);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    setStep(null);
  };

  const spotlightStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
        borderRadius: 8,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        pointerEvents: 'none',
        transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
      }
    : { display: 'none' as const };

  const tooltipPos = rect
    ? getTooltipPosition(rect)
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <>
      {/* Clickable backdrop to dismiss */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={handleSkip}
      />

      {/* Spotlight cutout */}
      <div style={spotlightStyle} />

      {/* Tooltip */}
      <div
        style={{
          position: 'fixed',
          ...tooltipPos,
          zIndex: 10000,
          background: 'var(--color-bg-default, #ffffff)',
          borderRadius: 12,
          padding: 20,
          width: TOOLTIP_WIDTH,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--color-border-default, #d0d7de)',
          transition: 'top 0.3s ease, left 0.3s ease',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-fg-muted, #656d76)',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>

        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--color-fg-default, #1f2328)',
            marginBottom: 8,
            paddingRight: 20,
          }}
        >
          {currentStep.title}
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'var(--color-fg-muted, #656d76)',
            lineHeight: 1.5,
            marginBottom: 16,
          }}
        >
          {currentStep.description}
        </div>

        {/* Footer: step indicator + buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--color-fg-muted, #656d76)',
            }}
          >
            {step + 1} of {TOUR_STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSkip} style={skipBtnStyle}>
              Skip
            </button>
            {step > 0 && (
              <button onClick={handleBack} style={backBtnStyle}>
                Back
              </button>
            )}
            <button onClick={handleNext} style={nextBtnStyle}>
              {step === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </div>

        {/* Step dots */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            marginTop: 12,
          }}
        >
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background:
                  i === step
                    ? 'var(--color-accent-fg, #0969da)'
                    : 'var(--color-border-default, #d0d7de)',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

const btnBase: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 6,
  padding: '5px 12px',
  cursor: 'pointer',
  border: 'none',
  transition: 'background 0.15s ease, color 0.15s ease',
};

const skipBtnStyle: React.CSSProperties = {
  ...btnBase,
  background: 'none',
  color: 'var(--color-fg-muted, #656d76)',
};

const backBtnStyle: React.CSSProperties = {
  ...btnBase,
  background: 'var(--color-bg-subtle, #f6f8fa)',
  color: 'var(--color-fg-default, #1f2328)',
  border: '1px solid var(--color-border-default, #d0d7de)',
};

const nextBtnStyle: React.CSSProperties = {
  ...btnBase,
  background: 'var(--color-accent-fg, #0969da)',
  color: '#ffffff',
};
