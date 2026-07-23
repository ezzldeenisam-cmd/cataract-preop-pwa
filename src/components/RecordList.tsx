import { useState } from 'react';
import { exportToPdf } from '../export';
import type { PatientRecord } from '../rules/types';

interface RecordListProps {
  records: PatientRecord[];
  onSelect: (record: PatientRecord) => void;
}

const EYE_LABELS = { R: 'Right', L: 'Left', B: 'Both' } as const;

export function RecordList({ records, onSelect }: RecordListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (records.length === 0) return null;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const selectedRecords = records.filter((record) => selectedIds.has(record.id));

  return (
    <section className="card">
      <h2>Saved Patients</h2>
      <ul className="record-list">
        {records.map((record) => (
          <li key={record.id} className="record-row">
            <input
              type="checkbox"
              checked={selectedIds.has(record.id)}
              onChange={() => toggleSelected(record.id)}
              aria-label={`Select ${record.name?.trim() || 'No name'} for export`}
            />
            <button type="button" className="record-item" onClick={() => onSelect(record)}>
              <span className="record-name">{record.name?.trim() || 'No name'}</span>
              <span className="record-meta">
                {EYE_LABELS[record.eye]} · {new Date(record.savedAt).toLocaleString('en-US')}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="export-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={selectedRecords.length === 0}
          onClick={() => exportToPdf(selectedRecords)}
        >
          Export PDF ({selectedRecords.length})
        </button>
      </div>
    </section>
  );
}
