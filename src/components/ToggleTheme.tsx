import { Sun, Moon } from "lucide-react";
import { useState } from "react";

export const ToggleTheme = () => {
  const [isDark, setIsDark] = useState<boolean>(false);

  useState(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  });

  const toggleTheme = () => {
    const newtheme = !isDark;
    setIsDark(newtheme);
    document.documentElement.classList.toggle("dark", newtheme);
    localStorage.setItem("theme", newtheme ? "dark" : "light");
  };

  return (
    <div>
      <button
        onClick={toggleTheme}
        className="p-3 sm:p-4 rounded-2xl bg-purple-600 text-white dark:bg-yellow-500 dark:text-gray-900 transition-colors"
      >
        {isDark ? <Moon /> : <Sun />}
      </button>
    </div>
  );
};
