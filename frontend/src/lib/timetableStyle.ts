import type { CSSProperties } from 'react';

/** Categorical slots validated for the dark surface. Beyond 6 subjects, a diagonal texture is added so identity never relies on colour alone. */
export const SUBJECT_COLORS = ['#2a6fdb', '#d0542a', '#16875f', '#b07800', '#c4457a', '#7262d6'];

export const subjectColor = (i: number) => SUBJECT_COLORS[i % SUBJECT_COLORS.length];

/** Translucent tint with a solid left rule in the subject colour, for dark glass. */
export function sessionStyle(i: number): CSSProperties {
  const c = subjectColor(i);
  const textured = Math.floor(i / SUBJECT_COLORS.length) % 2 === 1;
  return {
    borderColor: c + '66',
    borderLeftColor: c,
    borderLeftWidth: 3,
    backgroundColor: c + '2e',
    backgroundImage: textured ? `repeating-linear-gradient(135deg, ${c}26 0 6px, transparent 6px 12px)` : undefined,
  };
}

export const swatchStyle = (i: number): CSSProperties => {
  const c = subjectColor(i);
  const textured = Math.floor(i / SUBJECT_COLORS.length) % 2 === 1;
  return { background: textured ? `repeating-linear-gradient(135deg, ${c} 0 3px, ${c}b3 3px 6px)` : c };
};
