import { jsPDF } from 'jspdf';
import { ClassDataset, StudentRecord, Subject, VillageBuilding } from '../types/palampur';

function accuracy(students: StudentRecord[], subject?: Subject) {
  const totals = students.flatMap(student => subject
    ? [student.predictionCounts?.[subject]]
    : Object.values(student.predictionCounts ?? {})
  ).reduce<{ correct: number; total: number }>((sum, next) => ({
    correct: sum.correct + (next?.correct ?? 0),
    total: sum.total + (next?.total ?? 0),
  }), { correct: 0, total: 0 });
  return totals.total ? Math.round(100 * totals.correct / totals.total) : null;
}

function score(value: number | null) { return value === null ? '—' : value + '%'; }

export function exportTeacherReportPDF(
  dataset: ClassDataset,
  buildings: VillageBuilding[],
): void {
  const liveClass = dataset.id === 'live-class';
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 48;

  // Header band
  doc.setFillColor(233, 120, 50); // #E97832
  doc.rect(0, 0, pageWidth, 88, 'F');

  doc.setTextColor(255, 249, 241);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Rebuild — Palampur | Class Diagnostic Report', 40, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `${dataset.schoolName} · ${dataset.gradeLabel} · Teacher: ${dataset.teacherName} · Generated ${new Date().toLocaleDateString()}`,
    40,
    64,
  );

  y = 118;

  // Executive KPIs
  const totalStudents = dataset.students.length;
  const activeStudents = dataset.students.filter((s) => s.activeThisWeek).length;
  const avgCompletion = Math.round(
    dataset.students.reduce((acc, s) => acc + s.completionRate, 0) / Math.max(1, totalStudents),
  );
  const avgAccuracy = Math.round(
    dataset.students.reduce((acc, s) => acc + s.overallScore, 0) / Math.max(1, totalStudents),
  );

  doc.setTextColor(51, 37, 31); // #33251F
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Executive Class Summary', 40, y);
  y += 18;

  doc.setFillColor(255, 249, 241);
  doc.setDrawColor(233, 217, 199);
  doc.roundedRect(40, y, pageWidth - 80, 54, 6, 6, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(117, 102, 92);
  doc.text('Total Students', 56, y + 20);
  doc.text('Active This Week', 180, y + 20);
  doc.text('Avg. Completion', 310, y + 20);
  doc.text('Class Accuracy', 435, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(51, 37, 31);
  doc.text(String(totalStudents), 56, y + 40);
  doc.text(String(activeStudents), 180, y + 40);
  doc.text(`${avgCompletion}%`, 310, y + 40);
  doc.text(score(liveClass ? accuracy(dataset.students) : avgAccuracy), 435, y + 40);

  y += 82;

  // Subject averages
  const subjects: Subject[] = liveClass ? ['Maths', 'Science'] : ['Maths', 'Science', 'English', 'EVS'];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(liveClass ? '2. Prediction Accuracy & Village Progress' : '2. Subject-Wise Mastery & Village Progress', 40, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  subjects.forEach((subj, i) => {
    const avg = Math.round(
      dataset.students.reduce((acc, s) => acc + s.subjects[subj], 0) / Math.max(1, totalStudents),
    );
    const xPos = 40 + i * 130;
    doc.setTextColor(117, 102, 92);
    doc.text(subj, xPos, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 90, 32);
    doc.text(score(liveClass ? accuracy(dataset.students, subj) : avg), xPos, y + 15);
    doc.setFont('helvetica', 'normal');
  });

  y += 38;
  doc.setTextColor(51, 37, 31);
  doc.text(
    `Overall Village Restoration Progress: ${dataset.villageProgressPct}% (${
      buildings.filter((b) => b.progress >= 100).length
    }/${buildings.length} landmarks fully restored)`,
    40,
    y,
  );

  y += 30;

  // Teaching Recommendations & Misconceptions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('3. Teaching Recommendations & Detected Misconceptions', 40, y);
  y += 18;

  dataset.conceptInsights.forEach((c) => {
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
    doc.setFillColor(255, 253, 250);
    doc.setDrawColor(233, 217, 199);
    doc.roundedRect(40, y, pageWidth - 80, 62, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(51, 37, 31);
    doc.text(`${c.conceptTitle} (${c.domain} · Severity: ${c.severity})`, 52, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(117, 102, 92);
    doc.text(
      `Hold misconception: ${c.holdIdeaCount}  |  Fragile: ${c.fragileCount}  |  Secure: ${c.secureCount}  |  Not seen: ${c.notSeenCount}`,
      52,
      y + 34,
    );
    const actionLine = doc.splitTextToSize(
      `Recommended Action: ${c.suggestedClassroomActivity}`,
      pageWidth - 108,
    );
    doc.text(actionLine[0] ?? '', 52, y + 50);

    y += 72;
  });

  y += 10;
  if (y > 680) {
    doc.addPage();
    y = 48;
  }

  // Students needing attention
  const attention = dataset.students
    .filter((s) => s.status === 'Needs Attention' || (!liveClass && s.overallScore < 65))
    .sort((a, b) => a.overallScore - b.overallScore);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(51, 37, 31);
  doc.text('4. Students Needing Attention', 40, y);
  y += 18;

  doc.setFontSize(9.5);
  attention.slice(0, 10).forEach((stu) => {
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 37, 31);
    doc.text(`${stu.name} (${stu.rollNo})`, 48, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(201, 75, 63);
    doc.text(`Overall: ${score(liveClass ? accuracy([stu]) : stu.overallScore)}`, 210, y);

    doc.setTextColor(117, 102, 92);
    doc.text(
      liveClass ? `Maths ${score(accuracy([stu], 'Maths'))} · Sci ${score(accuracy([stu], 'Science'))}`
        : `Maths ${stu.subjects.Maths}% · Sci ${stu.subjects.Science}% · Eng ${stu.subjects.English}% · EVS ${stu.subjects.EVS}%`,
      290,
      y,
    );
    y += 16;
  });

  const filename = `Rebuild-Palampur-${dataset.id}-Report.pdf`;
  doc.save(filename);
}

function csvCell(input: string | number | null) {
  if (input === null || typeof input === 'number') return input ?? '';
  const text = /^[\s]*[=+@-]/.test(input) ? "'" + input : input;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function exportClassCSV(dataset: ClassDataset): void {
  const liveClass = dataset.id === 'live-class';
  const headers = [
    'Roll No',
    'Student Name',
    'Status',
    liveClass ? 'Prediction Accuracy (%)' : 'Overall Score (%)',
    'Maths (%)',
    'Science (%)',
    ...(liveClass ? [] : ['English (%)', 'EVS (%)']),
    'Completion (%)',
    ...(liveClass ? [] : ['XP', 'Streak (Days)']),
    'Active Misconceptions',
  ];

  const rows = dataset.students.map((s) => [
    s.rollNo,
    s.name,
    s.status,
    liveClass ? accuracy([s]) : s.overallScore,
    liveClass ? accuracy([s], 'Maths') : s.subjects.Maths,
    liveClass ? accuracy([s], 'Science') : s.subjects.Science,
    ...(liveClass ? [] : [s.subjects.English, s.subjects.EVS]),
    s.completionRate,
    ...(liveClass ? [] : [s.xp, s.streakDays]),
    s.activeMisconceptions.join('; '),
  ]);

  const csv = [headers.join(','), ...rows.map(row => row.map(csvCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rebuild-Palampur-${dataset.id}-Students.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
