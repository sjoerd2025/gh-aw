import { LayoutDashboard, Settings, PanelLeft, Download } from 'lucide-react';
import { useUIStore, type MobilePane } from '../../stores/uiStore';

const tabs: { id: MobilePane; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'canvas', label: 'Canvas', icon: LayoutDashboard },
  { id: 'properties', label: 'Properties', icon: Settings },
  { id: 'sidebar', label: 'Sidebar', icon: PanelLeft },
  { id: 'export', label: 'Export', icon: Download },
];

export function MobileTabBar() {
  const mobilePane = useUIStore((s) => s.mobilePane);
  const setMobilePane = useUIStore((s) => s.setMobilePane);

  return (
    <nav className="mobile-tab-bar" aria-label="Mobile navigation">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`mobile-tab-btn${mobilePane === id ? ' active' : ''}`}
          onClick={() => setMobilePane(id)}
          aria-current={mobilePane === id ? 'page' : undefined}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
