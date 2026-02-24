import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Rocket, LayoutTemplate, Compass, X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

export function WelcomeModal() {
  const setHasSeenOnboarding = useUIStore((s) => s.setHasSeenOnboarding);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setGuidedTourStep = useUIStore((s) => s.setGuidedTourStep);

  const handleStartScratch = () => {
    setHasSeenOnboarding(true);
  };

  const handleBrowseTemplates = () => {
    setSidebarTab('templates');
    if (!sidebarOpen) {
      toggleSidebar();
    }
    setHasSeenOnboarding(true);
  };

  const handleTakeTour = () => {
    setHasSeenOnboarding(true);
    setGuidedTourStep(0);
  };

  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => !open && setHasSeenOnboarding(true)}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
        }} />
        <Dialog.Content style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--color-bg-default, #ffffff)',
          borderRadius: 16,
          padding: 32,
          width: 480,
          maxWidth: '90vw',
          zIndex: 1001,
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--color-border-default, #d0d7de)',
        }}>
          <Dialog.Close asChild>
            <button style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-fg-muted, #656d76)',
              padding: 4,
              borderRadius: 4,
              transition: 'background 0.15s ease',
            }}>
              <X size={18} />
            </button>
          </Dialog.Close>

          <Dialog.Title style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 8,
            color: 'var(--color-fg-default, #1f2328)',
          }}>
            Welcome to the Workflow Builder!
          </Dialog.Title>

          <Dialog.Description style={{
            fontSize: 14,
            color: 'var(--color-fg-muted, #656d76)',
            marginBottom: 24,
            lineHeight: 1.5,
          }}>
            Create AI-powered GitHub workflows visually -- no coding required.
          </Dialog.Description>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <OptionCard
              icon={<Rocket size={24} />}
              title="Start from scratch"
              description="Build your workflow step by step"
              onClick={handleStartScratch}
            />
            <OptionCard
              icon={<LayoutTemplate size={24} />}
              title="Browse templates"
              description="Start with a pre-built workflow and customize"
              onClick={handleBrowseTemplates}
            />
          </div>
          <button
            onClick={handleTakeTour}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '10px 0',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-accent-fg, #0969da)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 8,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-subtle, #f6f8fa)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <Compass size={16} />
            Take a guided tour
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OptionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 20,
        border: `1px solid ${hovered ? 'var(--color-accent-fg, #0969da)' : 'var(--color-border-default, #d0d7de)'}`,
        borderRadius: 12,
        background: hovered ? 'var(--color-bg-subtle, #f6f8fa)' : 'var(--color-bg-default, #ffffff)',
        cursor: 'pointer',
        textAlign: 'center' as const,
        boxShadow: hovered ? '0 0 0 3px color-mix(in srgb, var(--color-accent-fg, #0969da) 15%, transparent)' : 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
      }}
    >
      <div style={{ color: 'var(--color-accent-fg, #0969da)' }}>{icon}</div>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--color-fg-default, #1f2328)',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 12,
        color: 'var(--color-fg-muted, #656d76)',
        lineHeight: 1.4,
      }}>
        {description}
      </div>
    </button>
  );
}
