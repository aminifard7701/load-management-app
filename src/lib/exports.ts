import { dateLabel, fa } from './jalali';

export type RecordEntry = { date: string; nissan: number; arisan: number; khavar: number; note: string };
export type WageRates = { nissan: number; arisan: number; khavar: number };

const wages = (r: RecordEntry, rates: WageRates) => r.nissan * rates.nissan + r.arisan * rates.arisan + r.khavar * rates.khavar;
const totalWages = (rows: RecordEntry[], rates: WageRates) => rows.reduce((sum, r) => sum + wages(r, rates), 0);
export const totalOf = (r: RecordEntry) => r.nissan + r.arisan + r.khavar;
export const sumRows = (rows: RecordEntry[]) => rows.reduce((sum, r) => ({
  nissan: sum.nissan + r.nissan,
  arisan: sum.arisan + r.arisan,
  khavar: sum.khavar + r.khavar,
  total: sum.total + totalOf(r)
}), { nissan: 0, arisan: 0, khavar: 0, total: 0 });

export async function saveFileWithTarget(blob: Blob, filename: string) {
  try {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const res = reader.result as string;
        const base64Data = res.split(',')[1];
        const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;

        if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          try { if (Filesystem.requestPermissions) await Filesystem.requestPermissions(); } catch (e) {}
          const folderName = 'مدیریت تخلیه بار';
          try { await Filesystem.mkdir({ path: folderName, directory: Directory.Documents, recursive: true }); } catch (e) {}
          const targetPath = `${folderName}/${filename}`;
          await Filesystem.writeFile({ path: targetPath, data: base64Data, directory: Directory.Documents });
          alert(`✅ فایل با موفقیت ذخیره شد!\n\nمکان ذخیره: مدیریت فایل ➔ پوشه اسناد (Documents) ➔ ${folderName}\nنام فایل: ${filename}`);
          return;
        }

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (nativeErr: any) {
        alert('❌ خطا در ذخیره فایل (ممکن است مجوز دسترسی به حافظه را رد کرده باشید):\n' + nativeErr.message);
      }
    };
  } catch (err: any) {
    alert('❌ خطای غیرمنتظره:\n' + err.message);
  }
}
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
 export function exportWord(rows: RecordEntry[], filename: string, rates: WageRates, titleText: string = 'گزارش تخلیه بار') {
  const totals = sumRows(rows);
  const totalCost = totalWages(rows, rates);
  const rowsHtml = rows.map((r, i) => `
    <tr style="background-color: ${i % 2 === 1 ? '#f7faf8' : '#ffffff'};">
      <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${dateLabel(r.date)}</td>
      <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(r.nissan)}</td>
      <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(r.arisan)}</td>
      <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(r.khavar)}</td>
      <td style="padding:8px;border:1px solid #b2c2be;text-align:center;"><b>${fa(totalOf(r))}</b></td>
      <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${escapeXml(r.note || '-')}</td>
      <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa((r.nissan * rates.nissan).toLocaleString('en-US'))}</td>
      <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa((r.arisan * rates.arisan).toLocaleString('en-US'))}</td>
      <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa((r.khavar * rates.khavar).toLocaleString('en-US'))}</td>
      <td style="padding:8px;border:1px solid #b2c2be;text-align:center;"><b>${fa(wages(r, rates).toLocaleString('en-US'))}</b></td>
    </tr>
  `).join('');

  const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>${escapeXml(titleText)}</title>
  <style>body { font-family: 'Tahoma', sans-serif; direction: rtl; text-align: right; padding: 20px; } h1 { color: #08795b; font-size: 18pt; margin-bottom: 5px; text-align: center; } h2 { color: #334b48; font-size: 13pt; margin-bottom: 15px; text-align: center; } .summary { background-color: #e8f5ef; border: 1px solid #08795b; padding: 12px; margin-bottom: 20px; border-radius: 6px; } table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 10pt; } th { background-color: #08795b; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #08795b; } .total-row { background-color: #eaf0ed; font-weight: bold; }</style></head>
  <body><h1>مدیریت تخلیه بار روزانه</h1><h2>${escapeXml(titleText)}</h2>
  <div class="summary"><p><b>تعداد روزهای ثبت‌شده:</b> ${fa(rows.length)} روز</p><p><b>مجموع بارهای تخلیه‌شده:</b> ${fa(totals.total)} بار</p><p><b>مجموع کل دستمزد:</b> ${fa(totalCost.toLocaleString('en-US'))} تومان</p></div>
  <table><thead><tr><th>تاریخ</th><th>نیسان</th><th>آریسان</th><th>خاور</th><th>جمع بار</th><th>توضیحات</th><th>دستمزد نیسان</th><th>دستمزد آریسان</th><th>دستمزد خاور</th><th>جمع دستمزد (تومان)</th></tr></thead>
  <tbody>${rowsHtml}<tr class="total-row"><td style="padding:8px;border:1px solid #b2c2be;text-align:center;">مجموع کل</td><td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(totals.nissan)}</td><td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(totals.arisan)}</td><td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(totals.khavar)}</td><td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(totals.total)}</td><td style="padding:8px;border:1px solid #b2c2be;text-align:center;">-</td><td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa((totals.nissan * rates.nissan).toLocaleString('en-US'))}</td><td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa((totals.arisan * rates.arisan).toLocaleString('en-US'))}</td><td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa((totals.khavar * rates.khavar).toLocaleString('en-US'))}</td><td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(totalCost.toLocaleString('en-US'))}</td></tr></tbody></table></body></html>`;
  saveFileWithTarget(new Blob(['\uFEFF', docHtml], { type: 'application/msword;charset=utf-8' }), filename + '.doc');
}

export function exportExcel(rows: RecordEntry[], filename: string, rates: WageRates) {
  const totals = sumRows(rows);
  const totalCost = totalWages(rows, rates);
  let csvContent = 'تاریخ,نیسان,آریسان,خاور,جمع کل,توضیحات,دستمزد نیسان,دستمزد آریسان,دستمزد خاور,جمع دستمزد (تومان)\n';
  rows.forEach(r => {
    const safeNote = `"${escapeXml(r.note || '-').replace(/"/g, '""')}"`;
    csvContent += `${dateLabel(r.date)},${r.nissan},${r.arisan},${r.khavar},${totalOf(r)},${safeNote},${r.nissan * rates.nissan},${r.arisan * rates.arisan},${r.khavar * rates.khavar},${wages(r, rates)}\n`;
  });
  csvContent += `مجموع کل,${totals.nissan},${totals.arisan},${totals.khavar},${totals.total},-,${totals.nissan * rates.nissan},${totals.arisan * rates.arisan},${totals.khavar * rates.khavar},${totalCost}\n`;
  saveFileWithTarget(new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8' }), filename + '.csv');
}
 async function drawReport(rows: RecordEntry[], title: string, rates: WageRates): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = Math.max(1000, 540 + rows.length * 64);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#f6f8f7'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(44, 44, w - 88, h - 88);
  ctx.fillStyle = '#08795b'; ctx.fillRect(44, 44, w - 88, 14);
  ctx.direction = 'rtl'; ctx.textAlign = 'right';
  ctx.fillStyle = '#172b2a'; ctx.font = 'bold 46px Vazirmatn, sans-serif';
  ctx.fillText('مدیریت تخلیه بار روزانه', 1100, 145);
  ctx.font = '30px Vazirmatn, sans-serif'; ctx.fillStyle = '#5e7370'; ctx.fillText(title, 1100, 207);
  ctx.font = '24px Vazirmatn, sans-serif'; ctx.fillText(`تعداد روزهای ثبت‌شده: ${fa(rows.length)}`, 1100, 255);
  const totals = sumRows(rows);
  ctx.fillStyle = '#e8f5ef'; ctx.fillRect(85, 289, 1030, 105);
  ctx.fillStyle = '#08795b'; ctx.font = 'bold 29px Vazirmatn, sans-serif';
  ctx.fillText(`مجموع کل: ${fa(totals.total)} بار`, 1065, 354);
  ctx.font = '24px Vazirmatn, sans-serif';
  ctx.fillText(`نیسان ${fa(totals.nissan)}  |  آریسان ${fa(totals.arisan)}  |  خاور ${fa(totals.khavar)}`, 670, 354);
  ctx.fillStyle = '#344b48'; ctx.font = '22px Vazirmatn, sans-serif';
  ctx.fillText(`جمع دستمزد: ${fa(totalWages(rows, rates).toLocaleString('en-US'))} تومان`, 1080, 414);
  const cols = [1080, 755, 625, 495, 365];
  ctx.fillStyle = '#eaf0ed'; ctx.fillRect(85, 435, 1030, 58);
  ctx.fillStyle = '#334b48'; ctx.font = 'bold 24px Vazirmatn, sans-serif';
  ['تاریخ', 'نیسان', 'آریسان', 'خاور', 'جمع'].forEach((label, i) => ctx.fillText(label, cols[i], 474));
  ctx.font = '23px Vazirmatn, sans-serif';
  rows.forEach((r, i) => {
    const y = 493 + i * 64;
    if (i % 2 === 1) { ctx.fillStyle = '#f7faf8'; ctx.fillRect(85, y, 1030, 64); }
    ctx.fillStyle = '#314642';
    [dateLabel(r.date), fa(r.nissan), fa(r.arisan), fa(r.khavar), fa(totalOf(r))].forEach((value, index) => ctx.fillText(value, cols[index], y + 42));
  });
  return canvas;
}

