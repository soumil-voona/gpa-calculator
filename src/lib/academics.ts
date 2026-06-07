import type { CourseRecord, CourseStatus, GradeKey, LastCompletedSemester, UserProfile } from "../types";

export const gradeSections: Array<{ key: GradeKey; label: string; gradeLevel: number; semesters: Array<0 | 1 | 2> }> = [
  { key: "8-before", label: "8th Grade & Before", gradeLevel: 8, semesters: [0] },
  { key: "9", label: "9th Grade", gradeLevel: 9, semesters: [1, 2] },
  { key: "10", label: "10th Grade", gradeLevel: 10, semesters: [1, 2] },
  { key: "11", label: "11th Grade", gradeLevel: 11, semesters: [1, 2] },
  { key: "12", label: "12th Grade", gradeLevel: 12, semesters: [1, 2] },
];

export const lastCompletedOptions: Array<{ value: LastCompletedSemester; label: string }> = [
  { value: "8-before", label: "8th Grade & Before" },
  { value: "9-1", label: "9th Grade Semester 1" },
  { value: "9-2", label: "9th Grade Semester 2" },
  { value: "10-1", label: "10th Grade Semester 1" },
  { value: "10-2", label: "10th Grade Semester 2" },
  { value: "11-1", label: "11th Grade Semester 1" },
  { value: "11-2", label: "11th Grade Semester 2" },
  { value: "12-1", label: "12th Grade Semester 1" },
  { value: "12-2", label: "12th Grade Semester 2" },
];

const semesterOrder: LastCompletedSemester[] = ["8-before", "9-1", "9-2", "10-1", "10-2", "11-1", "11-2", "12-1", "12-2"];

export function semesterKey(gradeKey: GradeKey, semester: 0 | 1 | 2): LastCompletedSemester {
  if (gradeKey === "8-before") return "8-before";
  return `${gradeKey}-${semester}` as LastCompletedSemester;
}

export function semesterLabel(gradeKey: GradeKey, semester: 0 | 1 | 2): string {
  if (gradeKey === "8-before") return "Completed Coursework";
  return `Semester ${semester}`;
}

export function markingPeriodLabel(mp: 0 | 1 | 2): string {
  if (mp === 0) return "All Courses";
  return `MP${mp}`;
}

export function resolveSemesterStatus(profile: UserProfile | null, gradeKey: GradeKey, semester: 0 | 1 | 2, now = new Date()): CourseStatus {
  const key = semesterKey(gradeKey, semester);
  const lastIndex = semesterOrder.indexOf(profile?.lastCompletedSemester ?? "8-before");
  const currentIndex = getCurrentSemesterIndex(profile, now);
  const targetIndex = semesterOrder.indexOf(key);

  if (targetIndex <= lastIndex) return "completed";
  if (targetIndex === currentIndex) return "current";
  return "future";
}

function getCurrentSemesterIndex(profile: UserProfile | null, now: Date): number {
  const lastIndex = semesterOrder.indexOf(profile?.lastCompletedSemester ?? "8-before");
  const month = now.getMonth();
  const day = now.getDate();
  const semesterClosed = (month === 11 && day >= 31) || (month === 4 && day >= 31) || month === 5 || month === 6;
  if (semesterClosed) return Math.min(lastIndex + 1, semesterOrder.length - 1);
  return Math.min(lastIndex + 1, semesterOrder.length - 1);
}

export function effectiveCourseStatus(course: CourseRecord, profile: UserProfile | null): CourseStatus {
  return resolveSemesterStatus(profile, course.gradeKey, course.semester);
}

export function createEmptyCourse(profile: UserProfile | null, gradeKey: GradeKey, gradeLevel: number, semester: 0 | 1 | 2, markingPeriod: 0 | 1 | 2) {
  const status = resolveSemesterStatus(profile, gradeKey, semester);
  return {
    courseName: "New Course",
    gradeKey,
    gradeLevel,
    semester,
    markingPeriod,
    mp1Grade: null,
    mp2Grade: null,
    projectedGrade: status === "future" ? 90 : null,
    courseLevel: 2 as const,
    ranked: true,
    status,
    credits: 1.0,
  };
}
