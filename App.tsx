import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Activity, ArchiveRestore, ArrowDownToLine, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Download, FileImage, FileSpreadsheet, FileText, Menu, Minus, Package, Plus, Search, Settings2, Trash2, Truck, X, Pencil, Database, CircleHelp, Moon, Sun, Wallet } from 'lucide-react';
import { MONTHS, WEEKDAYS, dateLabel, daysInMonth, en, fa, fromKey, keyOf, toGregorian, todayKey } from './lib/jalali';
import { exportBackup, exportCsv, exportExcel, exportImageOrPdf, sumRows, totalOf, type RecordEntry } from './lib/exports';
import { App as CapApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';

type Tab = 'home' | 'entry' | 'records' | 'reports' | 'settings';
type Vehicle = 'nissan' | 'arisan' | 'khavar';
const VEHICLES: { key: Vehicle; label: string; short: string; color: string }[] = [
  { key: 'nissan', label: 'نیسان', short: 'ن', color: '#087f62' },
  { key: 'arisan', label: 'آریسان', short: 'آ', color: '#4888bb' },
  { key: 'khavar', label: 'خاور', short: 'خ', color: '#bd8a4e' },
];
const STORAGE_KEY = 'daily-unloading-records-v1';
const RATES_KEY = 'daily-unloading-rates-v1';
const THEME_KEY = 'daily-unloading-theme-v1';
type Rates = Record<Vehicle, number>;
const defaultRates = (): Rates => ({ nissan: 0, arisan: 0, khavar: 0 });
const validRates = (value: unknown): value is Rates => !!value && typeof value === 'object' && VEHICLES.every(v => Number.isSafeInteger((value as Record<string, unknown>)[v.key]) && (value as Rates)[v.key] >= 0 && (value as Rates)[v.key] <= 999999999);
const loadRates = (): Rates => { try { const value: unknown = JSON.parse(localStorage.getItem(RATES_KEY) || 'null'); return validRates(value) ? value : defaultRates(); } catch { return defaultRates(); } };
const money = (value: number) => `${fa(value.toLocaleString('en-US'))} تومان`;
const isValidRecord = (r: unknown): r is RecordEntry => {
  if (!r || typeof r !== 'object') return false;
  const x = r as Record<string, unknown>;
  if (typeof x.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.date) || typeof x.note !== 'string') return false;
  const { year, month, day } = fromKey(x.date);
  if (year < 1300 || year > 1500 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return false;
  return VEHICLES.every(v => Number.isSafeInteger(x[v.key]) && (x[v.key] as number) >= 0 && (x[v.key] as number) <= 999999);
};
const loadRecords = (): RecordEntry[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter(isValidRecord).sort((a: RecordEntry, b: RecordEntry) => b.date.localeCompare(a.date));
  } catch { return []; }
};
const emptyCounts = () => ({ nissan: '0', arisan: '0', khavar: '0' });

