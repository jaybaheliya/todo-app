import { Sparkle, Plus, Check, Trash2, Circle, Timer } from "lucide-react";
import { ToggleTheme } from "./components/ToggleTheme";
import { useEffect, useMemo, useState, useCallback } from "react";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  elapsed: number; // ms accumulated before last pause
}

const STORAGE_KEY = "todo_v2";
const EXPIRY_KEY = "todo_expiry";
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

function loadTodos(): Todo[] {
  try {
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (expiry && Date.now() > Number(expiry)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EXPIRY_KEY);
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos(todos: Todo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  if (!localStorage.getItem(EXPIRY_KEY)) {
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + ONE_YEAR));
  }
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

function useTick(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

function LiveTimer({ todo }: { todo: Todo }) {
  const isRunning = !todo.completed && todo.startedAt !== null;
  useTick(isRunning);
  const ms = todo.elapsed + (isRunning && todo.startedAt ? Date.now() - todo.startedAt : 0);
  if (ms < 1000 && !todo.completed) return null;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shrink-0 ${
        todo.completed
          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
          : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
      }`}
    >
      {!todo.completed && (
        <span className="size-1.5 rounded-full bg-purple-500 animate-pulse inline-block" />
      )}
      {formatDuration(ms)}
    </span>
  );
}

const tabs = ["All", "Active", "Completed"];

const App = () => {
  const [input, setInput] = useState("");
  const [todo, setTodo] = useState<Todo[]>(loadTodos);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    saveTodos(todo);
  }, [todo]);

  const addTodo = useCallback(() => {
    if (!input.trim()) return;
    setTodo((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: input.trim(),
        completed: false,
        createdAt: Date.now(),
        startedAt: Date.now(),
        completedAt: null,
        elapsed: 0,
      },
    ]);
    setInput("");
  }, [input]);

  const removeTodo = useCallback((id: number) => {
    setTodo((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTodo = useCallback((id: number) => {
    setTodo((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (!t.completed) {
          // completing
          const elapsed = t.elapsed + (t.startedAt ? Date.now() - t.startedAt : 0);
          return { ...t, completed: true, completedAt: Date.now(), elapsed, startedAt: null };
        } else {
          // re-activating
          return { ...t, completed: false, completedAt: null, startedAt: Date.now() };
        }
      })
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setTodo((prev) => prev.filter((t) => !t.completed));
  }, []);

  const filterTodo = useMemo(() => {
    switch (activeTab) {
      case 1: return todo.filter((t) => !t.completed);
      case 2: return todo.filter((t) => t.completed);
      default: return todo;
    }
  }, [activeTab, todo]);

  const hasRunning = todo.some((t) => !t.completed && t.startedAt !== null);
  useTick(hasRunning); // keep footer stats live

  const remaining = todo.filter((t) => !t.completed).length;
  const completed = todo.filter((t) => t.completed).length;

  const progressPct = todo.length === 0 ? 0 : Math.round((completed / todo.length) * 100);

  return (
    <section className="bg-mesh min-h-lvh text-gray-900 dark:text-gray-50 transition-colors flex flex-col relative overflow-x-hidden">
      {/* floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* header */}
      <header className="relative z-10 max-w-3xl w-full mx-auto">
        <div className="container flex items-center justify-between">
          <div className="flex items-start gap-3">
            <span className="size-11 md:size-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white rounded-2xl shadow-lg shadow-violet-500/30 shrink-0">
              <Sparkle className="drop-shadow" />
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
          <ToggleTheme />
        </div>
      </header>

      {/* main */}
      <main className="container relative z-10">
        <div className="max-w-3xl w-full mx-auto space-y-4">

          {/* progress bar */}
          {todo.length > 0 && (
            <div className="glass rounded-2xl px-5 py-3 flex items-center gap-4">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 shrink-0">{progressPct}%</span>
              <div className="flex-1 h-2 rounded-full bg-purple-100 dark:bg-purple-900/50 overflow-hidden">
                <div
                  className="h-full rounded-full progress-shimmer transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{completed}/{todo.length} done</span>
            </div>
          )}

          {/* input */}
          <div className="glass rounded-2xl p-2 flex items-center gap-2">
            <input
              type="text"
              className="text-gray-900 dark:text-white flex-1 px-5 py-3.5 bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
              value={input}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What's on your mind?"
            />
            <button
              onClick={addTodo}
              className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white p-3.5 rounded-xl hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-md shadow-violet-500/30 disabled:opacity-40 disabled:shadow-none active:scale-95"
              disabled={!input.trim()}
            >
              <Plus size={20} />
            </button>
          </div>

          {/* tabs */}
          <div className="glass rounded-2xl p-1.5 flex gap-1.5">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex-1 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  activeTab === i
                    ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30"
                    : "text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/5"
                }`}
              >
                {tab}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === i
                    ? "bg-white/25 text-white"
                    : "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300"
                }`}>
                  {i === 0 ? todo.length : i === 1 ? remaining : completed}
                </span>
              </button>
            ))}
          </div>

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
              filterTodo.map((t) => (
                <div key={t.id} className="todo-row flex items-center gap-3 w-full px-4 py-3.5 group hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                  {/* checkbox */}
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

                  {/* text */}
                  <p className={`flex-1 min-w-0 truncate transition-colors ${
                    t.completed
                      ? "line-through text-gray-400 dark:text-gray-600"
                      : "text-gray-800 dark:text-gray-100"
                  }`}>
                    {t.text}
                  </p>

                  <LiveTimer todo={t} />

                  {/* delete */}
                  <button
                    onClick={() => removeTodo(t.id)}
                    className="ml-1 size-8 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shrink-0
                      opacity-100 visible
                      sm:opacity-0 sm:invisible sm:group-hover:opacity-100 sm:group-hover:visible"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}

            {/* stats footer */}
            {filterTodo.length > 0 && (
              <div className="px-4 py-3 flex flex-wrap items-center gap-2 justify-between bg-white/20 dark:bg-black/10">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Timer size={13} className="text-violet-500" />
                  <span>{remaining} remaining · {completed} done</span>
                </div>
                {completed > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 hover:underline transition-colors"
                  >
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
