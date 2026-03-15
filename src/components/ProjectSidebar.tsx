import { useState, useRef, useEffect } from "react";
import { ChevronRight, Folder, FolderOpen, Plus, Trash2, Pencil, Check, X } from "lucide-react";

export interface Project {
  id: number;
  name: string;
  color: string;
  parentId: number | null;
  collapsed: boolean;
}

const COLORS = ["#a78bfa","#f472b6","#34d399","#fbbf24","#60a5fa","#f87171","#fb923c","#a3e635"];

interface Props {
  projects: Project[];
  selectedId: number | null;          // null = "All Tasks"
  taskCounts: Record<number, number>; // projectId -> total tasks
  doneCounts:  Record<number, number>; // projectId -> done tasks
  onSelect: (id: number | null) => void;
  onAdd: (name: string, color: string, parentId: number | null) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onToggleCollapse: (id: number) => void;
}

function countDescendants(id: number, projects: Project[], counts: Record<number, number>): number {
  let total = counts[id] ?? 0;
  projects.filter(p => p.parentId === id).forEach(child => {
    total += countDescendants(child.id, projects, counts);
  });
  return total;
}

function countDoneDescendants(id: number, projects: Project[], counts: Record<number, number>): number {
  let total = counts[id] ?? 0;
  projects.filter(p => p.parentId === id).forEach(child => {
    total += countDoneDescendants(child.id, projects, counts);
  });
  return total;
}

interface NodeProps {
  project: Project;
  projects: Project[];
  depth: number;
  selectedId: number | null;
  taskCounts: Record<number, number>;
  doneCounts: Record<number, number>;
  onSelect: (id: number | null) => void;
  onAdd: (name: string, color: string, parentId: number | null) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onToggleCollapse: (id: number) => void;
}

