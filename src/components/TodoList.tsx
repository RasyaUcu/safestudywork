import { useState, useEffect, useRef } from "react";
import { getItem, setItem, STORAGE, today } from "../lib/store";
import type { Todo, SubTask } from "../lib/store";

const TAG_META = {
  school:   { label: "📚 Sekolah",  color: "#60a5fa" },
  task:     { label: "📋 Tugas",    color: "#a78bfa" },
  personal: { label: "🌟 Pribadi",  color: "#fb923c" },
} as const;

const PRIO_META = {
  high: { label: "🔴 Penting" },
  mid:  { label: "🟡 Sedang"  },
  low:  { label: "🟢 Santai"  },
} as const;

type SortKey = "added" | "priority" | "due";

function isOverdue(dueDate: string | null)  { return !!dueDate && dueDate < today(); }
function isDueToday(dueDate: string | null) { return dueDate === today(); }

const PRIO_ORDER = { high: 0, mid: 1, low: 2 };

function sortTodos(todos: Todo[], key: SortKey): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (key === "priority") return PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority];
    if (key === "due") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return b.createdAt - a.createdAt;
  });
}

/* ── Subtask panel ── */
function SubtaskPanel({ todo, onUpdate }: { todo: Todo; onUpdate: (t: Todo) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const text = input.trim(); if (!text) return;
    const sub: SubTask = { id: crypto.randomUUID(), text, done: false };
    onUpdate({ ...todo, subtasks: [...(todo.subtasks || []), sub] });
    setInput("");
  };
  const toggle = (id: string) => {
    onUpdate({ ...todo, subtasks: (todo.subtasks || []).map(s => s.id === id ? { ...s, done: !s.done } : s) });
  };
  const del = (id: string) => {
    onUpdate({ ...todo, subtasks: (todo.subtasks || []).filter(s => s.id !== id) });
  };
  return (
    <div className="subtask-panel">
      <ul className="subtask-list">
        {(todo.subtasks || []).map(s => (
          <li key={s.id} className={`subtask-item ${s.done ? "subtask-item--done" : ""}`}>
            <button className={`subtask-check ${s.done ? "subtask-check--on" : ""}`} onClick={() => toggle(s.id)}>
              {s.done && "✓"}
            </button>
            <span className="subtask-text">{s.text}</span>
            <button className="subtask-del" onClick={() => del(s.id)}>✕</button>
          </li>
        ))}
      </ul>
      <div className="subtask-input-row">
        <input className="glass-input subtask-input" placeholder="Tambah sub-tugas..."
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()} />
        <button className="subtask-add-btn" onClick={add}>+</button>
      </div>
    </div>
  );
}

