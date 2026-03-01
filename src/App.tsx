import { Sparkle, Plus, Check, Trash2 } from "lucide-react";
import { ToggleTheme } from "./components/ToggleTheme";

const App = () => {
  const tabs = ["All Tasks", "Active Tasks", "Completed Tasks"];

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
              placeholder="What's on your mind?"
              id=""
            />
            <button className="bg-purple-500 text-white dark:bg-purple-600 p-4 rounded-xl hover:bg-purple-600 transition-colors dark:hover:bg-purple-500">
              <Plus />
            </button>
          </div>

          {/* filter */}
          <div className="flex gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-200 rounded-xl transition-colors p-1 sm:p-2">
            {tabs.map((tab, i) => (
              <button
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm sm:text-base capitalize bg-gray-100 dark:bg-gray-700 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                key={i}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* todo list  */}
          <div className="bg-white divide-y divide-gray-200/30 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors">
            {/* list  */}
            <div className="flex items-center justify-between w-full p-4 group">
              <div className="flex align-middle justify-start gap-3 flex-1">
                <button
                  className={`size-6 border rounded-full flex items-center justify-center`}
                >
                  <Check size={16} />
                </button>
                <p>Task 01</p>
              </div>
              <button className="size-8 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-xl dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Trash2 />
              </button>
            </div>
            <div className="flex items-center justify-between w-full p-4 group">
              <div className="flex align-middle justify-start gap-3 flex-1">
                <button
                  className={`size-6 border rounded-full flex items-center justify-center`}
                >
                  <Check size={16} />
                </button>
                <p>Task 01</p>
              </div>
              <button className="size-8 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-xl dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Trash2 />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* footer */}
      <footer className="max-w-3xl w-full mx-auto mt-auto pb-4 space-y-6">
        <p>
          &copy; {new Date().getFullYear()} Made with JB, My Task. All rights
          reserved.
        </p>
      </footer>
    </section>
  );
};

export default App;
