"use client";
// Account Title autocomplete, like parts_bazar journalEntry ca_label:
// the server is searched after 2 letters (title has the text, or code starts with it),
// only heads with no child come, "Not Found!" when nothing matches.
// Arrow keys move in the list, Enter picks, Esc closes.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { journalEntryService } from "@/services/journalEntryService";

type Head = { value: number; label: string; code: string };

export interface AccountAutocompleteHandle {
  focus: () => void;
}

interface Props {
  value: number | null;
  label: string;
  disabled?: boolean;
  onPick: (id: number | null, label: string) => void;
}

const MIN_LETTERS = 2;

export const AccountAutocomplete = forwardRef<AccountAutocompleteHandle, Props>(function AccountAutocomplete({ value, label, disabled = false, onPick }, ref) {
  const [text, setText] = useState(label);
  const [results, setResults] = useState<Head[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
  }));

  // the picked head changed from outside (cleared after add, or set by a cheque)
  useEffect(() => {
    setText(label);
  }, [label, value]);

  // search after the user stops typing
  useEffect(() => {
    if (!open) {
      return;
    }
    const search = text.trim();
    if (search.length < MIN_LETTERS) {
      setResults([]);
      return;
    }
    let stillWanted = true;
    setLoading(true);
    const timer = setTimeout(() => {
      journalEntryService
        .searchHeads(search)
        .then((list) => {
          if (stillWanted) {
            setResults(list);
            setActive(0);
          }
        })
        .catch(() => {
          if (stillWanted) {
            setResults([]);
          }
        })
        .finally(() => {
          if (stillWanted) {
            setLoading(false);
          }
        });
    }, 250);
    return () => {
      stillWanted = false;
      clearTimeout(timer);
    };
  }, [text, open]);

  // a click outside closes the list
  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  function pick(head: Head) {
    setText(head.label);
    setOpen(false);
    onPick(head.value, head.label);
  }

  function changeText(newText: string) {
    setText(newText);
    setOpen(true);
    // typing again drops the picked head
    if (value !== null) {
      onPick(null, "");
    }
  }

  function keyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      if (active < results.length - 1) {
        setActive(active + 1);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (active > 0) {
        setActive(active - 1);
      }
    } else if (e.key === "Enter") {
      if (open && results.length > 0) {
        e.preventDefault();
        pick(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  let inputClass =
    "h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
  if (disabled) {
    inputClass = inputClass + " pointer-events-none bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-gray-300";
  }

  const search = text.trim();
  const showList = open && !disabled && search.length >= MIN_LETTERS;

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={text}
        readOnly={disabled}
        placeholder="Type 2 letters of the title or code"
        autoComplete="off"
        onChange={(e) => changeText(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={keyDown}
        className={inputClass}
      />
      {showList && (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
          {loading && results.length === 0 && <li className="px-3 py-2 text-gray-400">Searching...</li>}
          {!loading && results.length === 0 && <li className="px-3 py-2 text-gray-500">Not Found!</li>}
          {results.map((head, index) => {
            let rowClass = "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-gray-700 dark:text-gray-300";
            if (index === active) {
              rowClass = rowClass + " bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300";
            }
            return (
              <li
                key={head.value}
                className={rowClass}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => {
                  // keep the focus in the input until the pick is done
                  e.preventDefault();
                  pick(head);
                }}
              >
                <span>{head.label}</span>
                <span className="shrink-0 text-xs text-gray-400">{head.code}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
