import type { CourseRecord, CourseStatus, GpaMetrics, TrendPoint } from "../types";
import { effectiveCourseStatus, gradeSections, semesterKey } from "./academics";
import type { UserProfile } from "../types";

type WeightedBand = { min: number; values: Record<2 | 3 | 4, number> };

const weightedBands: WeightedBand[] = [
  { min: 97, values: { 4: 6.0, 3: 5.5, 2: 5.0 } },
  { min: 94, values: { 4: 5.8, 3: 5.3, 2: 4.8 } },
  { min: 90, values: { 4: 5.6, 3: 5.1, 2: 4.6 } },
  { min: 87, values: { 4: 5.4, 3: 4.9, 2: 4.4 } },
  { min: 84, values: { 4: 5.2, 3: 4.7, 2: 4.2 } },
  { min: 80, values: { 4: 5.0, 3: 4.5, 2: 4.0 } },
  { min: 77, values: { 4: 4.8, 3: 4.3, 2: 3.8 } },
  { min: 74, values: { 4: 4.6, 3: 4.1, 2: 3.6 } },
  { min: 71, values: { 4: 4.4, 3: 3.9, 2: 3.4 } },
  { min: 70, values: { 4: 4.2, 3: 3.7, 2: 3.2 } },
];

export function semesterAverage(course: Pick<CourseRecord, "mp1Grade" | "mp2Grade" | "projectedGrade" | "status">): number | null {
  if (course.mp1Grade != null && course.mp2Grade != null) return Math.ceil((course.mp1Grade + course.mp2Grade) / 2);
  if (course.projectedGrade != null) return Math.ceil(course.projectedGrade);
  if (course.mp1Grade != null) return Math.ceil(course.mp1Grade);
  if (course.mp2Grade != null) return Math.ceil(course.mp2Grade);
  return null;
}

export function unweightedPoints(grade: number | null): number | null {
  if (grade == null) return null;
  if (grade >= 90) return 4;
  if (grade >= 80) return 3;
  if (grade >= 70) return 2;
  if (grade >= 60) return 1;
  return 0;
}

export function weightedPoints(grade: number | null, level: 2 | 3 | 4): number | null {
  if (grade == null) return null;
  const band = weightedBands.find((entry) => grade >= entry.min);
  return band ? band.values[level] : 0;
}

function averageCourses(courses: CourseRecord[], profile: UserProfile | null, rankedOnly: boolean, statuses: CourseStatus[]): number | null {
  const eligible = courses.filter((course) => statuses.includes(effectiveCourseStatus(course, profile)) && (!rankedOnly || course.ranked));
  let total = 0;
  let credits = 0;

  for (const course of eligible) {
    const semesterWorth = course.credits / 2;
    const mpWorth = semesterWorth / 2;

    let coursePoints = 0;
    let courseCredits = 0;

    if (course.mp1Grade !== null) {
      const points = weightedPoints(course.mp1Grade, course.courseLevel);
      if (points !== null) {
        coursePoints += points * mpWorth;
        courseCredits += mpWorth;
      }
    }

    if (course.mp2Grade !== null) {
      const points = weightedPoints(course.mp2Grade, course.courseLevel);
      if (points !== null) {
        coursePoints += points * mpWorth;
        courseCredits += mpWorth;
      }
    }

    // Fallback to projected grade or use it to fill gaps for non-completed statuses
    if (course.mp1Grade === null && course.mp2Grade === null) {
      const grade = course.projectedGrade ?? (course.mp1Grade || course.mp2Grade);
      const points = weightedPoints(grade, course.courseLevel);
      if (points !== null) {
        coursePoints += points * semesterWorth;
        courseCredits += semesterWorth;
      }
    } else if (course.status !== "completed") {
      // For in-progress or future, if one MP is missing, use projected for that MP
      if (course.mp1Grade === null && course.projectedGrade !== null) {
        const points = weightedPoints(course.projectedGrade, course.courseLevel);
        if (points !== null) {
          coursePoints += points * mpWorth;
          courseCredits += mpWorth;
        }
      }
      if (course.mp2Grade === null && course.projectedGrade !== null) {
        const points = weightedPoints(course.projectedGrade, course.courseLevel);
        if (points !== null) {
          coursePoints += points * mpWorth;
          courseCredits += mpWorth;
        }
      }
    }

    total += coursePoints;
    credits += courseCredits;
  }

  return credits ? roundGpa(total / credits) : null;
}

export function calculateMetrics(courses: CourseRecord[], profile: UserProfile | null): GpaMetrics {
  const completed = ["completed"] as CourseStatus[];
  const throughCurrent = ["completed", "current"] as CourseStatus[];
  const throughGraduation = ["completed", "current", "future"] as CourseStatus[];

  const completedCourses = courses.filter((course) => effectiveCourseStatus(course, profile) === "completed");
  const projectedCourses = courses.filter((course) => {
    const status = effectiveCourseStatus(course, profile);
    return status === "completed" || status === "current" || status === "future";
  });

  return {
    currentUnweighted: averageCourses(courses, profile, false, completed),
    currentRanked: averageCourses(courses, profile, true, completed),
    inProgressUnweighted: averageCourses(courses, profile, false, throughCurrent),
    inProgressRanked: averageCourses(courses, profile, true, throughCurrent),
    predictedGraduation: averageCourses(courses, profile, false, throughGraduation),
    predictedGraduationRanked: averageCourses(courses, profile, true, throughGraduation),
    totalCreditsEarned: roundCredits(completedCourses.reduce((sum, course) => {
      let earned = 0;
      if (course.mp1Grade != null) earned += course.credits / 4;
      if (course.mp2Grade != null) earned += course.credits / 4;
      return sum + earned;
    }, 0)),
    projectedCreditsAtGraduation: roundCredits(projectedCourses.reduce((sum, course) => sum + (course.credits / 2), 0)),
    coursesIncludedInRank: courses.filter((course) => course.ranked && (course.mp1Grade != null || course.mp2Grade != null || course.projectedGrade != null)).length,
  };
}

export function buildTrend(courses: CourseRecord[], profile: UserProfile | null): TrendPoint[] {
  const orderedSemesters = gradeSections.flatMap((section) => section.semesters.map((semester) => ({ section, semester })));
  return orderedSemesters.map(({ section, semester }) => {
    const currentKey = semesterKey(section.key, semester);
    const upToSemester = courses.filter((course) => {
      const courseKey = semesterKey(course.gradeKey, course.semester);
      return orderedSemesters.findIndex((entry) => semesterKey(entry.section.key, entry.semester) === courseKey) <=
        orderedSemesters.findIndex((entry) => semesterKey(entry.section.key, entry.semester) === currentKey);
    });
    const label = section.key === "8-before" ? "8th" : `${section.gradeLevel}.${semester}`;
    return {
      label,
      unweighted: averageCourses(upToSemester, profile, false, ["completed", "current", "future"]),
      ranked: averageCourses(upToSemester, profile, true, ["completed", "current", "future"]),
    };
  });
}

function roundGpa(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundCredits(value: number): number {
  return Math.round(value * 10) / 10;
}
