"use client";

import { getTabLabel } from "@/lib/i18n";
import type { TabKey, BrandingConfig } from "@/lib/types";
import {
  FileText,
  Megaphone,
  TrendingUp,
  Globe,
  FolderOpen,
  ListChecks,
} from "lucide-react";

const TAB_ICONS: Record<TabKey, React.ComponentType<{ className?: string }>> = {
  brief: FileText,
  marketing_channels: Megaphone,
  demand: TrendingUp,
  website: Globe,
  assets: FolderOpen,
  execution: ListChecks,
};

interface BottomNavProps {
  tabs: TabKey[];
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  lang: string;
  branding: BrandingConfig;
}

export function BottomNav({ tabs, activeTab, onTabChange, lang, branding }: BottomNavProps) {
  const navBg = branding.nav_color || branding.text_color || "#1a1a1a";
  const navTxt = branding.nav_text_color || "#ffffff";
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t safe-bottom"
      style={{
        backgroundColor: navBg,
        borderColor: `${navBg}dd`,
      }}
      role="tablist"
      aria-label="Report sections"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {tabs.map((key) => {
          const Icon = TAB_ICONS[key];
          const active = activeTab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(key)}
              className="flex flex-1 flex-col items-center gap-0.5 px-0.5 py-2 text-[9px] font-medium transition-colors overflow-hidden min-w-0"
              style={{
                color: active ? navTxt : `${navTxt}66`,
              }}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                style={{
                  backgroundColor: active ? branding.primary_color : "transparent",
                  borderRadius: branding.border_radius,
                }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="max-w-full truncate text-center leading-tight">{getTabLabel(key, lang)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
