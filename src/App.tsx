import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

// Pages
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Auth from './pages/Auth';
import Meals from './pages/Meals';
import Workouts from './pages/Workouts';
import Tasks from './pages/Tasks';
import Tracking from './pages/Tracking';

// Globals (Custom Design System)
import { globalCSS, Icon, Icons, navItems } from './pages/globals';
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <>
        <style>{globalCSS}</style>
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
          <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      </>
    );
  }

  return (
    <Router>
      {/* Inject custom design system */}
      <style>{globalCSS}</style>
      
      <div className="app">
        {user && profile?.onboarded && <Sidebar />}
        
        <div className="main">
          <Routes>
            <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
            <Route 
              path="/onboarding" 
              element={user ? (profile?.onboarded ? <Navigate to="/" /> : <Onboarding user={user} setProfile={setProfile} />) : <Navigate to="/auth" />} 
            />
            <Route 
              path="/" 
              element={user ? (profile?.onboarded ? <Dashboard profile={profile} /> : <Navigate to="/onboarding" />) : <Navigate to="/auth" />} 
            />
            <Route path="/meals" element={user && profile?.onboarded ? <Meals profile={profile} /> : <Navigate to="/auth" />} />
            <Route path="/workouts" element={user && profile?.onboarded ? <Workouts profile={profile} /> : <Navigate to="/auth" />} />
            <Route path="/tasks" element={user && profile?.onboarded ? <Tasks profile={profile} /> : <Navigate to="/auth" />} />
            <Route path="/tracking" element={user && profile?.onboarded ? <Tracking profile={profile} /> : <Navigate to="/auth" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [expanded, setExpanded] = useState(false);

  // Map the IDs from globals.jsx to actual route paths
  const routePaths = {
    dashboard: '/',
    meals: '/meals',
    workouts: '/workouts',
    tasks: '/tasks',
    tracking: '/tracking'
  };

  return (
    <div 
      className={`sidebar ${expanded ? 'expanded' : ''}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="logo-wrap" style={{ justifyContent: expanded ? "flex-start" : "center", padding: expanded ? "0 12px" : "0", cursor: "pointer" }} onClick={() => navigate('/')}>
        <div className="logo">
          <Icon d={Icons.flame} size={20} style={{ color: "white" }} />
        </div>
        {expanded && <span className="logo-label">AI LifeOS</span>}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, width: "100%", padding: expanded ? "0" : "0 12px" }}>
        {navItems.map((item) => {
          const path = routePaths[item.id as keyof typeof routePaths];
          const isActive = currentPath === path;
          
          return (
            <div 
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(path)}
              style={{ width: expanded ? "100%" : "48px" }}
            >
              <Icon d={item.icon} size={20} />
              {expanded && <span className="nav-label">{item.label}</span>}
              {!expanded && <div className="nav-tooltip">{item.label}</div>}
            </div>
          );
        })}
      </div>

      <div 
        className="nav-item" 
        onClick={() => auth.signOut()}
        style={{ marginTop: "auto", width: expanded ? "100%" : "48px", color: "var(--red)" }}
      >
        <Icon d={Icons.back} size={20} style={{ transform: "rotate(180deg)" }} />
        {expanded && <span className="nav-label">Logout</span>}
        {!expanded && <div className="nav-tooltip">Logout</div>}
      </div>
    </div>
  );
}