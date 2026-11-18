import { lazy, Suspense, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { LandingExperience } from './components/landing/LandingExperience';
import { registerClass, registerStudent, useProgressStore } from './telemetry/store';
import { studentKey, type Classroom, type Student } from './telemetry/protocol';
import { useOfflineReady } from './useOfflineReady';

const GameExperience = lazy(() => import('./components/student/GameExperience').then(module => ({ default: module.GameExperience })));
const TeacherDashboard = lazy(() => import('./components/teacher/TeacherDashboard'));

type Session = { role: 'student'; student: Student; classroomId: string } | { role: 'teacher'; classroom: Classroom };
const loading = <main className="grid min-h-svh place-items-center p-6" role="status">Opening REBUILD…</main>;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const store = useProgressStore();
  const offlineReady = useOfflineReady();
  function exit() { setSession(null); window.scrollTo(0, 0); }

  return (
    <MotionConfig reducedMotion="user">
      {store.storageIssue && <p role="status" className="relative z-20 bg-[#f8ddd0] p-2 text-center text-sm text-[#782d20]">Browser storage is unavailable. Export your progress before closing REBUILD.</p>}
      <Suspense fallback={loading}>
        {session?.role === 'student' ? (
          <GameExperience
            progress={store.local.get(studentKey(session.student)) ?? { student: session.student, events: [] }}
            classroomId={session.classroomId}
            classroomLabel={store.classrooms.find(item => item.id === session.classroomId)?.section}
            onExit={exit}
          />
        ) : session?.role === 'teacher' ? (
          <TeacherDashboard selected={session.classroom} classrooms={store.classrooms} rosters={store.rosters} local={Array.from(store.local.values())} onExit={exit} />
        ) : (
          <LandingExperience classrooms={store.classrooms} offlineReady={offlineReady}
            onStudent={(student, classroomId) => {
              registerStudent(student, classroomId);
              setSession({ role: 'student', student, classroomId });
              window.scrollTo(0, 0);
            }}
            onTeacher={(teacher, section) => {
              setSession({ role: 'teacher', classroom: registerClass(section, teacher) });
              window.scrollTo(0, 0);
            }}
          />
        )}
      </Suspense>
    </MotionConfig>
  );
}
