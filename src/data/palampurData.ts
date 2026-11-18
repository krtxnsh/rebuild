import {
  Achievement,
  ClassDataset,
  ConceptInsight,
  StudentRecord,
  VillageBuilding,
} from '../types/palampur';

export const INITIAL_VILLAGE_BUILDINGS: VillageBuilding[] = [
  {
    id: 'schoolhouse',
    name: 'Palampur Primary School',
    category: 'Education',
    linkedSubject: 'English',
    description:
      'A cedar-framed Himalayan schoolhouse with slate roofing, sun-warmed classrooms, and a community reading porch.',
    restorationCostXp: 250,
    progress: 100,
    status: 'restored',
    communityBenefit: 'Opens daily literacy workshops for 42 village children.',
    position: [-5.5, 0, -2.5],
    rotationY: 0.35,
    linkedModuleId: 'mod-english-story',
  },
  {
    id: 'water-plant',
    name: 'Clearwater Filtration Station',
    category: 'Water',
    linkedSubject: 'Science',
    description:
      'Gravity-fed mountain spring filtration tanks with multi-stage sand, charcoal, and UV purification.',
    restorationCostXp: 350,
    progress: 72,
    status: 'restoring',
    communityBenefit: 'Delivers safe drinking water free of invisible microbes to 120 households.',
    position: [5.4, 0, -3.4],
    rotationY: -0.45,
    linkedModuleId: 'mod-water-safety',
  },
  {
    id: 'solar-microgrid',
    name: 'Ridge Solar Microgrid',
    category: 'Energy',
    linkedSubject: 'Science',
    description:
      'South-facing photovoltaic ridge array and battery storage hub powering evening study lamps.',
    restorationCostXp: 400,
    progress: 58,
    status: 'restoring',
    communityBenefit: 'Supplies clean evening electricity for homework and clinic refrigeration.',
    position: [4.8, 0, 4.4],
    rotationY: -0.9,
    linkedModuleId: 'mod-electricity',
  },
  {
    id: 'granary-mill',
    name: 'Terraced Granary & Mill',
    category: 'Agriculture',
    linkedSubject: 'Maths',
    description:
      'Stone grain storehouse and water-driven flour mill calibrated with precision harvest weight scales.',
    restorationCostXp: 300,
    progress: 85,
    status: 'restoring',
    communityBenefit: 'Prevents monsoon spoilage and tracks fair harvest shares for farmers.',
    position: [-4.8, 0, 4.6],
    rotationY: 0.75,
    linkedModuleId: 'mod-fractions-harvest',
  },
  {
    id: 'eco-conservatory',
    name: 'Valley Eco-Conservatory',
    category: 'Health',
    linkedSubject: 'EVS',
    description:
      'Terrace soil research greenhouse studying native deodar roots, composting, and rain catchment.',
    restorationCostXp: 320,
    progress: 64,
    status: 'restoring',
    communityBenefit: 'Stabilizes hillside terraces against landslides and boosts crop yields.',
    position: [0.4, 0, -6.2],
    rotationY: 0.1,
    linkedModuleId: 'mod-terrace-ecology',
  },
  {
    id: 'community-hall',
    name: 'Palampur Knowledge Hall',
    category: 'Community',
    linkedSubject: 'Maths',
    description:
      'Central octagonal timber pavilion for village assemblies, peer tutoring, and winter science fairs.',
    restorationCostXp: 500,
    progress: 30,
    status: 'foundation',
    communityBenefit: 'Unites students, parents, and teachers under one solar-lit roof.',
    position: [0, 0, 0.8],
    rotationY: 0,
    linkedModuleId: 'mod-village-budget',
  },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-quick-learner',
    title: 'Quick Learner',
    description: 'Earned over 1,000 XP through consistent mastery across subjects.',
    criteria: 'Earn 1,000 XP',
    xpBonus: 100,
    unlocked: true,
    unlockedDate: 'Nov 12, 2026',
    tier: 'Gold',
  },
  {
    id: 'ach-village-hero',
    title: 'Village Hero',
    description: 'Completed 10 community restoration challenges across Palampur.',
    criteria: 'Complete 10 missions',
    xpBonus: 150,
    unlocked: true,
    unlockedDate: 'Nov 15, 2026',
    tier: 'Gold',
  },
  {
    id: 'ach-streak-keeper',
    title: 'Lantern Keeper',
    description: 'Maintained a 7-day continuous learning streak without missing a day.',
    criteria: '7-Day Streak',
    xpBonus: 80,
    unlocked: true,
    unlockedDate: 'Nov 17, 2026',
    tier: 'Silver',
  },
  {
    id: 'ach-school-builder',
    title: 'Schoolhouse Architect',
    description: 'Restored Palampur Primary School to 100% completion.',
    criteria: '100% on 1 Building',
    xpBonus: 120,
    unlocked: true,
    unlockedDate: 'Nov 10, 2026',
    tier: 'Silver',
  },
  {
    id: 'ach-hydro-scientist',
    title: 'Clearwater Scientist',
    description: 'Resolve all water-safety misconceptions and bring Clearwater Station to 100%.',
    criteria: 'Restore Water Station',
    xpBonus: 200,
    unlocked: false,
    tier: 'Gold',
  },
  {
    id: 'ach-circuit-master',
    title: 'Microgrid Engineer',
    description: 'Score 100% on the Solar Microgrid & Circuits diagnostic challenge.',
    criteria: 'Master Electricity Lab',
    xpBonus: 200,
    unlocked: false,
    tier: 'Bronze',
  },
];

