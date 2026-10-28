import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole, UnlockKeyhole, X } from 'lucide-react';
import { Modal } from './DialogProvider';
import { verifyFilmEditPassword } from '../utils/filmEditPassword';

export default function FilmPasswordDialog({ onUnlock, onClose }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const attemptRef = useRef(0);

  useEffect(() => () => { attemptRef.current += 1; }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (checking) return;
    const attempt = ++attemptRef.current;
    setChecking(true);
    setError('');
    try {
      const valid = await verifyFilmEditPassword(password);
      if (attempt !== attemptRef.current) return;
      if (valid) {
        onUnlock();
      } else {
        setPassword('');
        setError('รหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง');
        inputRef.current?.focus();
      }
    } catch {
      if (attempt !== attemptRef.current) return;
      setError('ไม่สามารถตรวจสอบรหัสผ่านได้ กรุณาลองอีกครั้ง');
    } finally {
      if (attempt === attemptRef.current) setChecking(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="film-password-title" describedBy="film-password-description" className="notice-modal">
      <form onSubmit={handleSubmit}>
        <div className="relative p-6 sm:p-8">
          <button type="button" onClick={onClose} aria-label="ปิดหน้าปลดล็อก" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={20} /></button>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><LockKeyhole size={27} /></div>
          <h2 id="film-password-title" className="text-xl font-bold text-slate-900">ปลดล็อกการแก้ไขข้อมูล</h2>
          <p id="film-password-description" className="mt-2 text-sm leading-6 text-slate-500">กรอกรหัสผ่านก่อนเพิ่ม แก้ไข หรือลบข้อมูลฟิล์ม</p>
          <label htmlFor="film-edit-password" className="mt-5 block text-sm font-medium text-slate-700">รหัสผ่าน</label>
          <div className="relative mt-2">
            <input
              ref={inputRef}
              id="film-edit-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              data-initial-focus="true"
              required
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(''); }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'film-password-error' : undefined}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPassword} className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
          </div>
          {error && <p id="film-password-error" role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
          <p className="mt-4 text-xs leading-5 text-slate-500">ระบบจะล็อกอีกครั้งเมื่อออกจากหน้านี้ รีเฟรช หรือกดปุ่มล็อกการแก้ไข</p>
        </div>
        <div className="flex gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-5 sm:px-8">
          <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">ยกเลิก</button>
          <button type="submit" disabled={checking} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{checking ? <Loader2 size={18} className="animate-spin" /> : <UnlockKeyhole size={18} />}{checking ? 'กำลังตรวจสอบ...' : 'ปลดล็อก'}</button>
        </div>
      </form>
    </Modal>
  );
}
