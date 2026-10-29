"use client";

interface SpinnerProps {
  mode?: "fullscreen" | "content"; // default fullscreen
}

export default function Spinner({ mode = "fullscreen" }: SpinnerProps) {
  const isFullScreen = mode === "fullscreen";

  return (
    <div
      className={`${
        isFullScreen
          ? "fixed inset-0 z-[99999]"
          : "absolute inset-0" // inside layout container
      } flex flex-col items-center justify-center 
      bg-gradient-to-br from-gray-50 to-gray-100 
      dark:from-gray-900 dark:to-gray-800
      ${!isFullScreen ? "rounded-lg" : ""}`}
    >
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-l-purple-500 animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-cyan-400 border-l-indigo-400 animate-[spin_2s_linear_infinite_reverse]"></div>
      </div>

      <p className="mt-6 text-gray-700 dark:text-gray-300 text-sm font-medium tracking-wide animate-pulse">
        Loading...
      </p>
    </div>
  );
}