function makePdf(jpeg: Uint8Array, imageWidth: number, imageHeight: number): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const offsets = [0];
  const add = (part: string | Uint8Array) => { const bytes = typeof part === 'string' ? encoder.encode(part) : part; chunks.push(bytes); offset += bytes.length; };
  add('%PDF-1.4\n');
  const obj = (number: number, body: string) => { offsets[number] = offset; add(`${number} 0 obj\n${body}\nendobj\n`); };
  const pdfWidth = imageWidth;
  const pdfHeight = imageHeight;
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfWidth} ${pdfHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = offset;
  add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  add(jpeg); add('\nendstream\nendobj\n');
  const draw = `q\n${pdfWidth} 0 0 ${pdfHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  obj(5, `<< /Length ${encoder.encode(draw).length} >>\nstream\n${draw}endstream`);
  const xref = offset;
  add('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) add(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export async function exportImageOrPdf(rows: RecordEntry[], title: string, filename: string, type: 'jpg' | 'pdf', rates: WageRates) {
  const canvas = await drawReport(rows, title, rates);
  const data = canvas.toDataURL('image/jpeg', 0.92);
  const raw = atob(data.split(',')[1]);
  const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
  if (type === 'jpg') {
    saveFileWithTarget(new Blob([bytes], { type: 'image/jpeg' }), filename + '.jpg');
  } else {
    saveFileWithTarget(makePdf(bytes, canvas.width, canvas.height), filename + '.pdf');
  }
}

export function exportBackup(rows: RecordEntry[], rates: WageRates) {
  saveFileWithTarget(
    new Blob([JSON.stringify({ version: 2, records: rows, rates, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }), 
    'poshtiban-bar-' + Date.now() + '.json'
  );
}
// پایان فایل
