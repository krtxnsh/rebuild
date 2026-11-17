import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  Bell,
  BookOpen,
  Compass,
  Home,
  LogOut,
  Menu,
  Search,
  Star,
  Target,
  Trophy,
  User,
  X,
} from 'lucide-react';
import {
  LearningModule,
  Mission,
  NotificationItem,
  StudentNavTab,
  StudentRecord,
} from '../../types/palampur';
import { AnimatedNumber, PalampurLogo, PersonAvatar } from '../common/BrandMark';

interface StudentShellProps {
  student: StudentRecord;
  activeTab: StudentNavTab;
  onSelectTab: (tab: StudentNavTab) => void;
  onSwitchRole: (role: 'landing' | 'teacher') => void;
  onSignOut: () => void;
  modules: LearningModule[];
  missions: Mission[];
  notifications: NotificationItem[];
  onMarkNotificationsRead: () => void;
  onStartModule: (moduleId: string) => void;
  children: React.ReactNode;
}

const STUDENT_NAV: Array<{
  id: StudentNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'home', label: 'Dashboard', icon: Home },
  { id: 'learn', label: 'My Learning', icon: BookOpen },
  { id: 'missions', label: 'Missions', icon: Target },
  { id: 'village', label: 'Rebuild Village', icon: Compass },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'profile', label: 'Profile', icon: User },
];

export const StudentShell: React.FC<StudentShellProps> = ({
  student,
  activeTab,
  onSelectTab,
  onSwitchRole,
  onSignOut,
  modules,
  missions,
  notifications,
  onMarkNotificationsRead,
  onStartModule,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const studentNotifs = notifications.filter((n) => n.audience === 'student');
  const unreadCount = studentNotifs.filter((n) => n.unread).length;

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const modMatches = modules
      .filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.subject.toLowerCase().includes(q) ||
          m.conceptTag.toLowerCase().includes(q),
      )
      .map((m) => ({
        id: m.id,
        kind: 'Module',
        title: m.title,
        subtitle: `${m.subject} · +${m.xpReward} XP`,
        onClick: () => {
          setSearchQuery('');
          onStartModule(m.id);
        },
      }));

    const missionMatches = missions
      .filter((m) => m.title.toLowerCase().includes(q))
      .map((m) => ({
        id: m.id,
        kind: 'Mission',
        title: m.title,
        subtitle: `${m.cadence} · +${m.xpReward} XP`,
        onClick: () => {
          setSearchQuery('');
          onSelectTab('missions');
        },
      }));

    return [...modMatches, ...missionMatches].slice(0, 6);
  }, [searchQuery, modules, missions, onStartModule, onSelectTab]);

  const SidebarInner = () => (
    <div className="flex flex-col h-full justify-between p-4">
      <div>
        <button
          type="button"
          onClick={() => onSwitchRole('landing')}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer"
        >
          <PalampurLogo dark size="sm" />
          <div className="leading-tight">
            <div className="font-display font-bold text-sm text-[#FFF9F1]">
              Rebuild — Palampur
            </div>
            <div className="text-[11px] text-[#FFF9F1]/75">
              {student.name.split(' ')[0]} · {student.rollNo}
            </div>
          </div>
        </button>

        <nav aria-label="Student navigation" className="mt-6 space-y-1">
          {STUDENT_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#E97832] text-[#FFFDFA] font-semibold shadow-sm'
                    : 'text-[#FFF9F1]/85 hover:bg-white/10 hover:text-[#FFF9F1]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 pt-4 border-t border-white/15">
        <div className="rounded-xl bg-white/10 px-3.5 py-2.5 flex items-center justify-between text-xs text-[#FFF9F1]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Star className="w-4 h-4 text-[#F5A34A]" />
            XP Balance
          </span>
          <span className="font-mono font-bold tabular-nums">
            <AnimatedNumber value={student.xp} />
          </span>
        </div>

        <button
          type="button"
          onClick={() => onSwitchRole('teacher')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-[#FFF9F1] transition-colors cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Teacher Login</span>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-xs font-medium text-[#FFF9F1]/85 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#FFF6E9] text-[#33251F]">
      {/* Desktop Sidebar in Deep Warm Brown / Burnt Sienna */}
      <aside className="hidden lg:block w-64 shrink-0 bg-[#33251F] sticky top-0 h-screen">
        <SidebarInner />
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 bg-[#33251F] h-full shadow-xl">
            <SidebarInner />
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 border-b border-[#E9D9C7] bg-[#FFF9F1]/95 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md relative">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2 rounded-lg border border-[#E9D9C7] bg-[#FFFDFA] text-[#33251F]"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#75665C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchQuery('');
                }}
                placeholder="Search lessons, missions..."
                aria-label="Search lessons and missions"
                aria-expanded={searchQuery.length > 0}
                aria-controls="student-search-results"
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] text-sm text-[#33251F] placeholder:text-[#75665C] focus:outline-none focus:border-[#E97832]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#75665C] hover:text-[#33251F]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {searchQuery.trim() && (
                <div id="student-search-results" role="listbox" className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] shadow-lg overflow-hidden z-40">
                  {searchResults.length === 0 && (
                    <div className="px-4 py-3 text-xs text-[#75665C]">
                      No lessons or missions found. Try a subject like Maths or Science.
                    </div>
                  )}
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={res.onClick}
                      role="option"
                      className="w-full text-left px-4 py-2.5 hover:bg-[#FFF6E9] border-b last:border-b-0 border-[#E9D9C7] flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#33251F] truncate">
                          {res.title}
                        </div>
                        <div className="text-xs text-[#75665C]">{res.subtitle}</div>
                      </div>
                      <span className="text-[11px] font-medium text-[#C85A20] shrink-0">
                        {res.kind}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                if (!notifOpen && unreadCount > 0) onMarkNotificationsRead();
              }}
              aria-label="Notifications"
              aria-expanded={notifOpen}
              aria-haspopup="dialog"
              className="relative p-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] hover:bg-[#FFF6E9] text-[#33251F] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E97832] text-[#FFFDFA] text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] shadow-lg p-3 z-40">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E9D9C7]">
                  <span className="text-xs font-bold text-[#33251F]">Notifications</span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-[#75665C] hover:text-[#33251F]"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2">
                  {studentNotifs.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        if (n.targetTab) onSelectTab(n.targetTab as StudentNavTab);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-[#FFF6E9] transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-[#33251F]">{n.title}</div>
                      <div className="text-[11px] text-[#75665C] mt-0.5">{n.detail}</div>
                      <div className="text-[10px] text-[#C85A20] mt-1">{n.timeAgo}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onSelectTab('profile')}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] hover:bg-[#FFF6E9] transition-colors cursor-pointer"
            >
              <PersonAvatar name={student.name} variant={student.avatarVariant} size={30} />
              <span className="text-xs font-semibold text-[#33251F] hidden sm:inline whitespace-nowrap">
                {student.name.split(' ')[0]}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1320px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
