import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Database, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { specSuffix } from '../data/filmSpecs';
import FilmEditor from './FilmEditor';
import { useDialog } from './dialogContext';

const defaultSpecLabels = [
  'Solar Heat Gain Coefficient (SHGC)',
  'Nominal Thickness',
  'Infrared Rejected (IRR)',
  'UV Rejection (UVR)',
  'Total Solar Energy Rejected (T-SER)',
  'Visible Light Transmittance (VLT)',
  'Visible light reflectance (INT)',
  'Visible light reflectance (EXT)',
  'Construction',
];

const preferredSpecOrder = [
  'shgc',
  'nominal thickness',
  'irr',
  'uvr',
  't-ser',
  'vlt',
  'visible light reflectance (int)',
  'visible light reflectance (ext)',
  'construction',
];

function normalizedSpecKey(label) {
  return String(label ?? '').trim().toLowerCase();
}

function isWarrantyKey(label) {
  const normalized = normalizedSpecKey(label);
  return normalized.includes('warranty') || normalized.includes('รับประกัน');
}

function warrantyValue(film) {
  const directValue = String(film.warranty ?? '').trim();
  if (directValue) return directValue;

  const warrantyEntry = Object.entries(film.specs || {})
    .find(([label]) => isWarrantyKey(label));
  return String(warrantyEntry?.[1] ?? '').trim();
}

function displayWarranty(film) {
  const value = warrantyValue(film);
  if (!value || value === '00') return '-';
  return /^\d+(?:\.\d+)?$/.test(value) ? `${value} ปี` : value;
}

function specRank(label) {
  const normalized = normalizedSpecKey(label);
  const index = preferredSpecOrder.findIndex((key) => normalized === key || normalized.includes(`(${key})`));
  return index === -1 ? preferredSpecOrder.length : index;
}

