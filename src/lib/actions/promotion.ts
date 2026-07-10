"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/data/academic-year";
import type { ClassRow } from "@/types/database";

function parseClassLabel(kelas: string): { grade: number; suffix: string } | null {
  const match = kelas.match(/^(\d+)\s*(.*)$/);
  if (!match) return null;
  return { grade: parseInt(match[1], 10), suffix: match[2].trim() };
}

function suggestNextYearLabel(currentLabel: string): string {
  const match = currentLabel.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return currentLabel;
  const start = parseInt(match[1], 10) + 1;
  const end = parseInt(match[2], 10) + 1;
  return `${start}/${end}`;
}

export type ClassRosterRow = {
  id: string;
  kelas: string;
  activeStudentCount: number;
  suggestedToClassId: string | null;
  isMaxGrade: boolean;
};

export type PromotionData = {
  activeYearLabel: string;
  suggestedNewYearLabel: string;
  suggestedStartDate: string;
  suggestedEndDate: string;
  classRoster: ClassRosterRow[];
  allActiveClasses: ClassRow[];
};

export async function getPromotionData(): Promise<PromotionData> {
  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  const { data: activeClasses, error: classError } = await supabase
    .from("classes")
    .select("id, kelas")
    .eq("is_active", true)
    .order("kelas", { ascending: true });
  if (classError) throw new Error(classError.message);

  const parsed = (activeClasses ?? []).map((c) => ({ ...c, parsed: parseClassLabel(c.kelas) }));
  const maxGrade = Math.max(...parsed.map((c) => c.parsed?.grade ?? 0));

  const { data: enrollments, error: enrollError } = await supabase
    .from("student_enrollments")
    .select("class_id")
    .eq("academic_year_id", activeYear.id)
    .eq("status", "aktif")
    .range(0, 4999);
  if (enrollError) throw new Error(enrollError.message);

  const countByClass = new Map<string, number>();
  for (const e of enrollments ?? []) {
    countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1);
  }

  const classRoster: ClassRosterRow[] = parsed
    .filter((c) => (countByClass.get(c.id) ?? 0) > 0)
    .map((c) => {
      const isMaxGrade = c.parsed?.grade === maxGrade;
      let suggestedToClassId: string | null = null;
      if (!isMaxGrade && c.parsed) {
        const target = parsed.find(
          (t) => t.parsed?.grade === c.parsed!.grade + 1 && t.parsed?.suffix === c.parsed!.suffix
        );
        suggestedToClassId = target?.id ?? null;
      }
      return {
        id: c.id,
        kelas: c.kelas,
        activeStudentCount: countByClass.get(c.id) ?? 0,
        suggestedToClassId,
        isMaxGrade,
      };
    });

  const suggestedNewYearLabel = suggestNextYearLabel(activeYear.label);
  const [startYearStr] = suggestedNewYearLabel.split("/");

  return {
    activeYearLabel: activeYear.label,
    suggestedNewYearLabel,
    suggestedStartDate: `${startYearStr}-07-01`,
    suggestedEndDate: `${parseInt(startYearStr, 10) + 1}-06-30`,
    classRoster,
    allActiveClasses: (activeClasses ?? []).map((c) => ({ id: c.id, kelas: c.kelas })),
  };
}

export type MappingEntry = {
  fromClassId: string;
  toClassId: string | null;
  action: "naik" | "lulus";
};

export type PromotionResult = { success: true } | { success: false; error: string };

export async function executePromotion(
  newYearLabel: string,
  startDate: string,
  endDate: string,
  mappings: MappingEntry[]
): Promise<PromotionResult> {
  const supabase = getSupabaseServer();

  const { error } = await supabase.rpc("promote_academic_year", {
    p_new_year_label: newYearLabel,
    p_new_year_start: startDate,
    p_new_year_end: endDate,
    p_mappings: mappings.map((m) => ({
      from_class_id: m.fromClassId,
      to_class_id: m.toClassId,
      action: m.action,
    })),
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
