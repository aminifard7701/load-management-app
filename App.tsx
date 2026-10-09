import {
  exportBackup,
  exportWord,
  exportExcel,
  exportImageOrPdf,
  sumRows,
  totalOf,
  type RecordEntry
} from './lib/exports';
import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileCheck,
  // سایر آیکون‌ها
} from 'lucide-react';
const [saveFolderPath, setSaveFolderPath] = useState<string>(() => {
  return localStorage.getItem('custom_save_path') || 'تخلیه بار';
});
const [backupFolderPath, setBackupFolderPath] = useState<string>(() => {
  return localStorage.getItem('custom_backup_path') || 'تخلیه بار/نسخه پشتیبان';
});
const download = async (format: 'word' | 'excel' | 'pdf' | 'jpg', scope: 'month' | 'year' | 'daily') => {
  const rows = scope === 'month' ? monthRecords : scope === 'year' ? yearRecords : sortedRecords;
  if (rows.length === 0) {
    setNotice('رکوردی برای دریافت خروجی وجود ندارد.');
    return;
  }
  const reportTitle = `${fa(monthName(reportMonth))} ${fa(reportYear)}`;
  const title = scope === 'month'
    ? `گزارش ماهانه · ${reportTitle}`
    : scope === 'year'
    ? `گزارش سالانه · ${fa(reportYear)}`
    : 'گزارش سوابق روزانه';

  const filename = scope === 'month'
    ? `gozaresh-mahane-${reportYear}-${reportMonth}`
    : scope === 'year'
    ? `gozaresh-salane-${reportYear}`
    : 'gozaresh-roozane';

  try {
    setBusyExport(true);
    if (format === 'word') {
      exportWord(rows, filename, rates, saveFolderPath, title);
    } else if (format === 'excel') {
      exportExcel(rows, filename, rates, saveFolderPath);
    } else {
      await exportImageOrPdf(rows, title, filename, format, rates, saveFolderPath);
    }
    setNotice(`فایل با موفقیت در پوشه "${saveFolderPath}" ذخیره شد.`);
  } catch {
    setNotice('خطا در دریافت خروجی.');
  } finally {
    setBusyExport(false);
  }
};
const exportButtons = (scope: 'daily' | 'month' | 'year') => (
  <div className="export-grid" data-testid={`export-options-${scope}`}>
    <button
      type="button"
      className="export-button"
      disabled={busyExport}
      onClick={() => download('word', scope)}
    >
      <FileText size={19} /> Word
    </button>
    <button
      type="button"
      className="export-button"
      disabled={busyExport}
      onClick={() => download('excel', scope)}
    >
      <FileSpreadsheet size={19} /> Excel
    </button>
    <button
      type="button"
      className="export-button"
      disabled={busyExport}
      onClick={() => download('pdf', scope)}
    >
      <FileCheck size={19} /> PDF
    </button>
    <button
      type="button"
      className="export-button"
      disabled={busyExport}
      onClick={() => download('jpg', scope)}
    >
      <FileCheck size={19} /> JPG
    </button>
  </div>
);
{/* پنل تنظیم مسیر ذخیره فایل‌ها */}
<section className="panel">
  <div className="panel-title">
    <Folder size={22} />
    <h2>تنظیم مسیر ذخیره‌سازی فایل‌های خروجی</h2>
  </div>
  <p style={{ fontSize: '13px', color: '#556b67', marginBottom: '12px' }}>
    فایل‌های Word، Excel، PDF و JPG به صورت پیش‌فرض در پوشه <b>«تخلیه بار»</b> ذخیره می‌شوند. می‌توانید نام پوشه یا مسیر دلخواه خود را تعیین کنید:
  </p>
  <div style={{ display: 'flex', gap: '8px' }}>
    <input
      type="text"
      className="input-field"
      value={saveFolderPath}
      placeholder="مثلاً: تخلیه بار یا باربری/فایل‌ها"
      onChange={(e) => {
        setSaveFolderPath(e.target.value);
        localStorage.setItem('custom_save_path', e.target.value);
      }}
    />
    <button
      type="button"
      className="primary-button"
      onClick={() => {
        setSaveFolderPath('تخلیه بار');
        localStorage.setItem('custom_save_path', 'تخلیه بار');
        setNotice('مسیر ذخیره به پیش‌فرض (تخلیه بار) بازگردانده شد.');
      }}
    >
      پیش‌فرض
    </button>
  </div>
</section>

{/* پنل تهیه نسخه پشتیبان با مسیر دستی */}
<section className="panel backup-panel">
  <div>
    <ArrowDownToLine size={25} />
  </div>
  <h2>تهیه نسخه پشتیبان</h2>
  <div style={{ width: '100%', marginBottom: '12px' }}>
    <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#334b48' }}>
      مسیر ذخیره فایل پشتیبان:
    </label>
    <input
      type="text"
      className="input-field"
      value={backupFolderPath}
      placeholder="مسیر پوشه نسخه پشتیبان..."
      onChange={(e) => {
        setBackupFolderPath(e.target.value);
        localStorage.setItem('custom_backup_path', e.target.value);
      }}
    />
  </div>
  <button
    className="primary-button"
    data-testid="backup-download"
    onClick={() => {
      exportBackup(records, rates, backupFolderPath);
      setNotice(`نسخه پشتیبان در مسیر "${backupFolderPath}" ایجاد شد.`);
    }}
  >
    <ArrowDownToLine size={19} /> دریافت پشتیبان
  </button>
</section>
