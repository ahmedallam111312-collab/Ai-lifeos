import { useState, useEffect, useCallback } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Icon, Icons, Donut, statusBadge, statusLabel } from "./globals";

// ─── PROJECT DETAIL PAGE ─────────────────────────────────────────────────────
/**
 * Full-page view for a single project: progress ring, subtask checklist,
 * editable notes, metadata.
 *
 * Props:
 *   task     — task object (subtasks array, notes, progress, etc.)
 *   onBack   — callback to return to the list
 *   onUpdate — callback(updatedTask) to persist changes
 */
function TaskProjectPage({ task: initTask, onBack, onUpdate }) {
  const [task,        setTask]        = useState(initTask);
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal,     setNoteVal]     = useState(initTask.notes ?? "");

  const toggleSubtask = (subId) => {
    const updated = {
      ...task,
      subtasks: task.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s),
    };
    const doneCount = updated.subtasks.filter(s => s.done).length;
    updated.progress = Math.round((doneCount / updated.subtasks.length) * 100);
    setTask(updated);
    onUpdate(updated);
  };

  const saveNote = () => {
    const updated = { ...task, notes: noteVal };
    setTask(updated);
    onUpdate(updated);
    setEditingNote(false);
  };

  const doneCount = task.subtasks.filter(s => s.done).length;

  return (
    <div className="page task-page" style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 720 }}>

      {/* ── Back + meta ── */}
      <div>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 20, gap: 6 }}>
          <Icon d={Icons.back} size={16} /> All Projects
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <div className={`priority-dot priority-${task.priority}`} />
              <span className={`badge ${statusBadge[task.status]}`}>{statusLabel[task.status]}</span>
              <span className="badge badge-gray">📅 {task.deadline}</span>
            </div>
            <h1 style={{ fontSize: 26, lineHeight: 1.2, marginBottom: 10 }}>{task.title}</h1>
            <p className="muted">{task.description}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {task.tags.map(t => <span key={t} className="badge badge-accent" style={{ fontSize: 12 }}>{t}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress hero ── */}
      <div className="card glow-card" style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
          <Donut pct={task.progress} color="var(--accent2)" size={100} strokeW={8} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>{task.progress}%</span>
            <span className="dimmer" style={{ fontSize: 11 }}>done</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Overall Progress</p>
          <div className="progress-track" style={{ height: 10, marginBottom: 10 }}>
            <div className="progress-fill" style={{ width: `${task.progress}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }} />
          </div>
          <p className="muted" style={{ fontSize: 14 }}>{doneCount} of {task.subtasks.length} steps completed</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32 }}>{doneCount}/{task.subtasks.length}</p>
          <p className="label">Subtasks</p>
        </div>
      </div>

      {/* ── Subtask checklist ── */}
      <div className="card">
        <div className="sec-header" style={{ marginBottom: 20 }}>
          <h2>Steps & Milestones</h2>
          <span className="label">{task.subtasks.length - doneCount} remaining</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {task.subtasks.map((s, i) => (
            <div key={s.id} className="subtask-row" onClick={() => toggleSubtask(s.id)}
              style={{ animation: `fadeIn ${0.1 + i * 0.05}s ease both` }}>
              <div className={`check-circle ${s.done ? "done" : ""}`}>
                <Icon d={Icons.check} size={11} />
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500,
                textDecoration: s.done ? "line-through" : "none",
                color:          s.done ? "var(--text3)" : "var(--text)" }}>
                {s.title}
              </span>
              {s.done && <span className="badge badge-green" style={{ fontSize: 11 }}>Done</span>}
            </div>
          ))}
          {task.subtasks.length === 0 && (
            <p className="dimmer" style={{ fontStyle: "italic", padding: "16px 14px" }}>No subtasks yet.</p>
          )}
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="card">
        <div className="sec-header">
          <h2>Notes & Context</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditingNote(true); setNoteVal(task.notes ?? ""); }}>
            <Icon d={Icons.edit} size={16} />
          </button>
        </div>
        {editingNote ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <textarea value={noteVal} onChange={e => setNoteVal(e.target.value)} style={{ minHeight: 120, resize: "vertical" }} autoFocus />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={saveNote}>Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingNote(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {task.notes || <span className="dimmer" style={{ fontStyle: "italic" }}>No notes yet. Click the pencil to add some.</span>}
          </p>
        )}
      </div>

      {/* ── Meta strip ── */}
      <div className="grid-3">
        {[
          { label: "Priority", value: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) },
          { label: "Deadline", value: task.deadline },
          { label: "Tags",     value: task.tags.join(", ") || "—" },
        ].map((s, i) => (
          <div key={i} className="glass">
            <p className="label" style={{ marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TASKS LIST ───────────────────────────────────────────────────────────────
/**
 * Projects list page — shows all tasks as cards.
 * Clicking a card opens TaskProjectPage inline (no router needed).
 *
 * Props:
 *   profile — UserProfile object
 */
export default function Tasks({ profile }) {
  const [tasks,    setTasks]    = useState([]);
  const [openTask, setOpenTask] = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);
  const [filter,   setFilter]   = useState("all");
  const [newTask,  setNewTask]  = useState({
    title: "", description: "", priority: "medium", deadline: "", tags: "", status: "todo",
  });

  useEffect(() => {
    const q = query(collection(db, "tasks"), where("userId", "==", profile.uid));
    return onSnapshot(q, snap =>
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [profile.uid]);

  // Persist updated task to Firestore and local state
  const updateTask = useCallback(async (updated) => {
    const { id, ...data } = updated;
    await updateDoc(doc(db, "tasks", id), data);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    if (openTask?.id === id) setOpenTask(updated);
  }, [openTask]);

  const addNewTask = async () => {
    if (!newTask.title.trim()) return;
    await addDoc(collection(db, "tasks"), {
      userId:      profile.uid,
      title:       newTask.title,
      description: newTask.description,
      priority:    newTask.priority,
      deadline:    newTask.deadline,
      status:      newTask.status,
      tags:        newTask.tags.split(",").map(t => t.trim()).filter(Boolean),
      subtasks:    [],
      notes:       "",
      progress:    0,
      createdAt:   serverTimestamp(),
    });
    setShowAdd(false);
    setNewTask({ title: "", description: "", priority: "medium", deadline: "", tags: "", status: "todo" });
  };

  const deleteTask = async (id) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  // If a project page is open, render it
  if (openTask) {
    const fresh = tasks.find(t => t.id === openTask.id) || openTask;
    return <TaskProjectPage task={fresh} onBack={() => setOpenTask(null)} onUpdate={updateTask} />;
  }

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className="label" style={{ marginBottom: 4 }}>Project Tracker</p>
          <h1>My Projects</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon d={Icons.plus} size={16} /> New Project
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid-3">
        {[
          { label: "In Progress", count: tasks.filter(t => t.status === "in_progress").length, color: "var(--accent2)" },
          { label: "To Do",       count: tasks.filter(t => t.status === "todo").length,         color: "var(--text2)"   },
          { label: "Done",        count: tasks.filter(t => t.status === "done").length,         color: "var(--green)"   },
        ].map((s, i) => (
          <div key={i} className="card card-sm" style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, color: s.color }}>{s.count}</p>
            <p className="label" style={{ marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: "flex", gap: 8, background: "var(--surface)", padding: 4, borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
        {[["all", "All"], ["in_progress", "In Progress"], ["todo", "To Do"], ["done", "Done"]].map(([val, lab]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-body)",
              background:  filter === val ? "var(--bg2)"    : "transparent",
              color:       filter === val ? "var(--text)"   : "var(--text3)",
              boxShadow:   filter === val ? "var(--shadow2)": "none",
              transition: "all 0.2s" }}>
            {lab}
          </button>
        ))}
      </div>

      {/* ── Task cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((task, i) => (
          <div key={task.id} className="card" style={{ cursor: "pointer", animation: `fadeIn ${0.1 + i * 0.04}s ease both` }}
            onClick={() => setOpenTask(task)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)";  e.currentTarget.style.transform = ""; }}>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div className={`priority-dot priority-${task.priority}`} style={{ marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>{task.title}</h3>
                  <span className={`badge ${statusBadge[task.status]}`}>{statusLabel[task.status]}</span>
                </div>
                <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{task.description}</p>

                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  {/* Progress bar */}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="dimmer" style={{ fontSize: 12 }}>
                        {(task.subtasks ?? []).filter(s => s.done).length}/{(task.subtasks ?? []).length} steps
                      </span>
                      <span style={{ fontSize: 12, color: "var(--accent2)", fontWeight: 600 }}>{task.progress ?? 0}%</span>
                    </div>
                    <div className="progress-track" style={{ height: 5 }}>
                      <div className="progress-fill" style={{ width: `${task.progress ?? 0}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }} />
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(task.tags ?? []).map(t => <span key={t} className="badge badge-gray" style={{ fontSize: 11 }}>{t}</span>)}
                  </div>

                  <span className="dimmer" style={{ fontSize: 12 }}>📅 {task.deadline}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-icon btn-sm"
                  onClick={e => { e.stopPropagation(); if (window.confirm("Delete this project?")) deleteTask(task.id); }}>
                  <Icon d={Icons.trash} size={15} />
                </button>
                <Icon d={Icons.chevRight} size={18} style={{ color: "var(--text3)", marginTop: 2 }} />
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p className="dimmer" style={{ fontStyle: "italic" }}>No projects found.</p>
          </div>
        )}
      </div>

      {/* ── New project modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2>New Project</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}>
                <Icon d={Icons.x} size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p className="label" style={{ marginBottom: 8 }}>Project Title</p>
                <input placeholder="What are you working on?" value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })} autoFocus />
              </div>

              <div>
                <p className="label" style={{ marginBottom: 8 }}>Description</p>
                <textarea placeholder="Brief overview of this project..." value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  style={{ minHeight: 80 }} />
              </div>

              <div className="grid-2" style={{ gap: 12 }}>
                <div>
                  <p className="label" style={{ marginBottom: 8 }}>Priority</p>
                  <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <p className="label" style={{ marginBottom: 8 }}>Deadline</p>
                  <input type="date" value={newTask.deadline}
                    onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} />
                </div>
              </div>

              <div>
                <p className="label" style={{ marginBottom: 8 }}>Tags <span className="dimmer">(comma separated)</span></p>
                <input placeholder="health, work, learning..." value={newTask.tags}
                  onChange={e => setNewTask({ ...newTask, tags: e.target.value })} />
              </div>

              <button className="btn btn-primary" onClick={addNewTask}
                style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                <Icon d={Icons.plus} size={16} /> Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}