function makeRoster30(): StudentRecord[] {
  const specs: Array<{
    name: string;
    overall: number;
    maths: number;
    science: number;
    english: number;
    evs: number;
    xp: number;
    streak: number;
    completion: number;
    active: boolean;
    waterState: 'secure' | 'fragile' | 'misconception' | 'unseen';
    elecState: 'secure' | 'fragile' | 'misconception' | 'unseen';
    fracState: 'secure' | 'fragile' | 'misconception' | 'unseen';
    photoState: 'secure' | 'fragile' | 'misconception' | 'unseen';
  }> = [
    { name: 'Aditya Kumar', overall: 78, maths: 82, science: 76, english: 85, evs: 73, xp: 1250, streak: 7, completion: 86, active: true, waterState: 'fragile', elecState: 'fragile', fracState: 'secure', photoState: 'secure' },
    { name: 'Riya Sharma', overall: 45, maths: 48, science: 41, english: 52, evs: 39, xp: 540, streak: 1, completion: 52, active: true, waterState: 'misconception', elecState: 'misconception', fracState: 'misconception', photoState: 'fragile' },
    { name: 'Arjun Mehta', overall: 52, maths: 55, science: 46, english: 58, evs: 49, xp: 680, streak: 2, completion: 60, active: true, waterState: 'misconception', elecState: 'misconception', fracState: 'fragile', photoState: 'misconception' },
    { name: 'Diya Verma', overall: 54, maths: 51, science: 49, english: 61, evs: 55, xp: 710, streak: 2, completion: 62, active: true, waterState: 'misconception', elecState: 'fragile', fracState: 'misconception', photoState: 'fragile' },
    { name: 'Kabir Thakur', overall: 91, maths: 94, science: 89, english: 92, evs: 89, xp: 1620, streak: 12, completion: 96, active: true, waterState: 'secure', elecState: 'secure', fracState: 'secure', photoState: 'secure' },
    { name: 'Ananya Katoch', overall: 88, maths: 90, science: 85, english: 91, evs: 86, xp: 1510, streak: 10, completion: 94, active: true, waterState: 'secure', elecState: 'secure', fracState: 'secure', photoState: 'secure' },
    { name: 'Vivaan Rana', overall: 84, maths: 88, science: 81, english: 86, evs: 81, xp: 1380, streak: 9, completion: 90, active: true, waterState: 'secure', elecState: 'fragile', fracState: 'secure', photoState: 'secure' },
    { name: 'Meera Chauhan', overall: 82, maths: 80, science: 83, english: 88, evs: 77, xp: 1310, streak: 8, completion: 88, active: true, waterState: 'secure', elecState: 'secure', fracState: 'secure', photoState: 'secure' },
    { name: 'Ishaan Negi', overall: 56, maths: 58, science: 52, english: 62, evs: 52, xp: 740, streak: 1, completion: 64, active: false, waterState: 'misconception', elecState: 'misconception', fracState: 'fragile', photoState: 'unseen' },
    { name: 'Saanvi Dogra', overall: 79, maths: 84, science: 75, english: 83, evs: 74, xp: 1210, streak: 6, completion: 85, active: true, waterState: 'fragile', elecState: 'misconception', fracState: 'secure', photoState: 'secure' },
    { name: 'Rohan Pathania', overall: 75, maths: 79, science: 72, english: 78, evs: 71, xp: 1120, streak: 5, completion: 82, active: true, waterState: 'misconception', elecState: 'fragile', fracState: 'secure', photoState: 'fragile' },
    { name: 'Kavya Sharma', overall: 86, maths: 87, science: 84, english: 90, evs: 83, xp: 1420, streak: 9, completion: 92, active: true, waterState: 'secure', elecState: 'secure', fracState: 'secure', photoState: 'secure' },
    { name: 'Aarav Mahajan', overall: 58, maths: 60, science: 54, english: 63, evs: 55, xp: 760, streak: 2, completion: 66, active: true, waterState: 'misconception', elecState: 'misconception', fracState: 'misconception', photoState: 'fragile' },
    { name: 'Naina Jamwal', overall: 81, maths: 83, science: 78, english: 86, evs: 77, xp: 1260, streak: 7, completion: 87, active: true, waterState: 'secure', elecState: 'fragile', fracState: 'secure', photoState: 'secure' },
    { name: 'Devansh Parmar', overall: 74, maths: 77, science: 70, english: 79, evs: 70, xp: 1090, streak: 4, completion: 81, active: true, waterState: 'misconception', elecState: 'misconception', fracState: 'fragile', photoState: 'secure' },
    { name: 'Tanya Guleria', overall: 89, maths: 91, science: 88, english: 93, evs: 84, xp: 1540, streak: 11, completion: 95, active: true, waterState: 'secure', elecState: 'secure', fracState: 'secure', photoState: 'secure' },
    { name: 'Pranav Sood', overall: 71, maths: 75, science: 68, english: 74, evs: 67, xp: 1010, streak: 4, completion: 79, active: true, waterState: 'misconception', elecState: 'misconception', fracState: 'fragile', photoState: 'fragile' },
    { name: 'Zoya Khan', overall: 83, maths: 85, science: 80, english: 89, evs: 78, xp: 1340, streak: 8, completion: 89, active: true, waterState: 'secure', elecState: 'fragile', fracState: 'secure', photoState: 'secure' },
    { name: 'Kunal Banyal', overall: 57, maths: 59, science: 53, english: 61, evs: 55, xp: 750, streak: 0, completion: 61, active: false, waterState: 'misconception', elecState: 'unseen', fracState: 'misconception', photoState: 'unseen' },
    { name: 'Ira Bhardwaj', overall: 85, maths: 86, science: 84, english: 90, evs: 80, xp: 1390, streak: 9, completion: 91, active: true, waterState: 'fragile', elecState: 'secure', fracState: 'secure', photoState: 'secure' },
    { name: 'Reyansh Kapoor', overall: 73, maths: 76, science: 69, english: 77, evs: 70, xp: 1040, streak: 5, completion: 80, active: true, waterState: 'misconception', elecState: 'misconception', fracState: 'fragile', photoState: 'secure' },
    { name: 'Myra Awasthi', overall: 80, maths: 82, science: 79, english: 84, evs: 75, xp: 1220, streak: 6, completion: 86, active: true, waterState: 'fragile', elecState: 'unseen', fracState: 'secure', photoState: 'secure' },
    { name: 'Siddharth Raina', overall: 76, maths: 80, science: 71, english: 81, evs: 72, xp: 1140, streak: 5, completion: 83, active: true, waterState: 'misconception', elecState: 'misconception', fracState: 'secure', photoState: 'fragile' },
    { name: 'Pari Thakur', overall: 87, maths: 89, science: 85, english: 91, evs: 83, xp: 1460, streak: 10, completion: 93, active: true, waterState: 'fragile', elecState: 'unseen', fracState: 'secure', photoState: 'secure' },
    { name: 'Nikhil Verma', overall: 72, maths: 75, science: 67, english: 76, evs: 70, xp: 990, streak: 4, completion: 78, active: true, waterState: 'misconception', elecState: 'misconception', fracState: 'misconception', photoState: 'fragile' },
    { name: 'Avni Sen', overall: 79, maths: 81, science: 76, english: 84, evs: 75, xp: 1190, streak: 6, completion: 85, active: true, waterState: 'fragile', elecState: 'unseen', fracState: 'secure', photoState: 'secure' },
    { name: 'Harshil Puri', overall: 70, maths: 74, science: 65, english: 75, evs: 66, xp: 960, streak: 3, completion: 77, active: true, waterState: 'misconception', elecState: 'misconception', fracState: 'misconception', photoState: 'misconception' },
    { name: 'Gauri Kashyap', overall: 84, maths: 86, science: 82, english: 88, evs: 80, xp: 1360, streak: 8, completion: 90, active: true, waterState: 'unseen', elecState: 'unseen', fracState: 'secure', photoState: 'secure' },
    { name: 'Yashwardhan Gill', overall: 75, maths: 78, science: 71, english: 80, evs: 71, xp: 1100, streak: 5, completion: 82, active: true, waterState: 'unseen', elecState: 'unseen', fracState: 'fragile', photoState: 'fragile' },
    { name: 'Tanvi Jaswal', overall: 77, maths: 80, science: 74, english: 82, evs: 72, xp: 1170, streak: 6, completion: 84, active: true, waterState: 'unseen', elecState: 'unseen', fracState: 'fragile', photoState: 'unseen' },
  ];

  return specs.map((s, idx) => {
    const status: StudentRecord['status'] =
      s.overall < 60 ? 'Needs Attention' : s.overall < 74 ? 'Fragile' : 'On Track';
    const misconceptions: string[] = [];
    if (s.waterState === 'misconception') misconceptions.push('Clear water is safe to drink');
    if (s.elecState === 'misconception') misconceptions.push('Current gets used up in the wire');
    if (s.fracState === 'misconception') misconceptions.push('Larger denominator means larger fraction');
    if (s.photoState === 'misconception') misconceptions.push('Plants absorb all food from soil');

    const base = s.overall;
    return {
      id: `stu-${idx + 1}`,
      name: s.name,
      rollNo: `PLM-${String(idx + 101)}`,
      avatarVariant: idx % 6,
      level: Math.max(1, Math.floor(s.xp / 160)),
      xp: s.xp,
      streakDays: s.streak,
      overallScore: s.overall,
      weeklyDelta: s.overall >= 75 ? 8 : s.overall >= 60 ? 3 : -4,
      completionRate: s.completion,
      activeThisWeek: s.active,
      status,
      subjects: {
        Maths: s.maths,
        Science: s.science,
        English: s.english,
        EVS: s.evs,
      },
      modulesCompleted: Math.round((s.completion / 100) * 6),
      totalModules: 6,
      conceptStates: {
        'concept-water-safety': s.waterState,
        'concept-electricity': s.elecState,
        'concept-fractions': s.fracState,
        'concept-photosynthesis': s.photoState,
      },
      activeMisconceptions: misconceptions,
      weeklySeries: [
        Math.max(30, base - 10),
        Math.max(32, base - 7),
        Math.max(35, base - 5),
        Math.max(35, base - 4),
        Math.max(38, base - 2),
        Math.max(40, base + 2),
        base,
      ],
      monthlySeries: [
        Math.max(30, base - 16),
        Math.max(35, base - 10),
        Math.max(38, base - 4),
        Math.min(98, base + 4),
        base,
      ],
      badgesUnlocked:
        s.xp >= 1000
          ? ['ach-quick-learner', 'ach-village-hero', 'ach-streak-keeper']
          : ['ach-school-builder'],
      recentActivity: [
        {
          id: `act-${idx}-1`,
          title: 'Harvest Ratios & Granary Fractions',
          subject: 'Maths',
          scorePct: s.maths,
          xpEarned: 70,
          timestamp: 'Today, 9:40 AM',
        },
        {
          id: `act-${idx}-2`,
          title: 'Mountain Spring & Water Safety',
          subject: 'Science',
          scorePct: s.science,
          xpEarned: 50,
          timestamp: 'Yesterday, 4:15 PM',
        },
        {
          id: `act-${idx}-3`,
          title: 'Voices of Palampur: Reading & Craft',
          subject: 'English',
          scorePct: s.english,
          xpEarned: 110,
          timestamp: '2 days ago',
        },
      ],
      teacherNote:
        status === 'Needs Attention'
          ? 'Schedule 15-min hands-on visual demo before next unit.'
          : undefined,
    };
  });
}

