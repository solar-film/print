import React, { useMemo, useState } from 'react';
import { ArrowLeft, Database, Search } from 'lucide-react';
import { specSuffix } from '../data/filmSpecs';

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

export default function FilmSpecTable({ database, onBack }) {
  const [search, setSearch] = useState('');

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
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center text-base font-semibold text-slate-900">
                <Database size={18} className="mr-2 text-blue-600" /> ตารางสเปคฟิล์ม
              </h2>
              <p className="mt-1 text-sm text-slate-500">พบ {filteredFilms.length.toLocaleString('th-TH')} รายการ</p>
            </div>
            <label className="relative block w-full sm:max-w-sm print:hidden">
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
          </div>

          <div className="max-h-[calc(100dvh-190px)] overflow-auto print:max-h-none print:overflow-visible">
            <table className="min-w-max w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-20 bg-slate-800 text-white print:static">
                <tr>
                  <th className="sticky left-0 z-30 min-w-40 border-b border-r border-slate-700 bg-slate-800 px-4 py-3 text-center font-semibold">ปีรับประกัน</th>
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
                      <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-inherit px-4 py-3 text-center font-semibold text-blue-700 group-hover:bg-blue-50">{displayWarranty(film)}</td>
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
                    <td colSpan={4 + specColumns.length} className="px-6 py-16 text-center text-base text-slate-500">
                      ไม่พบรายการฟิล์มที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
