import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { Settings, Image as ImageIcon, Type, Move, Printer, Download, LayoutGrid, FileText, CreditCard, Ticket, Plus, Trash2, ArrowRight, Hash, Database, Search, ChevronDown, ChevronRight, X, Loader2, TableProperties } from 'lucide-react';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { filmDatabase } from './data/filmDatabase';
import { withCatalogAdditions, catalogAdditionsVersion, catalogAdditionsStorageKey } from './data/catalogAdditions';
import { filmFromRow, displaySpecs, specSuffix, hasFilmIdentity, filmLabel } from './data/filmSpecs';
import DatabaseManager from './components/DatabaseManager';
import FilmPasswordDialog from './components/FilmPasswordDialog';
import FilmSpecTable from './components/FilmSpecTable';
import { useDialog } from './components/dialogContext';
import { useFilmEditAccess } from './components/filmEditAccessContext';
import { filmPrintRanges, readFilmPrintPreferences, saveFilmPrintPreference } from './data/filmPrintPreferences';
import couponDefaultImage from './assets/templates/coupon.png';
import gfsCompanyLogoImage from './assets/company-watermarks/gfs.png';
import mhlCompanyLogoImage from './assets/company-watermarks/mhl.png';
import borneoCompanyLogoImage from './assets/company-watermarks/borneo.png';
import designSquareCompanyLogoImage from './assets/company-watermarks/design-square.png';

const companyLogos = [
  { id: 'none', name: 'ไม่ใช้', image: null },
  { id: 'gfs', name: 'GFS', image: gfsCompanyLogoImage, aspectRatio: 3103 / 1297 },
  { id: 'mhl', name: 'MHL', image: mhlCompanyLogoImage, aspectRatio: 300 / 128 },
  { id: 'borneo', name: 'Borneo', image: borneoCompanyLogoImage, aspectRatio: 496 / 212 },
  { id: 'designSquare', name: 'Design Square', image: designSquareCompanyLogoImage, aspectRatio: 779 / 165 },
];

// Load all images from the templates directory automatically
const templateFiles = import.meta.glob('./assets/templates/*.{png,jpg,jpeg,svg,webp,PNG,JPG,JPEG}', { eager: true, import: 'default' });
const predefinedTemplates = Object.keys(templateFiles).map((path, index) => {
  const filename = path.split('/').pop();
  return { id: index, name: filename, url: templateFiles[path] };
});

const logoFiles = import.meta.glob('./assets/film-logos/*.{png,jpg,jpeg,svg,webp,PNG,JPG,JPEG}', { eager: true, import: 'default' });
// Prefer named logos when the catalog still contains their numbered predecessors.
const legacyFilmLogoNames = {
  1: '3M',
  2: 'LAMINA',
  3: 'AMERRICANKING',
  4: 'HI-KOOL',
  5: 'IZY-KOOL',
  6: 'IZY-KOOL-CERAMIC',
  7: 'NANOTECH',
  9: 'G-TEC',
  10: 'COOPER',
  11: 'COOPER-TPU',
  12: 'MAXTECH',
};
const filmLogoAssets = Object.entries(logoFiles).map(([path, url]) => ({
  id: path,
  name: path.split('/').pop(),
  url,
}));
const filmLogoAssetKeys = new Set(filmLogoAssets.map(({ name }) => assetKey(name)));
const predefinedLogos = filmLogoAssets.flatMap((logo) => {
  const brand = legacyFilmLogoNames[assetKey(logo.name)];
  if (!brand) return [logo];
  return filmLogoAssetKeys.has(assetKey(brand)) ? [] : [{ ...logo, name: brand }];
});

const warrantyFiles = import.meta.glob('./assets/film-warranties/*.{png,jpg,jpeg,svg,webp,PNG,JPG,JPEG}', { eager: true, import: 'default' });
const predefinedWarranties = Object.keys(warrantyFiles).map((path, index) => {
  const filename = path.split('/').pop();
  return { id: index, name: filename, url: warrantyFiles[path] };
});

function assetKey(value) {
  return String(value ?? '')
    .replace(/\.[^.]+$/, '')
    .toUpperCase()
    .replace(/[^A-Z0-9฀-๿]/g, '');
}

function matchingFilmLogo(film) {
  const brandKey = assetKey(film.brand);
  const filmKey = assetKey(`${film.brand} ${film.series} ${film.model}`);
  const preferredKey = filmKey.includes('COOPER') && filmKey.includes('TPU')
    ? 'COOPERTPU'
    : filmKey.includes('IZYKOOL') && filmKey.includes('CERAMIC')
      ? 'IZYKOOLCERAMIC'
      : brandKey;

  return predefinedLogos.find((logo) => assetKey(logo.name) === preferredKey)?.url
    || predefinedLogos.find((logo) => assetKey(logo.name) === brandKey)?.url
    || null;
}

function matchingWarrantyBadge(film) {
  const legacyWarranty = Object.entries(film.specs || {})
    .find(([label]) => /warranty|รับประกัน/i.test(label))?.[1];
  const years = String(film.warranty || legacyWarranty || '')
    .match(/\d+(?:\.\d+)?/)?.[0]?.replace(/\.0+$/, '');
  if (!years) return null;

  const expectedKey = `WARRANTY${years}YR`;
  return predefinedWarranties.find((badge) => assetKey(badge.name) === expectedKey)?.url || null;
}

function isDefaultFilm({ brand, model }) {
  return brand === 'NANOTECH' && model === 'PX70';
}

const defaultFilm = filmDatabase.find(isDefaultFilm);

function createFilmDraft(film) {
  return {
    brand: film.brand,
    series: film.series,
    model: film.model,
    specs: displaySpecs(film.specs),
    brandLogo: matchingFilmLogo(film),
    warrantyLogo: matchingWarrantyBadge(film),
  };
}

const printModes = [
  { id: 'film', label: 'ฟิล์ม', icon: FileText },
  { id: 'general', label: 'ตกแต่ง', icon: ImageIcon },
  { id: 'business-card', label: 'นามบัตร', icon: CreditCard },
  { id: 'coupon', label: 'คูปอง', icon: Ticket },
];

function SidebarDisclosure({ title, icon: Icon, value, children }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white open:border-blue-200">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
        <Icon size={16} className="shrink-0 text-blue-600" aria-hidden="true" />
        <span className="flex-1">{title}</span>
        {value && <span className="text-xs font-medium text-slate-600">{value}</span>}
        <ChevronDown size={16} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-4 border-t border-slate-100 px-3 py-4">{children}</div>
    </details>
  );
}

