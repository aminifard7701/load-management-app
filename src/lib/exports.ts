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

// سیستم امن ذخیره فایل بدون کرش کردن
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
          
          // تلاش برای گرفتن مجوز دسترسی به حافظه برای جلوگیری از کرش
          try {
            if (Filesystem.requestPermissions) {
              await Filesystem.requestPermissions();
            }
          } catch (e) {}

          const folderName = 'مدیریت تخلیه بار';
          
          try {
            await Filesystem.mkdir({
              path: folderName,
              directory: Directory.Documents,
              recursive: true
            });
          } catch (e) {}

          const targetPath = `${folderName}/${filename}`;
          
          await Filesystem.writeFile({
            path: targetPath,
            data: base64Data,
            directory: Directory.Documents
          });

          // نمایش پیام موفقیت آمیز به جای باز کردن منوی اشتراک که باعث کرش میشد
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
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>${escapeXml(titleText)}</title>
    <style>
      body { font-family: 'Tahoma', sans-serif; direction: rtl; text-align: right; padding: 20px; }
      h1 { color: #08795b; font-size: 18pt; margin-bottom: 5px; text-align: center; }
      h2 { color: #334b48; font-size: 13pt; margin-bottom: 15px; text-align: center; }
      .summary { background-color: #e8f5ef; border: 1px solid #08795b; padding: 12px; margin-bottom: 20px; border-radius: 6px; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 10pt; }
      th { background-color: #08795b; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #08795b; }
      .total-row { background-color: #eaf0ed; font-weight: bold; }
    </style>
  </head>
  <body>
    <h1>مدیریت تخلیه بار روزانه</h1>
    <h2>${escapeXml(titleText)}</h2>
    <div class="summary">
      <p><b>تعداد روزهای ثبت‌شده:</b> ${fa(rows.length)} روز</p>
      <p><b>مجموع بارهای تخلیه‌شده:</b> ${fa(totals.total)} بار</p>
      <p><b>مجموع کل دستمزد:</b> ${fa(totalCost.toLocaleString('en-US'))} تومان</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>تاریخ</th><th>نیسان</th><th>آریسان</th><th>خاور</th><th>جمع بار</th><th>توضیحات</th>
          <th>دستمزد نیسان</th><th>دستمزد آریسان</th><th>دستمزد خاور</th><th>جمع دستمزد (تومان)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="total-row">
          <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">مجموع کل</td>
          <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(totals.nissan)}</td>
          <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(totals.arisan)}</td>
          <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(totals.khavar)}</td>
          <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(totals.total)}</td>
          <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">-</td>
          <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa((totals.nissan * rates.nissan).toLocaleString('en-US'))}</td>
          <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa((totals.arisan * rates.arisan).toLocaleString('en-US'))}</td>
          <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa((totals.khavar * rates.khavar).toLocaleString('en-US'))}</td>
          <td style="padding:8px;border:1px solid #b2c2be;text-align:center;">${fa(totalCost.toLocaleString('en-US'))}</td>
        </tr>
      </tbody>
    </table>
  </body></html>`;

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
  csvContent += `مجموع کل,${totals.nissan},${totals.
