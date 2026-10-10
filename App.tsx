import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Activity, ArchiveRestore, ArrowDownToLine, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Download, FileImage, FileSpreadsheet, FileText, Menu, Minus, Package, Plus, Search, Settings2, Trash2, Truck, X, Pencil, CircleHelp, Wallet } from 'lucide-react';
import { MONTHS, WEEKDAYS, dateLabel, daysInMonth, en, fa, fromKey, keyOf, toGregorian, todayKey } from './lib/jalali';
import { exportBackup, exportWord, exportExcel, exportImageOrPdf, sumRows, totalOf, type RecordEntry } from './lib/exports';
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
  if (year < 1300
