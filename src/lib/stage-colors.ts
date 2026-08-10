/** Stage catalog color tags — explicit Tailwind classes for JIT safelist */

export interface StageColorConfig {
  name: string;
  label: string;
  bg: string;
  text: string;
  dot: string;
  ring: string;
}

export const STAGE_COLORS: StageColorConfig[] = [
  { name: "slate", label: "Slate", bg: "bg-slate-500", text: "text-slate-600", dot: "bg-slate-500", ring: "ring-slate-500/20" },
  { name: "indigo", label: "Indigo", bg: "bg-indigo-500", text: "text-indigo-600", dot: "bg-indigo-500", ring: "ring-indigo-500/20" },
  { name: "blue", label: "Blue", bg: "bg-blue-500", text: "text-blue-600", dot: "bg-blue-500", ring: "ring-blue-500/20" },
  { name: "emerald", label: "Emerald", bg: "bg-emerald-500", text: "text-emerald-600", dot: "bg-emerald-500", ring: "ring-emerald-500/20" },
  { name: "amber", label: "Amber", bg: "bg-amber-500", text: "text-amber-600", dot: "bg-amber-500", ring: "ring-amber-500/20" },
  { name: "rose", label: "Rose", bg: "bg-rose-500", text: "text-rose-600", dot: "bg-rose-500", ring: "ring-rose-500/20" },
  { name: "violet", label: "Violet", bg: "bg-violet-500", text: "text-violet-600", dot: "bg-violet-500", ring: "ring-violet-500/20" },
  { name: "cyan", label: "Cyan", bg: "bg-cyan-500", text: "text-cyan-600", dot: "bg-cyan-500", ring: "ring-cyan-500/20" },
  { name: "orange", label: "Orange", bg: "bg-orange-500", text: "text-orange-600", dot: "bg-orange-500", ring: "ring-orange-500/20" },
];

export function getStageColorConfig(colorTag?: string): StageColorConfig {
  return STAGE_COLORS.find((c) => c.name === colorTag) ?? STAGE_COLORS[0];
}
