import { Sparkle, Plus, Check, Trash2, Circle } from "lucide-react";
import { ToggleTheme } from "./components/ToggleTheme";
import { useEffect, useMemo, useState } from "react";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const App = () => {
  const tabs = ["All Tasks", "Active Tasks", "Completed Tasks"];

  const [input, setInput] = useState<string>("");
  const [todo, setTodo] = useState<Todo[]>(()=>{
    const storedTodo = localStorage.getItem("todo");
    return storedTodo ? JSON.parse(storedTodo) : [];
  });

  useEffect(() => {
    localStorage.setItem("todo", JSON.stringify(todo));
  }, [todo]);

  const [activeTab, setActiveTab] = useState<number>(0);

  const addTodo = () => {
    if (input.trim() !== "") {
      setTodo([...todo, { id: Date.now(), text: input, completed: false }]);
      setInput("");
    }
  };

  const removeTodo = (id: number) => {
    setTodo(todo.filter((todo) => todo.id !== id));
  };

  const toggleTodo = (id: number) => {
    setTodo(
      todo.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // const filterTodo = () => {
  //   switch (activeTab) {
  //     case 0:
  //       return todo;
  //     case 1:
  //       return todo.filter((todo) => !todo.completed);
  //     case 2:
  //       return todo.filter((todo) => todo.completed);
  //     default:
  //       return todo;
  //   }
  // };

  const filterTodo = useMemo(() => {
    switch (activeTab) {
      case 0:
        return todo;
      case 1:
        return todo.filter((todo) => !todo.completed);
      case 2:
        return todo.filter((todo) => todo.completed);
      default:
        return todo;
    }
  }, [activeTab, todo]);


  return (
    <section className="min-h-lvh bg-gray-50 text-gray-900 dark:text-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      {/* header */}
      <header className="max-w-3xl w-full mx-auto bg-white border-b border-gray-400 dark:bg-gray-800 transition-colors dark:border-gray-700">
        <div className="container flex items-center justify-between">
          <div className="flex items-start gap-2.5">
            {/* icon */}
            <span className="size-10 md:size-14 bg-purple-500 flex items-center justify-center text-white rounded-xl transition-colors shrink-0 dark:bg-purple-600">
              <Sparkle />
            </span>
            <div className="flex flex-col">
              <h1 className="text-3xl font-semibold sm:text-5xl text-purple-700 dark:text-purple-500 transition-colors">
                My Task
              </h1>
              <p className="text-sm sm:text-base mt-1 text-gray-600 dark:text-gray-400 transition-colors">
                Stay Organised, stay productive
              </p>
            </div>
          </div>

          <ToggleTheme />
        </div>
      </header>

      {/* main */}
      <main className="container">
        <div className="max-w-3xl w-full mx-auto space-y-6">
          {/* input section */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 flex items-center gap-2 justify-between transition-colors hover:border-purple-400!">
            <input
              type="text"
              className="text-gray-900 dark:text-white flex-1 px-5 py-4"
              name=""
              value={input}
              onKeyDown={(e) => e.key == "Enter" && addTodo()}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What's on your mind?"
              id=""
            />
            <button
              onClick={addTodo}
              className="bg-purple-500 text-white dark:bg-purple-600 p-4 rounded-xl hover:bg-purple-600 transition-colors dark:hover:bg-purple-500 disabled:opacity-50"
              disabled={!input.trim()}
            >
              <Plus />
            </button>
          </div>

          {/* filter */}
          <div className="flex gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-200 rounded-xl transition-colors p-1 sm:p-2">
            {tabs.map((tab, i) => (
              <button
                onClick={() => setActiveTab(i)}
                disabled={activeTab === i}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm sm:text-base capitalize bg-gray-100 dark:bg-gray-700 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white ${
                  activeTab === i
                    ? "bg-purple-500 dark:bg-purple-600 text-white dark:text-white hover:bg-purple-600 dark:hover:bg-purple-500"
                    : ""
                }`}
                key={i}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* todo list  */}
          <div className="bg-white divide-y divide-gray-200/50 dark:divide-gray-700 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors max-h-96 overflow-y-auto">
            {/* list  */}
            {filterTodo.length === 0 ? (
              <div className="p-12 sm:p-16 text-center ">
                <span className="size-24 bg-purple-100 dark:bg-purple-900 flex items-center mx-auto justify-center  rounded-full dark:text-purple-600  text-purple-400 transition-colors">
                  <Circle size={54} />
                </span>
                <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                  {activeTab === 0
                    ? "No tasks yet. Add a task to get started!"
                    : activeTab === 1
                    ? "No active tasks."
                    : "No completed tasks."}
                  {/* No tasks yet. Add a task to get started! */}
                </p>
              </div>
            ) : (
              <>
                {filterTodo.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center justify-between w-full p-4 group"
                  >
                    <div className="flex align-middle justify-start gap-3 flex-1">
                      <button
                        className={`size-6 border rounded-full flex items-center justify-center ${
                          todo.completed
                            ? "bg-purple-500 border-purple-500 text-white"
                            : "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                        }`}
                        onClick={() => toggleTodo(todo.id)}
                      >
                        {todo.completed && (
                          <Check size={16} />
                        ) }
                      </button>
                      <p className={`text-gray-400 dark:text-gray-500 capitalize flex-1 ${todo.completed ? "line-through" : "text-gray-900 dark:text-white"} `}>{todo.text}</p>
                    </div>
                    <button
                      onClick={() => removeTodo(todo.id)}
                      className="size-8 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-xl dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </>
            )}
            {filterTodo.length > 0 && ( 
              <div className="p-4 text-gray-500 dark:text-gray-400 text-sm flex justify-between">
                <p className="flex items-center justify-center">{filterTodo.filter((t) => !t.completed).length} tasks remaining</p>
                <p className="flex items-center justify-center">{filterTodo.length} tasks in total</p>
                <p className="flex items-center justify-center">{filterTodo.filter((t) => t.completed).length} tasks completed</p>
                <button className="bg-purple-500 dark:bg-amber-500 shadow hover:bg-purple-600 dark:hover:bg-amber-600 rounded-2xl text-white px-3 py-1" onClick={() => setTodo(filterTodo.filter((t) => !t.completed))}>Clear Completed tasks</button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* footer */}
      <footer className="max-w-3xl w-full mx-auto mt-auto pb-4 space-y-6">
        <p className="px-5 md:px-0">
          &copy; {new Date().getFullYear()} Made with JB, My Task. All rights
          reserved.
        </p>
      </footer>
    </section>
  );
};

export default App;
