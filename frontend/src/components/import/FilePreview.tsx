import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Columns3, Download, Layers, Plus, Rows3, Sparkles, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { ENTITIES } from '../../lib/entities';
import type { EntityKey } from '../../lib/types';
import { reanalyze, type Override, type ParsedFile } from '../../lib/import/detect';
import { ConfidenceRing, EntityDot, FileBadge } from './visuals';
import { ENTITY_COLOR, ENTITY_LABEL, fmtSize } from '../../lib/import/entityStyle';
import { demoUrl } from '../../lib/import/demoFiles';

const PREVIEW_ROWS = 150;

export default function FilePreview({
  file,
  inQueue,
  onClose,
  onAdd,
  onRemove,
  onChange,
}: {
  file: ParsedFile | null;
  inQueue: boolean;
  onClose: () => void;
  onAdd: (f: ParsedFile) => void;
  onRemove: (f: ParsedFile) => void;
  onChange: (f: ParsedFile) => void;
}) {
  const [sheetIndex, setSheetIndex] = useState(0);
  const sheet = file?.sheets[Math.min(sheetIndex, (file?.sheets.length ?? 1) - 1)];

  // column → list of (entity, field label) it feeds
  const colInfo = useMemo(() => {
    const m = new Map<number, { entity: EntityKey; label: string; derived: boolean }[]>();
    sheet?.mappings.forEach((mp) => {
      Object.entries(mp.fields).forEach(([field, col]) => {
        const label = ENTITIES[mp.entity].fields.find((f) => f.key === field)?.label ?? field;
        m.set(col, [...(m.get(col) ?? []), { entity: mp.entity, label, derived: mp.derived }]);
      });
    });
    return m;
  }, [sheet]);

  if (!file || !sheet) return null;

  const setOverride = (o: Override) => onChange(reanalyze(file, Math.min(sheetIndex, file.sheets.length - 1), o));
  const mappedCols = colInfo.size;

  return (
    <Modal
      open
      wide
      onClose={onClose}
      icon={<FileBadge ext={file.ext} size={36} />}
      title={file.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5"><Layers size={13} /> {file.sheets.length} sheet{file.sheets.length === 1 ? '' : 's'}</span>
          <span>{fmtSize(file.size)}</span>
          <span className="flex items-center gap-1.5"><Clock size={13} /> parsed in {file.parseMs.toFixed(0)} ms</span>
          {file.demo && <span className="chip text-[10px]">Demo file</span>}
        </span>
      }
    >
      {/* Sheet tabs */}
      {file.sheets.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 pt-3">
          {file.sheets.map((s, i) => (
            <button
              key={s.name + i}
              onClick={() => setSheetIndex(i)}
              className={`flex shrink-0 items-center gap-2 rounded-t-md border-x border-t px-4 py-2.5 text-sm transition ${i === sheetIndex ? 'border-white/10 bg-white/[0.06] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {s.primary ? <EntityDot entity={s.primary} /> : <span className="h-2 w-2 rounded-full bg-white/10" />}
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Detection summary */}
      <div className="grid gap-4 border-b border-white/10 p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center gap-4">
          <ConfidenceRing value={sheet.confidence} size={56} />
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Detected as</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{sheet.primary ? ENTITY_LABEL[sheet.primary] : 'Not recognised'}</p>
            <p className="text-xs text-[var(--text-muted)]">
              Header on row {sheet.headerRow + 1} · {sheet.body.length} data rows · {mappedCols}/{sheet.headers.length} columns mapped
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {sheet.mappings.map((m) => (
            <span key={m.entity} className="chip text-xs text-[var(--text-primary)]" style={{ borderColor: ENTITY_COLOR[m.entity] + '70', background: ENTITY_COLOR[m.entity] + '12' }}>
              <EntityDot entity={m.entity} />
              {ENTITY_LABEL[m.entity]}
              {m.derived && <span className="text-[10px] font-normal text-[var(--text-secondary)]">· extracted</span>}
            </span>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          Treat sheet as
          <select value={sheet.override} onChange={(e) => setOverride(e.target.value as Override)} className="form-input w-auto py-1.5 text-xs">
            <option value="auto">Auto-detect</option>
            <option value="faculty">Faculty</option>
            <option value="rooms">Rooms</option>
            <option value="sections">Sections</option>
            <option value="subjects">Subjects</option>
            <option value="ignore">Ignore sheet</option>
          </select>
        </label>
      </div>

      {/* Column mapping strip */}
      <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-5 py-3">
        {sheet.headers.map((h, col) => {
          const info = colInfo.get(col);
          return (
            <div key={col} className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs ${info ? 'border-white/10 bg-white/[0.03]' : 'border-dashed border-white/10 opacity-60'}`}>
              <code className="font-mono text-sky-300">{h || `Column ${col + 1}`}</code>
              <ArrowRight size={12} className="text-[var(--text-muted)]" />
              {info ? (
                info.map((x) => (
                  <span key={x.entity} className="flex items-center gap-1.5 text-[var(--text-primary)]">
                    <EntityDot entity={x.entity} /> {x.label}
                  </span>
                ))
              ) : (
                <span className="text-[var(--text-muted)]">ignored</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Spreadsheet grid */}
      <div className="max-h-[46vh] overflow-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-10 border-b border-r border-white/10 bg-[#0e1226] px-3 py-2.5 text-right font-mono text-[10px] text-[var(--text-muted)]">#</th>
              {sheet.headers.map((h, col) => {
                const info = colInfo.get(col);
                return (
                  <th key={col} className="border-b border-r border-white/10 bg-white/[0.04] px-3 py-2.5 text-left font-semibold text-[var(--text-primary)]">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      {info?.map((x) => <EntityDot key={x.entity} entity={x.entity} />)}
                      {h}
                    </span>
                    {info && <span className="mt-1 block h-0.5 rounded-full" style={{ background: ENTITY_COLOR[info[0].entity] }} />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sheet.body.slice(0, PREVIEW_ROWS).map((row, r) => (
              <tr key={r} className="hover:bg-brand-400/10">
                <td className="sticky left-0 border-b border-r border-white/10 bg-white/[0.03] px-3 py-2 text-right font-mono text-[10px] text-[var(--text-muted)]">{sheet.headerRow + r + 2}</td>
                {sheet.headers.map((_, col) => (
                  <td key={col} className={`max-w-[260px] truncate whitespace-nowrap border-b border-r border-white/10 px-3 py-2 ${colInfo.has(col) ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sheet.body.length > PREVIEW_ROWS && <p className="p-4 text-center text-xs text-[var(--text-muted)]">Showing {PREVIEW_ROWS} of {sheet.body.length} rows. Every row is imported.</p>}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5"><Rows3 size={13} /> {sheet.body.length} rows</span>
          <span className="flex items-center gap-1.5"><Columns3 size={13} /> {sheet.headers.length} columns</span>
          <span className="flex items-center gap-1.5"><Sparkles size={13} className="text-brand-300" /> Missing values are filled in during review</span>
        </p>
        <div className="flex gap-2">
          {file.demo && (
            <a href={demoUrl(file.name)} download className="btn btn-ghost">
              <Download size={16} /> Download
            </a>
          )}
          {inQueue ? (
            <>
              <button onClick={() => onRemove(file)} className="btn btn-danger">
                <Trash2 size={16} /> Remove
              </button>
              <button onClick={onClose} className="btn btn-primary">
                <CheckCircle2 size={16} /> Done
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onAdd(file);
                onClose();
              }}
              className="btn btn-primary"
            >
              <Plus size={16} /> Add to import
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
