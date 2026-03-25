import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

// Pages
import Dashboard  from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Auth       from './pages/Auth';
import Meals      from './pages/Meals';
import Workouts   from './pages/Workouts';
import Tasks      from './pages/Tasks';
import Tracking   from './pages/Tracking';

// Design system
import { globalCSS, Icon, Icons, navItems, ToastProvider } from './pages/globals';

export default function App() {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) setProfile(snap.data() as UserProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <style>{globalCSS}</style>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 16 }}>
          <div style={{ width: 48, height: 48, background: 'var(--accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 12px 32px rgba(124,111,239,0.45)' }}>
            <Icon d={Icons.flame} size={24} style={{ color: 'white' }} />
          </div>
          <div style={{ width: 28, height: 28, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  return (
    <Router>
      <style>{globalCSS}</style>
      <ToastProvider>
        <div className="app">
          {user && profile?.onboarded && <Sidebar profile={profile} />}
          <div className="main">
            <Routes>
              <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
              <Route
                path="/onboarding"
                element={user
                  ? (profile?.onboarded ? <Navigate to="/" /> : <Onboarding user={user} setProfile={setProfile} />)
                  : <Navigate to="/auth" />}
              />
              <Route path="/"         element={user ? (profile?.onboarded ? <Dashboard profile={profile} setProfile={setProfile} /> : <Navigate to="/onboarding" />) : <Navigate to="/auth" />} />
              <Route path="/meals"    element={user && profile?.onboarded ? <Meals    profile={profile} /> : <Navigate to="/auth" />} />
              <Route path="/workouts" element={user && profile?.onboarded ? <Workouts profile={profile} setProfile={setProfile} /> : <Navigate to="/auth" />} />
              <Route path="/tasks"    element={user && profile?.onboarded ? <Tasks    profile={profile} /> : <Navigate to="/auth" />} />
              <Route path="/tracking" element={user && profile?.onboarded ? <Tracking profile={profile} /> : <Navigate to="/auth" />} />
            </Routes>
          </div>
        </div>
      </ToastProvider>
    </Router>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ profile }: { profile: UserProfile }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [expanded, setExpanded] = useState(false);

  const routePaths: Record<string, string> = {
    dashboard: '/', meals: '/meals', workouts: '/workouts', tasks: '/tasks', tracking: '/tracking',
  };

  return (
    <div
      className={`sidebar ${expanded ? 'expanded' : ''}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div
        className="logo-wrap"
        style={{ justifyContent: expanded ? 'flex-start' : 'center', padding: expanded ? '0 4px' : '0', cursor: 'pointer' }}
        onClick={() => navigate('/')}
      >
        <div className="logo">
          <Icon d={Icons.flame} size={20} style={{ color: 'white' }} />
        </div>
        <span className="logo-label">AI LifeOS</span>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, width: '100%', padding: expanded ? '0' : '0 12px' }}>
        {navItems.map(item => {
          const path     = routePaths[item.id];
          const isActive = location.pathname === path;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(path)}
              style={{ width: expanded ? '100%' : '48px' }}
            >
              <Icon d={item.icon} size={20} />
              <span className="nav-label">{item.label}</span>
              {!expanded && <div className="nav-tooltip">{item.label}</div>}
            </div>
          );
        })}
      </div>

      {/* User info + logout */}
      <div style={{ width: '100%', padding: expanded ? '0' : '0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {expanded && (
          <div style={{ padding: '10px 12px', borderRadius: 'var(--r)', background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 4 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.email}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Lv {profile.level} · {profile.xp} XP</p>
          </div>
        )}
        <div
          className="nav-item"
          onClick={() => auth.signOut()}
          style={{ width: expanded ? '100%' : '48px', color: 'var(--red)' }}
        >
          <Icon d={Icons.back} size={20} style={{ transform: 'rotate(180deg)' }} />
          <span className="nav-label">Logout</span>
          {!expanded && <div className="nav-tooltip">Logout</div>}
        </div>
      </div>
    </div>
  );
}