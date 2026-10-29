// Shows the digit → code map as small chips, e.g. 0:Z 1:A 2:B
export function CodeChips({ codes, wrap = false }: { codes: string[]; wrap?: boolean }) {
  return (
    <div className={`flex gap-1 ${wrap ? "flex-wrap" : ""}`}>
      {codes.map((code, digit) => (
        <span
          key={digit}
          className="inline-flex shrink-0 items-center overflow-hidden rounded border border-gray-200 text-xs dark:border-gray-700"
        >
          <span className="bg-gray-100 px-1.5 py-0.5 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{digit}</span>
          <span className="px-1.5 py-0.5 font-medium text-gray-800 dark:text-white/90">{code}</span>
        </span>
      ))}
    </div>
  );
}
