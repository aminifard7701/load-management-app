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
    const cap = (window as any).Capacitor;
    const isNative = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        if (!res || !res.includes(',')) {
          reject(new Error('تبدیل فایل ناموفق بود'));
          return;
        }
        resolve(res.split(',')[1]);
      };
      reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
      reader.readAsDataURL(blob);
    });

    if (isNative) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });

        const { uri } = await Filesystem.getUri({
          directory: Directory.Cache,
          path: filename
        });

        await Share.share({
          title: 'ذخیره فایل',
          text: filename,
          url: uri,
          dialogTitle: 'فایل را ذخیره یا اشتراک‌گذاری کنید'
        });
        return;
      } catch (e: any) {
        alert('خطا در ذخیره:\n' + (e?.message || String(e)));
        return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err: any) {
    alert('خطا در ذخیره فایل:\n' + (err?.message || String(err)));
  }
}

export function exportWord(rows: RecordEntry[], filename: string, rates: WageRates, titleText: string = '') {
  alert('گزینه Word فعلاً غیرفعال است. از JPG استفاده کنید.');
}

export function exportExcel(rows: RecordEntry[], filename: string, rates: WageRates) {
  alert('گزینه Excel فعلاً غیرفعال است. از JPG استفاده کنید.');
}

async function drawReport(rows: RecordEntry[], title: string, rates: WageRates): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = Math.max(800, 480 + rows.length * 56);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#f6f8f7'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(30, 30, w - 60, h - 60);
  ctx.fillStyle = '#08795b'; ctx.fillRect(30, 30, w - 60, 12);
  ctx.direction = 'rtl'; ctx.textAlign = 'right';
  ctx.fillStyle = '#172b2a'; ctx.font = 'bold 36px Vazirmatn, sans-serif';
  ctx.fillText('مدیریت تخلیه بار روزانه', 920, 110);
  ctx.font = '24px Vazirmatn, sans-serif'; ctx.fillStyle = '#5e7370'; ctx.fillText(title, 920, 155);
  ctx.font = '20px Vazirmatn, sans-serif'; ctx.fillText(`تعداد روزهای ثبت‌شده: ${fa(rows.length)}`, 920, 195);
  const totals = sumRows(rows);
  ctx.fillStyle = '#e8f5ef'; ctx.fillRect(60, 220, 880, 80);
  ctx.fillStyle = '#08795b'; ctx.font = 'bold 24px Vazirmatn, sans-serif';
  ctx.fillText(`مجموع کل: ${fa(totals.total)} بار`, 900, 270);
  ctx.font = '20px Vazirmatn, sans-serif';
  ctx.fillText(`نیسان ${fa(totals.nissan)}  |  آریسان ${fa(totals.arisan)}  |  خاور ${fa(totals.khavar)}`, 560, 270);
  ctx.fillStyle = '#344b48'; ctx.font = '18px Vazirmatn, sans-serif';
  ctx.fillText(`جمع دستمزد: ${fa(totalWages(rows, rates).toLocaleString('en-US'))} تومان`, 900, 320);
  const cols = [900, 640, 520, 400, 280];
  ctx.fillStyle = '#eaf0ed'; ctx.fillRect(60, 350, 880, 48);
  ctx.fillStyle = '#334b48'; ctx.font = 'bold 20px Vazirmatn, sans-serif';
  ['تاریخ', 'نیسان', 'آریسان', 'خاور', 'جمع'].forEach((label, i) => ctx.fillText(label, cols[i], 382));
  ctx.font = '19px Vazirmatn, sans-serif';
  rows.forEach((r, i) => {
    const y = 400 + i * 56;
    if (i % 2 === 1) { ctx.fillStyle = '#f7faf8'; ctx.fillRect(60, y, 880, 56); }
    ctx.fillStyle = '#314642';
    [dateLabel(r.date), fa(r.nissan), fa(r.arisan), fa(r.khavar), fa(totalOf(r))].forEach((value, index) => ctx.fillText(value, cols[index], y + 36));
  });
  return canvas;
}

export async function exportImageOrPdf(rows: RecordEntry[], title: string, filename: string, type: 'jpg' | 'pdf', rates: WageRates) {
  if (type === 'pdf') {
    alert('گزینه PDF فعلاً غیرفعال است. از JPG استفاده کنید.');
    return;
  }
  const canvas = await drawReport(rows, title, rates);
  const data = canvas.toDataURL('image/jpeg', 0.85);
  const raw = atob(data.split(',')[1]);
  const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
  await saveFileWithTarget(new Blob([bytes], { type: 'image/jpeg' }), filename + '.jpg');
}

export function exportBackup(rows: RecordEntry[], rates: WageRates) {
  saveFileWithTarget(
    new Blob([JSON.stringify({ version: 2, records: rows, rates, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }),
    'poshtiban-bar-' + Date.now() + '.json'
  );
}