function ProjectNode({ project, projects, depth, selectedId, taskCounts, doneCounts, onSelect, onAdd, onRename, onDelete, onToggleCollapse }: NodeProps) {
  const children = projects.filter(p => p.parentId === project.id);
  const hasChildren = children.length > 0;
  const [editing, setEditing]   = useState(false);
  const [editVal, setEditVal]   = useState(project.name);
  const [adding, setAdding]     = useState(false);
  const [newName, setNewName]   = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const newRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (adding)  newRef.current?.focus(); }, [adding]);

  const total = countDescendants(project.id, projects, taskCounts);
  const done  = countDoneDescendants(project.id, projects, doneCounts);
  const isSelected = selectedId === project.id;

  const commitRename = () => {
    if (editVal.trim()) onRename(project.id, editVal.trim());
    setEditing(false);
  };

  const commitAdd = () => {
    if (newName.trim()) onAdd(newName.trim(), newColor, project.id);
    setNewName(""); setAdding(false);
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-xl cursor-pointer transition-all select-none ${
          isSelected
            ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
            : "hover:bg-white/50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={() => !editing && onSelect(project.id)}
      >
        {/* collapse toggle */}
        <button
          className={`shrink-0 transition-transform ${hasChildren ? "opacity-60 hover:opacity-100" : "opacity-0 pointer-events-none"} ${!project.collapsed ? "rotate-90" : ""}`}
          onClick={e => { e.stopPropagation(); onToggleCollapse(project.id); }}
        >
          <ChevronRight size={13} />
        </button>

        {/* folder icon */}
        <span style={{ color: project.color }} className="shrink-0">
          {!project.collapsed && hasChildren ? <FolderOpen size={14} /> : <Folder size={14} />}
        </span>

        {/* name / edit input */}
        {editing ? (
          <input
            ref={inputRef}
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false); }}
            onBlur={commitRename}
            onClick={e => e.stopPropagation()}
            className="flex-1 text-xs bg-white/60 dark:bg-white/10 rounded px-1.5 py-0.5 outline-none border border-violet-300 dark:border-violet-600 min-w-0"
          />
        ) : (
          <span className="flex-1 text-xs font-medium truncate min-w-0">{project.name}</span>
        )}

        {/* task count badge */}
        {total > 0 && !editing && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 shrink-0 font-semibold">
            {done}/{total}
          </span>
        )}

        {/* action buttons */}
        {(showActions || isSelected) && !editing && (
          <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setAdding(a => !a)} className="p-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/40 text-gray-400 hover:text-violet-500" title="Add sub-project">
              <Plus size={11} />
            </button>
            <button onClick={() => { setEditing(true); setEditVal(project.name); }} className="p-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/40 text-gray-400 hover:text-violet-500" title="Rename">
              <Pencil size={11} />
            </button>
            <button onClick={() => onDelete(project.id)} className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-400 hover:text-red-500" title="Delete">
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* inline add sub-project */}
      {adding && (
        <div className="flex items-center gap-1.5 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}>
          <div className="flex gap-1 shrink-0">
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`size-3 rounded-full transition-transform ${newColor === c ? "scale-125 ring-1 ring-offset-1 ring-violet-400" : ""}`}
                style={{ background: c }} />
            ))}
          </div>
          <input
            ref={newRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Sub-project name…"
            className="flex-1 text-xs bg-white/60 dark:bg-white/10 rounded px-2 py-1 outline-none border border-violet-200 dark:border-violet-700 min-w-0"
          />
          <button onClick={commitAdd} className="text-green-500 hover:text-green-600"><Check size={13} /></button>
          <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-red-400"><X size={13} /></button>
        </div>
      )}

      {/* children */}
      {!project.collapsed && hasChildren && (
        <div className="border-l border-violet-200/50 dark:border-violet-700/30 ml-4">
          {children.map(child => (
            <ProjectNode key={child.id} project={child} projects={projects} depth={depth + 1}
              selectedId={selectedId} taskCounts={taskCounts} doneCounts={doneCounts}
              onSelect={onSelect} onAdd={onAdd} onRename={onRename} onDelete={onDelete} onToggleCollapse={onToggleCollapse} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectSidebar({ projects, selectedId, taskCounts, doneCounts, onSelect, onAdd, onRename, onDelete, onToggleCollapse }: Props) {
  const [newName, setNewName]   = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [adding, setAdding]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const roots = projects.filter(p => p.parentId === null);
  const totalAll = Object.values(taskCounts).reduce((a, b) => a + b, 0);
  const doneAll  = Object.values(doneCounts).reduce((a, b) => a + b, 0);

  const commit = () => {
    if (newName.trim()) onAdd(newName.trim(), newColor, null);
    setNewName(""); setAdding(false);
  };

  return (
    <div className="glass rounded-2xl p-3 flex flex-col gap-1 min-w-[200px]">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Projects</span>
        <button onClick={() => setAdding(a => !a)} className="p-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40 text-violet-500" title="New project">
          <Plus size={14} />
        </button>
      </div>

      {/* All Tasks */}
      <div
        onClick={() => onSelect(null)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer transition-all select-none ${
          selectedId === null
            ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
            : "hover:bg-white/50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
        }`}
      >
        <span className="text-base">📋</span>
        <span className="flex-1 text-xs font-medium">All Tasks</span>
        {totalAll > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 font-semibold">
            {doneAll}/{totalAll}
          </span>
        )}
      </div>

      {/* project tree */}
      {roots.map(p => (
        <ProjectNode key={p.id} project={p} projects={projects} depth={0}
          selectedId={selectedId} taskCounts={taskCounts} doneCounts={doneCounts}
          onSelect={onSelect} onAdd={onAdd} onRename={onRename} onDelete={onDelete} onToggleCollapse={onToggleCollapse} />
      ))}

      {/* add root project */}
      {adding && (
        <div className="flex flex-col gap-1.5 px-1 pt-1">
          <div className="flex gap-1 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`size-4 rounded-full transition-transform ${newColor === c ? "scale-125 ring-1 ring-offset-1 ring-violet-400" : ""}`}
                style={{ background: c }} />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Project name…"
              className="flex-1 text-xs bg-white/60 dark:bg-white/10 rounded-lg px-2 py-1.5 outline-none border border-violet-200 dark:border-violet-700 min-w-0"
            />
            <button onClick={commit} className="text-green-500 hover:text-green-600"><Check size={14} /></button>
            <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-red-400"><X size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
