import {
  ConceptMasteryState,
  GameChapter,
  MISCONCEPTION_TO_CONCEPT,
  StudentTelemetrySnapshot,
  Subject,
  TelemetryEvent,
} from '../types/palampur';

export function conceptForChapter(chapter?: GameChapter): string | undefined {
  switch (chapter) {
    case 'water':
      return 'concept-water-safety';
    case 'power':
      return 'concept-electricity';
    case 'ration':
      return 'concept-fractions';
    default:
      return undefined;
  }
}

export function conceptForPart(partId?: string): string | undefined {
  if (!partId) return undefined;
  const prefix = partId.split('.')[0] as GameChapter;
  return conceptForChapter(prefix);
}

export function labelForChapter(chapter?: GameChapter): string {
  switch (chapter) {
    case 'water':
      return 'Clean Water';
    case 'power':
      return 'Power for Palampur';
    case 'ration':
      return 'Fair Rations';
    default:
      return 'Palampur';
  }
}

export function subjectForChapter(chapter?: GameChapter): Subject {
  return chapter === 'ration' ? 'Maths' : 'Science';
}

export interface ConceptFold {
  conceptStates: Record<string, ConceptMasteryState>;
  activeMisconceptions: string[];
}

/**
 * Fold a single telemetry event into a student's concept state. Misconceptions
 * win over mastery; a resolved/completed concept clears the misconception flag.
 */
export function applyEvent(base: ConceptFold, evt: TelemetryEvent): ConceptFold {
  const conceptStates = { ...base.conceptStates };
  let misconceptions = base.activeMisconceptions.slice();

  const markSecure = (concept?: string) => {
    if (!concept) return;
    if (conceptStates[concept] !== 'misconception') conceptStates[concept] = 'secure';
  };
  const markMisconception = (concept?: string) => {
    if (!concept) return;
    conceptStates[concept] = 'misconception';
    if (misconceptions.indexOf(concept) < 0) misconceptions = misconceptions.concat(concept);
  };
  const resolve = (concept?: string) => {
    if (!concept) return;
    conceptStates[concept] = 'secure';
    misconceptions = misconceptions.filter((c) => c !== concept);
  };

  switch (evt.event) {
    case 'MISCONCEPTION_RECORDED':
      markMisconception(evt.misconceptionId ? MISCONCEPTION_TO_CONCEPT[evt.misconceptionId] : undefined);
      break;
    case 'NOTEBOOK_PART_UNLOCKED':
      markSecure(conceptForPart(evt.partId));
      break;
    case 'MODULE_COMPLETED':
      resolve(conceptForChapter(evt.chapter));
      break;
    case 'CONCEPT_RESOLVED':
      resolve(evt.conceptId);
      break;
    case 'CRI_RECORDED': {
      // A low-confidence tap on a not-yet-secure concept marks it fragile.
      const concept = conceptForChapter(evt.chapter);
      if (concept && evt.cri === 1 && !conceptStates[concept]) conceptStates[concept] = 'fragile';
      break;
    }
    default:
      break;
  }

  return { conceptStates, activeMisconceptions: misconceptions };
}

/** Fold an entire scanned snapshot (offline import) into concept state. */
export function foldSnapshot(base: ConceptFold, snap: StudentTelemetrySnapshot): ConceptFold {
  let acc = base;
  for (const evt of snap.events) acc = applyEvent(acc, evt);
  // Unlocked notebook parts also imply mastery of their concept.
  for (const part of snap.notebookParts) {
    const concept = conceptForPart(part);
    if (concept && acc.conceptStates[concept] !== 'misconception') {
      acc = { conceptStates: { ...acc.conceptStates, [concept]: 'secure' }, activeMisconceptions: acc.activeMisconceptions };
    }
  }
  return acc;
}
