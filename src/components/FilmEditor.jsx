import { useState } from 'react';
import { Pencil, Plus, Save, X } from 'lucide-react';
import { Modal } from './DialogProvider';

const inputClassName = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function FilmEditor({ film, warranty, columns, onSave, onClose }) {
  const [draft, setDraft] = useState(() => ({
    brand: film?.brand || '',
    series: film?.series || '',
    model: film?.model || '',
    warranty: warranty || '',
  }));
  const [specs, setSpecs] = useState(() => Object.fromEntries(
    Object.entries(film?.specs || {}).map(([label, value]) => [label.trim().toLowerCase(), String(value ?? '')]),
  ));
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const fields = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]));
    if (!fields.brand || !fields.series || !fields.model) {
      setError('กรุณากรอกยี่ห้อ ซีรีส์ และรุ่นให้ครบถ้วน');
      return;
    }

    const result = onSave({
      ...film,
      ...fields,
      specs: Object.fromEntries(columns.flatMap(({ key, label }) => {
        const value = String(specs[key] ?? '').trim();
        return value ? [[label, value]] : [];
      })),
    });
    if (result) setError(result);
  };

  return (
    <Modal onClose={onClose} labelledBy="film-editor-title" describedBy="film-editor-description" className="max-w-3xl">
      <form onSubmit={handleSubmit} className="flex max-h-[calc(100dvh-2rem-2px)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">{film ? <Pencil size={22} /> : <Plus size={22} />}</div>
            <div>
              <h2 id="film-editor-title" className="text-lg font-bold text-slate-900">{film ? 'แก้ไขข้อมูลฟิล์ม' : 'เพิ่มข้อมูลฟิล์ม'}</h2>
              <p id="film-editor-description" className="mt-1 text-xs text-slate-500">กรอกข้อมูลรุ่นและสเปคฟิล์ม ช่องที่มี * จำเป็นต้องกรอก</p>
            </div>
          </div>
          <button type="button" aria-label="ปิดฟอร์มฟิล์ม" onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"><X size={22} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-5 sm:p-7">
          <fieldset>
            <legend className="mb-4 text-sm font-semibold text-slate-900">ข้อมูลฟิล์ม</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['brand', 'ยี่ห้อ', 'เช่น G-TEC'],
                ['series', 'ซีรีส์', 'เช่น CERAMIC CARBON'],
                ['model', 'รุ่น', 'เช่น CM40'],
                ['warranty', 'ปีรับประกัน', 'เช่น 10 หรือ ตลอดอายุการใช้งาน'],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="block text-sm font-medium text-slate-700">
                  {label}{key !== 'warranty' && <span className="text-rose-500"> *</span>}
                  <input
                    type="text"
                    name={key}
                    required={key !== 'warranty'}
                    data-initial-focus={key === 'brand'}
                    value={draft[key]}
                    onChange={(event) => setDraft((previous) => ({ ...previous, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className={inputClassName}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6 border-t border-slate-200 pt-5">
            <legend className="px-1 text-sm font-semibold text-slate-900">ค่าสเปคฟิล์ม</legend>
            <p className="mb-4 text-xs leading-5 text-slate-500">กรอกค่าตามสเปค เช่น 99.5 หรือ 99.5% และเว้นว่างหากไม่มีข้อมูล</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {columns.map(({ key, label }) => (
                <label key={key} className="block text-sm font-medium text-slate-700">
                  {label}
                  <input
                    type="text"
                    value={specs[key] ?? ''}
                    onChange={(event) => setSpecs((previous) => ({ ...previous, [key]: event.target.value }))}
                    placeholder="ไม่ระบุ"
                    className={inputClassName}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">ยกเลิก</button>
            <button type="submit" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"><Save size={18} /> บันทึกข้อมูล</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
