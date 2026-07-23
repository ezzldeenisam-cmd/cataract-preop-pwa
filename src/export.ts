import { computePlan } from './rules/computePlan';
import type { PatientRecord } from './rules/types';

const EYE_LABELS = { R: 'R', L: 'L', B: 'B' } as const;
const ARABIC_PATTERN = /[؀-ۿ]/;
const NAME_COLUMN_INDEX = 0;
const NAME_COLUMN_WIDTH = 32;
const CELL_PADDING = 2.5;
const PAGE_MARGIN = 14;

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ExportRow {
  name: string;
  eye: string;
  status: string;
  visualAcuity: string;
  lens: string;
  specialProblems: string;
  refraction: string;
  prepare: string;
}

function buildRow(record: PatientRecord): ExportRow {
  const plan = computePlan(record);
  const isReady = plan.hardStops.length === 0;

  const problems: string[] = [];
  if (record.diabetes) problems.push('Diabetic');
  if (record.anticoag) problems.push('Anticoagulant');
  if (record.htn) problems.push('Uncontrolled HTN');
  if (record.cardiac) problems.push('Cardiac');
  if (record.pseudoexfoliation) problems.push('PXF');
  if (record.prostateMedication) problems.push('Alpha-blocker (IFIS risk)');
  if (record.pupilDilation === 'poor') problems.push('Poor pupil dilation');
  if (record.macula === 'diseased') problems.push('Diseased macula');
  if (record.macula === 'unknown') problems.push('Macula unknown');

  const prepare: string[] = [];
  if (record.pseudoexfoliation) prepare.push('CTR');
  if (record.pupilDilation === 'poor' || record.prostateMedication) prepare.push('Iris hooks');

  return {
    name: record.name?.trim() || 'No name',
    eye: EYE_LABELS[record.eye],
    status: isReady ? 'Ready' : 'Not Ready',
    visualAcuity: record.visualAcuity?.trim() || '—',
    lens: record.chosenLens ?? '—',
    specialProblems: problems.join(', ') || '—',
    refraction: record.refractionImage ? 'Photo attached' : '—',
    prepare: prepare.join(', ') || '—',
  };
}

const COLUMNS: { key: keyof ExportRow; header: string }[] = [
  { key: 'name', header: 'Name' },
  { key: 'eye', header: 'Eye' },
  { key: 'status', header: 'Status' },
  { key: 'visualAcuity', header: 'VA' },
  { key: 'lens', header: 'Lens' },
  { key: 'specialProblems', header: 'Special Problems' },
  { key: 'refraction', header: 'Refraction' },
  { key: 'prepare', header: 'Prepare' },
];

function renderTextToImage(text: string, fontSizePt: number): { dataUrl: string; widthPt: number; heightPt: number } {
  const scale = 4;
  const fontPx = fontSizePt * scale;
  const canvas = document.createElement('canvas');
  const measureCtx = canvas.getContext('2d')!;
  measureCtx.font = `${fontPx}px "Segoe UI", Tahoma, Arial, sans-serif`;
  const widthPx = Math.ceil(measureCtx.measureText(text).width) + fontPx * 0.5;
  const heightPx = Math.ceil(fontPx * 1.5);

  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontPx}px "Segoe UI", Tahoma, Arial, sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillText(text, widthPx - fontPx * 0.25, heightPx / 2);

  return { dataUrl: canvas.toDataURL('image/png'), widthPt: widthPx / scale, heightPt: heightPx / scale };
}

async function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dims;
}

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return { width: width * scale, height: height * scale };
}

export async function exportToPdf(records: PatientRecord[]) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableModule.default;

  const photoFields = [
    { key: 'biometryImage', heading: 'Biometry Sheet:' },
    { key: 'refractionImage', heading: 'Refraction Sheet:' },
  ] as const;

  const imageDims = new Map<string, { width: number; height: number }>();
  await Promise.all(
    records.flatMap((record) =>
      photoFields.map(async ({ key }) => {
        const dataUrl = record[key];
        if (!dataUrl) return;
        try {
          imageDims.set(`${record.id}:${key}`, await loadImageDimensions(dataUrl));
        } catch {
          // broken image data; this photo page will just be skipped
        }
      })
    )
  );

  const doc = new jsPDF({ orientation: 'landscape' });
  const marginX = 10;

  doc.setFontSize(14);
  doc.text('Surgery Prep List', marginX, 12);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString('en-US'), marginX, 18);

  const rows = records.map(buildRow);

  autoTable(doc, {
    startY: 22,
    head: [COLUMNS.map((c) => c.header)],
    body: rows.map((row) => COLUMNS.map((c) => row[c.key])),
    styles: { fontSize: 8, cellPadding: CELL_PADDING, valign: 'middle' },
    headStyles: { fillColor: [107, 59, 255] },
    columnStyles: { [NAME_COLUMN_INDEX]: { cellWidth: NAME_COLUMN_WIDTH } },
    didParseCell: (data) => {
      if (data.section === 'body' && ARABIC_PATTERN.test(String(data.cell.raw ?? ''))) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const raw = String(data.cell.raw ?? '');
      if (!ARABIC_PATTERN.test(raw)) return;

      const { dataUrl, widthPt, heightPt } = renderTextToImage(raw, data.cell.styles.fontSize);
      const maxWidth = data.cell.width - data.cell.padding('left') - data.cell.padding('right');
      const scaleDown = widthPt > maxWidth ? maxWidth / widthPt : 1;
      const w = widthPt * scaleDown;
      const h = heightPt * scaleDown;
      const x = data.cell.x + data.cell.width - data.cell.padding('right') - w;
      const y = data.cell.y + (data.cell.height - h) / 2;
      doc.addImage(dataUrl, 'PNG', x, y, w, h);
    },
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const photoMaxWidth = pageWidth - PAGE_MARGIN * 2;
  const photoMaxHeight = pageHeight - PAGE_MARGIN * 2 - 10;

  for (const record of records) {
    for (const { key, heading } of photoFields) {
      const dataUrl = record[key];
      const dims = dataUrl ? imageDims.get(`${record.id}:${key}`) : undefined;
      if (!dataUrl || !dims) continue;

      doc.addPage();
      const name = record.name?.trim() || 'No name';

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(heading, PAGE_MARGIN, PAGE_MARGIN);

      if (ARABIC_PATTERN.test(name)) {
        const { dataUrl: nameImg, widthPt, heightPt } = renderTextToImage(name, 12);
        doc.addImage(nameImg, 'PNG', PAGE_MARGIN + 34, PAGE_MARGIN - heightPt + 3, widthPt, heightPt);
      } else {
        doc.text(name, PAGE_MARGIN + 34, PAGE_MARGIN);
      }

      const { width, height } = fitWithin(dims.width, dims.height, photoMaxWidth, photoMaxHeight);
      doc.addImage(dataUrl, 'JPEG', PAGE_MARGIN, PAGE_MARGIN + 8, width, height);
    }
  }

  doc.save(`surgery-list-${todayStamp()}.pdf`);
}
