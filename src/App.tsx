import { Sparkle, Plus, Check, Trash2 } from "lucide-react";
import { ToggleTheme } from "./components/ToggleTheme";

const App = () => {
  const tabs = ["All Tasks", "Active Tasks", "Completed Tasks"];

  return (
    <section className="min-h-lvh bg-gray-50 text-gray-900 dark:text-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      {/* header */}
      <header className="bg-white border-b ">
        <div className="container">
          <div>
            {/* icon */}
            <span>
              <Sparkle />
            </span>
          </div>
          <>
            <h1>My Task</h1>
            <p>Stay Organised, stay productive</p>
          </>
          <ToggleTheme />
        </div>
      </header>

      {/* main */}
      <main className="">
        {/* input section */}
        <div className="">
          <input type="text" name="" placeholder="What's on your mind?" id="" />
          <button className="">
            <Plus />
          </button>
        </div>

        {/* filter */}
        <div className="">
          {tabs.map((tab, i) => (
            <button key={i}>{tab}</button>
          ))}
        </div>
        {/* list  */}
        <div>
          <div className="">
            <button>
              <Check />
            </button>
            <p>Task 01</p>
          </div>
          <button>
            <Trash2 />
          </button>
        </div>
      </main>

      {/* footer */}
      <footer className="">
        <p>
          &copy; {new Date().getFullYear()} Made with JB, My Task. All rights reserved.
        </p>
      </footer>
    </section>
  );
};

export default App;
