import { Sparkle, Plus, Check, Trash2, Circle, Timer, Bell, BellOff, BarChart2, X, Clock, LogOut, Pause, Play, Flag, FolderOpen, PanelLeftClose, PanelLeftOpen, Search, ArrowUpDown, Tag, ChevronDown, ChevronUp, Save, CheckSquare } from "lucide-react";
import { ToggleTheme } from "./components/ToggleTheme";
import ProjectSidebar from "./components/ProjectSidebar";
import type { Project } from "./components/ProjectSidebar";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

// Krishiv@2026

type Priority = "high" | "medium" | "low";
type SortBy = "created" | "deadline" | "priority" | "alphabetical" | "elapsed";

interface Subtask {
  id: number;
  text: string;
  completed: boolean;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  elapsed: number;
  deadline: number | null;
  notified: boolean;
  priority: Priority;
  estimate: number | null;
  paused: boolean;
  projectId: number | null;
  emoji: string | null;
  notes: string;
  tags: string[];
  subtasks: Subtask[];
  order: number;
}

interface Toast {
  id: number;
  text: string;
  type: "overdue" | "done" | "undo";
}

interface UndoAction {
  type: "delete" | "complete" | "bulkDelete";
  data: Todo | Todo[];
}

/* ── Auth gate ── */
function _AuthGate({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) onLogin(data.session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) onLogin(session.user);
    });
    return () => subscription.unsubscribe();
  }, [onLogin]);

  /* clear any error hash from the URL on mount */
  useEffect(() => {
    if (window.location.hash.includes("error")) {
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const send = async () => {
    if (!email.trim()) return;
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin },
    });
    if (err) setError(err.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <section className="bg-mesh min-h-lvh flex items-center justify-center">
      <div className="glass rounded-2xl p-8 max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className="size-11 bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white rounded-2xl">
            <Sparkle />
          </span>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">My Task</h1>
        </div>
        {sent ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">✉️ Check your email for a magic link to sign in!</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to sync your tasks across all devices.</p>
            <input
              type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-violet-700 bg-transparent text-gray-900 dark:text-white text-sm"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={send}
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-semibold text-sm disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Overdue";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${sec}s left`;
  return `${sec}s left`;
}

function useTick(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

const PRIORITY_STYLES: Record<Priority, string> = {
  high:   "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
  medium: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400",
  low:    "bg-blue-100 text-blue-500 dark:bg-blue-900/50 dark:text-blue-400",
};

/* ── Live elapsed timer badge ── */
function LiveTimer({ todo }: { todo: Todo }) {
  const isRunning = !todo.completed && !todo.paused && todo.startedAt !== null;
  useTick(isRunning);
  const ms = todo.elapsed + (isRunning && todo.startedAt ? Date.now() - todo.startedAt : 0);
  const overEst = todo.estimate && ms > todo.estimate * 60000;
  if (ms < 1000 && !todo.completed) return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shrink-0 ${
      todo.completed
        ? "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300"
        : overEst
        ? "bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-400"
        : todo.paused
        ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        : "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
    }`}>
      {!todo.completed && !todo.paused && <span className="size-1.5 rounded-full bg-purple-500 animate-pulse inline-block" />}
      {formatDuration(ms)}
      {todo.estimate && !todo.completed && (
        <span className="opacity-60">/ {todo.estimate}m</span>
      )}
    </span>
  );
}

/* ── Animated emoji state indicator ── */
const TASK_EMOJIS = ["🚀","💡","🎯","🔨","📝","🌟","⚡","🎨","🔬","🏆","🌈","🎵","🦋","🔥","💎"];

const EMOJI_PICKER_LIST = [
  "🚀","💡","🎯","🔨","📝","🌟","🎨","🔬","🏆","🌈","🎵","🦋","💎","💪","🧠",
  "💻","📱","📚","🔍","🛠️","🎉","👀","🐼","🦖","🐶","🌵","🍎","⚽","🎮","🎧",
  "💰","🔑","📧","📅","⏰","🚦","🏔️","🌊","☀️","⚡","🔥","❤️","👏","🤔","😄",
];

function EmojiPicker({ value, onChange }: { value: string | null; onChange: (e: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`text-xl px-2 py-1.5 rounded-xl transition-all hover:bg-violet-50 dark:hover:bg-violet-900/20 ${open ? "bg-violet-100 dark:bg-violet-900/40" : ""}`}
        title="Pick emoji">
        {value ?? "🎯"}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-[200] glass rounded-2xl p-2 grid grid-cols-9 gap-0.5 shadow-xl w-64">
          {EMOJI_PICKER_LIST.map(e => (
            <button key={e} type="button"
              onClick={() => { onChange(e); setOpen(false); }}
              className={`text-lg p-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all ${
                value === e ? "bg-violet-100 dark:bg-violet-900/40 ring-1 ring-violet-400" : ""
              }`}>
              {e}
            </button>
          ))}
          {value && (
            <button type="button" onClick={() => { onChange(null); setOpen(false); }}
              className="col-span-9 text-[10px] text-gray-400 hover:text-red-400 pt-1 transition-colors">
              clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TaskEmoji({ todo }: { todo: Todo }) {
  const isOverdue = !todo.completed && !!todo.deadline && Date.now() >= todo.deadline;
  const isUrgent  = !todo.completed && !!todo.deadline && !isOverdue && (todo.deadline - Date.now()) < 5 * 60 * 1000;

  if (todo.completed)  return <span className="emoji-bounce text-base shrink-0 select-none">🎉</span>;
  if (isOverdue)       return <span className="emoji-shake  text-base shrink-0 select-none">🔥</span>;
  if (isUrgent)        return <span className="emoji-pulse  text-base shrink-0 select-none">⚡</span>;
  if (todo.paused)     return <span className="emoji-zzz    text-base shrink-0 select-none">😴</span>;
  const emoji = todo.emoji ?? TASK_EMOJIS[todo.id % TASK_EMOJIS.length];
  return <span className="emoji-spin text-base shrink-0 select-none">{emoji}</span>;
}

/* ── Deadline countdown badge ── */
function DeadlineBadge({ todo }: { todo: Todo }) {
  useTick(!todo.completed && todo.deadline !== null);
  if (!todo.deadline || todo.completed) return null;
  const left = todo.deadline - Date.now();
  const overdue = left <= 0;
  const urgent  = left > 0 && left < 5 * 60 * 1000;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shrink-0 ${
      overdue ? "bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-400 animate-pulse"
      : urgent ? "bg-orange-100 text-orange-600 dark:bg-orange-900/60 dark:text-orange-300"
      : "bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300"
    }`}>
      <Clock size={10} />
      {formatCountdown(left)}
    </span>
  );
}

type ChartView = "hourly" | "weekly" | "priority";

/* ── Advanced interactive chart ── */
function HourlyChart({ todos }: { todos: Todo[] }) {
  const [view, setView]       = useState<ChartView>("hourly");
  const [hovered, setHovered] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(false); const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t); }, [view]);

  const now     = new Date();
  const nowH    = now.getHours();

  /* ── hourly data ── */
  const hourly = useMemo(() => {
    const map = Array.from({ length: 24 }, () => ({ active: 0, done: 0 }));
    todos.forEach(t => {
      const h = new Date(t.createdAt).getHours();
      if (t.completed) map[h].done++; else map[h].active++;
    });
    return map;
  }, [todos]);

  /* ── weekly data (last 7 days) ── */
  const weekly = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { label: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()], active: 0, done: 0, isToday: i === 6 };
    });
    todos.forEach(t => {
      const diff = Math.floor((Date.now() - t.createdAt) / 86400000);
      const idx  = 6 - diff;
      if (idx >= 0 && idx < 7) {
        if (t.completed) days[idx].done++; else days[idx].active++;
      }
    });
    return days;
  }, [todos]);

  /* ── priority data ── */
  const priorityData = useMemo(() => {
    const map: Record<Priority, { active: number; done: number }> = { high: { active:0,done:0 }, medium: { active:0,done:0 }, low: { active:0,done:0 } };
    todos.forEach(t => { if (t.completed) map[t.priority].done++; else map[t.priority].active++; });
    return (["high","medium","low"] as Priority[]).map(p => ({ label: p, ...map[p] }));
  }, [todos]);

  /* ── summary stats ── */
  const totalDone   = todos.filter(t => t.completed).length;
  const totalActive = todos.filter(t => !t.completed).length;
  const totalMs     = todos.reduce((a, t) => a + t.elapsed, 0);
  const avgMs       = totalDone > 0 ? Math.round(todos.filter(t=>t.completed).reduce((a,t)=>a+t.elapsed,0) / totalDone) : 0;

  const W = 560, H = 100, PAD = 2;

  /* ── render bars helper ── */
  function renderBars(
    items: { active: number; done: number; isToday?: boolean }[],
    labels: (string | number)[],
    showEvery = 1
  ) {
    const maxVal = Math.max(1, ...items.map(d => d.active + d.done));
    const barW   = W / items.length;
    return (
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ height: 110 }}>
        {/* grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={0} y1={H - f * H} x2={W} y2={H - f * H}
            stroke="currentColor" strokeWidth={0.5} opacity={0.08} className="text-gray-500" />
        ))}
        {items.map((d, i) => {
          const total  = d.active + d.done;
          const doneH  = (d.done   / maxVal) * H;
          const actH   = (d.active / maxVal) * H;
          const x      = i * barW + PAD;
          const bw     = barW - PAD * 2;
          const isHov  = hovered === i;
          const isNowH = d.isToday !== undefined ? d.isToday : (view === "hourly" && i === nowH);
          const scale  = mounted ? 1 : 0;
          const origin = H;
          return (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              {/* hover bg */}
              {isHov && <rect x={x - 1} y={0} width={bw + 2} height={H + 1} rx={4} fill="currentColor" opacity={0.05} className="text-violet-500" />}

              {/* done bar */}
              <rect
                x={x} y={H - doneH * scale} width={bw} height={doneH * scale}
                rx={3}
                fill={isNowH ? "#a78bfa" : isHov ? "#c084fc" : "#c4b5fd"}
                opacity={isHov ? 1 : 0.85}
                style={{ transformOrigin: `0 ${origin}px`, transition: "height 0.5s cubic-bezier(.34,1.56,.64,1), y 0.5s cubic-bezier(.34,1.56,.64,1), fill 0.15s" }}
              />
              {/* active bar */}
              <rect
                x={x} y={H - doneH * scale - actH * scale} width={bw} height={actH * scale}
                rx={3}
                fill={isNowH ? "#f472b6" : isHov ? "#f9a8d4" : "#fbcfe8"}
                opacity={isHov ? 1 : 0.8}
                style={{ transition: "height 0.5s cubic-bezier(.34,1.56,.64,1) 0.05s, y 0.5s cubic-bezier(.34,1.56,.64,1) 0.05s, fill 0.15s" }}
              />

              {/* now pulse ring */}
              {isNowH && (
                <>
                  <line x1={x + bw/2} y1={0} x2={x + bw/2} y2={H}
                    stroke="#a78bfa" strokeWidth={1} strokeDasharray="3 2" opacity={0.5} />
                  {total > 0 && <circle cx={x + bw/2} cy={H - doneH - actH - 5} r={3} fill="#a78bfa" opacity={0.9} />}
                </>
              )}

              {/* label */}
              {(i % showEvery === 0 || total > 0 || isNowH) && (
                <text x={x + bw/2} y={H + 14} textAnchor="middle"
                  fontSize={view === "priority" ? 9 : 7}
                  fill={isNowH ? "#a78bfa" : isHov ? "#7c3aed" : "#9ca3af"}
                  fontWeight={isNowH || isHov ? "700" : "400"}
                  style={{ transition: "fill 0.15s" }}>
                  {labels[i]}
                </text>
              )}

              {/* tooltip */}
              {isHov && total > 0 && (() => {
                const tx = Math.min(Math.max(x + bw/2, 30), W - 30);
                const ty = Math.max(H - doneH - actH - 14, 8);
                return (
                  <g>
                    <rect x={tx - 28} y={ty - 13} width={56} height={22} rx={5}
                      fill="#1e1b4b" opacity={0.88} />
                    <text x={tx} y={ty + 2} textAnchor="middle" fontSize={8} fill="white" fontWeight="600">
                      {d.done > 0 && `✓${d.done} `}{d.active > 0 && `◎${d.active}`}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>
    );
  }

  const priorityColors: Record<Priority, { done: string; active: string }> = {
    high:   { done: "#f87171", active: "#fca5a5" },
    medium: { done: "#fb923c", active: "#fdba74" },
    low:    { done: "#60a5fa", active: "#93c5fd" },
  };

  function renderPriorityBars() {
    const maxVal = Math.max(1, ...priorityData.map(d => d.active + d.done));
    const barW   = W / 3;
    return (
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ height: 110 }}>
        {[0.25,0.5,0.75,1].map(f => (
          <line key={f} x1={0} y1={H - f*H} x2={W} y2={H - f*H}
            stroke="currentColor" strokeWidth={0.5} opacity={0.08} className="text-gray-500" />
        ))}
        {priorityData.map((d, i) => {
          const doneH = (d.done   / maxVal) * H;
          const actH  = (d.active / maxVal) * H;
          const x     = i * barW + PAD * 3;
          const bw    = barW - PAD * 6;
          const isHov = hovered === i;
          const scale = mounted ? 1 : 0;
          const col   = priorityColors[d.label as Priority];
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
              {isHov && <rect x={x-2} y={0} width={bw+4} height={H+1} rx={6} fill="currentColor" opacity={0.05} className="text-violet-500" />}
              <rect x={x} y={H - doneH*scale} width={bw} height={doneH*scale} rx={4}
                fill={col.done} opacity={isHov ? 1 : 0.85}
                style={{ transition: "height 0.5s cubic-bezier(.34,1.56,.64,1), y 0.5s cubic-bezier(.34,1.56,.64,1)" }} />
              <rect x={x} y={H - doneH*scale - actH*scale} width={bw} height={actH*scale} rx={4}
                fill={col.active} opacity={isHov ? 1 : 0.75}
                style={{ transition: "height 0.5s cubic-bezier(.34,1.56,.64,1) 0.05s, y 0.5s cubic-bezier(.34,1.56,.64,1) 0.05s" }} />
              <text x={x + bw/2} y={H + 14} textAnchor="middle" fontSize={9}
                fill={isHov ? "#7c3aed" : "#9ca3af"} fontWeight={isHov ? "700" : "500"}
                style={{ transition: "fill 0.15s", textTransform: "capitalize" }}>
                {d.label}
              </text>
              {isHov && (d.done + d.active) > 0 && (() => {
                const tx = x + bw/2;
                const ty = Math.max(H - doneH - actH - 14, 8);
                return (
                  <g>
                    <rect x={tx-30} y={ty-13} width={60} height={22} rx={5} fill="#1e1b4b" opacity={0.88} />
                    <text x={tx} y={ty+2} textAnchor="middle" fontSize={8} fill="white" fontWeight="600">
                      {d.done > 0 && `✓${d.done} `}{d.active > 0 && `◎${d.active}`}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>
    );
  }

  const viewLabels: Record<ChartView, string> = { hourly: "By Hour", weekly: "7 Days", priority: "Priority" };

  return (
    <div className="glass rounded-2xl px-4 pt-3 pb-3 space-y-3">
      {/* header */}
      <div className="flex items-center gap-2">
        <BarChart2 size={14} className="text-violet-500" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Activity</span>
        {/* view switcher */}
        <div className="ml-auto flex gap-1 bg-white/40 dark:bg-white/5 rounded-xl p-0.5">
          {(["hourly","weekly","priority"] as ChartView[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                view === v
                  ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-violet-500"
              }`}>
              {viewLabels[v]}
            </button>
          ))}
        </div>
      </div>

      {/* summary stat pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "Total",   val: todos.length,           color: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300" },
          { label: "Done",    val: totalDone,               color: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300" },
          { label: "Active",  val: totalActive,             color: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/40 dark:text-fuchsia-300" },
          { label: "Tracked", val: totalMs > 0 ? formatDuration(totalMs) : "—", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" },
          { label: "Avg",     val: avgMs  > 0 ? formatDuration(avgMs)  : "—", color: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300" },
        ].map(s => (
          <span key={s.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
            {s.label}: {s.val}
          </span>
        ))}
      </div>

      {/* chart */}
      <div className="relative">
        {view === "hourly"   && renderBars(hourly,  Array.from({length:24},(_,i)=>i), 3)}
        {view === "weekly"   && renderBars(weekly,  weekly.map(d=>d.label), 1)}
        {view === "priority" && renderPriorityBars()}
      </div>

      {/* legend */}
      <div className="flex gap-3">
        <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="size-2 rounded-sm bg-fuchsia-300 inline-block" />Active</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="size-2 rounded-sm bg-violet-300 inline-block" />Done</span>
        {view === "hourly" && <span className="ml-auto text-[10px] text-violet-400 font-medium">now → {nowH}:00</span>}
        {view === "weekly" && <span className="ml-auto text-[10px] text-violet-400 font-medium">last 7 days</span>}
      </div>
    </div>
  );
}

const tabs = ["All", "Active", "Completed"];

const App = () => {
  const [user, setUser]         = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [input, setInput]       = useState("");
  const [deadline, setDeadline] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [priority, setPriority] = useState<Priority>("medium");
  const [estimate, setEstimate] = useState("");
  const [taskEmoji, setTaskEmoji] = useState<string | null>(null);
  const [todo, setTodo]         = useState<Todo[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("created");
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [undoStack, setUndoStack] = useState<UndoAction | null>(null);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [toasts, setToasts]     = useState<Toast[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [confetti, setConfetti]   = useState<{ id: number; x: number; color: string }[]>([]);
  const [streak, setStreak]       = useState(0);
  const notifPermRef = useRef<NotificationPermission>("default");
  const toastCounter = useRef(0);
  const notifiedIds  = useRef<Set<number>>(new Set());
  const [projects, setProjects]       = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  /* resolve auth session on mount, fall back to guest locally */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(data.session.user);
      else setUser({ id: "local" } as unknown as User);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? ({ id: "local" } as unknown as User));
    });
    return () => subscription.unsubscribe();
  }, []);

  /* load todos + projects from Supabase when user logs in */
  useEffect(() => {
    if (!user) return;
    supabase.from("todos").select("*").eq("user_id", user.id).order("order", { ascending: true }).then(({ data }) => {
      if (data) {
        const todos = data.map(r => ({
          id: r.id, text: r.text, completed: r.completed,
          createdAt: r.created_at, startedAt: r.started_at, completedAt: r.completed_at,
          elapsed: r.elapsed, deadline: r.deadline, notified: r.notified,
          priority: r.priority ?? "medium", estimate: r.estimate ?? null, paused: r.paused ?? false,
          projectId: r.project_id ?? null, emoji: r.emoji ?? null,
          notes: r.notes ?? "", tags: r.tags ?? [], subtasks: r.subtasks ?? [], order: r.order ?? r.id,
        }));
        setTodo(todos);
        const allTags = new Set<string>();
        todos.forEach(t => t.tags.forEach((tag: string) => allTags.add(tag)));
        setAvailableTags(Array.from(allTags));
      }
    });
    supabase.from("projects").select("*").eq("user_id", user.id).then(({ data }) => {
      if (data) setProjects(data.map(r => ({
        id: r.id, name: r.name, color: r.color, parentId: r.parent_id ?? null, collapsed: r.collapsed ?? false,
      })));
    });
  }, [user]);

  /* request notification permission once */
  useEffect(() => {
    if ("Notification" in window) {
      notifPermRef.current = Notification.permission;
      if (Notification.permission === "default") {
        Notification.requestPermission().then(p => { notifPermRef.current = p; });
      }
    }
  }, []);

  /* deadline watcher */
  useEffect(() => {
    const id = setInterval(() => {
      setTodo(prev => prev.map(t => {
        if (t.completed || !t.deadline || t.notified) return t;
        if (Date.now() >= t.deadline) {
          if (notifiedIds.current.has(t.id)) return { ...t, notified: true };
          notifiedIds.current.add(t.id);
          const msg = `"${t.text}" — time's up! You missed the deadline.`;
          if (notifPermRef.current === "granted") new Notification("My Task", { body: msg, icon: "/favicon.ico", tag: `overdue-${t.id}` });
          setToasts(ts => [...ts, { id: ++toastCounter.current, text: msg, type: "overdue" }]);
          supabase.from("todos").update({ notified: true }).eq("id", t.id);
          return { ...t, notified: true };
        }
        return t;
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* auto-dismiss toasts after 6s */
  useEffect(() => {
    if (toasts.length === 0) return;
    const id = setTimeout(() => setToasts(ts => ts.slice(1)), 6000);
    return () => clearTimeout(id);
  }, [toasts]);

  const addProject = useCallback(async (name: string, color: string, parentId: number | null) => {
    const p: Project = { id: Date.now(), name, color, parentId, collapsed: false };
    setProjects(prev => [...prev, p]);
    await supabase.from("projects").insert({ id: p.id, user_id: user!.id, name, color, parent_id: parentId, collapsed: false });
  }, [user]);

  const renameProject = useCallback(async (id: number, name: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    await supabase.from("projects").update({ name }).eq("id", id);
  }, []);

  const deleteProject = useCallback(async (id: number) => {
    // collect all descendant ids
    const collect = (pid: number, all: Project[]): number[] => {
      const children = all.filter(p => p.parentId === pid);
      return [pid, ...children.flatMap(c => collect(c.id, all))];
    };
    const ids = collect(id, projects);
    setProjects(prev => prev.filter(p => !ids.includes(p.id)));
    setTodo(prev => prev.map(t => ids.includes(t.projectId!) ? { ...t, projectId: null } : t));
    if (selectedProject && ids.includes(selectedProject)) setSelectedProject(null);
    for (const pid of ids) await supabase.from("projects").delete().eq("id", pid);
  }, [projects, selectedProject]);

  const toggleProjectCollapse = useCallback(async (id: number) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, collapsed: !p.collapsed } : p));
    const p = projects.find(p => p.id === id);
    if (p) await supabase.from("projects").update({ collapsed: !p.collapsed }).eq("id", id);
  }, [projects]);

  const addTodo = useCallback(async () => {
    if (!input.trim()) return;
    const dl  = deadline ? new Date(deadline).getTime() : null;
    const est = estimate ? parseInt(estimate) : null;
    const maxOrder = todo.length > 0 ? Math.max(...todo.map(t => t.order)) : 0;
    const newTodo: Todo = {
      id: Date.now(), text: input.trim(), completed: false,
      createdAt: Date.now(), startedAt: Date.now(), completedAt: null,
      elapsed: 0, deadline: dl, notified: false,
      priority, estimate: est, paused: false, projectId: selectedProject, emoji: taskEmoji,
      notes: "", tags: [], subtasks: [], order: maxOrder + 1,
    };
    setTodo(prev => [...prev, newTodo]);
    await supabase.from("todos").insert({
      id: newTodo.id, user_id: user!.id, text: newTodo.text, completed: false,
      created_at: newTodo.createdAt, started_at: newTodo.startedAt, completed_at: null,
      elapsed: 0, deadline: dl, notified: false,
      priority, estimate: est, paused: false, project_id: selectedProject, emoji: taskEmoji,
      notes: "", tags: [], subtasks: [], order: newTodo.order,
    });
    setInput(""); setDeadline(""); setShowOptions(false); setEstimate(""); setPriority("medium"); setTaskEmoji(null);
  }, [input, deadline, estimate, priority, user, selectedProject, taskEmoji, todo]);

  const removeTodo = useCallback(async (id: number, skipUndo = false) => {
    const task = todo.find(t => t.id === id);
    if (!skipUndo && task) {
      setUndoStack({ type: "delete", data: task });
      setToasts(ts => [...ts, { id: ++toastCounter.current, text: "Task deleted", type: "undo" }]);
    }
    setTodo(prev => prev.filter(t => t.id !== id));
    await supabase.from("todos").delete().eq("id", id);
  }, [todo]);

  const togglePause = useCallback(async (id: number) => {
    let updated: Todo | null = null;
    setTodo(prev => prev.map(t => {
      if (t.id !== id || t.completed) return t;
      if (!t.paused) {
        // pause: freeze elapsed
        const elapsed = t.elapsed + (t.startedAt ? Date.now() - t.startedAt : 0);
        updated = { ...t, paused: true, elapsed, startedAt: null };
      } else {
        // resume
        updated = { ...t, paused: false, startedAt: Date.now() };
      }
      return updated!;
    }));
    if (updated) {
      const u = updated as Todo;
      await supabase.from("todos").update({ paused: u.paused, elapsed: u.elapsed, started_at: u.startedAt }).eq("id", id);
    }
  }, []);

  const toggleTodo = useCallback(async (id: number) => {
    let updated: Todo | null = null;
    let sideEffect: (() => void) | null = null;
    setTodo(prev => {
      sideEffect = null;
      return prev.map(t => {
        if (t.id !== id) return t;
        if (!t.completed) {
          const elapsed = t.elapsed + (t.startedAt ? Date.now() - t.startedAt : 0);
          const msg = `"${t.text}" completed in ${formatDuration(elapsed)}!`;
          sideEffect = () => {
            if (notifPermRef.current === "granted") {
              new Notification("My Task", { body: msg, icon: "/favicon.ico", tag: `done-${t.id}` });
            }
            setToasts(ts => [...ts, { id: ++toastCounter.current, text: msg, type: "done" }]);
            const colors = ["#a78bfa","#f472b6","#34d399","#fbbf24","#60a5fa"];
            setConfetti(Array.from({ length: 12 }, (_, i) => ({ id: Date.now() + i, x: 20 + Math.random() * 60, color: colors[i % colors.length] })));
            setTimeout(() => setConfetti([]), 1200);
            setStreak(s => s + 1);
          };
          updated = { ...t, completed: true, completedAt: Date.now(), elapsed, startedAt: null };
          return updated;
        }
        sideEffect = () => setStreak(s => Math.max(0, s - 1));
        updated = { ...t, completed: false, completedAt: null, startedAt: Date.now(), notified: false };
        return updated;
      });
    });
    sideEffect?.();
    if (updated) {
      const u = updated as Todo;
      await supabase.from("todos").update({
        completed: u.completed, completed_at: u.completedAt,
        started_at: u.startedAt, elapsed: u.elapsed, notified: u.notified,
      }).eq("id", id);
    }
  }, []);

  const clearCompleted = useCallback(async () => {
    const completed = todo.filter(t => t.completed);
    setUndoStack({ type: "bulkDelete", data: completed });
    setToasts(ts => [...ts, { id: ++toastCounter.current, text: `${completed.length} tasks cleared`, type: "undo" }]);
    const ids = completed.map(t => t.id);
    setTodo(prev => prev.filter(t => !t.completed));
    if (ids.length) await supabase.from("todos").delete().in("id", ids);
  }, [todo]);

  const bulkDelete = useCallback(async () => {
    const tasks = todo.filter(t => selectedTasks.has(t.id));
    setUndoStack({ type: "bulkDelete", data: tasks });
    setToasts(ts => [...ts, { id: ++toastCounter.current, text: `${tasks.length} tasks deleted`, type: "undo" }]);
    const ids = Array.from(selectedTasks);
    setTodo(prev => prev.filter(t => !selectedTasks.has(t.id)));
    setSelectedTasks(new Set());
    if (ids.length) await supabase.from("todos").delete().in("id", ids);
  }, [todo, selectedTasks]);

  const bulkComplete = useCallback(async () => {
    const ids = Array.from(selectedTasks);
    setTodo(prev => prev.map(t => ids.includes(t.id) ? { ...t, completed: true, completedAt: Date.now() } : t));
    setSelectedTasks(new Set());
    for (const id of ids) await supabase.from("todos").update({ completed: true, completed_at: Date.now() }).eq("id", id);
  }, [selectedTasks]);

  const performUndo = useCallback(async () => {
    if (!undoStack) return;
    if (undoStack.type === "delete") {
      const task = undoStack.data as Todo;
      setTodo(prev => [...prev, task]);
      await supabase.from("todos").insert({
        id: task.id, user_id: user!.id, text: task.text, completed: task.completed,
        created_at: task.createdAt, started_at: task.startedAt, completed_at: task.completedAt,
        elapsed: task.elapsed, deadline: task.deadline, notified: task.notified,
        priority: task.priority, estimate: task.estimate, paused: task.paused,
        project_id: task.projectId, emoji: task.emoji, notes: task.notes, tags: task.tags, subtasks: task.subtasks, order: task.order,
      });
    } else if (undoStack.type === "bulkDelete") {
      const tasks = undoStack.data as Todo[];
      setTodo(prev => [...prev, ...tasks]);
      for (const task of tasks) {
        await supabase.from("todos").insert({
          id: task.id, user_id: user!.id, text: task.text, completed: task.completed,
          created_at: task.createdAt, started_at: task.startedAt, completed_at: task.completedAt,
          elapsed: task.elapsed, deadline: task.deadline, notified: task.notified,
          priority: task.priority, estimate: task.estimate, paused: task.paused,
          project_id: task.projectId, emoji: task.emoji, notes: task.notes, tags: task.tags, subtasks: task.subtasks, order: task.order,
        });
      }
    }
    setUndoStack(null);
    setToasts(ts => ts.filter(t => t.type !== "undo"));
  }, [undoStack, user]);

  const updateTaskText = useCallback(async (id: number, text: string) => {
    setTodo(prev => prev.map(t => t.id === id ? { ...t, text } : t));
    await supabase.from("todos").update({ text }).eq("id", id);
  }, []);

  const updateTaskNotes = useCallback(async (id: number, notes: string) => {
    setTodo(prev => prev.map(t => t.id === id ? { ...t, notes } : t));
    await supabase.from("todos").update({ notes }).eq("id", id);
  }, []);

  const addTag = useCallback(async (id: number, tag: string) => {
    const task = todo.find(t => t.id === id);
    if (!task || task.tags.includes(tag)) return;
    const newTags = [...task.tags, tag];
    setTodo(prev => prev.map(t => t.id === id ? { ...t, tags: newTags } : t));
    if (!availableTags.includes(tag)) setAvailableTags(prev => [...prev, tag]);
    await supabase.from("todos").update({ tags: newTags }).eq("id", id);
  }, [todo, availableTags]);

  const removeTag = useCallback(async (id: number, tag: string) => {
    const task = todo.find(t => t.id === id);
    if (!task) return;
    const newTags = task.tags.filter(t => t !== tag);
    setTodo(prev => prev.map(t => t.id === id ? { ...t, tags: newTags } : t));
    await supabase.from("todos").update({ tags: newTags }).eq("id", id);
  }, [todo]);

  const addSubtask = useCallback(async (id: number, text: string) => {
    const task = todo.find(t => t.id === id);
    if (!task) return;
    const newSubtask: Subtask = { id: Date.now(), text, completed: false };
    const newSubtasks = [...task.subtasks, newSubtask];
    setTodo(prev => prev.map(t => t.id === id ? { ...t, subtasks: newSubtasks } : t));
    await supabase.from("todos").update({ subtasks: newSubtasks }).eq("id", id);
  }, [todo]);

  const toggleSubtask = useCallback(async (taskId: number, subtaskId: number) => {
    const task = todo.find(t => t.id === taskId);
    if (!task) return;
    const newSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    setTodo(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t));
    await supabase.from("todos").update({ subtasks: newSubtasks }).eq("id", taskId);
  }, [todo]);

  const deleteSubtask = useCallback(async (taskId: number, subtaskId: number) => {
    const task = todo.find(t => t.id === taskId);
    if (!task) return;
    const newSubtasks = task.subtasks.filter(s => s.id !== subtaskId);
    setTodo(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t));
    await supabase.from("todos").update({ subtasks: newSubtasks }).eq("id", taskId);
  }, [todo]);

  const projectFilteredTodo = useMemo(() => {
    if (selectedProject === null) return todo;
    const collect = (pid: number, all: Project[]): number[] => {
      const children = all.filter(p => p.parentId === pid);
      return [pid, ...children.flatMap(c => collect(c.id, all))];
    };
    const ids = new Set(collect(selectedProject, projects));
    return todo.filter(t => t.projectId !== null && ids.has(t.projectId));
  }, [selectedProject, todo, projects]);

  const searchFilteredTodo = useMemo(() => {
    if (!searchQuery.trim()) return projectFilteredTodo;
    const q = searchQuery.toLowerCase();
    return projectFilteredTodo.filter(t => 
      t.text.toLowerCase().includes(q) || 
      t.notes.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }, [searchQuery, projectFilteredTodo]);

  const tagFilteredTodo = useMemo(() => {
    if (!filterTag) return searchFilteredTodo;
    return searchFilteredTodo.filter(t => t.tags.includes(filterTag));
  }, [filterTag, searchFilteredTodo]);

  const sortedTodo = useMemo(() => {
    const arr = [...tagFilteredTodo];
    switch (sortBy) {
      case "deadline":
        return arr.sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline - b.deadline;
        });
      case "priority":
        const prio = { high: 0, medium: 1, low: 2 };
        return arr.sort((a, b) => prio[a.priority] - prio[b.priority]);
      case "alphabetical":
        return arr.sort((a, b) => a.text.localeCompare(b.text));
      case "elapsed":
        return arr.sort((a, b) => b.elapsed - a.elapsed);
      case "created":
      default:
        return arr.sort((a, b) => a.order - b.order);
    }
  }, [tagFilteredTodo, sortBy]);

  const filterTodo = useMemo(() => {
    switch (activeTab) {
      case 1: return sortedTodo.filter(t => !t.completed);
      case 2: return sortedTodo.filter(t => t.completed);
      default: return sortedTodo;
    }
  }, [activeTab, sortedTodo]);

  const taskCounts = useMemo(() => {
    const map: Record<number, number> = {};
    todo.forEach(t => { if (t.projectId) map[t.projectId] = (map[t.projectId] ?? 0) + 1; });
    return map;
  }, [todo]);

  const doneCounts = useMemo(() => {
    const map: Record<number, number> = {};
    todo.forEach(t => { if (t.projectId && t.completed) map[t.projectId] = (map[t.projectId] ?? 0) + 1; });
    return map;
  }, [todo]);

  const hasRunning = todo.some(t => !t.completed && !t.paused && t.startedAt !== null);
  useTick(hasRunning);

  const remaining   = projectFilteredTodo.filter(t => !t.completed).length;
  const completed   = projectFilteredTodo.filter(t => t.completed).length;
  const progressPct = projectFilteredTodo.length === 0 ? 0 : Math.round((completed / projectFilteredTodo.length) * 100);
  const totalTracked = projectFilteredTodo.reduce((acc, t) => {
    const ms = t.elapsed + (!t.completed && !t.paused && t.startedAt ? Date.now() - t.startedAt : 0);
    return acc + ms;
  }, 0);

  /* keyboard shortcuts */
  useEffect(() => { 
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("input[placeholder*='mind']")?.focus();
      }
      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>("input[placeholder*='Search']");
        if (searchInput) {
          setShowSearch(true);
          setTimeout(() => searchInput.focus(), 50);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        performUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [performUndo]);

  const minDT = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  if (!authReady) return null;

  const activeProject = projects.find(p => p.id === selectedProject);

  return (
    <section className="bg-mesh min-h-lvh text-gray-900 dark:text-gray-50 transition-colors flex flex-col relative overflow-x-hidden">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

      {/* ── Confetti burst ── */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {confetti.map(c => (
            <span key={c.id} className="confetti-piece absolute text-lg"
              style={{ left: `${c.x}%`, color: c.color, animationDelay: `${Math.random() * 0.3}s` }}>
              {["✦","★","●","▲","◆"][Math.floor(Math.random()*5)]}
            </span>
          ))}
        </div>
      )}

      {/* ── Toast stack ── */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`pointer-events-auto glass rounded-2xl px-4 py-3 flex items-start gap-3 shadow-xl animate-slideIn ${
              toast.type === "overdue" ? "border-red-400/40 dark:border-red-500/30" :
              toast.type === "undo" ? "border-violet-400/40 dark:border-violet-500/30" :
              "border-green-400/40 dark:border-green-500/30"
            }`}>
            <span className="text-lg shrink-0">{toast.type === "overdue" ? "⏰" : toast.type === "undo" ? "🔄" : "✅"}</span>
            <p className="text-xs text-gray-700 dark:text-gray-200 flex-1">{toast.text}</p>
            {toast.type === "undo" && undoStack && (
              <button onClick={performUndo}
                className="text-xs font-semibold text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 shrink-0 pointer-events-auto">
                Undo
              </button>
            )}
            <button onClick={() => setToasts(ts => ts.filter(t => t.id !== toast.id))}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 pointer-events-auto">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-64 max-w-[80vw] h-full overflow-y-auto p-4">
            <ProjectSidebar
              projects={projects} selectedId={selectedProject}
              taskCounts={taskCounts} doneCounts={doneCounts}
              onSelect={id => { setSelectedProject(id); setSidebarOpen(false); }}
              onAdd={addProject} onRename={renameProject}
              onDelete={deleteProject} onToggleCollapse={toggleProjectCollapse}
            />
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="relative z-10 max-w-6xl w-full mx-auto">
        <div className="container flex items-center justify-between">
          <div className="flex items-start gap-3">
            <span className="size-11 md:size-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white rounded-2xl shadow-lg shadow-violet-500/30 shrink-0">
              <Sparkle />
            </span>
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold sm:text-5xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 dark:from-violet-400 dark:via-purple-300 dark:to-fuchsia-400 bg-clip-text text-transparent">
                My Task
              </h1>
              <p className="text-xs sm:text-sm mt-0.5 text-purple-500/70 dark:text-purple-300/60">
                Stay organised, stay productive
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChart(s => !s)}
              className={`p-2.5 rounded-xl transition-all ${showChart ? "bg-violet-500 text-white shadow-md shadow-violet-500/30" : "glass text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"}`}
              title="Toggle activity chart"
            >
              <BarChart2 size={18} />
            </button>
            <button
              onClick={() => supabase.auth.signOut().then(() => setUser(null))}
              className="p-2.5 rounded-xl glass text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
            <ToggleTheme />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="container relative z-10">
        <div className="max-w-6xl w-full mx-auto flex gap-5 items-start">

          {/* desktop sidebar */}
          {!isMobile && (
            <div className={`shrink-0 transition-all duration-300 overflow-hidden ${sidebarOpen ? "w-56" : "w-0"}`}>
              <ProjectSidebar
                projects={projects} selectedId={selectedProject}
                taskCounts={taskCounts} doneCounts={doneCounts}
                onSelect={setSelectedProject} onAdd={addProject}
                onRename={renameProject} onDelete={deleteProject}
                onToggleCollapse={toggleProjectCollapse}
              />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-4">
          {/* sidebar toggle button */}
          <button onClick={() => setSidebarOpen(s => !s)}
            className="flex items-center gap-1.5 text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            {sidebarOpen && !isMobile ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            {sidebarOpen && !isMobile ? "Hide projects" : "Projects"}
          </button>

          {/* active project breadcrumb */}
          {activeProject && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <FolderOpen size={13} style={{ color: activeProject.color }} />
              <span style={{ color: activeProject.color }} className="font-semibold">{activeProject.name}</span>
              <span>· {remaining} remaining</span>
            </div>
          )}

          {/* progress */}
          {projectFilteredTodo.length > 0 && (
            <div className="glass rounded-2xl px-5 py-3 flex flex-col gap-2">
              {/* dancing character above bar */}
              <div className="relative h-6">
                <span
                  className={`absolute -top-0.5 text-lg transition-all duration-700 ease-in-out select-none ${
                    progressPct === 100 ? "emoji-bounce" : remaining > 0 && todo.some(t => !t.completed && !t.paused) ? "emoji-walk" : "emoji-zzz"
                  }`}
                  style={{ left: `calc(${progressPct}% - 10px)`, display: "inline-block" }}
                >
                  {progressPct === 100 ? "🥳" : remaining > 0 && todo.some(t => !t.completed && !t.paused) ? "🏃" : "🚶"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 shrink-0">{progressPct}%</span>
                <div className="flex-1 h-2 rounded-full bg-purple-100 dark:bg-purple-900/50 overflow-hidden">
                  <div className="h-full rounded-full progress-shimmer transition-all duration-700" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{completed}/{todo.length} done</span>
                {streak >= 2 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300 shrink-0 streak-badge">
                    🔥 {streak} streak
                  </span>
                )}
              </div>
            </div>
          )}

          {/* add task input */}
          <div className="glass rounded-2xl p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="text-gray-900 dark:text-white flex-1 px-4 py-2 bg-white/40 dark:bg-white/5 rounded-xl placeholder:text-gray-400 dark:placeholder:text-gray-500 min-w-0"
                value={input}
                onKeyDown={e => e.key === "Enter" && addTodo()}
                onChange={e => setInput(e.target.value)}
                placeholder="What's on your mind? (press N)"
              />
              <button
                onClick={() => setShowSearch(s => !s)}
                title="Search"
                className={`shrink-0 p-2.5 rounded-xl transition-all ${showSearch ? "bg-blue-500 text-white" : "text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}
              >
                <Search size={17} />
              </button>
              <button
                onClick={() => setShowOptions(s => !s)}
                title="Set deadline / options"
                className={`shrink-0 p-2.5 rounded-xl transition-all ${showOptions || deadline || taskEmoji ? "bg-violet-500 text-white" : "text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"}`}
              >
                <Bell size={17} />
              </button>
              <button
                onClick={addTodo}
                className="shrink-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white p-3 rounded-xl hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-md shadow-violet-500/30 disabled:opacity-40 disabled:shadow-none active:scale-95"
                disabled={!input.trim()}
              >
                <Plus size={20} />
              </button>
            </div>

            {/* search bar - appears on click */}
            {showSearch && (
              <div className="flex items-center gap-2 bg-white/40 dark:bg-white/5 rounded-xl px-3 py-2 mt-2 animate-slideIn">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search tasks... (press /)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 min-w-0"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-red-400 shrink-0">
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* options panel (deadline, priority, estimate) */}
          {showOptions && (
            <div className="glass rounded-2xl p-3 flex flex-col gap-2 animate-slideIn">
              {/* emoji + deadline row */}
              <div className="flex items-center gap-2">
                <EmojiPicker value={taskEmoji} onChange={setTaskEmoji} />
                <Clock size={14} className="text-violet-500 shrink-0" />
                <input
                  type="datetime-local"
                  min={minDT}
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="flex-1 min-w-0 text-xs bg-transparent text-gray-700 dark:text-gray-200 border border-violet-200 dark:border-violet-700 rounded-lg px-3 py-1.5"
                />
                {deadline && (
                  <button onClick={() => setDeadline("")} className="shrink-0 text-gray-400 hover:text-red-400">
                    <BellOff size={14} />
                  </button>
                )}
              </div>
              {/* priority + estimate row */}
              <div className="flex items-center gap-2">
                <Flag size={14} className="text-violet-500 shrink-0" />
                <div className="flex gap-1.5">
                  {(["high", "medium", "low"] as Priority[]).map(p => (
                    <button key={p} onClick={() => setPriority(p)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize transition-all ${
                        priority === p ? PRIORITY_STYLES[p] + " ring-1 ring-current" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="number" min="1" max="480" placeholder="est. min"
                  value={estimate}
                  onChange={e => setEstimate(e.target.value)}
                  className="w-20 shrink-0 text-xs bg-transparent text-gray-700 dark:text-gray-200 border border-violet-200 dark:border-violet-700 rounded-lg px-2 py-1.5"
                />
              </div>
            </div>
          )}

          {/* sort + tag filter */}
          <div className="glass rounded-2xl p-3 flex flex-wrap gap-2">
              <div className="relative">
                <button
                  onClick={() => {
                    const sorts: SortBy[] = ["created", "deadline", "priority", "alphabetical", "elapsed"];
                    const idx = sorts.indexOf(sortBy);
                    setSortBy(sorts[(idx + 1) % sorts.length]);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/40 dark:bg-white/5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                  title="Sort by"
                >
                  <ArrowUpDown size={14} />
                  <span className="capitalize">{sortBy}</span>
                </button>
              </div>
              {availableTags.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setFilterTag(filterTag ? null : availableTags[0])}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      filterTag
                        ? "bg-violet-500 text-white"
                        : "bg-white/40 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                    }`}
                    title="Filter by tag"
                  >
                    <Tag size={14} />
                    {filterTag || "Tags"}
                  </button>
                  {filterTag && (
                    <div className="absolute top-full mt-1 right-0 z-50 glass rounded-xl p-1 shadow-xl min-w-[120px]">
                      {availableTags.map(tag => (
                        <button key={tag}
                          onClick={() => setFilterTag(tag)}
                          className={`w-full text-left px-2 py-1 rounded-lg text-xs transition-all ${
                            filterTag === tag
                              ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                              : "hover:bg-white/50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                          }`}>
                          {tag}
                        </button>
                      ))}
                      <button
                        onClick={() => setFilterTag(null)}
                        className="w-full text-left px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-red-400 transition-colors">
                        Clear filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          {/* tabs */}
          <div className="glass rounded-2xl p-1.5 flex gap-1.5">
            {tabs.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)}
                className={`flex-1 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  activeTab === i
                    ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30"
                    : "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/5"
                }`}>
                {tab}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === i ? "bg-white/25 text-white" : "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300"
                }`}>
                  {i === 0 ? todo.length : i === 1 ? remaining : completed}
                </span>
              </button>
            ))}
          </div>

          {/* chart */}
          {showChart && <HourlyChart todos={todo} />}

          {/* bulk actions bar */}
          {selectedTasks.size > 0 && (
            <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 animate-slideIn">
              <CheckSquare size={16} className="text-violet-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {selectedTasks.size} selected
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={bulkComplete}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-all">
                  Mark done
                </button>
                <button
                  onClick={bulkDelete}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition-all">
                  Delete
                </button>
                <button
                  onClick={() => setSelectedTasks(new Set())}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* list */}
          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/30 dark:divide-white/5 max-h-[30rem] overflow-y-auto">
            {filterTodo.length === 0 ? (
              <div className="p-12 sm:p-16 text-center">
                <span className="size-24 bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/40 dark:to-fuchsia-900/40 flex items-center mx-auto justify-center rounded-full text-violet-400 dark:text-violet-500">
                  <Circle size={48} />
                </span>
                <p className="text-gray-500 dark:text-gray-400 py-6 text-sm">
                  {activeTab === 0 ? "No tasks yet. Add one to get started!" : activeTab === 1 ? "No active tasks." : "No completed tasks."}
                </p>
              </div>
            ) : (
              filterTodo.map(t => (
                <div key={t.id} className="flex flex-col">
                  <div className="todo-row flex items-center gap-2 w-full px-4 py-3 group hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                    {/* bulk select checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(t.id)}
                      onChange={e => {
                        const newSet = new Set(selectedTasks);
                        if (e.target.checked) newSet.add(t.id);
                        else newSet.delete(t.id);
                        setSelectedTasks(newSet);
                      }}
                      className="size-4 rounded border-2 border-violet-300 dark:border-violet-700 shrink-0 cursor-pointer"
                      onClick={e => e.stopPropagation()}
                    />

                    {/* project color dot */}
                    {t.projectId && (() => { const proj = projects.find(p => p.id === t.projectId); return proj ? <span className="size-1.5 rounded-full shrink-0" style={{ background: proj.color }} /> : null; })()}

                    <button
                      className={`size-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        t.completed
                          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-400/40"
                          : "border-2 border-purple-300 dark:border-purple-700 hover:border-violet-500"
                      }`}
                      onClick={() => toggleTodo(t.id)}
                    >
                      {t.completed && <Check size={13} strokeWidth={3} />}
                    </button>

                    <TaskEmoji todo={t} />

                    {/* text + badges stacked on mobile, inline on sm+ */}
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                      {editingTask === t.id ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                updateTaskText(t.id, editText);
                                setEditingTask(null);
                              }
                              if (e.key === "Escape") setEditingTask(null);
                            }}
                            onBlur={() => {
                              updateTaskText(t.id, editText);
                              setEditingTask(null);
                            }}
                            autoFocus
                            className="flex-1 min-w-0 text-sm bg-white/60 dark:bg-white/10 rounded px-2 py-1 border border-violet-300 dark:border-violet-600"
                          />
                          <button onClick={() => { updateTaskText(t.id, editText); setEditingTask(null); }} className="text-green-500 hover:text-green-600 shrink-0">
                            <Save size={14} />
                          </button>
                        </div>
                      ) : (
                        <p
                          className={`min-w-0 truncate text-sm transition-colors cursor-pointer ${
                            t.completed ? "line-through text-gray-400 dark:text-gray-600" : "text-gray-800 dark:text-gray-100"
                          }`}
                          onDoubleClick={() => { setEditingTask(t.id); setEditText(t.text); }}
                          title="Double-click to edit"
                        >
                          {t.text}
                        </p>
                      )}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 shrink-0 ${PRIORITY_STYLES[t.priority]}`}>
                          <Flag size={8} />{t.priority}
                        </span>
                        {t.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300 font-medium shrink-0">
                            #{tag}
                          </span>
                        ))}
                        <DeadlineBadge todo={t} />
                        <LiveTimer todo={t} />
                        {t.subtasks.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 font-medium shrink-0">
                            {t.subtasks.filter(s => s.completed).length}/{t.subtasks.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* expand button */}
                    <button
                      onClick={() => setExpandedTask(expandedTask === t.id ? null : t.id)}
                      className="size-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all shrink-0"
                      title="Expand details"
                    >
                      {expandedTask === t.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* pause/resume */}
                    {!t.completed && (
                      <button
                        onClick={() => togglePause(t.id)}
                        className={`size-7 flex items-center justify-center rounded-xl transition-all shrink-0 ${
                          t.paused
                            ? "text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                            : "text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        } opacity-100 visible sm:opacity-0 sm:invisible sm:group-hover:opacity-100 sm:group-hover:visible`}
                        title={t.paused ? "Resume" : "Pause"}
                      >
                        {t.paused ? <Play size={13} /> : <Pause size={13} />}
                      </button>
                    )}

                    <button
                      onClick={() => removeTodo(t.id)}
                      className="size-8 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shrink-0 opacity-100 visible sm:opacity-0 sm:invisible sm:group-hover:opacity-100 sm:group-hover:visible"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* expanded panel: notes + tags + subtasks */}
                  {expandedTask === t.id && (
                    <div className="px-4 pb-3 space-y-2 bg-white/20 dark:bg-black/10 animate-slideIn">
                      {/* notes */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Notes</label>
                        <textarea
                          value={t.notes}
                          onChange={e => updateTaskNotes(t.id, e.target.value)}
                          placeholder="Add notes..."
                          className="w-full text-xs bg-white/60 dark:bg-white/10 rounded-lg px-3 py-2 border border-violet-200 dark:border-violet-700 text-gray-800 dark:text-gray-200 min-h-[60px] resize-none"
                        />
                      </div>

                      {/* tags */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Tags</label>
                        <div className="flex flex-wrap gap-1">
                          {t.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-1 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300 flex items-center gap-1">
                              #{tag}
                              <button onClick={() => removeTag(t.id, tag)} className="hover:text-red-500">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            placeholder="+ tag"
                            onKeyDown={e => {
                              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                addTag(t.id, e.currentTarget.value.trim());
                                e.currentTarget.value = "";
                              }
                            }}
                            className="text-xs bg-white/60 dark:bg-white/10 rounded-lg px-2 py-1 border border-violet-200 dark:border-violet-700 w-20"
                          />
                        </div>
                      </div>

                      {/* subtasks */}
                      <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Subtasks</label>
                        <div className="space-y-1">
                          {t.subtasks.map(sub => (
                            <div key={sub.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={sub.completed}
                                onChange={() => toggleSubtask(t.id, sub.id)}
                                className="size-3.5 rounded border-2 border-violet-300 dark:border-violet-700 shrink-0 cursor-pointer"
                              />
                              <span className={`flex-1 text-xs ${sub.completed ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                                {sub.text}
                              </span>
                              <button onClick={() => deleteSubtask(t.id, sub.id)} className="text-gray-400 hover:text-red-400 shrink-0">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <input
                            type="text"
                            placeholder="+ Add subtask"
                            onKeyDown={e => {
                              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                addSubtask(t.id, e.currentTarget.value.trim());
                                e.currentTarget.value = "";
                              }
                            }}
                            className="w-full text-xs bg-white/60 dark:bg-white/10 rounded-lg px-2 py-1.5 border border-violet-200 dark:border-violet-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {filterTodo.length > 0 && (
              <div className="px-4 py-3 flex flex-wrap items-center gap-2 justify-between bg-white/20 dark:bg-black/10">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Timer size={13} className="text-violet-500" />
                  <span>{remaining} remaining · {completed} done · {formatDuration(totalTracked)} tracked</span>
                  <span className="text-gray-400">· Press <kbd className="px-1.5 py-0.5 rounded bg-white/40 dark:bg-white/10 font-mono text-[10px]">N</kbd> new task · <kbd className="px-1.5 py-0.5 rounded bg-white/40 dark:bg-white/10 font-mono text-[10px]">/</kbd> search · <kbd className="px-1.5 py-0.5 rounded bg-white/40 dark:bg-white/10 font-mono text-[10px]">Ctrl+Z</kbd> undo</span>
                </div>
                {completed > 0 && (
                  <button onClick={clearCompleted}
                    className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 hover:underline transition-colors">
                    Clear completed
                  </button>
                )}
              </div>
            )}
          </div>
          </div>{/* end flex-1 */}
        </div>{/* end flex gap-5 */}
      </main>

      <footer className="relative z-10 max-w-6xl w-full mx-auto mt-auto pb-5">
        <p className="px-5 md:px-0 text-xs text-purple-400/60 dark:text-purple-500/50">
          &copy; {new Date().getFullYear().toString()} Made with ❤️ by JB · My Task
        </p>
      </footer>
    </section>
  );
};

export default App;
