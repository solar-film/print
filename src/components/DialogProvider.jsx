import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, TriangleAlert, X } from 'lucide-react';

import { DialogContext } from './dialogContext';

// Native modal semantics keep focus inside the topmost dialog and disable the page behind it.
export function Modal({ children, onClose, labelledBy, describedBy, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = ref.current;
    element.showModal();
    element.querySelector('[data-initial-focus="true"]')?.focus();
    return () => {
      element.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <dialog ref={ref} aria-labelledby={labelledBy} aria-describedby={describedBy}
      className={`app-modal ${className}`}
      onCancel={event => { event.preventDefault(); onClose(); }}>
      {children}
    </dialog>, document.body,
  );
}

const appearances = {
  success: { icon: Check, title: 'เรียบร้อยแล้ว', badge: 'bg-emerald-50 text-emerald-600 ring-emerald-100', button: 'bg-emerald-600 hover:bg-emerald-700', accent: 'bg-emerald-500' },
  error: { icon: TriangleAlert, title: 'ดำเนินการไม่สำเร็จ', badge: 'bg-rose-50 text-rose-600 ring-rose-100', button: 'bg-rose-600 hover:bg-rose-700', accent: 'bg-rose-500' },
  warning: { icon: TriangleAlert, title: 'ตรวจสอบข้อมูลอีกครั้ง', badge: 'bg-amber-50 text-amber-600 ring-amber-100', button: 'bg-blue-600 hover:bg-blue-700', accent: 'bg-amber-400' },
  info: { icon: Info, title: 'ข้อมูลเพิ่มเติม', badge: 'bg-blue-50 text-blue-600 ring-blue-100', button: 'bg-blue-600 hover:bg-blue-700', accent: 'bg-blue-500' },
  danger: { icon: TriangleAlert, title: 'ยืนยันการดำเนินการ', badge: 'bg-rose-50 text-rose-600 ring-rose-100', button: 'bg-rose-600 hover:bg-rose-700', accent: 'bg-rose-500' },
};

export function DialogProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const nextId = useRef(0);
  const request = useCallback(options => new Promise(resolve => {
    setQueue(items => [...items, { ...options, resolve, id: ++nextId.current }]);
  }), []);
  const notify = useCallback((message, options = {}) => request({ message, ...options, confirmation: false }), [request]);
  const confirm = useCallback((message, options = {}) => request({ message, type: 'danger', ...options, confirmation: true }), [request]);
  const current = queue[0];
  const finish = value => {
    current.resolve(value);
    setQueue(items => items.slice(1));
  };
  const look = appearances[current?.type] || appearances.info;
  const Icon = look.icon;
  return (
    <DialogContext.Provider value={{ notify, confirm }}>
      {children}
      {current && (
        <Modal key={current.id} labelledBy="notice-title" describedBy="notice-message" onClose={() => finish(false)} className="notice-modal">
          <div className={`h-1.5 ${look.accent}`} />
          <div className="relative px-7 pt-8 pb-7 sm:px-9">
            <button type="button" aria-label="ปิดข้อความ" onClick={() => finish(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><X size={18} /></button>
            <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ring-8 ${look.badge}`}><Icon size={28} strokeWidth={2} /></div>
            <h2 id="notice-title" className="text-xl font-bold tracking-tight text-slate-900">{current.title || look.title}</h2>
            <p id="notice-message" className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-slate-500">{current.message}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-7 py-5 sm:px-9">
            {current.confirmation && <button data-initial-focus="true" type="button" onClick={() => finish(false)} className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">ยกเลิก</button>}
            <button data-initial-focus={!current.confirmation} type="button" onClick={() => finish(true)} className={`min-h-11 flex-1 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${look.button}`}>{current.confirmLabel || (current.confirmation ? 'ยืนยัน' : 'ตกลง')}</button>
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  );
}

