import React, { useState } from 'react';
import { X, Plus, Trash2, RotateCcw, Pencil, Save, XCircle, DownloadCloud } from 'lucide-react';
import Papa from 'papaparse';
import { filmDatabase as defaultDatabase } from '../data/filmDatabase';

export default function DatabaseManager({ isOpen, onClose, database, setDatabase }) {
  const [newBrand, setNewBrand] = useState('');
  const [newSeries, setNewSeries] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newVlt, setNewVlt] = useState('');
  const [newIrr, setNewIrr] = useState('');
  const [newUvr, setNewUvr] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  
  const [csvUrl, setCsvUrl] = useState(() => localStorage.getItem('csvUrl') || '');
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSyncCsv = async () => {
    if (!csvUrl) {
      alert('กรุณาใส่ลิงก์ CSV จาก Google Sheets');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบลิงก์ (ต้องเป็นลิงก์ Publish to web รูปแบบ CSV)');
      const text = await res.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
             console.error(results.errors);
             alert('พบข้อผิดพลาดในการอ่านรูปแบบ CSV');
             setIsSyncing(false);
             return;
          }
          
          const newData = results.data.map(row => {
             const { brand, series, model, ...otherSpecs } = row;
             const specs = {};
             // Keep everything dynamic, lowercase keys for consistency
             Object.keys(otherSpecs).forEach(key => {
               if (otherSpecs[key] && otherSpecs[key].trim() !== '') {
                 specs[key.toLowerCase()] = otherSpecs[key].trim();
               }
             });
             // provide defaults for legacy form edit compatibility
             if (!specs.vlt) specs.vlt = '';
             if (!specs.irr) specs.irr = '';
             if (!specs.uvr) specs.uvr = '';
             
             return {
               brand: brand || '',
               series: series || '',
               model: model || '',
               specs
             };
          }).filter(item => item.brand && item.series && item.model);
          
          if (newData.length > 0) {
             setDatabase(newData);
             localStorage.setItem('csvUrl', csvUrl);
             alert(`ซิงค์ข้อมูลสำเร็จ! ดึงข้อมูลมาได้ ${newData.length} รายการ`);
          } else {
             alert('ไม่พบข้อมูล หรือรูปแบบคอลัมน์ใน CSV ไม่ถูกต้อง (ต้องมีหัวคอลัมน์ brand, series, model)');
          }
          setIsSyncing(false);
        }
      });
    } catch (err) {
      alert(err.message);
      setIsSyncing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newBrand || !newSeries || !newModel) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    const itemData = {
      brand: newBrand.trim(),
      series: newSeries.trim(),
      model: newModel.trim(),
      specs: {
        vlt: newVlt.trim() || '00',
        irr: newIrr.trim() || '00',
        uvr: newUvr.trim() || '00'
      }
    };
    
    if (editIndex !== null) {
      // Update existing
      setDatabase(prev => {
        const newData = [...prev];
        newData[editIndex] = itemData;
        return newData;
      });
      setEditIndex(null);
    } else {
      // Add new
      setDatabase(prev => [itemData, ...prev]);
    }
    
    setNewBrand('');
    setNewSeries('');
    setNewModel('');
    setNewVlt('');
    setNewIrr('');
    setNewUvr('');
  };

  const handleEditClick = (index) => {
    const item = database[index];
    setNewBrand(item.brand);
    setNewSeries(item.series);
    setNewModel(item.model);
    setNewVlt(item.specs?.vlt || '');
    setNewIrr(item.specs?.irr || '');
    setNewUvr(item.specs?.uvr || '');
    setEditIndex(index);
  };

  const handleCancelEdit = () => {
    setNewBrand('');
    setNewSeries('');
    setNewModel('');
    setNewVlt('');
    setNewIrr('');
    setNewUvr('');
    setEditIndex(null);
  };

  const handleDelete = (indexToDelete) => {
    if (confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) {
      if (editIndex === indexToDelete) handleCancelEdit();
      setDatabase(prev => prev.filter((_, idx) => idx !== indexToDelete));
    }
  };

  const handleReset = () => {
    if (confirm('ต้องการคืนค่าฐานข้อมูลเริ่มต้นทั้งหมดหรือไม่? ข้อมูลที่คุณเพิ่มเองจะหายไปทั้งหมด')) {
      setDatabase(defaultDatabase);
      handleCancelEdit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">⚙️ จัดการฐานข้อมูลรุ่นฟิล์ม</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 flex flex-col md:flex-row gap-8 bg-slate-50">
          
          {/* Left: Add Form */}
          <div className="w-full md:w-1/3 space-y-6">
            <div className={`p-5 rounded-xl border shadow-sm transition-colors ${editIndex !== null ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 border-b pb-2 ${editIndex !== null ? 'text-amber-800 border-amber-200' : 'text-slate-800 border-slate-200'}`}>
                {editIndex !== null ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ยี่ห้อ (Brand)</label>
                  <input type="text" value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="เช่น 3M, Lamina" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อซีรีส์ (Series)</label>
                  <input type="text" value={newSeries} onChange={e => setNewSeries(e.target.value)} placeholder="เช่น Ceramic Absolute" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">รุ่น (Model)</label>
                  <input type="text" value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="เช่น CM20" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" />
                </div>
                
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-2">ค่าสเปค (ปล่อยว่างได้)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1 text-center">VLT (%)</label>
                      <input type="text" value={newVlt} onChange={e => setNewVlt(e.target.value)} placeholder="00" className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1 text-center">IRR (%)</label>
                      <input type="text" value={newIrr} onChange={e => setNewIrr(e.target.value)} placeholder="00" className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1 text-center">UVR (%)</label>
                      <input type="text" value={newUvr} onChange={e => setNewUvr(e.target.value)} placeholder="00" className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm bg-white" />
                    </div>
                  </div>
                </div>
                
                {editIndex !== null ? (
                  <div className="flex space-x-2 pt-2">
                    <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center transition-colors">
                      <Save size={18} className="mr-1" /> บันทึก
                    </button>
                    <button type="button" onClick={handleCancelEdit} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2.5 rounded-lg flex items-center justify-center transition-colors">
                      <XCircle size={18} className="mr-1" /> ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center transition-colors mt-2">
                    <Plus size={18} className="mr-1" /> เพิ่มข้อมูล
                  </button>
                )}
              </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
                <DownloadCloud size={18} className="mr-2 text-green-600" /> ซิงค์จาก Google Sheets
              </h3>
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">ลิงก์ CSV (Publish to web)</label>
                <input type="text" value={csvUrl} onChange={e => setCsvUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-slate-50" />
              </div>
              <button onClick={handleSyncCsv} disabled={isSyncing} className={`w-full ${isSyncing ? 'bg-slate-400' : 'bg-green-600 hover:bg-green-700'} text-white font-semibold py-2.5 rounded-lg flex items-center justify-center transition-colors`}>
                <DownloadCloud size={18} className={`mr-2 ${isSyncing ? 'animate-bounce' : ''}`} /> {isSyncing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูล (Sync)'}
              </button>
            </div>

            <button onClick={handleReset} className="w-full bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-600 font-medium py-3 rounded-xl flex items-center justify-center transition-colors border border-slate-300 hover:border-red-300">
              <RotateCcw size={18} className="mr-2" /> คืนค่าเริ่มต้น (Reset Default)
            </button>
          </div>

          {/* Right: Data Table */}
          <div className="w-full md:w-2/3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
              <h3 className="text-md font-semibold text-slate-800">รายการทั้งหมด ({database.length})</h3>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-slate-600 border-b">ยี่ห้อ</th>
                    <th className="py-3 px-4 font-semibold text-slate-600 border-b">ซีรีส์</th>
                    <th className="py-3 px-4 font-semibold text-slate-600 border-b">รุ่น</th>
                    <th className="py-3 px-4 font-semibold text-slate-600 border-b hidden sm:table-cell">สเปค</th>
                    <th className="py-3 px-4 font-semibold text-slate-600 border-b w-24 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {database.map((item, idx) => (
                    <tr key={idx} className={`border-b transition-colors ${editIndex === idx ? 'bg-amber-50 border-amber-200' : 'hover:bg-slate-50 border-slate-100'}`}>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{item.brand}</td>
                      <td className="py-2.5 px-4 text-slate-600">{item.series}</td>
                      <td className="py-2.5 px-4 text-slate-600">{item.model}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-400 hidden sm:table-cell">
                        {item.specs ? `${item.specs.vlt}/${item.specs.irr}/${item.specs.uvr}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button onClick={() => handleEditClick(idx)} className={`p-1.5 rounded transition-colors ${editIndex === idx ? 'text-amber-600 bg-amber-100' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`} title="แก้ไข">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(idx)} className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded hover:bg-red-50" title="ลบ">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {database.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-500">ไม่มีข้อมูลในระบบ</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
