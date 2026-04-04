import { format } from 'date-fns';
import type { SectionKey, CaseExportData, ReportStyle } from '../types';

export function generateCaseWord(
  title: string,
  selected: SectionKey[],
  d: CaseExportData,
  reportStyle: ReportStyle,
  filename: string
): Blob {
  const isClinical = reportStyle === 'clinical';

  // ── HELPERS ──────────────────────────────────────────────────────────────
  const sec = (label: string, color?: string): string => isClinical
    ? '<div style="margin:24px 0 10px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
      + '<div style="width:4px;height:16px;background:' + color + ';border-radius:2px;display:inline-block;"></div>'
      + '<span style="font-size:11pt;font-weight:bold;color:' + color + ';letter-spacing:0.05em;">' + label + '</span></div>'
    : '<div style="margin-top:32px;margin-bottom:12px;">'
      + '<div style="font-size:18pt;font-weight:bold;color:#1F2937;padding-bottom:6px;border-bottom:1px solid #E5E7EB;">' + label + '</div></div>';

  const frow = (label: string, value: string, zebra?: boolean, bold?: boolean): string => isClinical
    ? '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:0.5px solid #E2E8F0;">'
      + '<span style="color:#94A3B8;font-size:10pt;">' + label + '</span>'
      + '<span style="color:#1A2332;font-weight:bold;font-size:10pt;">' + (value || '-') + '</span></div>'
    : '<tr style="background:' + (zebra ? '#F3F4F6' : 'white') + ';">'
      + '<td style="padding:8px;border:1px solid #E5E7EB;color:#6B7280;font-size:11pt;width:45%;">' + label + '</td>'
      + '<td style="padding:8px;border:1px solid #E5E7EB;color:#1F2937;font-size:11pt;font-weight:' + (bold ? 'bold' : 'normal') + ';">' + (value || '-') + '</td></tr>';

  const tblOpen = () => isClinical
    ? '<div style="background:#F8FAFC;border-radius:8px;padding:10px 12px;">'
    : '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">';

  const tblClose = () => isClinical ? '</div></div>' : '</table></div>';

  const sub = (label: string) =>
    '<div style="font-size:' + (isClinical ? '12' : '16') + 'pt;font-weight:bold;color:#1F2937;margin-bottom:' + (isClinical ? '6' : '8') + 'px;">' + label + '</div>';

  let body = '';

  // ── HEADER ────────────────────────────────────────────────────────────────
  if (isClinical) {
    body += '<div style="background:#1849A9;padding:20px;margin-bottom:0;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
      + '<div style="display:flex;align-items:center;gap:10px;">'
      + '<div style="width:34px;height:34px;background:white;border-radius:8px;text-align:center;line-height:34px;font-size:18pt;font-weight:bold;color:#1849A9;">M</div>'
      + '<div><div style="font-size:16pt;font-weight:bold;color:white;">Medora</div>'
      + '<div style="font-size:8pt;color:#93C5FD;">MEDICAL LOGBOOK</div></div></div>'
      + '<div style="text-align:right;color:#93C5FD;font-size:10pt;">Case Report<br>' + format(new Date(), 'dd MMM yyyy') + '</div></div>'
      + '<div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;">'
      + '<div style="font-size:14pt;font-weight:bold;color:white;">' + (d.patient?.name ?? title) + '</div>'
      + '<div style="font-size:10pt;color:#93C5FD;">' + (d.patient?.gender ?? '') + '</div></div></div>';
  } else {
    body += '<div style="margin-bottom:24px;">'
      + '<div style="font-size:24pt;font-weight:bold;color:#1F2937;margin-bottom:4px;">Case Report</div>'
      + '<div style="font-size:20pt;font-weight:bold;color:#1F2937;margin-bottom:16px;">' + (d.patient?.name ?? title) + '</div>'
      + '<hr style="border:none;border-top:1px solid #E5E7EB;margin:0;"></div>';
  }

  // ── PATIENT INFO ──────────────────────────────────────────────────────────
  if (selected.includes('info') && d.patient) {
    body += sec('PATIENT INFORMATION', '#1849A9');
    body += tblOpen();
    if (!isClinical) body += frow('Name', d.patient.name, true, true);
    body += frow('Hospital',      d.patient.hospital || '-',    isClinical ? false : false);
    body += frow('Date of Birth', d.patient.dob,                isClinical ? false : true);
    body += frow('Admission',     d.patient.admissionDate,      isClinical ? false : false);
    body += frow('Gender',        d.patient.gender,             isClinical ? false : true);
    body += frow('File Number',   d.patient.fileNumber || '-',  isClinical ? false : false);
    if (d.patient.dischargeDate)
      body += frow('Discharge', d.patient.dischargeDate + ' — ' + (d.patient.outcome || ''), isClinical ? false : true);
    body += tblClose();
  }

  // ── CLASSIFICATION ────────────────────────────────────────────────────────
  if (selected.includes('classification') && d.classification) {
    body += sec('CLASSIFICATION', '#7C3AED');
    body += tblOpen();
    body += frow('Specialty',       d.classification.specialty,      false);
    body += frow('Chief Complaint', d.classification.chiefComplaint, isClinical ? false : true);
    body += frow('Provisional Dx',  d.classification.provisional,    isClinical ? false : false);
    body += frow('Final Dx',        d.classification.final,          isClinical ? false : true, true);
    body += tblClose();
  }

  // ── HISTORY ───────────────────────────────────────────────────────────────
  if (selected.includes('history') && d.history) {
    body += sec('PATIENT HISTORY', '#0891B2');
    body += '<div style="' + (isClinical ? 'background:#F8FAFC;border-radius:8px;padding:10px 12px;">' : 'margin-bottom:20px;">');
    [
      { l: 'Chief Complaint',      v: d.history.chiefComplaint  },
      { l: 'Present History',      v: d.history.presentHistory  },
      { l: 'Past Medical History', v: d.history.pastHistory     },
      { l: 'Allergies',            v: d.history.allergies       },
      { l: 'Medications',          v: d.history.medications     },
    ].filter(f => f.v).forEach(f => {
      body += '<div style="margin-bottom:8px;">'
        + '<span style="font-size:11pt;font-weight:bold;color:#1F2937;">' + f.l + ': </span>'
        + '<span style="font-size:11pt;color:#374151;">' + f.v + '</span></div>';
    });
    body += '</div></div>';
  }

  // ── INVESTIGATIONS ────────────────────────────────────────────────────────
  if (selected.includes('investigations') && d.investigations?.length) {
    body += sec('INVESTIGATIONS', '#0891B2');
    body += '<div>';
    d.investigations.forEach((inv, i) => {
      const typeLabel = inv.type === 'lab' ? 'Lab' : inv.type === 'imaging' ? 'Imaging' : 'Other';
      const badgeBg = inv.type === 'lab' ? '#DBEAFE' : inv.type === 'imaging' ? '#EDE9FE' : '#CFFAFE';
      const badgeColor = inv.type === 'lab' ? '#1849A9' : inv.type === 'imaging' ? '#7C3AED' : '#0891B2';
      const imgHtml = (inv.images ?? []).filter((img: string) => img.startsWith('data:'))
        .map((img: string) => '<img src="' + img + '" style="width:300px;height:300px;object-fit:contain;display:block;margin-top:8px;border:1px solid #E5E7EB;border-radius:6px;">')
        .join('');

      if (isClinical) {
        body += '<div style="background:#F8FAFC;border-radius:8px;padding:10px 12px;margin-bottom:8px;">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">'
          + '<span style="font-size:12pt;font-weight:bold;color:#1F2937;">' + inv.name + '</span>'
          + '<span style="font-size:9pt;background:' + badgeBg + ';color:' + badgeColor + ';padding:2px 8px;border-radius:20px;font-weight:bold;">' + typeLabel + '</span></div>'
          + '<div style="font-size:9pt;color:#94A3B8;margin-bottom:4px;">' + inv.date + '</div>'
          + (inv.result ? '<div style="font-size:11pt;color:#334155;">' + inv.result + '</div>' : '')
          + imgHtml + '</div>';
      } else {
        body += '<div style="margin-bottom:16px;">'
          + '<div style="font-size:11pt;color:#374151;margin-bottom:4px;">' + typeLabel + ' · ' + inv.date + '</div>'
          + '<div style="font-size:16pt;font-weight:600;color:#1F2937;margin-bottom:6px;">' + inv.name + '</div>'
          + (inv.result ? '<div style="font-size:12pt;color:#1F2937;margin-bottom:6px;">' + inv.result + '</div>' : '')
          + imgHtml + '</div>';
        if (i < d.investigations!.length - 1)
          body += '<hr style="border:none;border-top:0.5px solid #F1F5F9;margin:8px 0;">';
      }
    });
    body += '</div>';
  }

  // ── MANAGEMENT ────────────────────────────────────────────────────────────
  if (selected.includes('management') && d.management?.length) {
    body += sec('MANAGEMENT', '#E11D48');
    body += '<div>';
    d.management.forEach((m, i) => {
      if (isClinical) {
        body += '<div style="background:#F8FAFC;border-radius:8px;padding:10px 12px;margin-bottom:8px;">'
          + '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">'
          + '<span style="font-size:12pt;font-weight:bold;color:#1F2937;">' + m.type + '</span>'
          + '<span style="font-size:9pt;color:#94A3B8;">' + m.date + '</span></div>'
          + (m.content ? '<div style="font-size:11pt;color:#334155;">'
            + m.content.split('\n').map((l: string, idx: number) => (idx + 1) + '. ' + l).join('<br>') + '</div>' : '')
          + (m.mode ? '<span style="font-size:11pt;background:#DBEAFE;color:#1849A9;padding:2px 10px;border-radius:20px;">' + m.mode + '</span>'
            + (m.details ? '<span style="font-size:11pt;color:#334155;margin-left:8px;">' + m.details + '</span>' : '') : '')
          + '</div>';
      } else {
        body += '<div style="margin-bottom:16px;">'
          + sub(m.type)
          + '<div style="font-size:11pt;color:#374151;margin-bottom:6px;">' + m.date + '</div>'
          + (m.content ? '<div style="font-size:12pt;color:#1F2937;line-height:1.8;">'
            + m.content.split('\n').map((l: string, idx: number) => (idx + 1) + '. ' + l).join('<br>') + '</div>' : '')
          + (m.mode ? '<div style="font-size:12pt;color:#1F2937;">' + m.mode + (m.details ? ' — ' + m.details : '') + '</div>' : '')
          + '</div>';
        if (i < d.management!.length - 1)
          body += '<hr style="border:none;border-top:0.5px solid #F1F5F9;margin:8px 0;">';
      }
    });
    body += '</div>';
  }

  // ── PROGRESS NOTES ────────────────────────────────────────────────────────
  if (selected.includes('progress') && d.progressNotes?.length) {
    body += sec('PROGRESS NOTES', '#16A34A');
    body += '<div>';
    d.progressNotes.forEach((n, i) => {
      const vitals = [
        n.hr    && 'HR: '   + n.hr,
        n.temp  && 'T: '    + n.temp + '\u00b0C',
        n.spo2  && 'SpO\u2082: ' + n.spo2 + '%',
        n.rr    && 'RR: '   + n.rr,
        n.bp    && 'BP: '   + n.bp,
        n.weight && 'Wt: '  + n.weight + 'kg',
      ].filter(Boolean).join('  \u00b7  ');

      if (isClinical) {
        body += '<div style="background:#F8FAFC;border-radius:8px;padding:9px 12px;margin-bottom:8px;">'
          + '<div style="font-size:12pt;font-weight:bold;color:#1F2937;margin-bottom:3px;">' + n.date + '</div>'
          + (vitals ? '<div style="font-size:10pt;color:#64748B;margin-bottom:4px;">' + vitals + '</div>' : '')
          + (n.assessment ? '<div style="font-size:11pt;color:#334155;">' + n.assessment + '</div>' : '')
          + '</div>';
      } else {
        body += '<div style="margin-bottom:10px;">'
          + sub(n.date)
          + (vitals ? '<div style="font-size:11pt;color:#374151;margin-bottom:4px;">' + vitals + '</div>' : '')
          + (n.assessment ? '<div style="font-size:12pt;color:#1F2937;">' + n.assessment + '</div>' : '')
          + '</div>';
        if (i < d.progressNotes!.length - 1)
          body += '<hr style="border:none;border-top:0.5px solid #F1F5F9;margin:8px 0;">';
      }
    });
    body += '</div>';
  }

  // ── PROGNOSIS ─────────────────────────────────────────────────────────────
  if (d.patient?.dischargeDate) {
    body += sec('PROGNOSIS', '#D97706');
    if (isClinical) {
      body += '<div style="background:#FFFBEB;border:0.5px solid #FDE68A;border-radius:8px;padding:12px 14px;">'
        + '<div style="font-size:13pt;font-weight:bold;color:#92400E;">' + (d.patient.outcome || 'Discharged') + '</div>'
        + '<div style="font-size:10pt;color:#94A3B8;margin-top:2px;">Discharge: ' + d.patient.dischargeDate + '</div>'
        + '</div></div>';
    } else {
      body += tblOpen();
      body += frow('Outcome',        d.patient.outcome || 'Discharged', true,  true);
      body += frow('Discharge Date', d.patient.dischargeDate,           false);
      body += tblClose();
    }
  }

  // ── GENERATE HTML ─────────────────────────────────────────────────────────
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">'
    + '<head><meta charset="utf-8"><title>' + title + '</title>'
    + '<style>body { font-family: Arial, sans-serif; margin: 40px; color: #1F2937; } @page { margin: 2cm; }</style>'
    + '</head><body>' + body
    + '<div style="border-top:1px solid #E5E7EB;margin-top:40px;padding-top:12px;text-align:center;font-size:10pt;color:#9CA3AF;">'
    + 'Generated by Medora \u00b7 Confidential \u2014 Medical use only'
    + '</div></body></html>';

  return new Blob([html], { type: 'application/msword' });
}
