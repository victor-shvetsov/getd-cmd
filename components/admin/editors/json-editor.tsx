"use client";

import { useState } from "react";

export function GenericJsonEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const [text, setText] = useState(JSON.stringify(data, null, 2));
  const [error, setError] = useState("");
  return (
    <div className="relative">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(parsed);
            setError("");
          } catch {
            setError("Invalid JSON");
          }
        }}
        spellCheck={false}
        rows={12}
        className="w-full rounded-md border border-[var(--adm-border)] bg-[var(--adm-bg)] p-3 font-mono text-xs leading-relaxed text-[var(--adm-text)] outline-none focus:border-[var(--adm-accent)]"
        style={{ tabSize: 2 }}
      />
      {error && (
        <div className="absolute bottom-2 right-2 rounded-md bg-[var(--adm-danger-bg)] px-2 py-1 text-[10px] text-[var(--adm-danger-text)]">
          {error}
        </div>
      )}
    </div>
  );
}