export function buildConceptInsights(students: StudentRecord[]): ConceptInsight[] {
  const defs = [
    {
      id: 'concept-water-safety',
      conceptTitle: 'Clear water is safe to drink',
      misconceptionStatement: 'Clear water is safe to drink',
      domain: 'Water Safety',
      subject: 'Science' as const,
      severity: 'High' as const,
      scientificModel:
        'Visual clarity only measures suspended sediment; invisible bacteria, viruses, and dissolved toxins require boiling, UV, or membrane disinfection.',
      studentMentalModel:
        'Students equate transparency and absence of odor with chemical and biological purity.',
      suggestedClassroomActivity:
        '12-min Microscope Drop Investigation: Compare clear pond water, boiled spring water, and muddy water under a foldscope to reveal living microbes in clear samples.',
      recommendedNextAction: 'Run Clearwater Lab Simulation with Class',
      activityDurationMin: 12,
      linkedModuleId: 'mod-water-safety',
    },
    {
      id: 'concept-electricity',
      conceptTitle: 'Current gets used up in the wire',
      misconceptionStatement: 'Current gets used up in the wire',
      domain: 'Electricity',
      subject: 'Science' as const,
      severity: 'High' as const,
      scientificModel:
        'Electric charge is conserved around a closed series loop; current entering and leaving a bulb is identical while electrical energy converts into light and heat.',
      studentMentalModel:
        'Students imagine electricity as fuel flowing one-way out of a battery and getting consumed inside the glowing bulb.',
      suggestedClassroomActivity:
        '15-min Dual-Ammeter Rope Loop: Place two student ammeter readers before and after a solar lantern to observe identical current readings.',
      recommendedNextAction: 'Assign Solar Microgrid Circuit Check',
      activityDurationMin: 15,
      linkedModuleId: 'mod-electricity',
    },
    {
      id: 'concept-fractions',
      conceptTitle: 'Larger denominator means larger fraction',
      misconceptionStatement: 'Larger denominator means larger fraction',
      domain: 'Fractions & Ratios',
      subject: 'Maths' as const,
      severity: 'Medium' as const,
      scientificModel:
        'The denominator indicates how many equal parts a whole is divided into; more parts mean smaller individual pieces when numerators match.',
      studentMentalModel:
        'Students apply whole-number magnitude directly to denominators (thinking 3/8 > 3/4 because 8 > 4).',
      suggestedClassroomActivity:
        '10-min Granary Sack Folding: Fold equal paper strips into fourths and eighths side-by-side to visually align 3/4 = 6/8.',
      recommendedNextAction: 'Launch Granary Harvest Fraction Drill',
      activityDurationMin: 10,
      linkedModuleId: 'mod-fractions-harvest',
    },
    {
      id: 'concept-photosynthesis',
      conceptTitle: 'Plants absorb all food from soil',
      misconceptionStatement: 'Plants absorb all food from soil',
      domain: 'Plant Ecology',
      subject: 'EVS' as const,
      severity: 'Low' as const,
      scientificModel:
        'Plants synthesize glucose inside chloroplasts using atmospheric CO2, water, and sunlight; soil provides water and mineral ions only.',
      studentMentalModel:
        'Students analogize plant roots to animal mouths eating rich soil as food.',
      suggestedClassroomActivity:
        '10-min Van Helmont Willow Thought Experiment: Weigh dry soil before and after sapling growth to show mass comes from air and water.',
      recommendedNextAction: 'Assign Eco-Conservatory Terrace Case',
      activityDurationMin: 10,
      linkedModuleId: 'mod-terrace-ecology',
    },
  ];

  return defs.map((d) => {
    let holdIdeaCount = 0;
    let fragileCount = 0;
    let secureCount = 0;
    let notSeenCount = 0;
    const affectedStudentIds: string[] = [];

    for (const st of students) {
      const state = st.conceptStates[d.id] ?? 'unseen';
      if (state === 'misconception') {
        holdIdeaCount += 1;
        affectedStudentIds.push(st.id);
      } else if (state === 'fragile') {
        fragileCount += 1;
      } else if (state === 'secure') {
        secureCount += 1;
      } else {
        notSeenCount += 1;
      }
    }

    const total = Math.max(1, students.length);
    const confidenceScore = Math.round(((secureCount + fragileCount * 0.5) / total) * 100);
    // Preserves explicit unsure callouts from original diagnostic engine
    const unsureCount =
      d.id === 'concept-water-safety'
        ? Math.max(9, fragileCount + notSeenCount)
        : d.id === 'concept-electricity'
          ? Math.max(5, fragileCount)
          : fragileCount;

    return {
      ...d,
      holdIdeaCount,
      fragileCount,
      secureCount,
      notSeenCount,
      unsureCount,
      confidenceScore,
      affectedStudentIds,
    };
  });
}

