export type GradeKey = "8-before" | "9" | "10" | "11" | "12";
export type CourseLevel = 2 | 3 | 4;
export type CourseStatus = "completed" | "current" | "future";
export type LastCompletedSemester =
  | "8-before"
  | "9-1"
  | "9-2"
  | "10-1"
  | "10-2"
  | "11-1"
  | "11-2"
  | "12-1"
  | "12-2";

export interface UserProfile {
  uid: string;
  email: string;
  graduationYear: number;
  lastCompletedSemester: LastCompletedSemester;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CourseRecord {
  id: string;
  courseId: string;
  courseName: string;
  gradeKey: GradeKey;
  gradeLevel: number;
  semester: 0 | 1 | 2;
  markingPeriod: 0 | 1 | 2;
  mp1Grade: number | null;
  mp2Grade: number | null;
  projectedGrade: number | null;
  courseLevel: CourseLevel;
  ranked: boolean;
  status: CourseStatus;
  credits: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CourseDraft {
  courseName: string;
  gradeKey: GradeKey;
  gradeLevel: number;
  semester: 0 | 1 | 2;
  markingPeriod: 0 | 1 | 2;
  mp1Grade: number | null;
  mp2Grade: number | null;
  projectedGrade: number | null;
  courseLevel: CourseLevel;
  ranked: boolean;
  status: CourseStatus;
  credits: number;
}

export interface GpaMetrics {
  currentUnweighted: number | null;
  currentRanked: number | null;
  inProgressUnweighted: number | null;
  inProgressRanked: number | null;
  predictedGraduation: number | null;
  predictedGraduationRanked: number | null;
  totalCreditsEarned: number;
  projectedCreditsAtGraduation: number;
  coursesIncludedInRank: number;
}

export interface TrendPoint {
  label: string;
  unweighted: number | null;
  ranked: number | null;
}
