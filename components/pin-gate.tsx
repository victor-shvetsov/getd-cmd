"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientConfig } from "@/lib/types";
import { t } from "@/lib/i18n";
import Image from "next/image";

interface PinGateProps {
  config: ClientConfig;
  onSuccess: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
}

export function PinGate({ config, onSuccess, verifyPin }: PinGateProps) {
  const [values, setValues] = useState<string[]>(["", "", "", "", "", ""]);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lang = config.default_language;

  const submit = useCallback(
    async (pin: string) => {
      setChecking(true);
      const valid = await verifyPin(pin);
      setChecking(false);
      if (valid) {
        onSuccess();
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => {
          setShake(false);
          setValues(["", "", "", "", "", ""]);
          setError(false);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    },
    [verifyPin, onSuccess]
  );

  const handleChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[index] = digit;
    setValues(next);
    setError(false);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const pin = next.join("");
    if (pin.length === 6 && !next.includes("")) {
      submit(pin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (values[index] === "" && index > 0) {
        const next = [...values];
        next[index - 1] = "";
        setValues(next);
        inputRefs.current[index - 1]?.focus();
      } else {
        const next = [...values];
        next[index] = "";
        setValues(next);
      }
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...values];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setValues(next);
    setError(false);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) setTimeout(() => submit(next.join("")), 50);
  };

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const b = config.branding;

  return (
    <div
      className="flex min-h-dvh items-center justify-center p-4"
      style={{ backgroundColor: b.background_color, color: b.text_color }}
    >
      <div className="flex flex-col items-center gap-8">
        {config.logo_url && (
          <Image
            src={config.logo_url}
            alt={`${config.name} logo`}
            width={120}
            height={48}
            className="h-12 w-auto object-contain"
          />
        )}
        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ fontFamily: `'${b.font_heading}', sans-serif` }}
          >
            {t("common.pin_title", lang, config.translations)}
          </h1>
          <p className="text-sm opacity-60">
            {t("common.pin_subtitle", lang, config.translations)}
          </p>
        </div>
        <div
          className={`flex gap-2.5 ${shake ? "animate-shake" : ""}`}
          onPaste={handlePaste}
        >
          {values.map((val, i) => {
            const isFocused = focusedIndex === i;
            return (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={val}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex(null)}
                disabled={checking}
                autoComplete="one-time-code"
                aria-label={`PIN digit ${i + 1}`}
                className="h-12 w-10 border-2 text-center text-lg font-semibold outline-none transition-all sm:h-14 sm:w-12 sm:text-xl"
                style={{
                  backgroundColor: b.background_color,
                  color: b.text_color,
                  borderColor: error ? "#ef4444" : isFocused ? b.primary_color : `${b.primary_color}33`,
                  borderRadius: b.border_radius,
                  boxShadow: isFocused ? `0 0 0 3px ${b.primary_color}22` : "none",
                }}
              />
            );
          })}
        </div>
        {checking && (
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: b.primary_color, borderTopColor: "transparent" }}
          />
        )}
      </div>
    </div>
  );
}
