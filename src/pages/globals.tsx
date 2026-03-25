// ─── DESIGN TOKENS / GLOBAL CSS ──────────────────────────────────────────────
export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --bg2: #111118;
    --bg3: #18181f;
    --surface: rgba(255,255,255,0.04);
    --surface2: rgba(255,255,255,0.07);
    --border: rgba(255,255,255,0.08);
    --border2: rgba(255,255,255,0.14);
    --text: #f0efff;
    --text2: rgba(240,239,255,0.55);
    --text3: rgba(240,239,255,0.28);
    --accent: #7c6fef;
    --accent2: #a897ff;
    --accent-glow: rgba(124,111,239,0.18);
    --green: #3ecf8e;
    --green2: rgba(62,207,142,0.12);
    --amber: #f5a623;
    --amber2: rgba(245,166,35,0.12);
    --red: #ff5e5e;
    --red2: rgba(255,94,94,0.12);
    --blue: #4c9ef5;
    --blue2: rgba(76,158,245,0.12);
    --r: 16px;
    --r2: 24px;
    --r3: 32px;
    --font-display: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
    --shadow: 0 8px 32px rgba(0,0,0,0.4);
    --shadow2: 0 2px 12px rgba(0,0,0,0.3);
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 15px; line-height: 1.6; -webkit-font-smoothing: antialiased; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  .app { display: flex; height: 100vh; overflow: hidden; }

  .sidebar {
    width: 72px; background: var(--bg2); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; align-items: center;
    padding: 20px 0; gap: 6px; flex-shrink: 0; z-index: 10;
    transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
  }
  .sidebar.expanded { width: 220px; align-items: flex-start; padding: 20px 12px; }
  .logo {
    width: 40px; height: 40px; background: var(--accent); border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-weight: 800; font-size: 18px;
    color: white; flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 8px 24px rgba(124,111,239,0.4);
  }
  .logo-wrap { display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 16px; }
  .logo-label { font-family: var(--font-display); font-weight: 700; font-size: 16px; white-space: nowrap; overflow: hidden; }
  .nav-item {
    width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s; color: var(--text3); position: relative;
    border: 1px solid transparent; flex-shrink: 0;
  }
  .nav-item:hover { background: var(--surface); color: var(--text2); }
  .nav-item.active { background: var(--accent-glow); color: var(--accent2); border-color: rgba(124,111,239,0.3); }
  .nav-item svg { width: 20px; height: 20px; }
  .sidebar.expanded .nav-item { width: 100%; padding: 0 12px; gap: 12px; justify-content: flex-start; height: 44px; }
  .nav-label { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; }
  .nav-tooltip {
    position: absolute; left: 56px; background: var(--bg3); border: 1px solid var(--border2);
    padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 500; white-space: nowrap;
    pointer-events: none; opacity: 0; transition: opacity 0.15s; z-index: 100;
  }
  .nav-item:hover .nav-tooltip { opacity: 1; }

  .main { flex: 1; overflow-y: auto; background: var(--bg); }
  .page { padding: 32px; max-width: 900px; animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

  .card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r2); padding: 24px; transition: border-color 0.2s; }
  .card:hover { border-color: var(--border2); }
  .card-sm { padding: 16px; border-radius: var(--r); }
  .glass { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; }
  .glow-card { box-shadow: 0 0 0 1px rgba(124,111,239,0.15), 0 16px 48px rgba(124,111,239,0.08); }

  h1 { font-family: var(--font-display); font-weight: 700; font-size: 28px; letter-spacing: -0.5px; }
  h2 { font-family: var(--font-display); font-weight: 600; font-size: 20px; letter-spacing: -0.3px; }
  h3 { font-family: var(--font-display); font-weight: 600; font-size: 16px; }
  .label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text3); }
  .muted { color: var(--text2); }
  .dimmer { color: var(--text3); }
  .big-num { font-family: var(--font-display); font-weight: 700; font-size: 42px; letter-spacing: -2px; line-height: 1; }
  .med-num { font-family: var(--font-display); font-weight: 600; font-size: 28px; letter-spacing: -1px; }
  .sec-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }

  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: var(--r); font-family: var(--font-body); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; white-space: nowrap; }
  .btn-primary { background: var(--accent); color: white; box-shadow: 0 0 0 1px rgba(255,255,255,0.1) inset, 0 4px 16px rgba(124,111,239,0.35); }
  .btn-primary:hover { background: var(--accent2); transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.15) inset, 0 8px 24px rgba(124,111,239,0.45); }
  .btn-secondary { background: var(--surface2); color: var(--text); border-color: var(--border); }
  .btn-secondary:hover { background: var(--surface); border-color: var(--border2); }
  .btn-ghost { background: transparent; color: var(--text2); }
  .btn-ghost:hover { background: var(--surface); color: var(--text); }
  .btn-sm { padding: 6px 14px; font-size: 13px; }
  .btn-icon { padding: 10px; gap: 0; }

  .progress-track { background: var(--surface2); border-radius: 999px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 999px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

  .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-accent { background: var(--accent-glow); color: var(--accent2); }
  .badge-green { background: var(--green2); color: var(--green); }
  .badge-amber { background: var(--amber2); color: var(--amber); }
  .badge-red { background: var(--red2); color: var(--red); }
  .badge-blue { background: var(--blue2); color: var(--blue); }
  .badge-gray { background: var(--surface2); color: var(--text2); }

  input, textarea, select { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); color: var(--text); font-family: var(--font-body); font-size: 14px; padding: 10px 14px; outline: none; transition: border-color 0.2s; width: 100%; }
  input:focus, textarea:focus, select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
  ::placeholder { color: var(--text3); }

  .divider { height: 1px; background: var(--border); margin: 20px 0; }
  .macro-pill { font-size: 12px; color: var(--text3); font-weight: 500; }

  .priority-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .priority-high { background: var(--red); box-shadow: 0 0 6px var(--red); }
  .priority-medium { background: var(--amber); box-shadow: 0 0 6px var(--amber); }
  .priority-low { background: var(--green); box-shadow: 0 0 6px var(--green); }

  .modal-overlay { position: fixed; inset: 0; background: rgba(10,10,15,0.85); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .modal { background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--r3); padding: 32px; width: 100%; max-width: 520px; animation: scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }

  .subtask-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--r); transition: background 0.15s; cursor: pointer; }
  .subtask-row:hover { background: var(--surface); }
  .check-circle { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
  .check-circle.done { background: var(--green); border-color: var(--green); }
  .check-circle svg { width: 11px; height: 11px; color: white; opacity: 0; transition: opacity 0.2s; }
  .check-circle.done svg { opacity: 1; }

  .task-page { animation: slideUp 0.3s cubic-bezier(0.4,0,0.2,1); }
  @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }

  .ex-row { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); transition: all 0.2s; cursor: pointer; }
  .ex-row:hover { border-color: var(--border2); }
  .ex-row.done { opacity: 0.45; }
  .ex-check { width: 36px; height: 36px; border-radius: 10px; border: 1.5px solid var(--border2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
  .ex-check.done { background: var(--green); border-color: var(--green); }

  .water-btn { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; border: none; font-size: 22px; }
  .water-plus { background: var(--accent-glow); color: var(--accent2); border: 1px solid rgba(124,111,239,0.3); }
  .water-plus:hover { background: var(--accent); color: white; }
  .water-minus { background: var(--surface2); color: var(--text2); border: 1px solid var(--border); }
  .water-minus:hover { background: var(--surface); }

  .step-dot { width: 8px; height: 8px; border-radius: 999px; transition: all 0.4s cubic-bezier(0.4,0,0.2,1); background: var(--border2); }
  .step-dot.active { background: var(--accent); width: 24px; }

  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

  @media (max-width: 640px) {
    .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
    .page { padding: 20px; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── ICONS ───────────────────────────────────────────────────────────────────
export const Icon = ({ d, size = 20, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

export const Icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  meals: "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3",
  tasks: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  tracking: "M22 12h-4l-3 9L9 3l-3 9H2",
  workouts: "M6.5 6.5h11M6.5 17.5h11M3 12h18M3 6.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM17 6.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM3 17.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM17 17.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z",
  back: "M19 12H5M12 5l-7 7 7 7",
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  flame: "M12 2c0 0-5 4-5 9a5 5 0 0010 0c0-5-5-9-5-9z",
  trophy: "M8 21h8M12 17v4M17 4H7L6 11a6 6 0 0012 0L17 4zM5 7H2M22 7h-3",
  droplets: "M12 2.69l5.66 5.66a8 8 0 11-11.31 0z",
  footsteps: "M19 5c-1.5 0-2.8 1.4-3 2-3.5 1.3-8.44 4.3-11.06 8.02C2.4 17.4 2.5 19.6 4 21c1.5 1.4 3.8 1.3 5.3-.1a7.16 7.16 0 003.7-5.5c1.6-.7 3.1-1.6 4.5-2.6V18c0 1.1.9 2 2 2h.5c.3 0 .5-.2.5-.5V5.5c0-.3-.2-.5-.5-.5H19z",
  scale: "M12 3v18M3 7h18M5 21l7-2 7 2M5 3l7 2 7-2",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  dumbbell: "M6.5 6.5h11M6.5 17.5h11M3 12h18M3 6.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM17 6.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM3 17.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM17 17.5c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6",
  x: "M18 6L6 18M6 6l12 12",
  camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 13m-4 0a4 4 0 108 0 4 4 0 00-8 0",
  chevRight: "M9 18l6-6-6-6",
  sparkle: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Icons.dashboard },
  { id: "meals",     label: "Meals",     icon: Icons.meals },
  { id: "tasks",     label: "Projects",  icon: Icons.tasks },
  { id: "tracking",  label: "Tracking",  icon: Icons.tracking },
  { id: "workouts",  label: "Workouts",  icon: Icons.workouts },
];

// ─── BADGE HELPERS ────────────────────────────────────────────────────────────
export const statusBadge = { todo: "badge-gray", in_progress: "badge-accent", done: "badge-green" };
export const statusLabel = { todo: "To Do", in_progress: "In Progress", done: "Done" };

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
export function Donut({ pct, color, size = 80, strokeW = 7 }) {
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={strokeW} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

export function Sparkline({ data, color = "var(--accent)", height = 52 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.weight);
  const min = Math.min(...vals) - 1;
  const max = Math.max(...vals) + 1;
  const w = 260; const h = height;
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * w,
    h - ((v - min) / (max - min)) * h,
  ]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={color} />)}
    </svg>
  );
}