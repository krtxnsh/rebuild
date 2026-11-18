import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ScanLine,
  Settings,
  Users,
  X,
} from 'lucide-react';
import {
  ClassDataset,
  NotificationItem,
  StudentRecord,
  TeacherNavTab,
} from '../../types/palampur';
import { PalampurLogo, PersonAvatar } from '../common/BrandMark';

interface TeacherShellProps {
  dataset: ClassDataset;
  activeDatasetId: string;
  cohorts: { id: string; label: string }[];
  onChangeDataset: (id: string) => void;
  onScan?: () => void;
  activeTab: TeacherNavTab;
  onSelectTab: (tab: TeacherNavTab) => void;
  onInspectStudent: (student: StudentRecord) => void;
  onSwitchRole: (role: 'landing' | 'student') => void;
  onSignOut: () => void;
  notifications: NotificationItem[];
  onMarkNotificationsRead: () => void;
  children: React.ReactNode;
}

const TEACHER_NAV: Array<{
  id: TeacherNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'class', label: 'Students', icon: Users },
  { id: 'recommendations', label: 'What to Teach Next', icon: Lightbulb },
  { id: 'misconceptions', label: 'Misconceptions', icon: AlertTriangle },
  { id: 'analytics', label: 'Class Analytics', icon: BarChart3 },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'village', label: 'Village Progress', icon: Building2 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const TeacherShell: React.FC<TeacherShellProps> = ({
  dataset,
  activeDatasetId,
  cohorts,
  onChangeDataset,
  onScan,
  activeTab,
  onSelectTab,
  onInspectStudent,
  onSwitchRole,
  onSignOut,
  notifications,
  onMarkNotificationsRead,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const teacherNotifs = notifications.filter((n) => n.audience === 'teacher');
  const unreadCount = teacherNotifs.filter((n) => n.unread).length;

  const studentMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return dataset.students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNo.toLowerCase().includes(q) ||
          s.status.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [searchQuery, dataset.students]);

  const SidebarInner = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isSlim = collapsed && !isMobile;
    return (
      <div className="flex flex-col h-full justify-between p-3.5">
        <div>
          <div className="flex items-center justify-between gap-2 px-1 py-1.5">
            <button
              type="button"
              onClick={() => onSwitchRole('landing')}
              className="flex items-center gap-2.5 text-left rounded-lg hover:bg-white/10 p-1 transition-colors cursor-pointer min-w-0"
            >
              <PalampurLogo dark size="sm" />
              {!isSlim && (
                <div className="leading-tight min-w-0">
                  <div className="font-display font-bold text-sm text-[#FFF9F1] truncate">
                    Rebuild — Palampur
                  </div>
                  <div className="text-[11px] text-[#FFF9F1]/70 truncate">
                    {dataset.teacherName}
                  </div>
                </div>
              )}
            </button>

            {!isMobile && (
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                aria-label={isSlim ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-1.5 rounded-lg text-[#FFF9F1]/75 hover:text-[#FFF9F1] hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                {isSlim ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          <nav aria-label="Teacher navigation" className="mt-5 space-y-1">
            {TEACHER_NAV.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={isSlim ? item.label : undefined}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isSlim ? 'justify-center px-2' : ''
                  } ${
                    active
                      ? 'bg-[#E97832] text-[#FFFDFA] font-semibold shadow-sm'
                      : 'text-[#FFF9F1]/82 hover:bg-white/10 hover:text-[#FFF9F1]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isSlim && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-white/15 space-y-2">
          <button
            type="button"
            onClick={() => onSwitchRole('student')}
            title={isSlim ? 'Student Login' : undefined}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-[#FFF9F1] transition-colors cursor-pointer ${
              isSlim ? 'justify-center px-2' : 'justify-center'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
            {!isSlim && <span className="whitespace-nowrap">Student Login</span>}
          </button>

          <button
            type="button"
            onClick={onSignOut}
            title={isSlim ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-xs font-medium text-[#FFF9F1]/85 transition-colors cursor-pointer ${
              isSlim ? 'justify-center px-2' : 'justify-center'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isSlim && <span className="whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#FFF6E9] text-[#33251F]">
      {/* Collapsible Enterprise Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 bg-[#33251F] sticky top-0 h-screen transition-all duration-200 no-print ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <SidebarInner />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="w-64 bg-[#33251F] h-full shadow-xl">
            <SidebarInner isMobile />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 border-b border-[#E9D9C7] bg-[#FFF9F1]/95 px-4 sm:px-8 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 flex-1 max-w-md relative">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open teacher menu"
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
                placeholder="Search students..."
                aria-label="Search students"
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] text-sm text-[#33251F] placeholder:text-[#75665C] focus:outline-none focus:border-[#E97832]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear student search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#75665C] hover:text-[#33251F]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {studentMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] shadow-lg overflow-hidden z-40">
                  {studentMatches.map((stu) => (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        onInspectStudent(stu);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#FFF6E9] border-b last:border-b-0 border-[#E9D9C7] flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PersonAvatar name={stu.name} variant={stu.avatarVariant} size={28} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#33251F] truncate">
                            {stu.name}
                          </div>
                          <div className="text-[11px] text-[#75665C]">{stu.rollNo}</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#C85A20] tabular-nums shrink-0">
                        {stu.overallScore}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative">
            {/* Class Selector */}
            <select
              aria-label="Select class cohort"
              value={activeDatasetId}
              onChange={(e) =>
                onChangeDataset(e.target.value)
              }
              className="hidden sm:block px-3 py-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] text-xs font-semibold text-[#33251F] focus:outline-none focus:border-[#E97832] cursor-pointer"
            >
              {cohorts.map(cohort => <option value={cohort.id} key={cohort.id}>{cohort.label}</option>)}
            </select>

            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                if (!notifOpen && unreadCount > 0) onMarkNotificationsRead();
              }}
              aria-label="Teacher notifications"
              className="relative p-2 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] hover:bg-[#FFF6E9] text-[#33251F] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C94B3F] text-[#FFFDFA] text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] shadow-lg p-3 z-40">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E9D9C7]">
                  <span className="text-xs font-bold text-[#33251F]">Class Alerts</span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-[#75665C] hover:text-[#33251F]"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2">
                  {teacherNotifs.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        if (n.targetTab) onSelectTab(n.targetTab as TeacherNavTab);
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
              onClick={() => onSelectTab('settings')}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA] hover:bg-[#FFF6E9] transition-colors cursor-pointer"
            >
              <PersonAvatar
                name={dataset.teacherName}
                variant={2}
                role="teacher"
                size={30}
              />
              <span className="text-xs font-semibold text-[#33251F] hidden sm:inline whitespace-nowrap">
                {dataset.teacherName}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto">
          {onScan && <div className="mb-4 flex justify-end no-print">
            <button type="button" className="sync-button sync-button-primary" onClick={onScan}><ScanLine size={18} /> Scan Student Work</button>
          </div>}
          {children}
        </main>
      </div>
    </div>
  );
};
