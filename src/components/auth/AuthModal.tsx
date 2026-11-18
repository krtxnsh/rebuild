import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Languages,
  Lock,
  Mail,
  UserPlus,
  X,
} from 'lucide-react';
import { Lang, StudentRecord } from '../../types/palampur';
import { PalampurLogo, PersonAvatar } from '../common/BrandMark';
import { unlockAudio } from '../../lib/audioUnlock';

const LANG_KEY = 'rebuild.lang';

export interface AuthSuccessPayload {
  role: 'student' | 'teacher';
  lang: Lang;
  studentId?: string;
  newStudent?: {
    name: string;
    email: string;
    classCode: string;
  };
  teacherInfo?: {
    name: string;
    email: string;
    schoolName: string;
  };
}

interface AuthModalProps {
  initialRole: 'student' | 'teacher';
  students: StudentRecord[];
  onClose: () => void;
  onSuccess: (payload: AuthSuccessPayload) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialRole,
  students,
  onClose,
  onSuccess,
}) => {
  const [role, setRole] = useState<'student' | 'teacher'>(initialRole);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem(LANG_KEY) === 'kn' ? 'kn' : 'en';
    } catch {
      return 'en';
    }
  });

  // Inject language + audio-unlock side effects into every success path.
  const emitSuccess = (payload: Omit<AuthSuccessPayload, 'lang'>) => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
    if (payload.role === 'student') unlockAudio();
    onSuccess({ ...payload, lang });
  };

  // Login fields
  const [identifier, setIdentifier] = useState(
    initialRole === 'student' ? 'PLM-101' : 'sharma@palampurschool.edu',
  );
  const [password, setPassword] = useState('palampur2026');
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [classCode, setClassCode] = useState('PALAMPUR-6A');
  const [schoolName, setSchoolName] = useState('Palampur Model School');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRoleChange = (nextRole: 'student' | 'teacher') => {
    setRole(nextRole);
    setErrorMsg(null);
    if (mode === 'login') {
      setIdentifier(
        nextRole === 'student' ? 'PLM-101' : 'sharma@palampurschool.edu',
      );
      setPassword('palampur2026');
    }
  };

  const handleModeChange = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.trim().length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    if (role === 'student') {
      if (mode === 'login') {
        const query = identifier.trim().toLowerCase();
        if (!query) {
          setErrorMsg('Please enter your Student Roll Number, Name, or Email.');
          return;
        }
        const matched = students.find(
          (s) =>
            s.rollNo.toLowerCase() === query ||
            s.name.toLowerCase() === query ||
            s.name.split(' ')[0].toLowerCase() === query ||
            `${s.name.split(' ')[0].toLowerCase()}@palampurschool.edu` === query,
        );
        if (!matched) {
          setErrorMsg(
            'No student found with that Roll Number or Email. Try PLM-101 (Aditya), PLM-102 (Riya), or register a new account.',
          );
          return;
        }
        emitSuccess({ role: 'student', studentId: matched.id });
      } else {
        if (fullName.trim().length < 2) {
          setErrorMsg('Please enter your full name.');
          return;
        }
        if (!regEmail.includes('@')) {
          setErrorMsg('Please enter a valid student or parent email address.');
          return;
        }
        if (classCode.trim().toUpperCase() !== 'PALAMPUR-6A') {
          setErrorMsg('Invalid class join code. Use PALAMPUR-6A for Grade 6 Section A.');
          return;
        }
        emitSuccess({
          role: 'student',
          newStudent: {
            name: fullName.trim(),
            email: regEmail.trim(),
            classCode: classCode.trim().toUpperCase(),
          },
        });
      }
    } else {
      // Teacher flow
      if (mode === 'login') {
        const query = identifier.trim().toLowerCase();
        if (!query) {
          setErrorMsg('Please enter your School Email or Faculty ID.');
          return;
        }
        const isValidDemo =
          query === 'sharma@palampurschool.edu' ||
          query === 'mrs. sharma' ||
          query === 'tch-01' ||
          query.includes('@');
        if (!isValidDemo) {
          setErrorMsg(
            'Please enter a valid school email (e.g. sharma@palampurschool.edu) or Faculty ID TCH-01.',
          );
          return;
        }
        emitSuccess({
          role: 'teacher',
          teacherInfo: {
            name: query.includes('sharma') || query === 'tch-01' ? 'Mrs. Sharma' : identifier.split('@')[0],
            email: query.includes('@') ? identifier.trim() : 'sharma@palampurschool.edu',
            schoolName: 'Palampur Model School',
          },
        });
      } else {
        if (fullName.trim().length < 2) {
          setErrorMsg('Please enter your full faculty name.');
          return;
        }
        if (!regEmail.includes('@')) {
          setErrorMsg('Please enter a valid school email address.');
          return;
        }
        emitSuccess({
          role: 'teacher',
          teacherInfo: {
            name: fullName.trim(),
            email: regEmail.trim(),
            schoolName: schoolName.trim() || 'Palampur Model School',
          },
        });
      }
    }
  };

  const quickLoginStudent = (stu: StudentRecord) => {
    emitSuccess({ role: 'student', studentId: stu.id });
  };

  const quickLoginTeacher = () => {
    emitSuccess({
      role: 'teacher',
      teacherInfo: {
        name: 'Mrs. Sharma',
        email: 'sharma@palampurschool.edu',
        schoolName: 'Palampur Model School',
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#33251F]/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Rebuild Palampur"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-lg rounded-2xl border border-[#E9D9C7] bg-[#FFFDFA] shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E9D9C7] bg-[#FFF9F1] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PalampurLogo size="sm" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#33251F]">
                {mode === 'login' ? 'Sign In to Rebuild — Palampur' : 'Create Palampur Account'}
              </h2>
              <p className="text-xs text-[#75665C]">
                {role === 'student'
                  ? 'Access your lessons, 3D village, and XP streak'
                  : 'Access Class 6A analytics, misconceptions & PDF reports'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in"
            className="p-2 rounded-lg text-[#75665C] hover:text-[#33251F] hover:bg-[#FFF6E9] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1]">
            <button
              type="button"
              onClick={() => handleRoleChange('student')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                role === 'student'
                  ? 'bg-[#E97832] text-[#FFFDFA] shadow-sm'
                  : 'text-[#75665C] hover:text-[#33251F]'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Login</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('teacher')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                role === 'teacher'
                  ? 'bg-[#33251F] text-[#FFF9F1] shadow-sm'
                  : 'text-[#75665C] hover:text-[#33251F]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Teacher Login</span>
            </button>
          </div>

          {/* Sign In vs Create Account */}
          <div className="flex items-center justify-between border-b border-[#E9D9C7] pb-3 text-xs">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'border-[#E97832] text-[#33251F]'
                    : 'border-transparent text-[#75665C] hover:text-[#33251F]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                className={`font-semibold pb-1 border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  mode === 'register'
                    ? 'border-[#E97832] text-[#33251F]'
                    : 'border-transparent text-[#75665C] hover:text-[#33251F]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>
            <span className="text-[#75665C]">
              {role === 'student' ? 'Class 6A' : 'Faculty Portal'}
            </span>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-[#C94B3F]/40 bg-[#C94B3F]/10 px-4 py-3 flex items-start gap-2.5 text-xs text-[#33251F]"
            >
              <AlertCircle className="w-4 h-4 text-[#C94B3F] shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'login' ? (
              <div>
                <label
                  htmlFor="auth-identifier"
                  className="block text-xs font-semibold text-[#33251F] mb-1.5"
                >
                  {role === 'student'
                    ? 'Student Roll Number or Email'
                    : 'School Email or Faculty ID'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#75665C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      role === 'student'
                        ? 'e.g. PLM-101 or aditya@palampurschool.edu'
                        : 'e.g. sharma@palampurschool.edu'
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm text-[#33251F] placeholder:text-[#75665C] focus:outline-none focus:border-[#E97832]"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="reg-name"
                      className="block text-xs font-semibold text-[#33251F] mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={role === 'student' ? 'e.g. Aarav Thakur' : 'e.g. Mr. Verma'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm text-[#33251F] focus:outline-none focus:border-[#E97832]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reg-email"
                      className="block text-xs font-semibold text-[#33251F] mb-1.5"
                    >
                      {role === 'student' ? 'Student / Parent Email' : 'School Email'}
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@palampurschool.edu"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm text-[#33251F] focus:outline-none focus:border-[#E97832]"
                    />
                  </div>
                </div>

                {role === 'student' ? (
                  <div>
                    <label
                      htmlFor="reg-code"
                      className="block text-xs font-semibold text-[#33251F] mb-1.5"
                    >
                      Classroom Join Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#75665C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reg-code"
                        type="text"
                        required
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value)}
                        placeholder="PALAMPUR-6A"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm font-mono text-[#33251F] focus:outline-none focus:border-[#E97832]"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="reg-school"
                      className="block text-xs font-semibold text-[#33251F] mb-1.5"
                    >
                      School Name
                    </label>
                    <input
                      id="reg-school"
                      type="text"
                      required
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm text-[#33251F] focus:outline-none focus:border-[#E97832]"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-[#33251F] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#75665C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] text-sm text-[#33251F] focus:outline-none focus:border-[#E97832]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#75665C] hover:text-[#33251F] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {role === 'student' && (
              <div>
                <label className="block text-xs font-semibold text-[#33251F] mb-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-[#C85A20]" /> Choose your language
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Language">
                  {(
                    [
                      { id: 'en', flag: '🇬🇧', label: 'English' },
                      { id: 'kn', flag: '🇮🇳', label: 'ಕನ್ನಡ' },
                    ] as { id: Lang; flag: string; label: string }[]
                  ).map((opt) => {
                    const active = lang === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setLang(opt.id)}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'border-[#E97832] bg-[#E97832]/10 text-[#33251F]'
                            : 'border-[#E9D9C7] bg-[#FFF9F1] text-[#75665C] hover:text-[#33251F]'
                        }`}
                      >
                        <span className="text-base leading-none">{opt.flag}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-[#75665C]">
                  Rio narrates the village in your language — switch anytime with the EN · ಕನ್ನಡ button.
                </p>
              </div>
            )}

            <button
              type="submit"
              className={`w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm transition-colors cursor-pointer ${
                role === 'student'
                  ? 'bg-[#E97832] hover:bg-[#C85A20] text-[#FFFDFA]'
                  : 'bg-[#33251F] hover:bg-[#4A372E] text-[#FFF9F1]'
              }`}
            >
              <span>
                {role === 'student'
                  ? 'Enter Palampur'
                  : mode === 'login'
                    ? 'Sign In as Teacher'
                    : 'Create Teacher Account'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* One-Click Quick Account Access */}
          {mode === 'login' && (
            <div className="pt-4 border-t border-[#E9D9C7]">
              <div className="text-[11px] font-semibold text-[#75665C] mb-2.5">
                Quick Demo Accounts
              </div>

              {role === 'student' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {students.slice(0, 2).map((stu) => (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => quickLoginStudent(stu)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] hover:border-[#E97832] text-left transition-colors cursor-pointer"
                    >
                      <PersonAvatar name={stu.name} variant={stu.avatarVariant} size={32} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#33251F] truncate">
                          {stu.name}
                        </div>
                        <div className="text-[11px] font-mono text-[#75665C]">
                          {stu.rollNo} · {stu.xp} XP
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={quickLoginTeacher}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E9D9C7] bg-[#FFF9F1] hover:border-[#E97832] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <PersonAvatar name="Mrs. Sharma" variant={2} role="teacher" size={34} />
                    <div>
                      <div className="text-xs font-bold text-[#33251F]">Mrs. Sharma</div>
                      <div className="text-[11px] text-[#75665C]">
                        sharma@palampurschool.edu · Class 6A
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#C85A20] shrink-0">
                    Sign In →
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
