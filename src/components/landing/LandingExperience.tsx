import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CloudOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PalampurLogo, PersonAvatar } from '../common/BrandMark';
import { parseStudent, type Classroom, type Student } from '../../telemetry/protocol';
import './landing.css';

type Role = 'student' | 'teacher';

const roles = [
  { role: 'student', title: "I'm a student", subtitle: 'Play and bring the village back' },
  { role: 'teacher', title: "I'm a teacher", subtitle: 'See the class dashboard' },
] as const;

export function LandingExperience({ classrooms, offlineReady, onStudent, onTeacher }: {
  classrooms: Classroom[];
  offlineReady: boolean;
  onStudent: (student: Student, classroomId: string) => void;
  onTeacher: (teacher: string, section: string) => void;
}) {
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const identifier = String(data.get('identifier') ?? '').trim();
    if (!name || !identifier) {
      setError('Please fill in both fields.');
      return;
    }
    if (role === 'student') {
      const student = parseStudent({ name, rollNo: identifier });
      if (!student) { setError('Please check your name and roll number.'); return; }
      onStudent(student, String(data.get('classroom') ?? ''));
    } else {
      onTeacher(name, identifier);
    }
  }

  return (
    <main className="role-portal">
      <div className="role-portal-landscape" aria-hidden="true">
        <i className="portal-cloud cloud-left" />
        <i className="portal-cloud cloud-right" />
      </div>
      <header className="portal-header">
        <div className="portal-brand"><PalampurLogo /><span>REBUILD <small>PALAMPUR</small></span></div>
        {offlineReady && <span className="offline-status"><CloudOff size={15} /> Ready offline</span>}
      </header>
      <section className="portal-content" aria-labelledby="portal-title">
        <div className="portal-title">
          <h1 id="portal-title">Who is playing today?</h1>
          <p>Help bring water, power, and food back to Palampur.</p>
        </div>
        <div className="portal-selection">
          <AnimatePresence mode="wait" initial={false}>
            {!role ? (
              <motion.div className="portal-roles" key="roles" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.18 }}>
                {roles.map(item => (
                  <button className={'role-card role-' + item.role} key={item.role} type="button" onClick={() => { setError(''); setRole(item.role); }}>
                    <div className="role-portrait"><PersonAvatar role={item.role} name={item.role} variant={item.role === 'teacher' ? 1 : 0} size={78} /></div>
                    <span className="role-card-title">{item.title}</span>
                    <span className="role-card-subtitle">{item.subtitle}</span>
                    <span className="role-card-arrow" aria-hidden="true"><ArrowRight size={21} /></span>
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.form key={role} className={'onboarding role-' + role} onSubmit={submit} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.18 }}>
                <button type="button" className="onboarding-back" onClick={() => setRole(null)}><ArrowLeft size={17} /> Choose a role</button>
                <h2>{role === 'student' ? 'Meet your village' : 'Open your classroom'}</h2>
                <label>{role === 'student' ? 'Student Name' : 'Teacher Name'}
                  <input name="name" autoFocus required maxLength={64} placeholder={role === 'student' ? 'Aarav' : 'Mrs. Sharma'} autoComplete="name" />
                </label>
                <label>{role === 'student' ? 'Roll Number' : 'Class / Section'}
                  <input name="identifier" required maxLength={role === 'student' ? 24 : 48} placeholder={role === 'student' ? '14' : 'Class 6A'} />
                </label>
                {role === 'student' && classrooms.length > 0 && (
                  <label>Class on this device
                    <select name="classroom" defaultValue={classrooms.length === 1 ? classrooms[0].id : ''}>
                      <option value="">Play without linking a class</option>
                      {classrooms.map(classroom => <option key={classroom.id} value={classroom.id}>{classroom.section}</option>)}
                    </select>
                  </label>
                )}
                {error && <p role="alert">{error}</p>}
                <button className="portal-primary" type="submit">{role === 'student' ? 'Enter Palampur' : 'Open Class Dashboard'} <ArrowRight size={20} /></button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>
      <footer className="portal-footer">A STEM adventure in the Himalayan foothills</footer>
    </main>
  );
}
