export type ClassRow = {
  id: string;
  kelas: string;
};

export type StudentRow = {
  id: string;
  name: string;
};

export type ViolationType = {
  id: string;
  label: string;
  severity: "ringan" | "sedang" | "berat";
};

export type AcademicYear = {
  id: string;
  label: string;
  is_active: boolean;
};

export type ViolationEntryInput = {
  studentId: string;
  violationTypeId: string | null;
  violationLabel: string;
  severity: "ringan" | "sedang" | "berat" | null;
  timeAt: string;
  dateAt: string;
  notes: string;
};
