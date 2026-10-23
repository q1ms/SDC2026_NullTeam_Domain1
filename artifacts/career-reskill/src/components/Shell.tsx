import { Link, useLocation } from 'wouter';
import { Activity, ArrowUpRight, Compass, GraduationCap, Layers3, Waypoints } from 'lucide-react';
import type { CareerProfile } from '../data/catalog';

export function Shell({ children, profile }: { children: React.ReactNode; profile: CareerProfile | null }) {
  const [location] = useLocation();
  const links = [
    { href: '/intake', label: 'Your profile', icon: Compass },
    { href: '/radar', label: 'Skills radar', icon: Activity },
    { href: '/pathway', label: 'Career pathways', icon: Waypoints },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar" data-testid="navigation-sidebar">
        <Link href="/" className="brand" data-testid="link-brand-home">
          <span className="brand-mark"><Layers3 size={19} /></span>
          <span><span className="brand-name">Northstar</span><span className="brand-caption">Career companion</span></span>
        </Link>
        <div className="nav-caption">Your next chapter</div>
        <nav className="nav-list" aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href} className={`nav-link ${location === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note" data-testid="text-sidebar-note">
            <div className="side-note-label"><GraduationCap size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />A steady way forward</div>
            <p>Small, focused learning steps can make a meaningful career shift feel manageable.</p>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-kicker">Career resilience, made personal</div>
          <div className="topbar-right"><span>{profile ? 'Profile saved in SQLite' : 'A practical guide to what’s next'}</span><span className="profile-dot" data-testid="status-profile">{profile ? profile.currentRole.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase() : <ArrowUpRight size={14} />}</span></div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