export default function FilmSpecTable({ database, setDatabase, onBack }) {
  const { confirm } = useDialog();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [status, setStatus] = useState('');

  const specColumns = useMemo(() => {
    const labels = new Map();

    database.forEach((film) => {
      Object.keys(film.specs || {}).forEach((label) => {
        const normalized = normalizedSpecKey(label);
        if (normalized && !isWarrantyKey(label) && !labels.has(normalized)) labels.set(normalized, label.trim());
      });
    });

    return Array.from(labels, ([key, label]) => ({ key, label }))
      .sort((a, b) => specRank(a.label) - specRank(b.label));
  }, [database]);

  const filteredFilms = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('th');
    if (!term) return database;

    return database.filter((film) => {
      const specText = Object.entries(film.specs || {})
        .map(([label, value]) => `${label} ${value}`)
        .join(' ');
      return `${film.brand} ${film.series} ${film.model} ${warrantyValue(film)} ${specText}`
        .toLocaleLowerCase('th')
        .includes(term);
    });
  }, [database, search]);

  const openEditor = (film = null) => {
    setStatus('');
    setEditor({
      film,
      columns: specColumns.length ? specColumns : defaultSpecLabels.map((label) => ({ key: normalizedSpecKey(label), label })),
    });
  };

  const handleSave = (item) => {
    const original = editor.film;
    if (original && !database.includes(original)) {
      return 'รายการนี้มีการเปลี่ยนแปลงแล้ว กรุณาปิดฟอร์มและเปิดรายการอีกครั้ง';
    }
    const identity = (film) => [film.brand, film.series, film.model].map(normalizedSpecKey).join('\u0000');
    if (database.some((film) => film !== original && identity(film) === identity(item))) {
      return 'มียี่ห้อ ซีรีส์ และรุ่นนี้อยู่แล้ว กรุณาตรวจสอบข้อมูล';
    }

    setDatabase((previous) => original
      ? previous.map((film) => film === original ? item : film)
      : [item, ...previous]);
    if (!original) setSearch('');
    setEditor(null);
    setStatus(`${original ? 'แก้ไข' : 'เพิ่ม'}ข้อมูล ${item.brand} ${item.model} แล้ว`);
    return '';
  };

  const handleDelete = async (film) => {
    const approved = await confirm(`ต้องการลบ ${film.brand} ${film.series} ${film.model} ออกจากรายการหรือไม่?`, {
      title: 'ลบข้อมูลฟิล์ม?',
      confirmLabel: 'ลบข้อมูล',
    });
    if (!approved) return;
    setDatabase((previous) => previous.filter((item) => item !== film));
    setStatus(`ลบข้อมูล ${film.brand} ${film.model} แล้ว`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 print:bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur print:static print:shadow-none">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 print:hidden"
            aria-label="กลับไปหน้าพิมพ์ฟิล์ม"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">รายการและสเปคฟิล์ม</h1>
            <p className="mt-0.5 text-sm text-slate-500">ข้อมูลทั้งหมด {database.length.toLocaleString('th-TH')} รายการ</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <p className="mb-3 text-xs leading-5 text-slate-500 print:hidden">ข้อมูลที่เพิ่มหรือแก้ไขจะบันทึกไว้ในอุปกรณ์นี้ และใช้ร่วมกับหน้าเลือกฟิล์มสำหรับพิมพ์</p>
        <div role="status" aria-live="polite" className="print:hidden">
          {status && <p className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={18} className="shrink-0" />{status}</p>}
        </div>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center text-base font-semibold text-slate-900">
                <Database size={18} className="mr-2 text-blue-600" /> ตารางสเปคฟิล์ม
              </h2>
              <p className="mt-1 text-sm text-slate-500">พบ {filteredFilms.length.toLocaleString('th-TH')} รายการ</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto print:hidden">
              <label className="relative block w-full sm:flex-1 lg:w-96 lg:flex-none">
                <span className="sr-only">ค้นหารายการฟิล์ม</span>
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหา ยี่ห้อ ซีรีส์ รุ่น หรือค่าสเปค"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-base outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <button type="button" onClick={() => openEditor()} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><Plus size={18} /> เพิ่มข้อมูลฟิล์ม</button>
            </div>
          </div>

          <div className="max-h-[calc(100dvh-240px)] overflow-auto print:max-h-none print:overflow-visible">
            <table className="min-w-max w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-20 bg-slate-800 text-white print:static">
                <tr>
                  <th scope="col" className="sticky left-0 z-30 min-w-36 border-b border-r border-slate-700 bg-slate-800 px-3 py-3 text-center font-semibold print:hidden">จัดการ</th>
                  <th className="min-w-40 border-b border-r border-slate-700 bg-slate-800 px-4 py-3 text-center font-semibold">ปีรับประกัน</th>
                  <th className="min-w-32 border-b border-r border-slate-700 px-4 py-3 font-semibold">ยี่ห้อ</th>
                  <th className="min-w-48 border-b border-r border-slate-700 px-4 py-3 font-semibold">ซีรีส์</th>
                  <th className="min-w-44 border-b border-r border-slate-700 px-4 py-3 font-semibold">รุ่น</th>
                  {specColumns.map((column) => (
                    <th key={column.key} className="max-w-64 border-b border-r border-slate-700 px-4 py-3 text-center font-semibold last:border-r-0">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFilms.map((film, index) => {
                  const specsByKey = Object.fromEntries(
                    Object.entries(film.specs || {}).map(([label, value]) => [normalizedSpecKey(label), value]),
                  );

                  return (
                    <tr key={`${film.brand}-${film.series}-${film.model}-${index}`} className="group odd:bg-white even:bg-slate-50/70 hover:bg-blue-50">
                      <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-2 group-hover:bg-blue-50 print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => openEditor(film)} aria-label={`แก้ไข ${film.brand} ${film.series} ${film.model}`} className="flex min-h-9 items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600"><Pencil size={15} /> แก้ไข</button>
                          <button type="button" onClick={() => handleDelete(film)} aria-label={`ลบ ${film.brand} ${film.series} ${film.model}`} className="flex min-h-9 items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-rose-600"><Trash2 size={15} /> ลบ</button>
                        </div>
                      </td>
                      <td className="border-b border-r border-slate-200 px-4 py-3 text-center font-semibold text-blue-700">{displayWarranty(film)}</td>
                      <td className="border-b border-r border-slate-200 px-4 py-3 font-semibold text-slate-900">{film.brand || '-'}</td>
                      <td className="border-b border-r border-slate-200 px-4 py-3 text-slate-700">{film.series || '-'}</td>
                      <td className="border-b border-r border-slate-200 px-4 py-3 font-medium text-slate-800">{film.model || '-'}</td>
                      {specColumns.map((column) => {
                        const value = String(specsByKey[column.key] ?? '').trim();
                        return (
                          <td key={column.key} className="border-b border-r border-slate-200 px-4 py-3 text-center tabular-nums text-slate-700 last:border-r-0">
                            {value && value !== '00' ? `${value}${specSuffix({ label: column.label, value })}` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {filteredFilms.length === 0 && (
                  <tr>
                    <td colSpan={5 + specColumns.length} className="px-6 py-16 text-center text-base text-slate-500">
                      {database.length ? 'ไม่พบรายการฟิล์มที่ค้นหา' : 'ยังไม่มีข้อมูลฟิล์ม กด “เพิ่มข้อมูลฟิล์ม” เพื่อเริ่มต้น'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      {editor && <FilmEditor film={editor.film} warranty={editor.film ? warrantyValue(editor.film) : ''} columns={editor.columns} onSave={handleSave} onClose={() => setEditor(null)} />}
    </div>
  );
}