const class6AStudents = makeRoster30();

// Sample Class dataset for the "Show Sample Class" toggle in Teaching Recommendations & Top Bar
const sampleStudents = class6AStudents.slice(0, 24).map((s, idx) => ({
  ...s,
  id: `sample-${idx + 1}`,
  rollNo: `SMP-${idx + 201}`,
  overallScore: Math.min(96, s.overallScore + (idx % 3 === 0 ? 5 : -2)),
  subjects: {
    Maths: Math.min(97, s.subjects.Maths + 4),
    Science: Math.min(95, s.subjects.Science + 3),
    English: Math.min(98, s.subjects.English + 2),
    EVS: Math.min(94, s.subjects.EVS + 5),
  },
}));

export const SAMPLE_CLASS_DATASET: ClassDataset = {
  id: 'sample-class',
  label: 'Sample Class (Kangra Valley)',
  schoolName: 'Kangra Valley Demo Cohort',
  gradeLabel: 'Grade 6 · Pilot Cohort',
  teacherName: 'Mrs. Sharma',
  villageProgressPct: 74,
  classConfidencePct: 83,
  classConfidenceDelta: 15,
  students: sampleStudents,
  conceptInsights: buildConceptInsights(sampleStudents),
  assignments: [
    {
      id: 'asg-smp-1',
      title: 'Pilot Water Filtration Challenge',
      subject: 'Science',
      conceptFocus: 'Clear water is safe to drink',
      dueDate: 'Nov 20, 2026',
      assignedTo: 'Pilot Cohort (24)',
      submittedCount: 22,
      totalCount: 24,
      averageScore: 81,
      status: 'Active',
    },
    {
      id: 'asg-smp-2',
      title: 'Terrace Slope Soil Retention',
      subject: 'EVS',
      conceptFocus: 'Plants absorb all food from soil',
      dueDate: 'Nov 23, 2026',
      assignedTo: 'Pilot Cohort (24)',
      submittedCount: 19,
      totalCount: 24,
      averageScore: 79,
      status: 'Active',
    },
  ],
};
