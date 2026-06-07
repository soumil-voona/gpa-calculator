import {
  LogOut,
  Moon,
  Plus,
  Save,
  Sun,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useMemo, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { TrendChart } from "./components/TrendChart";
import { useAuth } from "./hooks/useAuth";
import { useCourses } from "./hooks/useCourses";
import {
  createEmptyCourse,
  gradeSections,
  resolveSemesterStatus,
  semesterLabel
} from "./lib/academics";
import { hasFirebaseConfig } from "./lib/firebase";
import { buildTrend, calculateMetrics, weightedPoints } from "./lib/gpa";
import type { CourseLevel, CourseRecord } from "./types";

const metricGroups: Array<{
  title: string;
  metrics: Array<[keyof ReturnType<typeof calculateMetrics>, string]>;
}> = [
  {
    title: "Current Progress",
    metrics: [
      ["currentUnweighted", "Weighted GPA (All Completed)"],
      ["currentRanked", "Ranked GPA (Completed)"],
      ["totalCreditsEarned", "Credits Earned"]
    ]
  },
  {
    title: "Including In-Progress",
    metrics: [
      ["inProgressUnweighted", "Weighted GPA (Through Current)"],
      ["inProgressRanked", "Ranked GPA (Through Current)"],
      ["coursesIncludedInRank", "Rank-Eligible Courses"]
    ]
  },
  {
    title: "Projected Graduation",
    metrics: [
      ["predictedGraduation", "Graduation Weighted GPA"],
      ["predictedGraduationRanked", "Graduation Ranked GPA"],
      ["projectedCreditsAtGraduation", "Projected Credits"]
    ]
  }
];

export default function App() {
  const auth = useAuth();
  const [darkMode, setDarkMode] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const { courses, loading, addCourse, updateCourse, removeCourse, savingIds } =
    useCourses(auth.user?.uid);
  const metrics = useMemo(
    () => calculateMetrics(courses, auth.profile),
    [auth.profile, courses]
  );
  const trend = useMemo(
    () => buildTrend(courses, auth.profile),
    [auth.profile, courses]
  );
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "11": true,
    "12": true
  });
  const [showCalcDetails, setShowCalcDetails] = useState(false);

  if (auth.loading) return <div className="boot">Loading planner...</div>;
  if (!hasFirebaseConfig) return <FirebaseSetup />;
  if (!auth.user || !auth.profile)
    return <AuthPanel onSignup={auth.signup} onLogin={auth.login} />;

  return (
    <main className={darkMode ? "app dark" : "app"}>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            Class of {auth.profile.graduationYear} • Academic Planner
          </p>
          <h1>GPA Calculator</h1>
        </div>
        <div className="top-actions">
          <button
            className="icon-button"
            onClick={() => setDarkMode((value) => !value)}
            title="Toggle dark mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            className="icon-button danger"
            onClick={auth.logout}
            title="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="metrics-grid">
        {metricGroups.map((group) => (
          <div key={group.title} style={{ display: "contents" }}>
            {group.metrics.map(([key, label]) => (
              <div className="metric-card" key={String(key)}>
                <div className="metric-label">
                  <span
                    className="eyebrow"
                    style={{
                      fontSize: "0.65rem",
                      display: "block",
                      marginBottom: 4
                    }}
                  >
                    {group.title}
                  </span>
                  {label}
                </div>
                <div className="metric-value">{formatMetric(metrics[key])}</div>
              </div>
            ))}
          </div>
        ))}
      </div>


      <section className="workspace">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Interactive coursework</p>
            <h2>Academic Plan</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {loading && (
              <span className="saving">
                <Save size={14} /> Syncing
              </span>
            )}
            <button
              className="button compact"
              onClick={() => setShowCalcDetails((s) => !s)}
            >
              <Info size={16} /> {showCalcDetails ? "Hide" : "Show"} Details
            </button>
          </div>
        </div>

        {showCalcDetails && (
          <div
            className="grade-section"
            style={{
              padding: 24,
              marginBottom: 24,
              border: "2px solid #0d9488"
            }}
          >
            <div className="section-heading">
              <div>
                <h2>GPA Calculation Details</h2>
                <p className="eyebrow">Per-marking-period breakdown</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 32 }}>
              {metricGroups
                .flatMap((g) => g.metrics)
                .map(([key, label]) => {
                  const statuses = key.includes("current")
                    ? ["completed"]
                    : key.includes("inProgress")
                      ? ["completed", "current"]
                      : ["completed", "current", "future"];
                  const rankedOnly = key.includes("Ranked");
                  const eligible = courses.filter(
                    (course) =>
                      statuses.includes(
                        resolveSemesterStatus(
                          auth.profile,
                          course.gradeKey,
                          course.semester
                        )
                      ) &&
                      (!rankedOnly || course.ranked)
                  );

                  const rows: any[] = [];
                  let totalPoints = 0;
                  let totalCredits = 0;

                  eligible.forEach((course) => {
                    const semWorth = course.credits / 2;
                    const mpWorth = semWorth / 2;

                    if (course.mp1Grade !== null) {
                      const p = weightedPoints(
                        course.mp1Grade,
                        course.courseLevel
                      );
                      const sub = (p ?? 0) * mpWorth;
                      totalPoints += sub;
                      totalCredits += mpWorth;
                      rows.push({
                        name: `${course.courseName} (MP1)`,
                        sem: `${course.gradeKey}-${course.semester}`,
                        grade: course.mp1Grade,
                        points: p,
                        weight: mpWorth,
                        sub
                      });
                    }
                    if (course.mp2Grade !== null) {
                      const p = weightedPoints(
                        course.mp2Grade,
                        course.courseLevel
                      );
                      const sub = (p ?? 0) * mpWorth;
                      totalPoints += sub;
                      totalCredits += mpWorth;
                      rows.push({
                        name: `${course.courseName} (MP2)`,
                        sem: `${course.gradeKey}-${course.semester}`,
                        grade: course.mp2Grade,
                        points: p,
                        weight: mpWorth,
                        sub
                      });
                    }

                    if (course.mp1Grade === null && course.mp2Grade === null) {
                      const grade = course.projectedGrade;
                      const p = weightedPoints(grade, course.courseLevel);
                      const sub = (p ?? 0) * semWorth;
                      totalPoints += sub;
                      totalCredits += semWorth;
                      rows.push({
                        name: `${course.courseName} (Proj)`,
                        sem: `${course.gradeKey}-${course.semester}`,
                        grade,
                        points: p,
                        weight: semWorth,
                        sub
                      });
                    } else if (
                      resolveSemesterStatus(
                        auth.profile,
                        course.gradeKey,
                        course.semester
                      ) !== "completed"
                    ) {
                      if (
                        course.mp1Grade === null &&
                        course.projectedGrade !== null
                      ) {
                        const p = weightedPoints(
                          course.projectedGrade,
                          course.courseLevel
                        );
                        const sub = (p ?? 0) * mpWorth;
                        totalPoints += sub;
                        totalCredits += mpWorth;
                        rows.push({
                          name: `${course.courseName} (MP1 Proj)`,
                          sem: `${course.gradeKey}-${course.semester}`,
                          grade: course.projectedGrade,
                          points: p,
                          weight: mpWorth,
                          sub
                        });
                      }
                      if (
                        course.mp2Grade === null &&
                        course.projectedGrade !== null
                      ) {
                        const p = weightedPoints(
                          course.projectedGrade,
                          course.courseLevel
                        );
                        const sub = (p ?? 0) * mpWorth;
                        totalPoints += sub;
                        totalCredits += mpWorth;
                        rows.push({
                          name: `${course.courseName} (MP2 Proj)`,
                          sem: `${course.gradeKey}-${course.semester}`,
                          grade: course.projectedGrade,
                          points: p,
                          weight: mpWorth,
                          sub
                        });
                      }
                    }
                  });

                  const gpa = totalCredits
                    ? Math.round((totalPoints / totalCredits) * 1000) / 1000
                    : null;
                  if (!rows.length) return null;

                  return (
                    <div key={String(key)} className="table-wrap">
                      <h3
                        style={{
                          marginBottom: 12,
                          display: "flex",
                          justifyContent: "space-between"
                        }}
                      >
                        <span>{label}</span>
                        <strong style={{ color: "#0d9488" }}>
                          GPA: {formatMetric(gpa)}
                        </strong>
                      </h3>
                      <table style={{ borderSpacing: 0, width: "100%" }}>
                        <thead>
                          <tr>
                            <th style={{ background: "transparent" }}>Entry</th>
                            <th
                              style={{
                                background: "transparent",
                                textAlign: "right"
                              }}
                            >
                              Sem
                            </th>
                            <th
                              style={{
                                background: "transparent",
                                textAlign: "right"
                              }}
                            >
                              Grade
                            </th>
                            <th
                              style={{
                                background: "transparent",
                                textAlign: "right"
                              }}
                            >
                              Points
                            </th>
                            <th
                              style={{
                                background: "transparent",
                                textAlign: "right"
                              }}
                            >
                              Weight
                            </th>
                            <th
                              style={{
                                background: "transparent",
                                textAlign: "right"
                              }}
                            >
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={i}>
                              <td
                                style={{
                                  background: "transparent",
                                  borderBottom: "1px solid rgba(0,0,0,0.05)"
                                }}
                              >
                                {r.name}
                              </td>
                              <td
                                style={{
                                  background: "transparent",
                                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                                  textAlign: "right"
                                }}
                              >
                                {r.sem}
                              </td>
                              <td
                                style={{
                                  background: "transparent",
                                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                                  textAlign: "right"
                                }}
                              >
                                {r.grade ?? "-"}
                              </td>
                              <td
                                style={{
                                  background: "transparent",
                                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                                  textAlign: "right"
                                }}
                              >
                                {r.points ?? "-"}
                              </td>
                              <td
                                style={{
                                  background: "transparent",
                                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                                  textAlign: "right"
                                }}
                              >
                                {r.weight.toFixed(3)}
                              </td>
                              <td
                                style={{
                                  background: "transparent",
                                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                                  textAlign: "right"
                                }}
                              >
                                {r.sub.toFixed(3)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {gradeSections.map((section) => {
          const isOpen = openSections[section.key] ?? false;
          const sectionCourses = courses.filter(
            (c) => c.gradeKey === section.key
          );

          return (
            <article className="grade-section" key={section.key}>
              <button
                className="grade-toggle"
                onClick={() =>
                  setOpenSections((c) => ({ ...c, [section.key]: !isOpen }))
                }
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  <span>{section.label}</span>
                </div>
                <span>
                  {sectionCourses.length} Courses •{" "}
                  {isOpen ? "Collapse" : "Expand"}
                </span>
              </button>

              {isOpen && (
                <div className="semester-list">
                  {section.semesters.map((semester) => (
                    <div
                      className="semester-block"
                      key={`${section.key}-${semester}`}
                    >
                      <div className="semester-header">
                        <div>
                          <h3>{semesterLabel(section.key, semester)}</h3>
                          <p>
                            {resolveSemesterStatus(
                              auth.profile,
                              section.key,
                              semester
                            ).toUpperCase()}
                          </p>
                        </div>
                        <button
                          className="button compact"
                          onClick={() =>
                            addCourse(
                              createEmptyCourse(
                                auth.profile,
                                section.key,
                                section.gradeLevel,
                                semester,
                                0
                              )
                            )
                          }
                        >
                          <Plus size={16} /> Add Course
                        </button>
                      </div>
                      <CourseTable
                        courses={courses.filter(
                          (c) =>
                            c.gradeKey === section.key &&
                            c.semester === semester
                        )}
                        savingIds={savingIds}
                        onUpdate={updateCourse}
                        onRemove={removeCourse}
                      />
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}

function FirebaseSetup() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-mark">
          <Save size={32} />
        </div>
        <h1>Firebase Setup Needed</h1>
        <p>
          Configure your Firebase environment variables to enable persistence
          and multi-device sync.
        </p>
        <pre className="env-box">
          VITE_FIREBASE_API_KEY=... VITE_FIREBASE_PROJECT_ID=...
        </pre>
      </section>
    </main>
  );
}

function CourseTable({
  courses,
  savingIds,
  onUpdate,
  onRemove
}: {
  courses: CourseRecord[];
  savingIds: Set<string>;
  onUpdate: (courseId: string, changes: Partial<CourseRecord>) => void;
  onRemove: (courseId: string) => void;
}) {
  if (!courses.length)
    return (
      <p className="empty" style={{ padding: "20px 0" }}>
        No courses added to this semester yet.
      </p>
    );

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Course Name</th>
            <th style={{ textAlign: "center" }}>MP1</th>
            <th style={{ textAlign: "center" }}>MP2</th>
            <th style={{ textAlign: "center" }}>Average</th>
            <th style={{ textAlign: "center" }}>Level</th>
            <th style={{ textAlign: "center" }}>Ranked</th>
            <th style={{ textAlign: "center" }}>Credits</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id}>
              <td>
                <div style={{ position: "relative" }}>
                  <input
                    value={course.courseName}
                    placeholder="e.g. Calculus BC"
                    onChange={(e) =>
                      onUpdate(course.id, { courseName: e.target.value })
                    }
                  />
                  {savingIds.has(course.id) && (
                    <span
                      className="row-save"
                      style={{ position: "absolute", bottom: -14, left: 12 }}
                    >
                      Syncing...
                    </span>
                  )}
                </div>
              </td>
              <td>
                <GradeInput
                  value={course.mp1Grade}
                  onChange={(v) => onUpdate(course.id, { mp1Grade: v })}
                />
              </td>
              <td>
                <GradeInput
                  value={course.mp2Grade}
                  onChange={(v) => onUpdate(course.id, { mp2Grade: v })}
                />
              </td>
              <td style={{ textAlign: "center" }}>
                <strong
                  style={{ opacity: course.status === "future" ? 0.5 : 1 }}
                >
                  {(() => {
                    const avg = (() => {
                      if (course.mp1Grade != null && course.mp2Grade != null)
                        return Math.ceil(
                          (course.mp1Grade + course.mp2Grade) / 2
                        );
                      if (course.projectedGrade != null)
                        return Math.ceil(course.projectedGrade);
                      if (course.mp1Grade != null)
                        return Math.ceil(course.mp1Grade);
                      if (course.mp2Grade != null)
                        return Math.ceil(course.mp2Grade);
                      return null;
                    })();
                    return avg ?? "-";
                  })()}
                </strong>
              </td>
              <td>
                <select
                  value={course.courseLevel}
                  onChange={(e) =>
                    onUpdate(course.id, {
                      courseLevel: Number(e.target.value) as CourseLevel
                    })
                  }
                >
                  <option value={2}>On-Level</option>
                  <option value={3}>Honors</option>
                  <option value={4}>AP / IB</option>
                </select>
              </td>
              <td style={{ textAlign: "center" }}>
                <input
                  className="check"
                  type="checkbox"
                  checked={course.ranked}
                  onChange={(e) =>
                    onUpdate(course.id, { ranked: e.target.checked })
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.5"
                  value={course.credits}
                  onChange={(e) =>
                    onUpdate(course.id, {
                      credits: Number(e.target.value) || 0
                    })
                  }
                />
              </td>
              <td>
                <button
                  className="icon-button danger"
                  onClick={() => onRemove(course.id)}
                  title="Remove course"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GradeInput({
  value,
  onChange
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      type="number"
      min="0"
      max="100"
      placeholder="--"
      style={{ textAlign: "center" }}
      value={value ?? ""}
      onChange={(e) =>
        onChange(
          e.target.value === ""
            ? null
            : Math.min(100, Math.max(0, Number(e.target.value)))
        )
      }
    />
  );
}

function formatMetric(value: number | null): string {
  if (value == null) return "-";
  return typeof value === "number" && value % 1 !== 0
    ? value.toFixed(3)
    : String(value);
}
