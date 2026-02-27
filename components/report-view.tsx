"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import type { ClientConfig, TabKey } from "@/lib/types";
import { BottomNav } from "@/components/bottom-nav";
import { LanguagePicker } from "@/components/language-picker";
import { BriefTab } from "@/components/tabs/brief-tab";
import { MarketingChannelsTab } from "@/components/tabs/marketing-channels-tab";
import { DemandTab } from "@/components/tabs/demand-tab";
import { WebsiteTab } from "@/components/tabs/website-tab";
import { AssetsTab } from "@/components/tabs/assets-tab";
import { ExecutionTab } from "@/components/tabs/execution-tab";
import { mergeTranslation } from "@/lib/i18n";
import Image from "next/image";

interface ReportViewProps {
  config: ClientConfig;
}

export function ReportView({ config }: ReportViewProps) {
  const visibleTabs = config.tabs.map((t) => t.tab_key);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lang, setLang] = useState(config.default_language);

  // Swipe state
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    isDragging: false,
    locked: false,        // true once we decide horizontal vs vertical
    isHorizontal: false,  // direction decision
  });
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Handle return from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "complete") {
      // Navigate to the execution tab
      const execIndex = visibleTabs.indexOf("execution");
      if (execIndex >= 0) setActiveIndex(execIndex);
      setPaymentSuccess(true);
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => setPaymentSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTab = visibleTabs[activeIndex] ?? "brief";
  const b = config.branding;

  // Navigate to a given index with animation
  const goTo = useCallback(
    (idx: number) => {
      setIsAnimating(true);
      setActiveIndex(idx);
      setDragOffset(0);
      setTimeout(() => setIsAnimating(false), 340);
    },
    []
  );

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      const idx = visibleTabs.indexOf(tab);
      if (idx !== -1) goTo(idx);
    },
    [visibleTabs, goTo]
  );

  // Get the right data for the current tab and language
  const getTabData = useCallback(
    (tabKey: TabKey) => {
      const tab = config.tabs.find((t) => t.tab_key === tabKey);
      if (!tab) return undefined;
      // Assets tab is language-independent (files, colors, URLs don't translate)
      if (tabKey === "assets") return tab.data;
      // For other tabs: base structure is source of truth,
      // translation only overrides string values at matching paths
      if (lang !== config.default_language && tab.translations[lang]) {
        return mergeTranslation(tab.data, tab.translations[lang]) as Record<string, unknown>;
      }
      return tab.data;
    },
    [config, lang]
  );

  // Always returns the base (default language) data — for status/logic checks
  const getBaseTabData = useCallback(
    (tabKey: TabKey) => {
      const tab = config.tabs.find((t) => t.tab_key === tabKey);
      return tab?.data;
    },
    [config]
  );

  // ---- Touch handlers ----
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      isDragging: true,
      locked: false,
      isHorizontal: false,
    };
    setIsAnimating(false);
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const d = dragRef.current;
      if (!d.isDragging) return;

      const touch = e.touches[0];
      const dx = touch.clientX - d.startX;
      const dy = touch.clientY - d.startY;

      // Lock direction on first significant move
      if (!d.locked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        d.locked = true;
        d.isHorizontal = Math.abs(dx) > Math.abs(dy);
      }

      if (!d.locked || !d.isHorizontal) return;

      d.currentX = touch.clientX;

      // Rubber band: at edges, apply resistance
      const atStart = activeIndex === 0 && dx > 0;
      const atEnd = activeIndex === visibleTabs.length - 1 && dx < 0;
      const resistance = atStart || atEnd ? 0.25 : 1;

      setDragOffset(dx * resistance);
    },
    [activeIndex, visibleTabs.length]
  );

  const onTouchEnd = useCallback(() => {
    const d = dragRef.current;
    d.isDragging = false;

    if (!d.locked || !d.isHorizontal) {
      setDragOffset(0);
      return;
    }

    const dx = d.currentX - d.startX;
    const dt = Date.now() - d.startTime;
    const velocity = Math.abs(dx) / Math.max(dt, 1); // px per ms

    // Thresholds: either drag > 80px or velocity > 0.3 px/ms (quick flick)
    const threshold = 80;
    const velocityThreshold = 0.3;
    const passedThreshold = Math.abs(dx) > threshold || velocity > velocityThreshold;

    if (passedThreshold && dx < 0 && activeIndex < visibleTabs.length - 1) {
      goTo(activeIndex + 1);
    } else if (passedThreshold && dx > 0 && activeIndex > 0) {
      goTo(activeIndex - 1);
    } else {
      // Spring back
      setIsAnimating(true);
      setDragOffset(0);
      setTimeout(() => setIsAnimating(false), 340);
    }
  }, [activeIndex, visibleTabs.length, goTo]);

  // ---- Mouse drag (for desktop preview) ----
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      currentX: e.clientX,
      isDragging: true,
      locked: false,
      isHorizontal: false,
    };
    setIsAnimating(false);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.isDragging) return;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (!d.locked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        d.locked = true;
        d.isHorizontal = Math.abs(dx) > Math.abs(dy);
      }

      if (!d.locked || !d.isHorizontal) return;

      d.currentX = e.clientX;

      const atStart = activeIndex === 0 && dx > 0;
      const atEnd = activeIndex === visibleTabs.length - 1 && dx < 0;
      const resistance = atStart || atEnd ? 0.25 : 1;

      setDragOffset(dx * resistance);
    };

    const onMouseUp = () => {
      const d = dragRef.current;
      if (!d.isDragging) return;
      d.isDragging = false;

      if (!d.locked || !d.isHorizontal) {
        setDragOffset(0);
        return;
      }

      const dx = d.currentX - d.startX;
      const dt = Date.now() - d.startTime;
      const velocity = Math.abs(dx) / Math.max(dt, 1);
      const threshold = 80;
      const velocityThreshold = 0.3;
      const passedThreshold = Math.abs(dx) > threshold || velocity > velocityThreshold;

      if (passedThreshold && dx < 0 && activeIndex < visibleTabs.length - 1) {
        goTo(activeIndex + 1);
      } else if (passedThreshold && dx > 0 && activeIndex > 0) {
        goTo(activeIndex - 1);
      } else {
        setIsAnimating(true);
        setDragOffset(0);
        setTimeout(() => setIsAnimating(false), 340);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [activeIndex, visibleTabs.length, goTo]);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeIndex]);

  const renderTab = (tabKey: TabKey) => {
    const data = getTabData(tabKey);
    const translations = config.translations;
    switch (tabKey) {
      case "brief":
        return <BriefTab data={data} lang={lang} translations={translations} />;
      case "marketing_channels":
        return <MarketingChannelsTab data={data} baseData={getBaseTabData(tabKey)} lang={lang} translations={translations} />;
      case "demand":
        return <DemandTab data={data} baseData={getBaseTabData(tabKey)} lang={lang} translations={translations} />;
      case "website":
        return <WebsiteTab data={data} baseData={getBaseTabData(tabKey)} lang={lang} translations={translations} />;
      case "assets":
        return <AssetsTab data={data} lang={lang} translations={translations} />;
      case "execution":
        return (
          <ExecutionTab
            data={data}
            baseData={getBaseTabData(tabKey)}
            lang={lang}
            translations={translations}
            clientId={config.id}
            slug={config.slug}
            subscriptions={config.subscriptions}
            onRefresh={() => window.location.reload()}
          />
        );
    }
  };

  // Compute translateX for the track (all slides side by side)
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 400;
  const baseX = -activeIndex * viewportWidth;
  const translateX = baseX + dragOffset;

  return (
    <div
      className="flex min-h-dvh flex-col pb-16"
      style={{
        backgroundColor: b.background_color,
        color: b.text_color,
        fontFamily: `'${b.font_body}', sans-serif`,
        // Surface system: layered cards using text color at varying opacities
        // Works for ANY color scheme (light or dark backgrounds)
        "--surface-1": `${b.text_color}08`,  // subtle card bg
        "--surface-2": `${b.text_color}0d`,  // nested / section header bg
        "--surface-3": `${b.text_color}14`,  // deeper nesting / active states
        "--border-1": `${b.text_color}0f`,   // light border
        "--border-2": `${b.text_color}1a`,   // stronger border
      } as React.CSSProperties}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-sm"
        style={{
          backgroundColor: `${b.background_color}ee`,
          borderColor: `${b.text_color}11`,
        }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2.5">
          {config.logo_url ? (
            <Image
              src={config.logo_url}
              alt={`${config.name} logo`}
              width={80}
              height={32}
              className="h-7 w-auto object-contain"
            />
          ) : (
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: `'${b.font_heading}', sans-serif` }}
            >
              {config.name}
            </span>
          )}
          <LanguagePicker
            languages={config.available_languages}
            current={lang}
            onChange={setLang}
            primaryColor={b.primary_color}
          />
        </div>
      </header>

      {/* Payment success banner */}
      {paymentSuccess && (
        <div
          className="animate-in slide-in-from-top fade-in flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: "#16a34a" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="white" fillOpacity="0.2" />
            <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Payment successful! Work is starting.
        </div>
      )}

      {/* Swipeable Track */}
      <main
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: "pan-y" }}
      >
        <div
          ref={trackRef}
          className="flex"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isAnimating ? "transform 340ms cubic-bezier(0.25, 1, 0.5, 1)" : "none",
            willChange: "transform",
            userSelect: dragRef.current.isDragging ? "none" : "auto",
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        >
          {visibleTabs.map((tabKey, i) => (
            <div
              key={tabKey}
              className="w-screen flex-shrink-0"
              style={{ minHeight: "calc(100dvh - 8.5rem)" }}
            >
              <div className="mx-auto max-w-lg">
                {/* Only render adjacent + active tabs to save memory */}
                {Math.abs(i - activeIndex) <= 1 ? renderTab(tabKey) : null}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Nav */}
      <BottomNav
        tabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        lang={lang}
        branding={b}
      />
    </div>
  );
}
