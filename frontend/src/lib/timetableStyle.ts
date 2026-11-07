import type { CSSProperties } from 'react';

/** Validated categorical slots (dark surface). Beyond 6 subjects, a diagonal texture is added so identity never relies on colour alone. */
export const SUBJECT_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'];

export const subjectColor = (i: number) => SUBJECT_COLORS[i % SUBJECT_COLORS.length];

export function sessionStyle(i: number): CSSProperties {
  const c = subjectColor(i);
  const textured = Math.floor(i / SUBJECT_COLORS.length) % 2 === 1;
  return {
    borderColor: c + '88',
    backgroundImage: [
      textured ? `repeating-linear-gradient(135deg, ${c}26 0 6px, transparent 6px 12px)` : '',
      `linear-gradient(155deg, ${c}48, ${c}1a 55%, rgba(13,16,34,0.75))`,
    ]
      .filter(Boolean)
      .join(','),
  };
}

export const swatchStyle = (i: number): CSSProperties => {
  const c = subjectColor(i);
  const textured = Math.floor(i / SUBJECT_COLORS.length) % 2 === 1;
  return { background: textured ? `repeating-linear-gradient(135deg, ${c} 0 3px, ${c}55 3px 6px)` : c };
};
