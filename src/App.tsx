import { Sparkle, Plus, Check, Trash2, Circle, Timer, Bell, BellOff, BarChart2, X, Clock, LogOut } from "lucide-react";
import { ToggleTheme } from "./components/ToggleTheme";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

// Krishiv@2026

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  elapsed: number;
  deadline: number | null;   // unix ms
  notified: boolean;
}

interface Toast {
  id: number;
  text: string;
  type: "overdue" | "done";
}

/* ── Auth gate ── */
function AuthGate({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!email.trim()) return;
    setLoading(true);
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    setSent(true);
    setLoading(false);
  };

  // listen for magic-link redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) onLogin(data.session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) onLogin(session.user);
    });
    return () => subscription.unsubscribe();
  }, [onLogin]);

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
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-violet-700 bg-transparent text-gray-900 dark:text-white text-sm"
            />
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

/* ── Live elapsed timer badge ── */
function LiveTimer({ todo }: { todo: Todo }) {
  const isRunning = !todo.completed && todo.startedAt !== null;
  useTick(isRunning);
  const ms = todo.elapsed + (isRunning && todo.startedAt ? Date.now() - todo.startedAt : 0);
  if (ms < 1000 && !todo.completed) return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shrink-0 ${
      todo.completed
        ? "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300"
        : "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
    }`}>
      {!todo.completed && <span className="size-1.5 rounded-full bg-purple-500 animate-pulse inline-block" />}
      {formatDuration(ms)}
    </span>
  );
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

/* ── Hourly bar chart (pure SVG) ── */
function HourlyChart({ todos }: { todos: Todo[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const counts = useMemo(() => {
    const map: Record<number, { active: number; done: number }> = {};
    hours.forEach(h => (map[h] = { active: 0, done: 0 }));
    todos.forEach(t => {
      const h = new Date(t.createdAt).getHours();
      if (t.completed) map[h].done++;
      else map[h].active++;
    });
    return map;
  }, [todos]);

  const now = new Date().getHours();
  const maxVal = Math.max(1, ...hours.map(h => counts[h].active + counts[h].done));
  const W = 560, H = 80, barW = W / 24;

  // only show hours that have data or ±2 from now
  const relevant = hours.filter(h => counts[h].active + counts[h].done > 0 || Math.abs(h - now) <= 1);
  if (relevant.length === 0) return null;

  return (
    <div className="glass rounded-2xl px-4 pt-3 pb-2">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 size={14} className="text-violet-500" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Activity by hour</span>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">now → {now}:00</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full" style={{ height: 72 }}>
        {hours.map(h => {
          const total = counts[h].active + counts[h].done;
          const doneH  = (counts[h].done   / maxVal) * H;
          const activeH = (counts[h].active / maxVal) * H;
          const x = h * barW + 1;
          const isNow = h === now;
          return (
            <g key={h}>
              {/* done bar */}
              {doneH > 0 && (
                <rect x={x} y={H - doneH} width={barW - 2} height={doneH}
                  rx={2} fill={isNow ? "#a78bfa" : "#c4b5fd"} opacity={0.9} />
              )}
              {/* active bar stacked on top */}
              {activeH > 0 && (
                <rect x={x} y={H - doneH - activeH} width={barW - 2} height={activeH}
                  rx={2} fill={isNow ? "#f472b6" : "#f9a8d4"} opacity={0.85} />
              )}
              {/* now indicator */}
              {isNow && (
                <line x1={x + (barW - 2) / 2} y1={0} x2={x + (barW - 2) / 2} y2={H + 14}
                  stroke="#a78bfa" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
              )}
              {/* hour label — only show every 3h or if has data */}
              {(h % 3 === 0 || total > 0) && (
                <text x={x + (barW - 2) / 2} y={H + 13} textAnchor="middle"
                  fontSize={7} fill={isNow ? "#a78bfa" : "#9ca3af"} fontWeight={isNow ? "700" : "400"}>
                  {h}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex gap-3 mt-1">
        <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="size-2 rounded-sm bg-fuchsia-300 inline-block" />Active</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="size-2 rounded-sm bg-violet-300 inline-block" />Done</span>
      </div>
    </div>
  );
}

const tabs = ["All", "Active", "Completed"];

const App = () => {
  const [user, setUser]         = useState<User | null>(null);
  const [input, setInput]       = useState("");
  const [deadline, setDeadline] = useState("");          // datetime-local string
  const [showDL, setShowDL]     = useState(false);       // toggle deadline picker
  const [todo, setTodo]         = useState<Todo[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [toasts, setToasts]     = useState<Toast[]>([]);
  const [showChart, setShowChart] = useState(false);
  const notifPerm = useRef<NotificationPermission>("default");

  /* load todos from Supabase when user logs in */
  useEffect(() => {
    if (!user) return;
    supabase.from("todos").select("*").eq("user_id", user.id).then(({ data }) => {
      if (data) setTodo(data.map(r => ({
        id: r.id, text: r.text, completed: r.completed,
        createdAt: r.created_at, startedAt: r.started_at, completedAt: r.completed_at,
        elapsed: r.elapsed, deadline: r.deadline, notified: r.notified,
      })));
    });
  }, [user]);

  /* request notification permission once */
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then(p => { notifPerm.current = p; });
    }
  }, []);

  /* deadline watcher */
  useEffect(() => {
    const id = setInterval(() => {
      setTodo(prev => prev.map(t => {
        if (t.completed || !t.deadline || t.notified) return t;
        if (Date.now() >= t.deadline) {
          const msg = `⏰ "${t.text}" — time's up! You missed the deadline.`;
          if (notifPerm.current === "granted") new Notification("My Task", { body: msg, icon: "/favicon.ico" });
          setToasts(ts => [...ts, { id: Date.now(), text: msg, type: "overdue" }]);
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

  const addTodo = useCallback(async () => {
    if (!input.trim() || !user) return;
    const dl = deadline ? new Date(deadline).getTime() : null;
    const newTodo: Todo = {
      id: Date.now(), text: input.trim(), completed: false,
      createdAt: Date.now(), startedAt: Date.now(), completedAt: null,
      elapsed: 0, deadline: dl, notified: false,
    };
    setTodo(prev => [...prev, newTodo]);
    await supabase.from("todos").insert({
      id: newTodo.id, user_id: user.id, text: newTodo.text, completed: false,
      created_at: newTodo.createdAt, started_at: newTodo.startedAt, completed_at: null,
      elapsed: 0, deadline: dl, notified: false,
    });
    setInput(""); setDeadline(""); setShowDL(false);
  }, [input, deadline, user]);

  const removeTodo = useCallback(async (id: number) => {
    setTodo(prev => prev.filter(t => t.id !== id));
    await supabase.from("todos").delete().eq("id", id);
  }, []);

  const toggleTodo = useCallback(async (id: number) => {
    let updated: Todo | null = null;
    setTodo(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (!t.completed) {
        const elapsed = t.elapsed + (t.startedAt ? Date.now() - t.startedAt : 0);
        const msg = `✅ "${t.text}" completed in ${formatDuration(elapsed)}!`;
        if (notifPerm.current === "granted") new Notification("My Task", { body: msg });
        setToasts(ts => [...ts, { id: Date.now(), text: msg, type: "done" }]);
        updated = { ...t, completed: true, completedAt: Date.now(), elapsed, startedAt: null };
        return updated;
      }
      updated = { ...t, completed: false, completedAt: null, startedAt: Date.now(), notified: false };
      return updated;
    }));
    if (updated) {
      const u = updated as Todo;
      await supabase.from("todos").update({
        completed: u.completed, completed_at: u.completedAt,
        started_at: u.startedAt, elapsed: u.elapsed, notified: u.notified,
      }).eq("id", id);
    }
  }, []);

  const clearCompleted = useCallback(async () => {
    const ids = todo.filter(t => t.completed).map(t => t.id);
    setTodo(prev => prev.filter(t => !t.completed));
    if (ids.length) await supabase.from("todos").delete().in("id", ids);
  }, [todo]);

  const filterTodo = useMemo(() => {
    switch (activeTab) {
      case 1: return todo.filter(t => !t.completed);
      case 2: return todo.filter(t => t.completed);
      default: return todo;
    }
  }, [activeTab, todo]);

  const hasRunning = todo.some(t => !t.completed && t.startedAt !== null);
  useTick(hasRunning);

  const remaining   = todo.filter(t => !t.completed).length;
  const completed   = todo.filter(t => t.completed).length;
  const progressPct = todo.length === 0 ? 0 : Math.round((completed / todo.length) * 100);

  /* min datetime for picker = now */
  const minDT = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  if (!user) return <AuthGate onLogin={setUser} />;

  return (
    <section className="bg-mesh min-h-lvh text-gray-900 dark:text-gray-50 transition-colors flex flex-col relative overflow-x-hidden">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

      {/* ── Toast stack ── */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`pointer-events-auto glass rounded-2xl px-4 py-3 flex items-start gap-3 shadow-xl animate-slideIn ${
              toast.type === "overdue"
                ? "border-red-400/40 dark:border-red-500/30"
                : "border-green-400/40 dark:border-green-500/30"
            }`}>
            <span className="text-lg shrink-0">{toast.type === "overdue" ? "⏰" : "✅"}</span>
            <p className="text-xs text-gray-700 dark:text-gray-200 flex-1">{toast.text}</p>
            <button onClick={() => setToasts(ts => ts.filter(t => t.id !== toast.id))}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 pointer-events-auto">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 max-w-3xl w-full mx-auto">
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
        <div className="max-w-3xl w-full mx-auto space-y-4">

          {/* progress */}
          {todo.length > 0 && (
            <div className="glass rounded-2xl px-5 py-3 flex items-center gap-4">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 shrink-0">{progressPct}%</span>
              <div className="flex-1 h-2 rounded-full bg-purple-100 dark:bg-purple-900/50 overflow-hidden">
                <div className="h-full rounded-full progress-shimmer transition-all duration-700" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{completed}/{todo.length} done</span>
            </div>
          )}

          {/* input */}
          <div className="glass rounded-2xl p-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="text-gray-900 dark:text-white flex-1 px-5 py-3.5 bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                value={input}
                onKeyDown={e => e.key === "Enter" && addTodo()}
                onChange={e => setInput(e.target.value)}
                placeholder="What's on your mind?"
              />
              <button
                onClick={() => setShowDL(s => !s)}
                title="Set deadline"
                className={`p-3 rounded-xl transition-all ${showDL || deadline ? "bg-violet-500 text-white" : "text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"}`}
              >
                <Bell size={18} />
              </button>
              <button
                onClick={addTodo}
                className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white p-3.5 rounded-xl hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-md shadow-violet-500/30 disabled:opacity-40 disabled:shadow-none active:scale-95"
                disabled={!input.trim()}
              >
                <Plus size={20} />
              </button>
            </div>
            {showDL && (
              <div className="flex items-center gap-2 px-2 pb-1 animate-slideIn">
                <Clock size={14} className="text-violet-500 shrink-0" />
                <input
                  type="datetime-local"
                  min={minDT}
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="flex-1 text-xs bg-transparent text-gray-700 dark:text-gray-200 border border-violet-200 dark:border-violet-700 rounded-lg px-3 py-1.5"
                />
                {deadline && (
                  <button onClick={() => setDeadline("")} className="text-gray-400 hover:text-red-400">
                    <BellOff size={14} />
                  </button>
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
                <div key={t.id} className="todo-row flex items-center gap-2 w-full px-4 py-3.5 group hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
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

                  <p className={`flex-1 min-w-0 truncate transition-colors ${
                    t.completed ? "line-through text-gray-400 dark:text-gray-600" : "text-gray-800 dark:text-gray-100"
                  }`}>
                    {t.text}
                  </p>

                  {/* badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <DeadlineBadge todo={t} />
                    <LiveTimer todo={t} />
                  </div>

                  <button
                    onClick={() => removeTodo(t.id)}
                    className="ml-1 size-8 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shrink-0
                      opacity-100 visible sm:opacity-0 sm:invisible sm:group-hover:opacity-100 sm:group-hover:visible"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}

            {filterTodo.length > 0 && (
              <div className="px-4 py-3 flex flex-wrap items-center gap-2 justify-between bg-white/20 dark:bg-black/10">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Timer size={13} className="text-violet-500" />
                  <span>{remaining} remaining · {completed} done</span>
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
        </div>
      </main>

      <footer className="relative z-10 max-w-3xl w-full mx-auto mt-auto pb-5">
        <p className="px-5 md:px-0 text-xs text-purple-400/60 dark:text-purple-500/50">
          &copy; {new Date().getFullYear()} Made with ❤️ by JB · My Task
        </p>
      </footer>
    </section>
  );
};

export default App;