export default function App() {
  const { notify } = useDialog();
  const { isUnlocked: isFilmEditUnlocked, canEdit: canEditFilmDatabase, unlock, lock } = useFilmEditAccess();
  const [mode, setMode] = useState('film'); // 'general' | 'film'
  const [activeFilmSettings, setActiveFilmSettings] = useState(null);
  const settingsTriggerRef = useRef(null);
  const settingsPanelRef = useRef(null);
  const settingsHeadingRef = useRef(null);

  useLayoutEffect(() => {
    const trigger = settingsTriggerRef.current;
    const panel = settingsPanelRef.current;
    if (!activeFilmSettings || !trigger || !panel) return;

    const viewportMargin = 8;
    const positionPanel = () => {
      const triggerTop = trigger.getBoundingClientRect().top;
      const bottomLimit = document.documentElement.clientHeight - panel.offsetHeight - viewportMargin;
      panel.style.top = `${Math.max(viewportMargin, Math.min(triggerTop, bottomLimit))}px`;
    };

    let frame;
    const schedulePosition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(positionPanel);
    };
    positionPanel();
    settingsHeadingRef.current?.focus({ preventScroll: true });

    const observer = new ResizeObserver(schedulePosition);
    observer.observe(panel);
    const menuArea = trigger.closest('nav')?.parentElement;
    if (menuArea) observer.observe(menuArea);
    window.addEventListener('resize', schedulePosition);
    window.addEventListener('scroll', schedulePosition, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedulePosition);
      window.removeEventListener('scroll', schedulePosition, true);
    };
  }, [activeFilmSettings]);

  const closeFilmSettings = () => {
    setActiveFilmSettings(null);
    settingsTriggerRef.current?.focus({ preventScroll: true });
  };

  // General Mode State
  const [modelText, setModelText] = useState('SH2FGIM');
  const [bgImage, setBgImage] = useState(null);
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(33);
  const [textX, setTextX] = useState(49); // percentage
  const [textY, setTextY] = useState(59); // percentage
  
  // Film Mode State
  const [filmDraft, setFilmDraft] = useState(null);
  const [filmPrintPreferences, setFilmPrintPreferences] = useState(readFilmPrintPreferences);
  const {
    seriesSize: filmSeriesSize,
    modelSize: filmModelSize,
    specSize: filmSpecSize,
    brandLogoSize: filmBrandLogoSize,
    warrantyLogoSize: filmWarrantyLogoSize,
    watermark: companyLogoId,
    quantity,
    startPos: savedStartPos,
    gridCols,
    gridRows,
    piecePaddingTop,
    piecePaddingBottom,
    piecePaddingLeft,
    piecePaddingRight,
  } = filmPrintPreferences;
  const [printLayoutDraft, setPrintLayoutDraft] = useState(null);
  const totalSlots = mode === 'business-card' ? 10 : mode === 'coupon' ? 6 : gridCols * gridRows;
  const startPos = Math.min(savedStartPos, totalSlots);
  const filmCompanyLogo = companyLogos.find((logo) => logo.id === companyLogoId);
  const companyLogoSizePreference = `${companyLogoId}LogoSize`;
  const filmCompanyLogoSize = filmPrintPreferences[companyLogoSizePreference];
  const horizontalCompanyLogo = companyLogoId === 'designSquare' && filmPrintPreferences.designSquarePlacement === 'header';
  // Fit the rotated logo into its own leading column without covering the specs.
  const filmCompanyLogoLength = filmCompanyLogo.image && !horizontalCompanyLogo ? Math.max(0, Math.min(
    275 / gridRows - piecePaddingTop - piecePaddingBottom - 0.6,
    (200 / gridCols - piecePaddingLeft - piecePaddingRight - 0.6) * 0.2 * filmCompanyLogo.aspectRatio,
  )) * filmCompanyLogoSize / 100 : 0;

  // Business Card State
  const [businessCardImage, setBusinessCardImage] = useState(null);

  // Coupon State
  const [couponImage, setCouponImage] = useState(couponDefaultImage);
  const [couponPrefix, setCouponPrefix] = useState('202608-');
  const [couponStartNum, setCouponStartNum] = useState(301);
  const [couponNumLength, setCouponNumLength] = useState(3);
  
  const [couponNum1X, setCouponNum1X] = useState(9);
  const [couponNum1Y, setCouponNum1Y] = useState(13.5);
  const [couponNum1Size, setCouponNum1Size] = useState(14);
  const [couponNum1Color, setCouponNum1Color] = useState('#000000');

  const [couponNum2X, setCouponNum2X] = useState(81.5);
  const [couponNum2Y, setCouponNum2Y] = useState(38);
  const [couponNum2Size, setCouponNum2Size] = useState(15);
  const [couponNum2Color, setCouponNum2Color] = useState('#000000');

  // Database State
  const [customDatabase, setCustomDatabase] = useState(() => {
    try {
      const saved = localStorage.getItem('filmDatabase');
      if (saved) {
        const parsed = JSON.parse(saved);
        const version = localStorage.getItem('dbVersion');
        const edited = localStorage.getItem('filmDatabaseEdited') === 'true';
        if (Array.isArray(parsed) && (version === 'v8' || edited)) {
          // Apply new catalog entries once, preserving subsequent local edits/deletions.
          return localStorage.getItem(catalogAdditionsStorageKey) === catalogAdditionsVersion
            ? parsed
            : withCatalogAdditions(parsed);
        }
      }
    } catch (error) {
      console.error('Cannot load saved film database:', error);
    }
    return filmDatabase;
  });
  const catalogDefaultFilm = customDatabase.find(isDefaultFilm) ?? defaultFilm;
  const initialFilmDraft = useMemo(() => createFilmDraft(catalogDefaultFilm), [catalogDefaultFilm]);
  const {
    brand: filmBrand,
    series: filmSeries,
    model: filmModel,
    specs: filmSpecs,
    brandLogo: filmLogo1,
    warrantyLogo: filmLogo2,
  } = filmDraft ?? initialFilmDraft;
  const [databaseEdited] = useState(() => {
    try {
      return localStorage.getItem('filmDatabaseEdited') === 'true';
    } catch {
      return false;
    }
  });
  const hasLocalDatabaseChanges = useRef(databaseEdited);
  const databaseRevision = useRef(0);
  const updateDatabase = (update) => {
    if (!canEditFilmDatabase()) return false;
    hasLocalDatabaseChanges.current = true;
    databaseRevision.current += 1;
    setCustomDatabase(update);
    return true;
  };
  const [isDbManagerOpen, setIsDbManagerOpen] = useState(false);
  const [isFilmListRequested, setIsFilmListRequested] = useState(() => window.location.hash === '#film-specs');
  const isFilmListPage = isFilmListRequested && isFilmEditUnlocked;
  const closeFilmList = () => {
    lock();
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    setIsFilmListRequested(false);
  };

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosInstall, setShowIosInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check iOS for manual install instruction
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);
    if (isIos() && !isInStandaloneMode()) {
      setShowIosInstall(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (showIosInstall) {
      notify('สำหรับ iPhone/iPad:\nให้กดปุ่มแชร์ (Share) ที่ด้านล่างจอ\nแล้วเลือก "เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen) ครับ');
    }
  };

  const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKDKVr3RKTRAp3KauC7AYBEcVq4coI9gss_O5iXyIr3mk8M1SA1KNkKy56J40J0xU-lyc3Tbs8HExa/pub?output=csv';

  const syncFromGoogleSheets = async (silent = false) => {
    if (silent && hasLocalDatabaseChanges.current) return;
    const revision = databaseRevision.current;
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error('Cannot fetch');
      const text = await res.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length === 0) {
            const newData = results.data.map(filmFromRow).filter(hasFilmIdentity);
            
            if (newData.length > 0) {
               // A response started before a local edit must not replace that edit.
               if (databaseRevision.current !== revision || (silent && hasLocalDatabaseChanges.current)) return;
               const mergedData = withCatalogAdditions(newData);
               setCustomDatabase(mergedData);
               if (!silent) notify(`อัปเดตข้อมูลล่าสุดแล้ว (${mergedData.length} รายการ)`, { type: 'success', title: 'ซิงค์ข้อมูลสำเร็จ' });
            } else if (!silent) {
               notify('ไม่พบข้อมูลรุ่นฟิล์ม กรุณาตรวจสอบข้อมูลใน Google Sheets', { type: 'warning' });
            }
          } else if (!silent) {
            notify('ไม่สามารถอ่านรูปแบบข้อมูลได้ กรุณาตรวจสอบไฟล์ CSV แล้วลองอีกครั้ง', { type: 'error', title: 'ซิงค์ข้อมูลไม่สำเร็จ' });
          }
        }
      });
    } catch (err) {
      console.error('Auto sync failed:', err);
      if (!silent) notify('ไม่สามารถเชื่อมต่อ Google Sheets ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง', { type: 'error', title: 'ซิงค์ข้อมูลไม่สำเร็จ' });
    }
  };

  // Auto sync on load
  useEffect(() => {
    syncFromGoogleSheets(true);
  }, []);

  // Searchable Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef(null);
  const filmPickerButtonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('filmDatabase', JSON.stringify(customDatabase));
      localStorage.setItem(catalogAdditionsStorageKey, catalogAdditionsVersion);
      localStorage.setItem('dbVersion', 'v8');
      localStorage.setItem('filmDatabaseEdited', String(hasLocalDatabaseChanges.current));
    } catch (error) {
      console.error('Cannot save film database:', error);
      notify('ไม่สามารถบันทึกข้อมูลในอุปกรณ์นี้ได้ ข้อมูลที่เปลี่ยนจะใช้ได้เฉพาะระหว่างเปิดหน้านี้ กรุณาตรวจสอบพื้นที่จัดเก็บและการตั้งค่าเบราว์เซอร์', { type: 'error', title: 'บันทึกข้อมูลไม่สำเร็จ' });
    }
  }, [customDatabase, notify]);

  useEffect(() => {
    const handleHashChange = () => {
      const isFilmList = window.location.hash === '#film-specs';
      setIsFilmListRequested(isFilmList);
      if (isFilmList) setActiveFilmSettings(null);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printPreviewRef = useRef(null);
  const fitPrintPreview = mode === 'film' && activeFilmSettings !== null;
  const filmPrintPreviewRef = useRef(null);
  const [filmPrintOverflows, setFilmPrintOverflows] = useState(false);

  useEffect(() => {
    const preview = printPreviewRef.current;
    if (!fitPrintPreview || !preview) return;

    const pixelsPerMm = 96 / 25.4;
    preview.scrollTo(0, 0);
    let frame;
    const observer = new ResizeObserver(([{ contentRect: { width, height } }]) => {
      const scale = Math.min(1, width / (210 * pixelsPerMm), height / (297 * pixelsPerMm));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        preview.style.setProperty('--print-preview-scale', String(scale));
      });
    });
    observer.observe(preview);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      preview.style.removeProperty('--print-preview-scale');
    };
  }, [fitPrintPreview]);

  useEffect(() => {
    const preview = filmPrintPreviewRef.current;
    if (!preview) {
      setFilmPrintOverflows(false);
      return;
    }

    const checkFit = () => {
      setFilmPrintOverflows(preview.scrollHeight > preview.clientHeight || preview.scrollWidth > preview.clientWidth);
    };
    checkFit();

    const observer = new ResizeObserver(checkFit);
    observer.observe(preview);
    for (const block of preview.children) observer.observe(block);
    return () => observer.disconnect();
  }, [isFilmListPage, mode, startPos, quantity, filmSeries, filmModel, filmSeriesSize, filmModelSize, filmSpecSize, filmSpecs, gridCols, gridRows, piecePaddingTop, piecePaddingBottom, piecePaddingLeft, piecePaddingRight, companyLogoId, filmCompanyLogoLength, filmLogo1, filmLogo2]);

  // Handlers
  const updateFilmDraft = (field, value) => {
    setFilmDraft((draft) => ({ ...(draft ?? initialFilmDraft), [field]: value }));
  };

  const updateFilmPrintPreference = (name, value) => {
    setFilmPrintPreferences((preferences) => ({ ...preferences, [name]: value }));
    saveFilmPrintPreference(name, value);
  };

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setter(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSpecChange = (index, newValue) => {
    const newSpecs = [...filmSpecs];
    newSpecs[index] = { ...newSpecs[index], value: newValue };
    updateFilmDraft('specs', newSpecs);
  };

  const handleSpecToggle = (index, isVisible) => {
    const newSpecs = [...filmSpecs];
    newSpecs[index] = { ...newSpecs[index], visible: isVisible };
    updateFilmDraft('specs', newSpecs);
  };

  const handlePrint = () => {
    window.print();
  };
  
  const handleSavePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const printAreas = document.querySelectorAll('.print-area');
      if (printAreas.length === 0) return;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      for (let i = 0; i < printAreas.length; i++) {
        const imgData = await toPng(printAreas[i], {
          pixelRatio: 2,
          cacheBust: true,
        });
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }
      
      pdf.save('sticker-layout.pdf');
    } catch (error) {
      console.error("Error generating PDF:", error);
      notify('ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองอีกครั้ง', { type: 'error', title: 'บันทึก PDF ไม่สำเร็จ' });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const printLayoutInput = (name, { max = filmPrintRanges[name].max, value = filmPrintPreferences[name], multiplier = 1 } = {}) => ({
    id: `print-layout-${name}`,
    type: 'number',
    min: filmPrintRanges[name].min,
    max,
    step: filmPrintRanges[name].step,
    value: printLayoutDraft?.name === name ? printLayoutDraft.value : value,
    onChange: ({ currentTarget }) => {
      const { value, valueAsNumber, validity } = currentTarget;
      setPrintLayoutDraft({ name, value });
      if (validity.valid && Number.isFinite(valueAsNumber)) {
        updateFilmPrintPreference(name, valueAsNumber * multiplier);
      }
    },
    onBlur: () => setPrintLayoutDraft(null),
  });

  const slots = Array.from({ length: totalSlots }, (_, i) => i + 1);
  const totalItemsNeeded = (startPos - 1) + quantity;
  const totalPages = Math.ceil(totalItemsNeeded / totalSlots);
  const pagesArray = Array.from({ length: Math.max(1, totalPages) }, (_, i) => i);

  const printAreaStyle = mode === 'business-card' 
    ? { width: '210mm', height: '297mm', paddingTop: '13.5mm', paddingLeft: '15mm', paddingRight: '15mm' }
    : mode === 'coupon'
    ? { width: '210mm', height: '297mm', paddingTop: '5mm', paddingLeft: '5mm', paddingRight: '5mm' }
    : { width: '210mm', height: '297mm', paddingTop: '8.5mm', paddingLeft: '5mm', paddingRight: '5mm' };

  const dropdownQuery = dropdownSearch.trim().toLowerCase();
  const matchingFilms = isDropdownOpen ? customDatabase.filter((film) =>
    `${film.brand} ${film.series} ${film.model}`.toLowerCase().includes(dropdownQuery),
  ) : [];

  const printQuantityFields = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor="print-layout-quantity" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
          <Hash size={14} className="text-blue-600" aria-hidden="true" />
          {mode === 'coupon' ? 'จำนวนแผ่น (แผ่นละ 6 ใบ)' : 'จำนวนดวง'}
        </label>
        <input
          {...printLayoutInput('quantity', mode === 'coupon' ? {
            max: filmPrintRanges.quantity.max / 6,
            value: Math.ceil(quantity / 6),
            multiplier: 6,
          } : undefined)}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium focus:border-blue-500 focus:outline-2 focus:outline-blue-500"
        />
      </div>
      <div>
        <label htmlFor="print-layout-startPos" className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
          <ArrowRight size={14} className="text-blue-600" aria-hidden="true" />
          เริ่มช่องที่
        </label>
        <input {...printLayoutInput('startPos', { max: totalSlots, value: startPos })} aria-describedby={mode === 'film' ? 'film-print-start-help' : undefined} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium focus:border-blue-500 focus:outline-2 focus:outline-blue-500" />
      </div>
    </div>
  );

  const printPaperFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          ['gridCols', 'คอลัมน์แนวนอน'],
          ['gridRows', 'แถวแนวตั้ง'],
        ].map(([name, label]) => (
          <div key={name}>
            <label htmlFor={`print-layout-${name}`} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
            <input {...printLayoutInput(name)} className="min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600" />
          </div>
        ))}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700">ระยะขอบแต่ละดวง (มม.)</legend>
        <div className="grid grid-cols-4 gap-2">
          {[
            ['piecePaddingTop', 'บน'],
            ['piecePaddingBottom', 'ล่าง'],
            ['piecePaddingLeft', 'ซ้าย'],
            ['piecePaddingRight', 'ขวา'],
          ].map(([name, label]) => (
            <div key={name}>
              <label htmlFor={`print-layout-${name}`} className="mb-1 block text-center text-xs text-slate-600">{label}</label>
              <input {...printLayoutInput(name)} className="min-h-10 w-full rounded-lg border border-slate-300 px-1 text-center text-sm focus-visible:outline-2 focus-visible:outline-blue-600" />
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );

  const filmSettings = [
    {
      id: 'paper', title: 'จัดหน้ากระดาษ', icon: LayoutGrid, value: `${gridCols} × ${gridRows}`,
      content: (
        <>
          <div className="space-y-2 border-b border-slate-200 pb-4">
            {printQuantityFields}
            <p id="film-print-start-help" className="text-xs leading-relaxed text-slate-600">
              ใช้ช่องที่ 1 เมื่อเริ่มพิมพ์บนแผ่นใหม่
            </p>
          </div>
          {printPaperFields}
        </>
      ),
    },
    {
      id: 'company-logo', title: 'โลโก้และตรารับประกัน', icon: ImageIcon, value: filmCompanyLogo.name,
      content: (
        <>
          <h3 className="text-sm font-semibold text-slate-800">โลโก้บริษัทด้านหน้า</h3>
          <div className="grid grid-cols-3 gap-2">
            {companyLogos.map((logo) => (
              <button
                key={logo.id}
                type="button"
                onClick={() => updateFilmPrintPreference('watermark', logo.id)}
                aria-pressed={filmCompanyLogo === logo}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-600 ${filmCompanyLogo === logo ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}
              >
                {logo.image && <img src={logo.image} alt="" className="h-5 w-full object-contain" />}
                {logo.name}
              </button>
            ))}
          </div>
          {companyLogoId === 'designSquare' && (
            <div className="space-y-1.5">
              <label htmlFor="design-square-placement" className="block text-xs font-medium text-slate-700">
                ตำแหน่งโลโก้ Design Square
              </label>
              <select
                id="design-square-placement"
                value={filmPrintPreferences.designSquarePlacement}
                onChange={(event) => updateFilmPrintPreference('designSquarePlacement', event.target.value)}
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <option value="side">ด้านซ้าย (แนวตั้ง)</option>
                <option value="header">แถวบน (แนวนอน)</option>
              </select>
            </div>
          )}
          {filmCompanyLogo.image && [
            { id: 'film-company-logo-size', label: 'ขนาดโลโก้บริษัท', name: companyLogoSizePreference },
          ].map(({ id, label, name }) => (
            <div key={id} className="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-x-3 gap-y-1">
              <label htmlFor={id} className="text-xs font-medium text-slate-700">{label}</label>
              <output htmlFor={id} className="row-span-2 text-right text-xs font-semibold tabular-nums text-slate-600">{filmPrintPreferences[name]}%</output>
              <input
                id={id}
                type="range"
                min={filmPrintRanges[name].min}
                max={filmPrintRanges[name].max}
                step={filmPrintRanges[name].step}
                value={filmPrintPreferences[name]}
                onChange={(event) => updateFilmPrintPreference(name, event.target.valueAsNumber)}
                className="w-full accent-blue-600"
              />
            </div>
          ))}

          <section aria-labelledby="film-brand-logo-title" className="space-y-3">
            <h3 id="film-brand-logo-title" className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-800">
              <span className="flex items-center"><ImageIcon size={16} className="mr-2" /> โลโก้แบรนด์ (ซ้าย)</span>
              {filmLogo1 && <button type="button" aria-label="นำโลโก้แบรนด์ออก" onClick={() => updateFilmDraft('brandLogo', null)} className="text-xs font-medium normal-case text-red-500 hover:text-red-600">นำออก</button>}
            </h3>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              {predefinedLogos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {predefinedLogos.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      aria-pressed={filmLogo1 === tpl.url}
                      onClick={() => updateFilmDraft('brandLogo', tpl.url)}
                      title={tpl.name}
                      className={`flex-shrink-0 w-16 h-10 border-2 rounded-lg overflow-hidden transition-all bg-white ${
                        filmLogo1 === tpl.url ? 'border-blue-600 shadow-md scale-105' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={tpl.url} alt={tpl.name} className="w-full h-full object-contain p-0.5" onError={(e) => e.target.style.display = 'none'} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-center text-slate-400 py-4">
                  ไม่มีไฟล์เทมเพลต<br/>นำรูปภาพไปวางในโฟลเดอร์<br/><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-500 mt-1 inline-block">src/assets/film-logos</code>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="film-warranty-logo-title" className="space-y-3">
            <h3 id="film-warranty-logo-title" className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-800">
              <span className="flex items-center"><ImageIcon size={16} className="mr-2" /> ตรารับประกัน (ขวา)</span>
              {filmLogo2 && <button type="button" aria-label="นำตรารับประกันออก" onClick={() => updateFilmDraft('warrantyLogo', null)} className="text-xs font-medium normal-case text-red-500 hover:text-red-600">นำออก</button>}
            </h3>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              {predefinedWarranties.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {predefinedWarranties.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      aria-pressed={filmLogo2 === tpl.url}
                      onClick={() => updateFilmDraft('warrantyLogo', tpl.url)}
                      title={tpl.name}
                      className={`flex-shrink-0 w-12 h-12 border-2 rounded-lg overflow-hidden transition-all bg-white ${
                        filmLogo2 === tpl.url ? 'border-blue-600 shadow-md scale-105' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={tpl.url} alt={tpl.name} className="w-full h-full object-contain p-0.5" onError={(e) => e.target.style.display = 'none'} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-center text-slate-400 py-4">
                  ไม่มีไฟล์เทมเพลต<br/>นำรูปภาพไปวางในโฟลเดอร์<br/><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-500 mt-1 inline-block">src/assets/film-warranties</code>
                </div>
              )}
            </div>
          </section>
        </>
      ),
    },
    {
      id: 'typography', title: 'ข้อความและขนาด', icon: Type,
      content: (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="film-series-text" className="block text-xs font-medium text-slate-700">ชื่อซีรีส์ (ซ้าย)</label>
              <input id="film-series-text" type="text" value={filmSeries} onChange={(e) => updateFilmDraft('series', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
            </div>
            <div className="space-y-2">
              <label htmlFor="film-model-text" className="block text-xs font-medium text-slate-700">รุ่น (ขวา)</label>
              <input id="film-model-text" type="text" value={filmModel} onChange={(e) => updateFilmDraft('model', e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
            </div>
          </div>
          <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white px-3 pb-3">
            <legend className="px-1 text-sm font-semibold text-slate-800">ขนาดตัวอักษรบนสติกเกอร์</legend>
            {[
              { id: 'film-series-size', label: 'ชื่อซีรีส์', name: 'seriesSize' },
              { id: 'film-model-size', label: 'ชื่อรุ่น', name: 'modelSize' },
              { id: 'film-spec-size', label: 'หัวข้อและค่าสเปค', name: 'specSize' },
            ].map(({ id, label, name }) => (
              <div key={id} className="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-x-3 gap-y-1">
                <label htmlFor={id} className="text-xs font-medium text-slate-700">{label}</label>
                <output htmlFor={id} className="row-span-2 text-right text-xs font-semibold tabular-nums text-slate-600">{filmPrintPreferences[name]} px</output>
                <input
                  id={id}
                  type="range"
                  min={filmPrintRanges[name].min}
                  max={filmPrintRanges[name].max}
                  step={filmPrintRanges[name].step}
                  value={filmPrintPreferences[name]}
                  onChange={(event) => updateFilmPrintPreference(name, event.target.valueAsNumber)}
                  className="w-full accent-blue-600"
                />
              </div>
            ))}
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white px-3 pb-3">
            <legend className="px-1 text-sm font-semibold text-slate-800">ขนาดโลโก้บนสติกเกอร์</legend>
            {[
              { id: 'film-brand-logo-size', label: 'โลโก้แบรนด์ (ซ้าย)', name: 'brandLogoSize' },
              { id: 'film-warranty-logo-size', label: 'ตรารับประกัน (ขวา)', name: 'warrantyLogoSize' },
            ].map(({ id, label, name }) => (
              <div key={id} className="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-x-3 gap-y-1">
                <label htmlFor={id} className="text-xs font-medium text-slate-700">{label}</label>
                <output htmlFor={id} className="row-span-2 text-right text-xs font-semibold tabular-nums text-slate-600">{filmPrintPreferences[name]}%</output>
                <input
                  id={id}
                  type="range"
                  min={filmPrintRanges[name].min}
                  max={filmPrintRanges[name].max}
                  step={filmPrintRanges[name].step}
                  value={filmPrintPreferences[name]}
                  onChange={(event) => updateFilmPrintPreference(name, event.target.valueAsNumber)}
                  className="w-full accent-blue-600"
                />
              </div>
            ))}
          </fieldset>
        </>
      ),
    },
    {
      id: 'specs', title: 'สเปคฟิล์ม', icon: FileText,
      content: (
        <>
          <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <h2 className="flex items-center justify-between gap-2 text-sm font-bold text-amber-900">
              <span className="flex items-center">
                <Settings size={16} className="mr-2 text-amber-600" /> ค่าสเปค (%)
              </span>
            </h2>
              <p className="text-[11px] text-amber-700 leading-snug mt-3 font-medium">
                ⚠️ ตรวจสอบและแก้ไขค่าให้ตรงรุ่นก่อนพิมพ์
              </p>
            <div className="space-y-2 mt-2">
              {filmSpecs.map((spec, idx) => (
                <div key={idx} className={`flex items-center justify-between space-x-2 transition-opacity ${spec.visible === false ? 'opacity-50' : 'opacity-100'}`}>
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <input type="checkbox" checked={spec.visible !== false} onChange={(e) => handleSpecToggle(idx, e.target.checked)} className="w-3.5 h-3.5 shrink-0 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer" />
                    <label className={`text-xs font-medium whitespace-normal break-words leading-snug cursor-pointer ${spec.visible === false ? 'text-slate-500 line-through' : 'text-amber-900'}`} title={spec.label} onClick={() => handleSpecToggle(idx, spec.visible === false)}>{spec.label}</label>
                  </div>
                  <div className={`flex items-center w-[110px] shrink-0 bg-white rounded shadow-sm border focus-within:ring-2 focus-within:ring-amber-500 ${spec.visible === false ? 'border-slate-200' : 'border-amber-200'}`}>
                    <input type="text" value={spec.value} onChange={(e) => handleSpecChange(idx, e.target.value)} disabled={spec.visible === false} className="w-full px-2 py-1 text-sm text-right outline-none bg-transparent font-semibold text-slate-800 disabled:text-slate-500" />
                    <span className={`text-xs font-bold pr-2 ${spec.visible === false ? 'text-slate-400' : 'text-amber-600'}`}>{specSuffix(spec)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ),
    },
  ];
  const selectedFilmSettings = filmSettings.find(({ id }) => id === activeFilmSettings);

  if (isFilmListPage) {
    return (
      <FilmSpecTable
        database={customDatabase}
        setDatabase={updateDatabase}
        onBack={closeFilmList}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 [--print-menu-width:350px] [--film-settings-width:22rem] print:block">
      {isFilmListRequested && (
        <FilmPasswordDialog
          onUnlock={() => { if (window.location.hash === '#film-specs') unlock(); }}
          onClose={closeFilmList}
        />
      )}
      
      {/* Sidebar */}
      <aside className="z-10 flex w-full shrink-0 flex-col border-slate-200 bg-white md:sticky md:top-0 md:h-dvh md:w-[var(--print-menu-width)] md:border-r print:hidden">
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-4 py-3.5">
          <a
            href="https://docs.google.com/spreadsheets/d/1Xc4EY34N1u75-N899BUnb4Rrkv-1qq189R1Gqp94aIg/edit?pli=1&gid=292272685#gid=292272685"
            target="_blank"
            rel="noopener noreferrer"
            title="เปิด Google Sheets ในแท็บใหม่"
            className="flex items-center space-x-3 rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <LayoutGrid size={24} />
            </div>
            <h1 className="text-base font-bold text-slate-900">พิมพ์สติกเกอร์และนามบัตร</h1>
          </a>
          
          {(deferredPrompt || showIosInstall) && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center justify-center w-full py-2 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all shadow-md"
            >
              <Download size={16} className="mr-2" /> ติดตั้งแอป (Install App)
            </button>
          )}
        </div>

        <nav aria-label="ประเภทงานพิมพ์" className="grid shrink-0 grid-cols-4 gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
          {printModes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => {
                setMode(id);
                setActiveFilmSettings(null);
                setIsDropdownOpen(false);
              }}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${mode === id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 space-y-4 p-4 md:overflow-y-auto">
          {mode === 'general' && (
            <>
              {/* General Mode Form */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                  <Type size={16} className="mr-2" />
                  ข้อความ & สี
                </h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อรุ่น (Model)</label>
                  <input type="text" value={modelText} onChange={(e) => setModelText(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">สีข้อความ</label>
                    <div className="flex items-center space-x-2">
                      <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-10 h-10 p-1 border border-slate-300 rounded-lg cursor-pointer" />
                      <span className="text-sm text-slate-500 uppercase">{textColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ขนาดฟอนต์</label>
                    <input type="number" min="8" max="48" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <label className="block text-sm font-medium text-slate-700 flex items-center">
                    <Move size={14} className="mr-1 text-slate-400" /> ตำแหน่งข้อความ (X / Y)
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-500 w-4">X:</span>
                    <input type="range" min="0" max="100" value={textX} onChange={(e) => setTextX(Number(e.target.value))} className="w-full accent-blue-600" />
                    <span className="text-xs text-slate-500 w-8 text-right">{textX}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-500 w-4">Y:</span>
                    <input type="range" min="0" max="100" value={textY} onChange={(e) => setTextY(Number(e.target.value))} className="w-full accent-blue-600" />
                    <span className="text-xs text-slate-500 w-8 text-right">{textY}%</span>
                  </div>
                </div>
              </div>

              {/* Background */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                  <ImageIcon size={16} className="mr-2" />
                  พื้นหลังสติ๊กเกอร์
                </h2>
                
                {predefinedTemplates.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-500">เลือกเทมเพลตสำเร็จรูป ({predefinedTemplates.length}):</label>
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                      {predefinedTemplates.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setBgImage(tpl.url)}
                          title={tpl.name}
                          className={`flex-shrink-0 w-20 h-14 border-2 rounded-lg overflow-hidden transition-all ${
                            bgImage === tpl.url ? 'border-blue-600 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img src={tpl.url} alt={tpl.name} className="w-full h-full object-fill" onError={(e) => e.target.style.display = 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">หรืออัปโหลดเอง</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBgImage)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {bgImage ? (
                    <div className="relative h-20 w-full rounded-md overflow-hidden flex items-center justify-center bg-slate-100">
                      <img src={bgImage} alt="Background Preview" className="h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-medium">เปลี่ยนรูปภาพ</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 flex flex-col items-center">
                      <div className="bg-blue-50 p-3 rounded-full text-blue-600 mb-2">
                        <ImageIcon size={24} />
                      </div>
                      <span className="text-sm font-medium text-slate-600">คลิกเพื่ออัปโหลด</span>
                      <span className="text-xs text-slate-400 mt-1">ขนาด 5 x 3.5 ซม.</span>
                    </div>
                  )}
                </div>
                {bgImage && (
                  <button onClick={() => setBgImage(null)} className="text-xs text-red-500 hover:text-red-600 font-medium w-full text-right">นำรูปภาพออก</button>
                )}
              </div>
            </>
          )}

          {mode === 'film' && (
            <>
              <section aria-labelledby="film-pick-title" className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5">
                <h2 id="film-pick-title" className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
                  <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-600 text-xs text-white">1</span>
                  เลือกรุ่นฟิล์ม
                </h2>
                <div
                  className="relative"
                  ref={dropdownRef}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape' && isDropdownOpen) {
                      setIsDropdownOpen(false);
                      filmPickerButtonRef.current?.focus();
                    }
                  }}
                >
                  <button
                    ref={filmPickerButtonRef}
                    type="button"
                    aria-expanded={isDropdownOpen}
                    aria-controls={isDropdownOpen ? 'film-picker-options' : undefined}
                    className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600"
                    onClick={() => setIsDropdownOpen((open) => !open)}
                  >
                    <Search size={17} className="shrink-0 text-blue-600" aria-hidden="true" />
                    <span className="min-w-0 flex-1 break-words font-semibold">
                      {filmLabel({ brand: filmBrand, model: filmModel }) || filmSeries || 'ค้นหายี่ห้อหรือรุ่น'}
                    </span>
                    <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>

                  {isDropdownOpen && (
                    <div id="film-picker-options" className="mt-2 flex max-h-60 flex-col overflow-hidden rounded-lg border border-blue-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 p-2">
                        <input
                          type="search"
                          autoFocus
                          aria-label="ค้นหายี่ห้อ ซีรีส์ หรือรุ่น"
                          placeholder="พิมพ์ชื่อยี่ห้อ ซีรีส์ หรือรุ่น"
                          className="min-h-10 w-full rounded bg-slate-50 px-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
                          value={dropdownSearch}
                          onChange={(event) => setDropdownSearch(event.target.value)}
                        />
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto p-1">
                        {matchingFilms.map((film, index) => (
                          <button
                            key={index}
                            type="button"
                            className="block min-h-11 w-full rounded border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-800 last:border-0 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                            onClick={() => {
                              setFilmDraft(createFilmDraft(film));
                              setIsDropdownOpen(false);
                              setDropdownSearch('');
                              filmPickerButtonRef.current?.focus();
                            }}
                          >
                            <span className="font-semibold">{filmLabel(film) || film.series}</span>
                            {film.model && film.series && <span className="mt-0.5 block text-xs text-slate-600">{film.series}</span>}
                          </button>
                        ))}
                        {matchingFilms.length === 0 && (
                          <p role="status" className="px-3 py-4 text-sm text-slate-600">ไม่พบรุ่น ลองค้นหาด้วยชื่อยี่ห้อ</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  เลือกรุ่นเพื่อใส่สเปคและโลโก้ให้โดยอัตโนมัติ
                </p>
              </section>

              {filmPrintOverflows && (
                <p role="status" className="rounded-lg bg-amber-50 px-2.5 py-2 text-xs leading-snug text-amber-900">
                  เนื้อหาล้นขอบสติกเกอร์ ลองลดขนาดโลโก้หรือตัวอักษร หรือปรับจำนวนแถวและคอลัมน์ก่อนพิมพ์
                </p>
              )}

              <nav aria-label="ตั้งค่าสติกเกอร์ฟิล์ม" className="space-y-4">
                {filmSettings.map(({ id, title, icon: Icon, value }) => {
                  const isOpen = activeFilmSettings === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={isOpen ? 'film-settings-panel' : undefined}
                      onClick={(event) => {
                        if (isOpen) {
                          closeFilmSettings();
                        } else {
                          settingsTriggerRef.current = event.currentTarget;
                          setActiveFilmSettings(id);
                        }
                      }}
                      className={`flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${isOpen ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500/20' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'}`}
                    >
                      {id === 'paper' ? (
                        <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-600 text-xs text-white">2</span>
                      ) : (
                        <Icon size={16} className="shrink-0 text-blue-600" aria-hidden="true" />
                      )}
                      <span className="flex-1">{title}</span>
                      {value && <span className={`text-xs font-medium ${isOpen ? 'text-blue-800' : 'text-slate-600'}`}>{value}</span>}
                      <ChevronRight size={16} className={`shrink-0 ${isOpen ? 'text-blue-600' : 'text-slate-500'}`} aria-hidden="true" />
                    </button>
                  );
                })}
              </nav>
            </>
          )}

          {mode === 'business-card' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                <CreditCard size={16} className="mr-2" /> นามบัตร (Business Card)
              </h2>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBusinessCardImage)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {businessCardImage ? (
                  <div className="relative h-24 w-full rounded-md overflow-hidden flex items-center justify-center bg-slate-100">
                    <img src={businessCardImage} alt="Business Card" className="h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium">เปลี่ยนนามบัตร</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center">
                    <div className="bg-amber-50 p-3 rounded-full text-amber-600 mb-2">
                      <CreditCard size={28} />
                    </div>
                    <span className="text-sm font-medium text-slate-600">คลิกเพื่ออัปโหลดไฟล์นามบัตร</span>
                    <span className="text-xs text-slate-400 mt-1">สัดส่วน 90 x 54 มม.</span>
                  </div>
                )}
              </div>
              {businessCardImage && (
                <button onClick={() => setBusinessCardImage(null)} className="text-xs text-red-500 hover:text-red-600 font-medium w-full text-right">นำรูปภาพออก</button>
              )}
            </div>
          )}
          {mode === 'coupon' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                <Ticket size={16} className="mr-2" /> คูปอง (Coupon)
              </h2>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setCouponImage)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                {couponImage ? (
                  <div className="relative h-24 w-full rounded-md overflow-hidden flex items-center justify-center bg-slate-100">
                    <img src={couponImage} alt="Coupon Template" className="h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium">เปลี่ยนเทมเพลต</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center">
                    <div className="bg-red-50 p-3 rounded-full text-red-600 mb-2">
                      <ImageIcon size={28} />
                    </div>
                    <span className="text-sm font-medium text-slate-600">คลิกเพื่ออัปโหลดไฟล์เทมเพลต</span>
                    <span className="text-xs text-slate-400 mt-1">สัดส่วนกว้าง 200mm สูง 47.8mm</span>
                  </div>
                )}
              </div>
              {couponImage && (
                <button onClick={() => setCouponImage(null)} className="text-xs text-red-500 hover:text-red-600 font-medium w-full text-right">นำรูปภาพออก</button>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase">ตั้งค่าเลขรัน</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">คำนำหน้า (Prefix)</label>
                    <input type="text" value={couponPrefix} onChange={e => setCouponPrefix(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none" placeholder="202410-" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">เลขเริ่มต้น</label>
                    <input type="number" value={couponStartNum} onChange={e => setCouponStartNum(Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">หลัก (Padding)</label>
                    <input type="number" min="1" max="10" value={couponNumLength} onChange={e => setCouponNumLength(Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded outline-none" />
                  </div>
                </div>
                
                <h3 className="text-xs font-bold text-slate-800 uppercase pt-2 border-t border-slate-100">ตำแหน่งเลขจุดที่ 1 (ซ้าย)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 flex justify-between">
                      <span>ซ้าย-ขวา (X)</span><span>{couponNum1X}%</span>
                    </label>
                    <input type="range" min="0" max="100" step="0.5" value={couponNum1X} onChange={e => setCouponNum1X(Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 flex justify-between">
                      <span>บน-ล่าง (Y)</span><span>{couponNum1Y}%</span>
                    </label>
                    <input type="range" min="0" max="100" step="0.5" value={couponNum1Y} onChange={e => setCouponNum1Y(Number(e.target.value))} className="w-full" />
                  </div>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-slate-500">ขนาดฟอนต์</label>
                      <input type="number" value={couponNum1Size} onChange={e => setCouponNum1Size(Number(e.target.value))} className="w-full px-2 py-1 text-sm border border-slate-300 rounded outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-slate-500">สีข้อความ</label>
                      <input type="color" value={couponNum1Color} onChange={e => setCouponNum1Color(e.target.value)} className="w-full h-7 p-0 border-0 rounded cursor-pointer" />
                    </div>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-slate-800 uppercase pt-2 border-t border-slate-100">ตำแหน่งเลขจุดที่ 2 (ขวา)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 flex justify-between">
                      <span>ซ้าย-ขวา (X)</span><span>{couponNum2X}%</span>
                    </label>
                    <input type="range" min="0" max="100" step="0.5" value={couponNum2X} onChange={e => setCouponNum2X(Number(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 flex justify-between">
                      <span>บน-ล่าง (Y)</span><span>{couponNum2Y}%</span>
                    </label>
                    <input type="range" min="0" max="100" step="0.5" value={couponNum2Y} onChange={e => setCouponNum2Y(Number(e.target.value))} className="w-full" />
                  </div>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-slate-500">ขนาดฟอนต์</label>
                      <input type="number" value={couponNum2Size} onChange={e => setCouponNum2Size(Number(e.target.value))} className="w-full px-2 py-1 text-sm border border-slate-300 rounded outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-slate-500">สีข้อความ</label>
                      <input type="color" value={couponNum2Color} onChange={e => setCouponNum2Color(e.target.value)} className="w-full h-7 p-0 border-0 rounded cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode !== 'film' && (
            <SidebarDisclosure title="การตั้งค่าการพิมพ์" icon={Settings}>
              {printQuantityFields}
              {mode === 'general' && printPaperFields}
            </SidebarDisclosure>
          )}

          {mode === 'film' && (
            <a
              href="#film-specs"
              className="group flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <span className="flex items-center text-sm font-semibold text-blue-900">
                <span className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                  <TableProperties size={19} />
                </span>
                แสดงรายการฟิล์ม
              </span>
              <ArrowRight size={18} className="text-blue-500 transition-transform group-hover:translate-x-1" />
            </a>
          )}
          
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-4 py-3">
          {mode === 'film' && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-slate-900">3. ตรวจตัวอย่างแล้วพิมพ์</span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-slate-600">{quantity} ดวง · {totalPages} แผ่น</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handlePrint} className={`w-full text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md ${mode === 'film' ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-300' : mode === 'coupon' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
              <Printer size={20} />
              <span>สั่งพิมพ์</span>
            </button>

            <button onClick={handleSavePDF} disabled={isGeneratingPDF} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isGeneratingPDF ? <Loader2 className="animate-spin text-slate-500" size={20} /> : <Download size={20} className="text-slate-500" />}
              <span>{isGeneratingPDF ? 'กำลังสร้าง PDF...' : 'บันทึก PDF'}</span>
            </button>
          </div>
          <p className="text-center text-xs text-slate-600">
            ตั้งเครื่องพิมพ์เป็น A4 และเลือกไม่มีระยะขอบ
          </p>
        </div>
      </aside>

      {mode === 'film' && selectedFilmSettings && (
        <aside
          id="film-settings-panel"
          ref={settingsPanelRef}
          aria-labelledby="film-settings-heading"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeFilmSettings();
            }
          }}
          className="fixed top-2 right-0 z-30 flex max-h-[calc(100dvh_-_1rem)] w-[min(var(--film-settings-width),calc(100%_-_1rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl lg:right-auto lg:left-[var(--print-menu-width)] print:hidden"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
            <selectedFilmSettings.icon size={19} className="shrink-0 text-blue-600" aria-hidden="true" />
            <h2 id="film-settings-heading" ref={settingsHeadingRef} tabIndex={-1} className="flex-1 text-base font-bold text-slate-900 outline-none">
              {selectedFilmSettings.title}
            </h2>
            <button type="button" aria-label="ปิดแผงตั้งค่า" onClick={closeFilmSettings} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
              <X size={19} aria-hidden="true" />
            </button>
          </header>
          <div key={selectedFilmSettings.id} className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4">
            {selectedFilmSettings.content}
          </div>
        </aside>
      )}

      {/* Main Preview Area */}
      <main ref={printPreviewRef} className={`min-w-0 flex-1 overflow-auto bg-slate-100 p-4 md:p-8 print:block print:overflow-visible print:bg-white print:p-0 ${fitPrintPreview ? 'print-preview-fit lg:h-dvh lg:self-start print:h-auto' : ''}`}>
        <div className="print-preview-pages mx-auto w-max space-y-8 print:w-auto print:space-y-0">
        {pagesArray.map((pageIndex) => {
          const pageStartSlot = pageIndex * totalSlots + 1;
          const pageColumns = mode === 'business-card' ? 2 : mode === 'coupon' ? 1 : gridCols;
          const pageRows = mode === 'business-card' ? 5 : mode === 'coupon' ? 6 : gridRows;
          const printedSlotIndexes = slots.filter((slotIndex) => {
            const slotNumber = pageStartSlot + slotIndex - 1;
            return slotNumber >= startPos && slotNumber < startPos + quantity;
          });
          const printedColumns = new Set(printedSlotIndexes.map((slotIndex) => (slotIndex - 1) % pageColumns));
          const printedRows = new Set(printedSlotIndexes.map((slotIndex) => Math.floor((slotIndex - 1) / pageColumns)));
          const verticalMarkPositions = Array.from({ length: pageColumns + 1 }, (_, index) => index)
            .filter((boundary) => printedColumns.has(boundary - 1) || printedColumns.has(boundary));
          const horizontalMarkPositions = Array.from({ length: pageRows + 1 }, (_, index) => index)
            .filter((boundary) => printedRows.has(boundary - 1) || printedRows.has(boundary));
          
          return (
            <div key={pageIndex} className="print-area mx-auto bg-white shadow-2xl print:shadow-none print-area-bg relative box-border" style={printAreaStyle}>
          
          {/* Vertical Marks */}
          {verticalMarkPositions.map((col) => {
            const left = mode === 'business-card'
              ? `calc(15mm + ${col * 90}mm)`
              : mode === 'coupon'
                ? `calc(5mm + ${col * 200}mm)`
                : `calc(5mm + ${col * (200/gridCols)}mm)`;
            return (
              <React.Fragment key={`v-${col}`}>
                <div className="absolute top-0 w-0 h-[5mm] border-l border-slate-400 z-20" style={{ left }} />
                <div className="absolute bottom-0 w-0 h-[5mm] border-l border-slate-400 z-20" style={{ left }} />
              </React.Fragment>
            );
          })}
          {/* Horizontal Marks */}
          {horizontalMarkPositions.map((row) => {
            const top = mode === 'business-card'
              ? `calc(13.5mm + ${row * 54}mm)`
              : mode === 'coupon'
                ? `calc(5mm + ${row * 47.8}mm)`
                : `calc(8.5mm + ${row * (275/gridRows)}mm)`;
            return (
              <React.Fragment key={`h-${row}`}>
                <div className="absolute left-0 h-0 w-[4mm] border-t border-slate-400 z-20" style={{ top }} />
                <div className="absolute right-0 h-0 w-[4mm] border-t border-slate-400 z-20" style={{ top }} />
              </React.Fragment>
            );
          })}

          {/* Grid */}
          <div 
            className={`grid gap-0 border-none w-fit ${mode === 'business-card' ? 'grid-cols-2 grid-rows-5' : mode === 'coupon' ? 'grid-cols-1 grid-rows-6' : ''}`}
            style={mode !== 'business-card' && mode !== 'coupon' ? { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))` } : undefined}
          >
            {slots.map((slotIndex) => {
              const slotNum = pageStartSlot + slotIndex - 1;
              const shouldPrint = slotNum >= startPos && slotNum < startPos + quantity;
              
              return (
                <div 
                  key={slotNum} 
                  className={`relative box-border bg-white overflow-hidden ${shouldPrint ? 'border border-dashed border-slate-300' : 'border border-transparent'}`}
                  style={mode === 'business-card' ? { width: '90mm', height: '54mm' } : mode === 'coupon' ? { width: '200mm', height: '47.8mm' } : { width: `${200/gridCols}mm`, height: `${275/gridRows}mm` }}
                >
                  {shouldPrint ? (
                    <div 
                      className="absolute top-0 left-0"
                      style={{ width: '100%', height: '100%' }}
                    >
                      <div className="absolute inset-0 w-full h-full overflow-hidden">
                      
                      {mode === 'general' && (
                        <>
                          {bgImage ? <img src={bgImage} className="absolute inset-0 w-full h-full object-fill z-0" alt="" /> : <div className="absolute inset-0 w-full h-full bg-white z-0" />}
                          <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                            <span style={{ color: textColor, fontSize: `${fontSize}px`, left: `${textX}%`, top: `${textY}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }} className="font-bold leading-none text-center drop-shadow-md whitespace-nowrap">
                              {modelText}
                            </span>
                          </div>
                        </>
                      )}

                      {mode === 'business-card' && (
                        <>
                          {businessCardImage ? <img src={businessCardImage} className="absolute inset-0 w-full h-full object-fill z-0" alt="" /> : <div className="absolute inset-0 w-full h-full bg-white z-0" />}
                        </>
                      )}

                      {mode === 'coupon' && (
                        <>
                          {couponImage ? <img src={couponImage} className="absolute inset-0 w-full h-full object-fill z-0" alt="" /> : <div className="absolute inset-0 w-full h-full bg-white z-0" />}
                          <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                            <span style={{ color: couponNum1Color, fontSize: `${couponNum1Size}px`, left: `${couponNum1X}%`, top: `${couponNum1Y}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }} className="font-bold leading-none text-center whitespace-nowrap">
                              {couponPrefix}{(couponStartNum + slotNum - 1).toString().padStart(couponNumLength, '0')}
                            </span>
                            <span style={{ color: couponNum2Color, fontSize: `${couponNum2Size}px`, left: `${couponNum2X}%`, top: `${couponNum2Y}%`, transform: 'translate(-50%, -50%)', position: 'absolute' }} className="font-bold leading-none text-center whitespace-nowrap">
                              {couponPrefix}{(couponStartNum + slotNum - 1).toString().padStart(couponNumLength, '0')}
                            </span>
                          </div>
                        </>
                      )}

                      {mode === 'film' && (
                        <div 
                          className="w-full h-full flex items-stretch gap-[2mm] box-border font-sans bg-white text-black z-10 relative"
                          style={{ paddingTop: `${piecePaddingTop}mm`, paddingBottom: `${piecePaddingBottom}mm`, paddingLeft: `${piecePaddingLeft}mm`, paddingRight: `${piecePaddingRight}mm` }}
                        >
                          {filmCompanyLogo.image && !horizontalCompanyLogo && (
                            <div className="relative shrink-0" style={{ width: `${filmCompanyLogoLength / filmCompanyLogo.aspectRatio}mm` }}>
                              <img
                                src={filmCompanyLogo.image}
                                alt={`โลโก้บริษัท ${filmCompanyLogo.name}`}
                                draggable={false}
                                className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
                                style={{ width: `${filmCompanyLogoLength}mm`, height: 'auto', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
                              />
                            </div>
                          )}

                          <div
                            ref={slotNum === Math.max(1, Math.ceil(startPos)) ? filmPrintPreviewRef : null}
                            className="min-w-0 flex-1 flex flex-col justify-start"
                          >
                          {/* Top Header Logos */}
                          <div className="relative z-10 flex justify-between items-start">
                            {/* Main Logo Container */}
                            <div className={`flex items-start justify-start ${horizontalCompanyLogo ? 'max-w-[48%]' : 'max-w-[75%]'}`} style={{ width: `${32 * filmBrandLogoSize / 100}mm` }}>
                              {filmLogo1 && (
                                <img src={filmLogo1} className="max-w-full object-contain object-left-top" style={{ maxHeight: `${12.5 * filmBrandLogoSize / 100}mm` }} alt="Logo" />
                              )}
                            </div>
                            {horizontalCompanyLogo && (
                              <div className="flex w-[32%] max-w-[28mm] shrink-0 justify-center self-center">
                                <img
                                  src={filmCompanyLogo.image}
                                  alt={`โลโก้บริษัท ${filmCompanyLogo.name}`}
                                  draggable={false}
                                  className="h-auto object-contain"
                                  style={{ width: `${filmCompanyLogoSize}%` }}
                                />
                              </div>
                            )}
                            {/* Warranty Badge Container */}
                            <div className={`flex items-start justify-end ${horizontalCompanyLogo ? 'max-w-[18%]' : 'max-w-[25%]'}`} style={{ width: `${9 * filmWarrantyLogoSize / 100}mm` }}>
                              {filmLogo2 && (
                                <img src={filmLogo2} className="max-w-full object-contain object-right-top" style={{ maxHeight: `${8 * filmWarrantyLogoSize / 100}mm` }} alt="Warranty" />
                              )}
                            </div>
                          </div>

                          {/* Film Series Title */}
                          <div className="relative z-10 flex items-baseline w-full">
                            <span style={{ fontSize: `${filmSeriesSize}px` }} className="font-bold leading-tight text-black whitespace-nowrap tracking-tight">{filmSeries}</span>
                            <div className="flex-grow border-b border-dotted border-slate-600 mx-1 mb-[2px]"></div>
                            <span style={{ fontSize: `${filmModelSize}px` }} className="font-bold leading-tight text-black whitespace-nowrap">{filmModel}</span>
                          </div>

                          {/* Spec Rows */}
                          <div className="relative z-10 flex flex-col mt-[1mm] w-full" style={{ fontSize: `${filmSpecSize}px`, rowGap: filmSpecSize > 8 ? '0.4mm' : '0.8mm' }}>
                            {filmSpecs.filter(s => s.visible !== false && s.value && s.value.trim() !== '' && s.value.trim() !== '00').map((spec, i) => (
                              <div key={i} className="flex items-baseline w-full">
                                <span className="min-w-0 break-words font-medium leading-none text-black tracking-tight">{spec.label}</span>
                                <div className="flex-grow border-b border-dotted border-slate-500 mx-1 mb-[1.5px]"></div>
                                <span className="shrink-0 leading-none font-medium text-black whitespace-nowrap">
                                  {spec.value}{specSuffix(spec)}
                                </span>
                              </div>
                            ))}
                          </div>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        ); })}
        </div>
      </main>

      {/* Database Manager Modal */}
      <DatabaseManager 
        isOpen={isDbManagerOpen && isFilmEditUnlocked}
        onClose={() => setIsDbManagerOpen(false)} 
        database={customDatabase} 
        setDatabase={updateDatabase}
      />
    </div>
  );
}
