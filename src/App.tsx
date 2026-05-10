import { useEffect } from 'react';
import { Desktop } from './shell/Desktop';
import { Tray } from './shell/Tray';
import { Dock } from './shell/Dock';
import { Notifications } from './shell/Notifications';
import { Boot } from './shell/Boot';
import { useWebSocket } from './api/useWebSocket';
import { useHealth } from './api/hooks';
import { useStore } from './store';
import type { DistroUser } from './lib/types';

function applyBrand(brand: import('./lib/types').DistributionBrand) {
  const root = document.documentElement;
  root.style.setProperty('--color-kernel', brand.primary);
  root.style.setProperty('--color-kernel-soft', `${brand.primary}20`);
  root.style.setProperty('--color-kernel-glow', `${brand.primary}55`);
  root.style.setProperty('--color-cortex', brand.accent);
  root.style.setProperty('--color-cortex-soft', `${brand.accent}20`);
  root.style.setProperty('--color-cortex-glow', `${brand.accent}55`);
  root.style.setProperty('--color-os-bg', brand.background);
  root.style.setProperty('--color-os-desktop', brand.background);
  root.style.setProperty('--color-os-panel', brand.panel);
}

function OsShell() {
  useWebSocket();
  const setDistributionName = useStore((s) => s.setDistributionName);
  const setPackageApps = useStore((s) => s.setPackageApps);
  const setUsers = useStore((s) => s.setUsers);
  const setActiveUser = useStore((s) => s.setActiveUser);
  const { data: health } = useHealth();

  useEffect(() => {
    if (!health) return;

    if (health.distribution) {
      setDistributionName(health.distribution);
    }
    if (health.brand) {
      applyBrand(health.brand);
    }

    if (health.users) {
      const userList: DistroUser[] = Object.entries(health.users).map(([slug, u]) => ({
        slug,
        name: u.name ?? slug,
        role: u.role ?? 'member',
        initials: u.initials ?? slug.slice(0, 2).toUpperCase(),
        color: u.color ?? '#888',
      }));
      setUsers(userList);

      const instanceUser = health.instance?.user;
      const active = userList.find(u => u.slug === instanceUser) ?? userList[0] ?? null;
      setActiveUser(active);
    }
  }, [health, setDistributionName, setPackageApps, setUsers, setActiveUser]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative"
      style={{ background: 'var(--color-os-bg)' }}>
      <Tray />
      <Desktop />
      <Dock />
      <Notifications />
      <Boot />
    </div>
  );
}

export default function App() {
  return <OsShell />;
}
