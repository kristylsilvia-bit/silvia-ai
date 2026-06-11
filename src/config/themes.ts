export interface ColorSchemeConfig {
  id: string;
  label: string;
  /** Three gradient stop colors: [start, mid, end] */
  colors: [string, string, string];
}

export const COLOR_SCHEMES: ColorSchemeConfig[] = [
  { id: "violet",   label: "Violet",   colors: ["#8B6CFF", "#5B8DEF", "#2DD4BF"] },
  { id: "ocean",    label: "Ocean",    colors: ["#0EA5E9", "#0284C7", "#06B6D4"] },
  { id: "sunset",   label: "Sunset",   colors: ["#F97316", "#EF4444", "#FBBF24"] },
  { id: "forest",   label: "Forest",   colors: ["#22C55E", "#16A34A", "#4ADE80"] },
  { id: "midnight", label: "Midnight", colors: ["#6366F1", "#8B5CF6", "#A78BFA"] },
  { id: "rose",     label: "Rose",     colors: ["#F43F5E", "#E11D48", "#FB7185"] },
  { id: "golden",   label: "Golden",   colors: ["#F59E0B", "#D97706", "#FDE68A"] },
  { id: "aurora",   label: "Aurora",   colors: ["#00C6FB", "#005BEA", "#B429F9"] },
];

export type ColorSchemeId = typeof COLOR_SCHEMES[number]["id"];

export const VALID_SCHEME_IDS = new Set(COLOR_SCHEMES.map((s) => s.id));

export function isColorSchemeId(v: unknown): v is ColorSchemeId {
  return typeof v === "string" && VALID_SCHEME_IDS.has(v);
}

export type LayoutId = "default" | "centered" | "relaxed" | "wide";

export interface LayoutPresetConfig {
  id: LayoutId;
  label: string;
  desc: string;
}

export const LAYOUT_PRESETS: LayoutPresetConfig[] = [
  { id: "default",  label: "Default",  desc: "Standard 840px chat column" },
  { id: "centered", label: "Centered", desc: "Focused 680px column" },
  { id: "relaxed",  label: "Relaxed",  desc: "Spacious 900px with larger gaps" },
  { id: "wide",     label: "Wide",     desc: "1100px for large screens" },
];

export const VALID_LAYOUT_IDS: LayoutId[] = ["default", "centered", "relaxed", "wide"];

export function isLayoutId(v: unknown): v is LayoutId {
  return typeof v === "string" && (VALID_LAYOUT_IDS as string[]).includes(v);
}