/* ── Todo Item ── */
function TodoItem({ todo, onToggle, onDel, onUpdate }: {
  todo: Todo;
  onToggle: () => void;
  onDel: () => void;
  onUpdate: (t: Todo) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState(todo.notes || "");
  const overdue  = isOverdue(todo.dueDate);
  const dueToday = isDueToday(todo.dueDate);
  const subtasksDone = (todo.subtasks || []).filter(s => s.done).length;
  const subtasksTotal = (todo.subtasks || []).length;

  return (
    <li className={`todo-item todo-item--${todo.priority} ${todo.done ? "todo-item--done" : ""} ${overdue && !todo.done ? "todo-item--overdue" : ""}`}>
      <div className="todo-item-main">
        <button className={`todo-check ${todo.done ? "todo-check--on" : ""}`} onClick={onToggle}>
          {todo.done && <span className="check-mark">✓</span>}
        </button>
        <div className="todo-main" onClick={() => setExpanded(e => !e)}>
          <span className="todo-text">{todo.text}</span>
          <div className="todo-meta">
            {todo.tag && (
              <span className="tag-badge" style={{ "--tag-color": TAG_META[todo.tag].color } as React.CSSProperties}>
                {TAG_META[todo.tag].label}
              </span>
            )}
            {todo.estimate && <span className="estimate-badge">🕐 {todo.estimate}m</span>}
            {todo.dueDate && !todo.done && (
              <span className={`due-badge ${overdue ? "due-badge--overdue" : dueToday ? "due-badge--today" : ""}`}>
                {overdue ? "⚠️ Terlambat!" : dueToday ? "📅 Hari ini" : `📅 ${todo.dueDate}`}
              </span>
            )}
            {subtasksTotal > 0 && (
              <span className="subtask-count-badge">{subtasksDone}/{subtasksTotal}</span>
            )}
          </div>
        </div>
        <div className="todo-actions">
          <button className={`todo-expand-btn ${expanded ? "todo-expand-btn--open" : ""}`} onClick={() => setExpanded(e => !e)} title="Subtask &amp; Catatan">
            ⌄
          </button>
          <button className="todo-del ripple-btn" onClick={onDel}>✕</button>
        </div>
      </div>

      {/* Expanded: subtasks + notes */}
      {expanded && (
        <div className="todo-expanded">
          <SubtaskPanel todo={todo} onUpdate={onUpdate} />
          <div className="notes-section">
            <div className="notes-section-header">
              <span className="notes-section-label">📝 Catatan</span>
              <button className="notes-edit-btn" onClick={() => setEditNotes(e => !e)}>
                {editNotes ? "Simpan" : "Edit"}
              </button>
            </div>
            {editNotes ? (
              <textarea className="subtask-notes-area"
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                onBlur={() => { onUpdate({ ...todo, notes: noteDraft }); setEditNotes(false); }}
                placeholder="Tambah catatan..."
                rows={2}
              />
            ) : (
              <p className="notes-preview" onClick={() => setEditNotes(true)}>
                {todo.notes || <span className="notes-empty">Klik untuk menambah catatan...</span>}
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN TODO LIST
══════════════════════════════════════════════════════ */
export default function TodoList({ onTaskDone }: { onTaskDone: () => void }) {
  const [todos,    setTodos]    = useState<Todo[]>(() =>
    getItem<Todo[]>(STORAGE.todos, []).map(t => ({
      ...t,
      subtasks: t.subtasks ?? [],
      notes: t.notes ?? "",
      estimate: t.estimate ?? null,
    }))
  );
  const [input,    setInput]    = useState("");
  const [priority, setPriority] = useState<Todo["priority"]>("mid");
  const [tag,      setTag]      = useState<Todo["tag"]>(null);
  const [dueDate,  setDueDate]  = useState<string>("");
  const [estimate, setEstimate] = useState<string>("");
  const [search,   setSearch]   = useState("");
  const [sortKey,  setSortKey]  = useState<SortKey>(() => getItem<SortKey>("ssw_sort_by", "added"));
  const [allDone,  setAllDone]  = useState(false);

  const dragId     = useRef<string | null>(null);

  useEffect(() => {
    setItem(STORAGE.todos, todos);
    if (todos.length > 0 && todos.every(t => t.done)) {
      setAllDone(true); setTimeout(() => setAllDone(false), 3000);
    }
  }, [todos]);

  useEffect(() => { setItem("ssw_sort_by", sortKey); }, [sortKey]);

  const add = () => {
    const text = input.trim(); if (!text) return;
    setTodos(p => [...p, {
      id: crypto.randomUUID(), text, done: false, priority, tag,
      dueDate: dueDate || null, createdAt: Date.now(),
      subtasks: [], notes: "",
      estimate: estimate ? parseInt(estimate, 10) : null,
    }]);
    setInput(""); setDueDate(""); setEstimate("");
  };

  const toggle = (id: string) => {
    setTodos(p => p.map(t => {
      if (t.id !== id) return t;
      if (!t.done) onTaskDone();
      return { ...t, done: !t.done };
    }));
  };
  const del       = (id: string) => setTodos(p => p.filter(t => t.id !== id));
  const update    = (id: string, updated: Todo) => setTodos(p => p.map(t => t.id === id ? updated : t));
  const clearDone = () => setTodos(p => p.filter(t => !t.done));

  const onDragStart = (id: string) => { dragId.current = id; };
  const onDragOver  = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setTodos(prev => {
      const from = prev.findIndex(t => t.id === dragId.current);
      const to   = prev.findIndex(t => t.id === id);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev]; const [item] = next.splice(from, 1); next.splice(to, 0, item);
      return next;
    });
  };
  const onDragEnd = () => { dragId.current = null; };

  const done    = todos.filter(t => t.done).length;
  const pct     = todos.length > 0 ? (done / todos.length) * 100 : 0;

  const filtered = todos.filter(t =>
    !search || t.text.toLowerCase().includes(search.toLowerCase())
  );
  const visible = sortKey === "added" ? filtered : sortTodos(filtered, sortKey);

  return (
    <section className="glass-card todo-card">
      {/* Header */}
      <div className="section-title-row">
        <h2 className="section-title">
          <span className="icon-dot dot-green" />
          To-Do List
          {todos.length > 0 && <span className="todo-counter">{done}/{todos.length}</span>}
        </h2>
        <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
          {done > 0 && <button className="clear-btn" onClick={clearDone}>🗑 Hapus selesai</button>}
        </div>
      </div>

      {/* Progress */}
      {todos.length > 0 && (
        <div className="todo-prog-wrap">
          <div className="todo-prog-bar" style={{ width: `${pct}%` }} />
        </div>
      )}
      {allDone && <div className="all-done-banner">🌟 Semua selesai! Luar biasa!</div>}

      {/* Search + sort */}
      <div className="search-sort-row">
        <input className="glass-input todo-search" type="search" placeholder="🔍 Cari tugas..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="sort-select" value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}>
          <option value="added">Terbaru</option>
          <option value="priority">Prioritas</option>
          <option value="due">Tenggat</option>
        </select>
      </div>

      {/* Priority */}
      <div className="prio-row">
        {(["high","mid","low"] as const).map(p => (
          <button key={p}
            className={`prio-btn prio-btn--${p} ${priority === p ? "prio-btn--active" : ""}`}
            onClick={() => setPriority(p)}
          >
            {PRIO_META[p].label}
          </button>
        ))}
      </div>

      {/* Tag + due + estimate row */}
      <div className="tag-due-row">
        <div className="tag-pills">
          {(Object.keys(TAG_META) as Array<keyof typeof TAG_META>).map(k => (
            <button key={k}
              className={`tag-pill ${tag === k ? "tag-pill--active" : ""}`}
              style={{ "--tag-color": TAG_META[k].color } as React.CSSProperties}
              onClick={() => setTag(t => t === k ? null : k)}
            >
              {TAG_META[k].label}
            </button>
          ))}
        </div>
        <input type="date" className="glass-input date-input" value={dueDate}
          min={today()} onChange={e => setDueDate(e.target.value)} title="Tenggat" />
      </div>

      {/* Estimate */}
      <div className="estimate-row">
        <span className="estimate-label">🕐 Estimasi:</span>
        <div className="estimate-chips">
          {[15, 30, 60, 90].map(m => (
            <button key={m}
              className={`estimate-chip ${estimate === String(m) ? "estimate-chip--active" : ""}`}
              onClick={() => setEstimate(estimate === String(m) ? "" : String(m))}
            >
              {m}m
            </button>
          ))}
          <input className="glass-input estimate-input" type="number" min={1} max={480}
            placeholder="lain..." value={estimate} onChange={e => setEstimate(e.target.value)} />
        </div>
      </div>

      {/* Input */}
      <div className="todo-input-row">
        <input className="glass-input" type="text" placeholder="Tambah tugas baru..."
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()} maxLength={120}
        />
        <button className="btn btn-primary btn-sm ripple-btn" onClick={add}>+</button>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <p className="todo-empty">{search ? "Tidak ada tugas yang cocok." : "Belum ada tugas. Ayo mulai! 🚀"}</p>
      ) : (
        <ul className="todo-list">
          {visible.map(todo => (
            <TodoItem key={todo.id} todo={todo}
              onToggle={() => toggle(todo.id)}
              onDel={() => del(todo.id)}
              onUpdate={updated => update(todo.id, updated)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
