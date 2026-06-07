import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "../lib/firebase";
import type { CourseDraft, CourseRecord } from "../types";

export function useCourses(uid: string | undefined) {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) {
      setCourses([]);
      setLoading(false);
      return;
    }
    if (!db) {
      setLoading(false);
      return;
    }

    const coursesRef = collection(db, "users", uid, "courses");
    const unsubscribe = onSnapshot(query(coursesRef, orderBy("createdAt", "asc")), (snapshot) => {
      setCourses(snapshot.docs.map((courseDoc) => ({ id: courseDoc.id, ...courseDoc.data() }) as CourseRecord));
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  const addCourse = useCallback(
    async (draft: CourseDraft) => {
      if (!uid) return;
      if (!db) throw new Error("Firebase is not configured.");
      const courseRef = doc(collection(db, "users", uid, "courses"));
      await setDoc(courseRef, {
        ...draft,
        courseId: courseRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [uid],
  );

  const updateCourse = useCallback(
    async (courseId: string, changes: Partial<CourseRecord>) => {
      if (!uid) return;
      if (!db) throw new Error("Firebase is not configured.");
      setCourses((current) => current.map((course) => (course.id === courseId ? { ...course, ...changes } : course)));
      setSavingIds((current) => new Set(current).add(courseId));
      try {
        const { id: _id, ...safeChanges } = changes;
        await updateDoc(doc(db, "users", uid, "courses", courseId), {
          ...safeChanges,
          updatedAt: serverTimestamp(),
        });
      } finally {
        setSavingIds((current) => {
          const next = new Set(current);
          next.delete(courseId);
          return next;
        });
      }
    },
    [uid],
  );

  const removeCourse = useCallback(
    async (courseId: string) => {
      if (!uid) return;
      if (!db) throw new Error("Firebase is not configured.");
      setCourses((current) => current.filter((course) => course.id !== courseId));
      await deleteDoc(doc(db, "users", uid, "courses", courseId));
    },
    [uid],
  );

  return useMemo(() => ({ courses, loading, addCourse, updateCourse, removeCourse, savingIds }), [addCourse, courses, loading, removeCourse, savingIds, updateCourse]);
}
