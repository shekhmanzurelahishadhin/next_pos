"use client";
import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  footer?: React.ReactNode; // buttons shown in the bottom bar
  className?: string; // width, e.g. "max-w-md"
  children: React.ReactNode;
}

// Every modal looks the same: title bar (drag to move), scrollable body, button bar
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  footer,
  className = "max-w-md",
  children,
}) => {
  // How far the user has dragged the modal from the center
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 }); // open again in the center
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Drag the modal by its title bar
  const startDrag = (e: React.MouseEvent) => {
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const onMove = (ev: MouseEvent) => {
      setPosition({ x: ev.clientX - startX, y: ev.clientY - startY });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  if (!isOpen) return null;

  return (
    <div className="modal fixed inset-0 z-99999 flex items-center justify-center p-4">
      {/* Clicking outside does not close the modal, use Close / Cancel / Esc */}
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-[1px] dark:bg-black/60"></div>

      <div
        className={`relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-700 dark:bg-gray-800 ${className}`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        {/* Title bar */}
        <div
          onMouseDown={startDrag}
          className="flex shrink-0 cursor-move select-none items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700"
          title="Drag to move"
        >
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h4>
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()} // clicking X should not start a drag
            aria-label="Close"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Button bar */}
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-900/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
