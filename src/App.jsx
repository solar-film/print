import React, { useState, useRef, useEffect } from 'react';
import { Settings, Image as ImageIcon, Type, Move, Printer, Download, LayoutGrid, FileText, CreditCard, Plus, Trash2, ArrowRight, Hash, Database, Search, ChevronDown, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { filmDatabase } from './data/filmDatabase';
import DatabaseManager from './components/DatabaseManager';

// Load all images from the templates directory automatically
const templateFiles = import.meta.glob('./assets/templates/*.{png,jpg,jpeg,svg,webp,PNG,JPG,JPEG}', { eager: true, import: 'default' });
const predefinedTemplates = Object.keys(templateFiles).map((path, index) => {
  const filename = path.split('/').pop();
  return { id: index, name: filename, url: templateFiles[path] };
});

const logoFiles = import.meta.glob('./assets/film-logos/*.{png,jpg,jpeg,svg,webp,PNG,JPG,JPEG}', { eager: true, import: 'default' });
const predefinedLogos = Object.keys(logoFiles).map((path, index) => {
  const filename = path.split('/').pop();
  return { id: index, name: filename, url: logoFiles[path] };
});

const warrantyFiles = import.meta.glob('./assets/film-warranties/*.{png,jpg,jpeg,svg,webp,PNG,JPG,JPEG}', { eager: true, import: 'default' });
const predefinedWarranties = Object.keys(warrantyFiles).map((path, index) => {
  const filename = path.split('/').pop();
  return { id: index, name: filename, url: warrantyFiles[path] };
});

export default function App() {
  const [mode, setMode] = useState('general'); // 'general' | 'film'

  // General Mode State
  const [modelText, setModelText] = useState('SH2FGIM');
  const [bgImage, setBgImage] = useState(null);
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(33);
  const [textX, setTextX] = useState(49); // percentage
  const [textY, setTextY] = useState(59); // percentage
  
  // Film Mode State
  const [filmSeries, setFilmSeries] = useState('');
  const [filmSeriesSize, setFilmSeriesSize] = useState(10);
  const [filmModel, setFilmModel] = useState('');
  const [filmModelSize, setFilmModelSize] = useState(12);
  const [filmSpecs, setFilmSpecs] = useState([
    { label: 'Solar Heat Gain Coefficient (SHGC)', value: '' },
    { label: 'Nominal Thickness', value: '' },
    { label: 'Infrared Rejected (IRR)', value: '' },
    { label: 'UV Rejection (UVR)', value: '' },
    { label: 'Total Solar Energy Rejected (T-SER)', value: '' },
    { label: 'Visible Light Transmittance (VLT)', value: '' },
    { label: 'Visible light reflectance (INT)', value: '' },
    { label: 'Visible light reflectance (EXT)', value: '' },
    { label: 'Construction', value: '' }
  ]);
  
  const [filmLogo1, setFilmLogo1] = useState(null);
  const [filmLogo2, setFilmLogo2] = useState(null);

  // Business Card State
  const [businessCardImage, setBusinessCardImage] = useState(null);

  // Database State
  const [customDatabase, setCustomDatabase] = useState(() => {
    const saved = localStorage.getItem('filmDatabase');
    if (saved) {
      const parsed = JSON.parse(saved);
      const version = localStorage.getItem('dbVersion');
      if (version !== 'v8') {
        localStorage.setItem('dbVersion', 'v8');
        return filmDatabase; // Force migrate to include specs
      }
      return parsed;
    }
    return filmDatabase;
  });
  const [isDbManagerOpen, setIsDbManagerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Grid Settings
  const [gridCols, setGridCols] = useState(4);
  const [gridRows, setGridRows] = useState(8);

  const [piecePaddingTop, setPiecePaddingTop] = useState(0.5);
  const [piecePaddingBottom, setPiecePaddingBottom] = useState(0.5);
  const [piecePaddingLeft, setPiecePaddingLeft] = useState(2);
  const [piecePaddingRight, setPiecePaddingRight] = useState(2);

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
      alert('สำหรับ iPhone/iPad:\nให้กดปุ่มแชร์ (Share) ที่ด้านล่างจอ\nแล้วเลือก "เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen) ครับ');
    }
  };

  const EDIT_URL = 'https://docs.google.com/spreadsheets/d/1Xc4EY34N1u75-N899BUnb4Rrkv-1qq189R1Gqp94aIg/edit';
  const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKDKVr3RKTRAp3KauC7AYBEcVq4coI9gss_O5iXyIr3mk8M1SA1KNkKy56J40J0xU-lyc3Tbs8HExa/pub?output=csv';

  const syncFromGoogleSheets = async (silent = false) => {
    setIsSyncing(true);
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error('Cannot fetch');
      const text = await res.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length === 0) {
            const newData = results.data.map(row => {
               const { brand, series, model, ...otherSpecs } = row;
               const specs = {};
               Object.keys(otherSpecs).forEach(key => {
                 if (otherSpecs[key] && otherSpecs[key].trim() !== '') {
                   specs[key.toLowerCase()] = otherSpecs[key].trim();
                 }
               });
               return { brand: brand || '', series: series || '', model: model || '', specs };
            }).filter(item => item.brand && item.series && item.model);
            
            if (newData.length > 0) {
               setCustomDatabase(newData);
               if (!silent) alert(`อัปเดตข้อมูลล่าสุดแล้ว (${newData.length} รายการ)`);
            }
          }
          setIsSyncing(false);
        }
      });
    } catch (err) {
      console.error('Auto sync failed:', err);
      setIsSyncing(false);
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
    localStorage.setItem('filmDatabase', JSON.stringify(customDatabase));
  }, [customDatabase]);

  // Common Layout State
  const [quantity, setQuantity] = useState(32);
  const [startPos, setStartPos] = useState(1);
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printAreaRef = useRef(null);

  // Handlers
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
    newSpecs[index].value = newValue;
    setFilmSpecs(newSpecs);
  };

  const handleSpecToggle = (index, isVisible) => {
    const newSpecs = [...filmSpecs];
    newSpecs[index].visible = isVisible;
    setFilmSpecs(newSpecs);
  };

  const handlePrint = () => {
    window.print();
  };
  
  const handleSavePDF = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPDF(true);
      const imgData = await toPng(printAreaRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save('sticker-layout.pdf');
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const totalSlots = mode === 'business-card' ? 10 : gridCols * gridRows;
  const slots = Array.from({ length: totalSlots }, (_, i) => i + 1);

  const printAreaStyle = mode === 'business-card' 
    ? { width: '210mm', height: '297mm', paddingTop: '13.5mm', paddingLeft: '15mm', paddingRight: '15mm' }
    : { width: '210mm', height: '297mm', paddingTop: '8.5mm', paddingLeft: '5mm', paddingRight: '5mm' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Sidebar */}
      <aside className="w-full md:w-[350px] bg-white border-r border-slate-200 shadow-sm flex flex-col h-screen md:sticky top-0 z-10 print:hidden overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <LayoutGrid size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Print Sticker & NameCard</h1>
          </div>
          
          {(deferredPrompt || showIosInstall) && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center justify-center w-full py-2 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all shadow-md"
            >
              <Download size={16} className="mr-2" /> ติดตั้งแอป (Install App)
            </button>
          )}
        </div>

        {/* Mode Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex space-x-2">
          <button 
            onClick={() => setMode('general')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex justify-center items-center ${mode === 'general' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <ImageIcon size={16} className="mr-1" /> ตกแต่ง
          </button>
          <button 
            onClick={() => setMode('film')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex justify-center items-center ${mode === 'film' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <FileText size={16} className="mr-1" /> กรองแสง
          </button>
          <button 
            onClick={() => setMode('business-card')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex justify-center items-center ${mode === 'business-card' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <CreditCard size={16} className="mr-1" /> นามบัตร
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col space-y-6">
          
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
              {/* Film Mode Form */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center"><ImageIcon size={16} className="mr-2" /> โลโก้แบรนด์ (ซ้าย)</span>
                  {filmLogo1 && <button onClick={() => setFilmLogo1(null)} className="text-xs text-red-500 hover:text-red-600 font-medium">นำออก</button>}
                </h2>
                
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  {predefinedLogos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {predefinedLogos.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setFilmLogo1(tpl.url)}
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
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center"><ImageIcon size={16} className="mr-2" /> ตรารับประกัน (ขวา)</span>
                  {filmLogo2 && <button onClick={() => setFilmLogo2(null)} className="text-xs text-red-500 hover:text-red-600 font-medium">นำออก</button>}
                </h2>
                
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  {predefinedWarranties.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {predefinedWarranties.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setFilmLogo2(tpl.url)}
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
              </div>

              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                  <Type size={16} className="mr-2" /> หัวข้อสเปค
                </h2>

                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-2 relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-blue-800">เลือกข้อมูลอัตโนมัติ (Dropdown)</label>
                    <div className="flex space-x-1.5">
                      <button onClick={() => syncFromGoogleSheets(false)} disabled={isSyncing} className="text-[10px] font-medium text-emerald-700 hover:text-emerald-800 flex items-center bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded transition-colors disabled:opacity-50">
                        <RefreshCw size={10} className={`mr-1 ${isSyncing ? 'animate-spin' : ''}`} /> ซิงค์
                      </button>
                      <a href={EDIT_URL} target="_blank" rel="noreferrer" className="text-[10px] font-medium text-blue-600 hover:text-blue-800 flex items-center bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition-colors">
                        <ExternalLink size={10} className="mr-1" /> จัดการ
                      </a>
                    </div>
                  </div>
                  <div className="relative" ref={dropdownRef}>
                    <div 
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white flex justify-between items-center cursor-pointer hover:border-blue-400 transition-colors shadow-sm"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <span className={filmSeries && filmModel ? "text-slate-800 font-medium" : "text-slate-400"}>
                        {filmSeries && filmModel ? `${filmSeries} - ${filmModel}` : '-- พิมพ์เพื่อค้นหา หรือเลือกรุ่นฟิล์ม --'}
                      </span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-slate-100 flex items-center bg-slate-50 sticky top-0">
                          <Search size={14} className="text-slate-400 mr-2" />
                          <input 
                            type="text" 
                            autoFocus
                            placeholder="ค้นหา ยี่ห้อ, ซีรีส์, รุ่น..." 
                            className="w-full text-sm bg-transparent outline-none"
                            value={dropdownSearch}
                            onChange={(e) => setDropdownSearch(e.target.value)}
                          />
                        </div>
                        <div className="overflow-y-auto p-1 flex-1">
                          {customDatabase.filter(f => 
                            `${f.brand} ${f.series} ${f.model}`.toLowerCase().includes(dropdownSearch.toLowerCase())
                          ).length > 0 ? (
                            customDatabase.filter(f => 
                              `${f.brand} ${f.series} ${f.model}`.toLowerCase().includes(dropdownSearch.toLowerCase())
                            ).map((f, i) => (
                              <div 
                                key={i}
                                className="px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded cursor-pointer border-b border-slate-50 last:border-0"
                                onClick={() => {
                                  setFilmSeries(f.series);
                                  setFilmModel(f.model);
                                  if (f.specs) {
                                    const newSpecs = [];
                                    const labelMap = {
                                      'shgc': 'Solar Heat Gain Coefficient (SHGC)',
                                      'thickness': 'Nominal Thickness',
                                      'irr': 'Infrared Rejected (IRR)',
                                      'uvr': 'UV Rejection (UVR)',
                                      'tser': 'Total Solar Energy Rejected (T-SER)',
                                      't-ser': 'Total Solar Energy Rejected (T-SER)',
                                      'vlt': 'Visible Light Transmittance (VLT)',
                                      'int': 'Visible light reflectance (INT)',
                                      'ext': 'Visible light reflectance (EXT)',
                                      'construction': 'Construction'
                                    };
                                    const preferredOrder = ['shgc', 'thickness', 'irr', 'uvr', 'tser', 'vlt', 'intext', 'construction'];
                                    
                                    preferredOrder.forEach(key => {
                                      if (key === 'intext') {
                                        const intVal = f.specs['int'];
                                        const extVal = f.specs['ext'];
                                        const hasInt = intVal && intVal !== '00' && intVal !== '';
                                        const hasExt = extVal && extVal !== '00' && extVal !== '';
                                        
                                        if (hasInt && hasExt) {
                                          newSpecs.push({ label: 'Visible light reflectance (INT/EXT)', value: `${intVal}% / ${extVal}` });
                                        } else if (hasInt) {
                                          newSpecs.push({ label: labelMap['int'], value: intVal });
                                        } else if (hasExt) {
                                          newSpecs.push({ label: labelMap['ext'], value: extVal });
                                        }
                                      } else {
                                        const val = f.specs[key] || f.specs[key.replace('-', '')];
                                        if (val && val !== '00' && val !== '') {
                                          newSpecs.push({ label: labelMap[key] || key, value: val });
                                        }
                                      }
                                    });
                                    
                                    Object.keys(f.specs).forEach(key => {
                                      const normalizedKey = key.toLowerCase();
                                      if (!preferredOrder.includes(normalizedKey) && !['t-ser', 'int', 'ext'].includes(normalizedKey) && f.specs[key] && f.specs[key] !== '00' && f.specs[key] !== '') {
                                        newSpecs.push({ label: key, value: f.specs[key] });
                                      }
                                    });
                                    setFilmSpecs(newSpecs);
                                  } else {
                                    setFilmSpecs([]);
                                  }
                                  setIsDropdownOpen(false);
                                  setDropdownSearch('');
                                }}
                              >
                                <span className="font-semibold text-blue-800 text-[10px] uppercase tracking-wider mr-2 bg-blue-100 px-1.5 py-0.5 rounded">{f.brand}</span>
                                <span>{f.series} - <span className="font-medium text-slate-900">{f.model}</span></span>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-6 text-center text-sm text-slate-400">ไม่พบผลลัพธ์ที่ค้นหา</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700">ชื่อซีรีส์ (ซ้าย)</label>
                    <input type="text" value={filmSeries} onChange={(e) => setFilmSeries(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-slate-500">ขนาด:</span>
                      <input type="range" min="6" max="24" step="0.5" value={filmSeriesSize} onChange={(e) => setFilmSeriesSize(Number(e.target.value))} className="w-full accent-slate-600" />
                      <span className="text-[10px] text-slate-500 w-6 text-right">{filmSeriesSize}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700">รุ่น (ขวา)</label>
                    <input type="text" value={filmModel} onChange={(e) => setFilmModel(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-slate-500">ขนาด:</span>
                      <input type="range" min="6" max="24" step="0.5" value={filmModelSize} onChange={(e) => setFilmModelSize(Number(e.target.value))} className="w-full accent-slate-600" />
                      <span className="text-[10px] text-slate-500 w-6 text-right">{filmModelSize}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-amber-50/80 p-4 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                <div className="flex flex-col mb-1">
                  <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center">
                    <Settings size={16} className="mr-2 text-amber-600" /> ค่าสเปค (%)
                  </h2>
                  <p className="text-[11px] text-amber-700 leading-snug mt-1 font-medium">
                    ⚠️ ตรวจสอบและแก้ไขค่าให้ตรงรุ่นก่อนพิมพ์
                  </p>
                </div>
                <div className="space-y-2 mt-2">
                  {filmSpecs.map((spec, idx) => (
                    <div key={idx} className={`flex items-center justify-between space-x-2 transition-opacity ${spec.visible === false ? 'opacity-50' : 'opacity-100'}`}>
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <input type="checkbox" checked={spec.visible !== false} onChange={(e) => handleSpecToggle(idx, e.target.checked)} className="w-3.5 h-3.5 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer" />
                        <label className={`text-xs font-medium truncate cursor-pointer ${spec.visible === false ? 'text-slate-500 line-through' : 'text-amber-900'}`} title={spec.label} onClick={() => handleSpecToggle(idx, spec.visible === false)}>{spec.label}</label>
                      </div>
                      <div className={`flex items-center w-[110px] shrink-0 bg-white rounded shadow-sm border focus-within:ring-2 focus-within:ring-amber-500 ${spec.visible === false ? 'border-slate-200' : 'border-amber-200'}`}>
                        <input type="text" value={spec.value} onChange={(e) => handleSpecChange(idx, e.target.value)} disabled={spec.visible === false} className="w-full px-2 py-1 text-sm text-right outline-none bg-transparent font-semibold text-slate-800 disabled:text-slate-500" />
                        <span className={`text-xs font-bold pr-2 ${spec.visible === false ? 'text-slate-400' : 'text-amber-600'}`}>{spec.label.includes('SHGC') || spec.label.includes('Thickness') || spec.label.includes('Construction') || /[a-zA-Z%]$/.test(spec.value) ? '' : '%'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

          {/* Common Layout Settings */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center">
              <Settings size={16} className="mr-2" /> การตั้งค่าการพิมพ์
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                  <Hash size={14} className="mr-1 text-slate-400" /> จำนวนดวง
                </label>
                <input type="number" min="1" max={totalSlots} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center" title="เริ่มพิมพ์จากช่องที่ N">
                  <ArrowRight size={14} className="mr-1 text-slate-400" /> เริ่มตำแหน่งที่
                </label>
                <input type="number" min="1" max={totalSlots} value={startPos} onChange={(e) => setStartPos(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            
            {mode !== 'business-card' && (
              <>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนคอลัมน์ (แนวนอน)</label>
                    <input type="number" min="1" max="10" value={gridCols} onChange={(e) => setGridCols(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนแถว (แนวตั้ง)</label>
                    <input type="number" min="1" max="20" value={gridRows} onChange={(e) => setGridRows(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 mt-3">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ระยะขอบแต่ละดวง (Padding)</label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 text-center">บน (Top)</label>
                      <input type="number" step="0.5" min="0" value={piecePaddingTop} onChange={(e) => setPiecePaddingTop(Number(e.target.value))} className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs text-center font-medium" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 text-center">ล่าง (Bottom)</label>
                      <input type="number" step="0.5" min="0" value={piecePaddingBottom} onChange={(e) => setPiecePaddingBottom(Number(e.target.value))} className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs text-center font-medium" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 text-center">ซ้าย (Left)</label>
                      <input type="number" step="0.5" min="0" value={piecePaddingLeft} onChange={(e) => setPiecePaddingLeft(Number(e.target.value))} className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs text-center font-medium" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 text-center">ขวา (Right)</label>
                      <input type="number" step="0.5" min="0" value={piecePaddingRight} onChange={(e) => setPiecePaddingRight(Number(e.target.value))} className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs text-center font-medium" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-slate-100 bg-white flex flex-col space-y-3">
          <button onClick={handlePrint} className={`w-full text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md ${mode === 'film' ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-300' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
            <Printer size={20} />
            <span>สั่งพิมพ์ (Print)</span>
          </button>
          
          <button onClick={handleSavePDF} disabled={isGeneratingPDF} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isGeneratingPDF ? <Loader2 className="animate-spin text-slate-500" size={20} /> : <Download size={20} className="text-slate-500" />}
            <span>{isGeneratingPDF ? 'กำลังสร้าง PDF...' : 'บันทึก PDF'}</span>
          </button>

          <p className="text-xs text-slate-400 mt-2 text-center">
            * สั่งพิมพ์จริง: ตั้งค่ากระดาษ A4 / Margin: None
          </p>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 p-4 md:p-8 overflow-auto flex justify-center items-start bg-slate-100 print:p-0 print:bg-white print:overflow-visible">
        
        {/* A4 Paper Container */}
        <div ref={printAreaRef} className="print-area bg-white shadow-2xl print:shadow-none print-area-bg relative box-border" style={printAreaStyle}>
          
          {/* Vertical Marks */}
          {mode === 'business-card' ? (
            [0, 1, 2].map((col) => (
              <React.Fragment key={`v-bc-${col}`}>
                <div className="absolute top-0 w-[1px] h-[5mm] bg-slate-400 z-20" style={{ left: `calc(15mm + ${col * 90}mm)` }} />
                <div className="absolute bottom-0 w-[1px] h-[5mm] bg-slate-400 z-20" style={{ left: `calc(15mm + ${col * 90}mm)` }} />
              </React.Fragment>
            ))
          ) : (
            Array.from({ length: gridCols + 1 }).map((_, col) => (
              <React.Fragment key={`v-${col}`}>
                <div className="absolute top-0 w-[1px] h-[5mm] bg-slate-400 z-20" style={{ left: `calc(5mm + ${col * (200/gridCols)}mm)` }} />
                <div className="absolute bottom-0 w-[1px] h-[5mm] bg-slate-400 z-20" style={{ left: `calc(5mm + ${col * (200/gridCols)}mm)` }} />
              </React.Fragment>
            ))
          )}
          {/* Horizontal Marks */}
          {mode === 'business-card' ? (
            [0, 1, 2, 3, 4, 5].map((row) => (
              <React.Fragment key={`h-bc-${row}`}>
                <div className="absolute left-0 h-[1px] w-[4mm] bg-slate-400 z-20" style={{ top: `calc(13.5mm + ${row * 54}mm)` }} />
                <div className="absolute right-0 h-[1px] w-[4mm] bg-slate-400 z-20" style={{ top: `calc(13.5mm + ${row * 54}mm)` }} />
              </React.Fragment>
            ))
          ) : (
            Array.from({ length: gridRows + 1 }).map((_, row) => (
              <React.Fragment key={`h-${row}`}>
                <div className="absolute left-0 h-[1px] w-[4mm] bg-slate-400 print:bg-black z-20" style={{ top: `calc(8.5mm + ${row * (280/gridRows)}mm)` }} />
                <div className="absolute right-0 h-[1px] w-[4mm] bg-slate-400 print:bg-black z-20" style={{ top: `calc(8.5mm + ${row * (280/gridRows)}mm)` }} />
              </React.Fragment>
            ))
          )}

          {/* Grid */}
          <div 
            className={`grid gap-0 border-none w-fit ${mode === 'business-card' ? 'grid-cols-2 grid-rows-5' : ''}`}
            style={mode !== 'business-card' ? { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))` } : undefined}
          >
            {slots.map((slotNum) => {
              const shouldPrint = slotNum >= startPos && slotNum < startPos + quantity;
              
              return (
                <div 
                  key={slotNum} 
                  className="relative border border-dashed border-slate-300 box-border bg-white overflow-hidden" 
                  style={mode === 'business-card' ? { width: '90mm', height: '54mm' } : { width: `${200/gridCols}mm`, height: `${280/gridRows}mm` }}
                >
                  {shouldPrint ? (
                    <div 
                      className="absolute top-0 left-0"
                      style={mode === 'business-card' ? { width: '100%', height: '100%' } : { 
                        width: '50mm', 
                        height: '35mm', 
                        transform: `scale(${(200/gridCols)/50}, ${(280/gridRows)/35})`,
                        transformOrigin: 'top left'
                      }}
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

                      {mode === 'film' && (
                        <div 
                          className="w-full h-full flex flex-col justify-start box-border font-sans bg-white text-black z-10 relative"
                          style={{ paddingTop: `${piecePaddingTop}mm`, paddingBottom: `${piecePaddingBottom}mm`, paddingLeft: `${piecePaddingLeft}mm`, paddingRight: `${piecePaddingRight}mm` }}
                        >
                          {/* Top Header Logos */}
                          <div className="flex justify-between items-start">
                            {/* Main Logo Container */}
                            <div className="flex items-start justify-start">
                              {filmLogo1 ? (
                                <img src={filmLogo1} className="max-h-[12.5mm] max-w-[32mm] object-contain object-left-top" alt="Logo" />
                              ) : null}
                            </div>
                            {/* Warranty Badge Container */}
                            <div className="flex items-start justify-end">
                              {filmLogo2 ? (
                                <img src={filmLogo2} className="max-h-[8mm] max-w-[9mm] object-contain object-right-top" alt="Warranty" />
                              ) : null}
                            </div>
                          </div>

                          {/* Film Series Title */}
                          <div className="flex items-baseline w-full">
                            <span style={{ fontSize: `${filmSeriesSize}px` }} className="font-bold leading-tight text-black whitespace-nowrap tracking-tight">{filmSeries}</span>
                            <div className="flex-grow border-b border-dotted border-slate-600 mx-1 mb-[2px]"></div>
                            <span style={{ fontSize: `${filmModelSize}px` }} className="font-bold leading-tight text-black whitespace-nowrap">{filmModel}</span>
                          </div>

                          {/* Spec Rows */}
                          <div className="flex flex-col mt-[1.5mm] space-y-[0.8mm] w-full">
                            {filmSpecs.filter(s => s.visible !== false && s.value && s.value.trim() !== '' && s.value.trim() !== '00').map((spec, i) => (
                              <div key={i} className="flex items-baseline w-full">
                                <span className="text-[7px] font-medium leading-[1] text-black whitespace-nowrap tracking-tight">{spec.label}</span>
                                <div className="flex-grow border-b border-dotted border-slate-500 mx-1 mb-[1.5px]"></div>
                                <span className="text-[7px] leading-[1] font-medium text-black whitespace-nowrap">
                                  {spec.value}{spec.label.includes('SHGC') || spec.label.includes('Thickness') || spec.label.includes('Construction') || /[a-zA-Z%]$/.test(spec.value) ? '' : '%'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-slate-200 text-sm print:hidden">{slotNum}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
      </main>

      {/* Database Manager Modal */}
      <DatabaseManager 
        isOpen={isDbManagerOpen} 
        onClose={() => setIsDbManagerOpen(false)} 
        database={customDatabase} 
        setDatabase={setCustomDatabase} 
      />
    </div>
  );
}
