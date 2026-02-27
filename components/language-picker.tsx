"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { LANG_FLAGS } from "@/lib/i18n";

interface LanguagePickerProps {
  languages: string[];
  current: string;
  onChange: (lang: string) => void;
  primaryColor?: string;
}

export function LanguagePicker({
  languages,
  current,
  onChange,
  primaryColor = "#3b82f6",
}: LanguagePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (languages.length <= 1) return null;

  const otherLanguages = languages.filter((l) => l !== current);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors"
        style={{ backgroundColor: `${primaryColor}10` }}
        aria-label="Change language"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{LANG_FLAGS[current] || current.toUpperCase()}</span>
        <ChevronDown
          className="h-3 w-3 transition-transform duration-200"
          style={{
            color: primaryColor,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 flex flex-col overflow-hidden rounded-lg border shadow-lg"
          style={{
            backgroundColor: "var(--client-bg, #ffffff)",
            borderColor: `${primaryColor}20`,
            minWidth: "2.75rem",
          }}
        >
          {otherLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                onChange(lang);
                setOpen(false);
              }}
              className="flex items-center justify-center px-3 py-2 text-base transition-colors hover:bg-black/5 active:bg-black/10"
            >
              {LANG_FLAGS[lang] || lang.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