function App() {
  const today = todayKey();
  const current = fromKey(today);
  const [records, setRecords] = useState<RecordEntry[]>(loadRecords);
  const [rates, setRates] = useState<Rates>(loadRates);
  const [rateInputs, setRateInputs] = useState<Record<Vehicle, string>>(() => { const loaded = loadRates(); return { nissan: String(loaded.nissan), arisan: String(loaded.arisan), khavar: String(loaded.khavar) }; });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => { try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } });
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); document.documentElement.style.colorScheme = theme; try { localStorage.setItem(THEME_KEY, theme); } catch { /* Appearance still works for this session. */ } }, [theme]);
  const [tab, setTab] = useState<Tab>('home');
  const tabRef = useRef<Tab>('home');
  const [formDate, setFormDate] = useState(today);
  const [counts, setCounts] = useState<Record<Vehicle, string>>(emptyCounts);
  const [note, setNote] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState({ year: current.year, month: current.month });
  const [deleteDate, setDeleteDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reportYear, setReportYear] = useState(current.year);
  const [reportMonth, setReportMonth] = useState(current.month);
  const [notice, setNotice] = useState('');
  const [busyExport, setBusyExport] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  
  const stateRef = useRef({ calendarOpen, deleteDate, restoreOpen, menuOpen, exitOpen });
  useEffect(() => { stateRef.current = { calendarOpen, deleteDate, restoreOpen, menuOpen, exitOpen }; }, [calendarOpen, deleteDate, restoreOpen, menuOpen, exitOpen]);

  useEffect(() => {
    window.history.replaceState({ unloadingScreen: 'home' }, '');
    
    // مخفی کردن نوار وضعیت گوشی
    const hideBars = async () => {
      try { await StatusBar.hide(); } catch (e) {}
    };
    hideBars();

    // مدیریت دکمه برگشت گوشی بومی اندروید
    const setupCapacitor = async () => {
      try {
        await CapApp.addListener('backButton', () => {
          const s = stateRef.current;
          if (tabRef.current !== 'home') {
            navigate('home');
          } else if (s.calendarOpen || s.deleteDate || s.restoreOpen || s.menuOpen) {
            setCalendarOpen(false); setDeleteDate(null); setRestoreOpen(false); setMenuOpen(false);
          } else if (s.exitOpen) {
            setExitOpen(false);
            CapApp.exitApp();
          } else {
            setExitOpen(true);
          }
        });
      } catch(e) {}
    };
    setupCapacitor();

    // بکاپ برای مرورگر
    const onBack = () => {
      if (tabRef.current === 'home') {
        setExitOpen(true);
        window.history.pushState({ unloadingScreen: 'home' }, '');
        return;
      }
      tabRef.current = 'home';
      setTab('home');
      setCalendarOpen(false);
      setDeleteDate(null);
      setRestoreOpen(false);
      setMenuOpen(false);
      setNotice('');
      window.history.replaceState({ unloadingScreen: 'home' }, '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', onBack);
    return () => {
      window.removeEventListener('popstate', onBack);
      try { CapApp.removeAllListeners(); } catch(e) {}
    };
  }, []);

  const saveRecords = (next: RecordEntry[]) => {
    const sorted = [...next].sort((a, b) => b.date.localeCompare(a.date));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted)); setRecords(sorted); return true; }
    catch { setNotice('ذخیره اطلاعات روی این دستگاه ممکن نشد. فضای ذخیره‌سازی را بررسی کنید.'); return false; }
  };
  const monthRows = useMemo(() => records.filter(r => { const d = fromKey(r.date); return d.year === reportYear && d.month === reportMonth; }), [records, reportYear, reportMonth]);
  const yearRows = useMemo(() => records.filter(r => fromKey(r.date).year === reportYear), [records, reportYear]);
  const currentMonthRows = useMemo(() => records.filter(r => { const d = fromKey(r.date); return d.year === current.year && d.month === current.month; }), [records, current.year, current.month]);
  
  // محاسبه بارهای این هفته
  const currentWeekRows = useMemo(() => {
    const now = toGregorian({ year: current.year, month: current.month, day: current.day });
    now.setHours(0, 0, 0, 0);
    const currentJalaliDay = (now.getDay() + 1) % 7; 
    const startMs = now.getTime() - (currentJalaliDay * 24 * 3600 * 1000);
    const endMs = startMs + (6 * 24 * 3600 * 1000);
    
    return records.filter(r => {
      const d = fromKey(r.date);
      const g = toGregorian({ year: d.year, month: d.month, day: d.day });
      g.setHours(0, 0, 0, 0);
      return g.getTime() >= startMs && g.getTime() <= endMs;
    });
  }, [records, current.year, current.month, current.day]);

  const monthSums = sumRows(monthRows);
  const yearSums = sumRows(yearRows);
  const currentSums = sumRows(currentMonthRows);
  const weekSums = sumRows(currentWeekRows);
  const allSums = sumRows(records);
  
  const costFor = (sums: ReturnType<typeof sumRows>) => VEHICLES.reduce((sum, v) => sum + sums[v.key] * rates[v.key], 0);
  const setRate = (vehicle: Vehicle, value: string) => {
    const cleaned = en(value).replace(/[^0-9]/g, '').slice(0, 9);
    setRateInputs(previous => ({ ...previous, [vehicle]: cleaned }));
    const next = { ...rates, [vehicle]: Number(cleaned || 0) };
    try { localStorage.setItem(RATES_KEY, JSON.stringify(next)); setRates(next); }
    catch { setNotice('ذخیره دستمزدها روی این دستگاه ممکن نشد. فضای ذخیره‌سازی را بررسی کنید.'); }
  };
  const todayRecord = records.find(r => r.date === today);
  const editing = records.some(r => r.date === formDate);
  const filtered = useMemo(() => {
    const q = en(search.trim());
    return records.filter(r => !q || r.date.includes(q) || dateLabel(r.date).includes(search.trim()) || r.note.includes(search.trim()));
  }, [records, search]);
  const earliestYear = Math.max(1300, Math.min(current.year - 5, reportYear, ...records.map(r => fromKey(r.date).year)));
  const latestYear = Math.min(1500, Math.max(current.year + 2, reportYear, ...records.map(r => fromKey(r.date).year)));
  const yearOptions = Array.from({ length: latestYear - earliestYear + 1 }, (_, i) => latestYear - i);

  const selectDate = (key: string) => {
    const existing = records.find(r => r.date === key);
    setFormDate(key);
    setCounts(existing ? { nissan: String(existing.nissan), arisan: String(existing.arisan), khavar: String(existing.khavar) } : emptyCounts());
    setNote(existing?.note ?? '');
    setCalendarOpen(false);
    setNotice('');
  };
  const editRecord = (r: RecordEntry) => {
    selectDate(r.date);
    navigate('entry');
  };
  const updateCount = (vehicle: Vehicle, value: string) => {
    const cleaned = en(value).replace(/[^0-9]/g, '').slice(0, 6);
    setCounts(previous => ({ ...previous, [vehicle]: cleaned }));
  };
  const changeCount = (vehicle: Vehicle, delta: number) => updateCount(vehicle, String(Math.max(0, Math.min(999999, Number(counts[vehicle] || 0) + delta))));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (VEHICLES.some(v => counts[v.key] === '' || !Number.isSafeInteger(Number(counts[v.key])) || Number(counts[v.key]) < 0)) {
      setNotice('تعداد هر خودرو باید یک عدد صحیح و غیرمنفی باشد.'); return;
    }
    const entry: RecordEntry = { date: formDate, nissan: Number(counts.nissan), arisan: Number(counts.arisan), khavar: Number(counts.khavar), note: note.trim().slice(0, 500) };
    const wasEditing = editing;
    if (saveRecords([...records.filter(r => r.date !== formDate), entry])) setNotice(wasEditing ? 'اطلاعات این روز به‌روزرسانی شد.' : 'بارهای این روز با موفقیت ثبت شد.');
  };
  const deleteRecord = () => {
    if (!deleteDate) return;
    if (saveRecords(records.filter(r => r.date !== deleteDate))) {
      if (formDate === deleteDate) { setCounts(emptyCounts()); setNote(''); }
      setNotice('رکورد انتخاب‌شده حذف شد.');
    }
    setDeleteDate(null);
  };
  const moveCalendar = (delta: number) => {
    
