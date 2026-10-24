import { Link, useLocation } from 'wouter';
import { Activity, ArrowUpRight, Check, Compass, GraduationCap, Waypoints } from 'lucide-react';
import type { CareerProfile } from '../data/catalog';
import { LightRays } from './effects/LightRays';
import { useMagicSurfaces } from './effects/useMagicSurfaces';
import { useLanguage } from '../i18n/LanguageContext';

export function Shell({ children, profile }: { children: React.ReactNode; profile: CareerProfile | null }) {
  const [location] = useLocation();
  const { t } = useLanguage();
  useMagicSurfaces();
  const links = [
    { href: '/intake', label: t('navigation.profile'), icon: Compass, id: 'profile' },
    { href: '/radar', label: t('navigation.radar'), icon: Activity, id: 'radar' },
    { href: '/pathway', label: t('navigation.pathways'), icon: Waypoints, id: 'pathways' },
  ];
  return (
    <div className="app-shell">
      <div className="app-backdrop" aria-hidden="true"><LightRays /></div>
      <aside className="sidebar glow-edge" data-testid="navigation-sidebar">
        <Link href="/" className="brand" aria-label="JAX home" data-testid="link-brand-home">
          <img className="brand-logo" src="/jax-wordmark.png" alt="JAX wordmark with star and orbit" />
        </Link>
        <div className="nav-caption">{t('navigation.chapter')}</div>
        <nav className="nav-list pill-nav" aria-label={t('navigation.chapter')}>
          {links.map(({ href, label, icon: Icon, id }) => (
            <Link href={href} key={href} className={`nav-link ${location === href ? 'active' : ''}`} aria-current={location === href ? "page" : undefined} data-testid={`link-nav-${id}`}>
              <span className="pill-hover" aria-hidden="true" /><Icon size={17} strokeWidth={1.8} /><span className="pill-label">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note glow-edge glow-edge-soft" data-testid="text-sidebar-note">
            <div className="side-note-label"><GraduationCap size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />A steady way forward</div>
            <p>Small, focused learning steps can make a meaningful career shift feel manageable.</p>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-kicker">{t('header.kicker')}</div>
          <div className="topbar-right">
            {profile
              ? <span className="profile-status"><Check size={13} strokeWidth={2.5} aria-hidden="true" /> {t('header.saved')}</span>
              : <span>{t('header.guide')}</span>}
            <span className="profile-dot" data-testid="status-profile">{profile ? profile.currentRole.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase() : <ArrowUpRight size={14} />}</span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
