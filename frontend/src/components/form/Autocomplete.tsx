"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface AutocompleteProps<T> {
  value: string;
  onChange: (text: string) => void;
  // called (debounced) with the typed text, returns the list to show
  search: (term: string) => Promise<T[]>;
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  // return false (and show your own message) to stop the search, e.g. "Please select store"
  canSearch?: () => boolean;
  minLength?: number;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}

// Text box with a suggestion list, like the jQuery UI autocomplete in parts_bazar.
// Arrow keys move, Enter picks, Esc closes.
export default function Autocomplete<T>({
  value, onChange, search, onSelect, renderItem, canSearch, minLength = 2, placeholder, disabled, error, inputRef,
}: AutocompleteProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const typed = useRef(false); // only search after the user types, not when the value is set from code
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  // the list is drawn on document.body so a scrolling table or modal can not cut it off
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!typed.current) return;
    if (value.trim().length < minLength) {
      setItems([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      if (canSearch && !canSearch()) return;
      setLoading(true);
      try {
        const result = await search(value.trim());
        setItems(result);
        setActive(0);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // close when clicking somewhere else
  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!box.current?.contains(target) && !list.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // keep the list under the input while the page scrolls
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = box.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const pick = (item: T) => {
    typed.current = false;
    setOpen(false);
    onSelect(item);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={box} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => items.length > 0 && typed.current && setOpen(true)}
        className={`h-9 w-full rounded-md border bg-transparent px-3 py-1.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 disabled:cursor-not-allowed disabled:bg-gray-100 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:disabled:bg-gray-800 ${
          error
            ? "border-error-500 focus:ring-error-500/10"
            : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800"
        }`}
      />
      {loading && <span className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />}
      {open && position && createPortal(
        <ul
          ref={list}
          style={{ position: "fixed", top: position.top, left: position.left, width: position.width, zIndex: 100001 }}
          className="custom-scrollbar max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {items.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-500">No match found</li>
          ) : (
            items.map((item, index) => (
              <li
                key={index}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(item);
                }}
                onMouseEnter={() => setActive(index)}
                className={`cursor-pointer px-3 py-1.5 text-[13px] ${
                  index === active ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-white" : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {renderItem(item)}
              </li>
            ))
          )}
        </ul>,
        document.body
      )}
    </div>
  );
}
