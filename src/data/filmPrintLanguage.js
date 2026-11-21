export const filmPrintLanguages = [
  { value: 'th', label: 'ไทย' },
  { value: 'en', label: 'English' },
];

const normalize = value => value.trim().toLowerCase()
  .replace(/\s*\/\s*/g, ' / ')
  .replace(/\s+/g, ' ');

function translationMap(rows) {
  return new Map(rows.flatMap(([en, th, ...aliases]) => {
    const translation = { en, th };
    return [en, th, ...aliases].map(text => [normalize(text), translation]);
  }));
}

const headings = translationMap([
  ['Light Transmission (VLT)', 'แสงส่องผ่าน (VLT)', 'vlt', 'Visible Light Transmittance (VLT)', 'Visible Light Transmission (VLT)', 'แสงส่องผ่าน', 'แสงส่องผ่าน (ตัวฟิล์ม)'],
  ['Infrared Rejection (IRR)', 'กันรังสีอินฟราเรด (IRR)', 'irr', 'Infrared Rejected (IRR)', 'การป้องกันรังสีอินฟราเรด'],
  ['UV Rejection (UVR)', 'กันรังสียูวี (UVR)', 'uvr', 'การป้องกันรังสียูวี', 'การป้องกันรังสีอัลตราไวโอเลต'],
  ['Light Reflected (Exterior)', 'สะท้อนแสงด้านนอก', 'Visible Light Reflected (EXT)', 'Visible Light Reflectance (EXT)', 'vlr ext'],
  ['Light Reflected (Interior)', 'สะท้อนแสงด้านใน', 'Visible Light Reflected (INT)', 'Visible Light Reflectance (INT)', 'vlr int'],
  ['Light Reflected (Int / Ext)', 'สะท้อนแสง (ใน / นอก)', 'Visible Light Reflected (INT / EXT)', 'Visible Light Reflectance (INT / EXT)'],
  ['Total Solar Energy Rejected (TSER)', 'ลดพลังงานแสงอาทิตย์รวม (TSER)', 'tser', 't-ser', 'Total Solar Energy Rejected (T-SER)', 'การลดพลังงานความร้อนรวมจากรังสีอาทิตย์'],
  ['Total Solar Energy Rejected at 60°', 'ลดพลังงานแสงอาทิตย์รวมที่ 60°'],
  ['Solar Heat Gain Coefficient (SHGC)', 'สัมประสิทธิ์การรับความร้อน (SHGC)', 'shgc', 'ค่าสัมประสิทธิ์การส่งผ่านความร้อนจากรังสีอาทิตย์'],
  ['Glare Reduction', 'ลดแสงจ้า'],
  ['Thickness', 'ความหนา'],
  ['Nominal Thickness', 'ความหนาระบุ'],
  ['Construction', 'โครงสร้างฟิล์ม'],
  ['Tensile Strength', 'ความต้านแรงดึง'],
  ['Break Strength', 'แรงที่ทำให้ขาด'],
  ['Break Strength (2)', 'แรงที่ทำให้ขาด (2)', 'Break Strength_1'],
  ['Peel Strength', 'แรงลอก'],
  ['Abrasion Resistance', 'ความทนต่อการขัดถู'],
  ['Tear Resistance', 'ความต้านแรงฉีก'],
  // The wavelength units are copied from the sheet headings.
  ['IRR 1400mm', 'กันอินฟราเรด 1400mm'],
  ['IRR 900mm', 'กันอินฟราเรด 900mm', 'IRR 900mm.'],
  ['Color', 'สีฟิล์ม', 'Colour'],
  ['Film Type', 'ประเภทฟิล์ม'],
  ['Suitable For', 'เหมาะสำหรับ'],
  ['Adhesive', 'ชนิดกาว'],
  ['Custom Cutting', 'ตัดลวดลาย'],
  ['Surface', 'ผิวฟิล์ม'],
  ['Privacy', 'การมองผ่าน'],
  ['Test Basis', 'เงื่อนไขการวัด'],
  ['Finish', 'ลายฟิล์ม'],
  ['Installation', 'การติดตั้ง'],
  ['Indoor Service Life', 'อายุใช้งานภายใน'],
  ['Outdoor Service Life', 'อายุใช้งานภายนอก'],
]);

const values = translationMap([
  ['Dark Smoke', 'สีควันบุหรี่เข้ม'],
  ['Light Smoke', 'สีควันบุหรี่อ่อน'],
  ['Bluish', 'โทนอมฟ้า'],
  ['Light Bluish Black', 'สีดำอมฟ้าอ่อน'],
  ['Dark Bluish Black', 'สีดำอมฟ้าเข้ม'],
  ['Light Reflective', 'สีอ่อนแบบสะท้อนแสง'],
  ['Dark Reflective', 'สีเข้มแบบสะท้อนแสง'],
  ['Silver', 'สีเงิน'],
  ['Decorative Frosted Vinyl', 'ไวนิลฝ้าตกแต่งกระจก'],
  ['Glass Doors & Partitions', 'ประตูและฉากกั้นกระจก'],
  ['Clear Permanent Acrylic', 'กาวใสอะคริลิกชนิดติดถาวร'],
  ['Logos & Patterns', 'โลโก้และลวดลาย'],
  ['Smooth Frosted', 'ฝ้าเรียบ'],
  ['Etched Glass Effect', 'ฝ้าแบบกระจกกัดกรด'],
  ['Crystal Sandblast Effect', 'ฝ้าคริสตัลลายพ่นทราย'],
  ['Sandblast Effect', 'ฝ้าลายพ่นทราย'],
  ['Light passes, view blurred', 'แสงผ่าน ช่วยบังสายตา'],
  ['6 mm clear glass', 'กระจกใส 6 มม.'],
  ['Film only', 'ตัวฟิล์ม'],
  ['Dusted Crystal', 'ฝ้าคริสตัลแบบละเอียด'],
  ['Frosted Crystal', 'ฝ้าคริสตัลแบบพ่นทราย'],
  ['Haze', 'ลายฝ้าเรียบ'],
  ['Sandblast', 'ลายพ่นทราย'],
  ['Clear', 'ใส'],
  ['Indoor / Outdoor', 'ภายใน / ภายนอก'],
  ['Indoor only', 'ภายในเท่านั้น'],
  ['N/A', 'ไม่ระบุ', 'NA'],
]);

const modelNotes = {
  'เขียวใส': 'Clear Green',
  'ควันบุหรี่': 'Smoke',
  'ฟ้าใส': 'Clear Blue',
  'ปรอทเขียว': 'Reflective Green',
  'ปรอทฟ้า': 'Reflective Blue',
  'ปรอทเทอร์คงอยส์': 'Reflective Turquoise',
  'ปรอทสีปูนดิบ': 'Reflective Concrete Gray',
  'ชาโดว์': 'Shadow',
  'ปรอทเทา': 'Reflective Gray',
  'ปรอทนิกเกิล': 'Reflective Nickel',
  'ปรอทฟ้าเข้ม': 'Reflective Dark Blue',
  'ไททาเนียม': 'Titanium',
  'ปรอทกราไฟร์': 'Reflective Graphite',
  'ปรอทดำเข้ม': 'Deep Black Reflective',
  'กราไฟร์': 'Graphite',
  'ปรอทน้ำเงิน': 'Reflective Navy',
  'รุ้ง': 'Rainbow',
  'เงา': 'Gloss',
  'ด้าน': 'Matte',
  'ฟิล์มสีเหลืองกันแมลง': 'Yellow Insect-Deterrent Film',
  'ติดรถ': 'Automotive',
};

export function localizeFilmModel(model, language) {
  if (language !== 'en' || !model) return model;
  if (model === 'Rainbow (รุ้ง)') return 'Rainbow';
  return model.replace(/\p{Script=Thai}+(?:\s*\d+%?)?/gu, note => {
    const [, name, number] = /^(\p{Script=Thai}+)\s*(\d+%?)?$/u.exec(note);
    if (!Object.hasOwn(modelNotes, name)) return note;
    return [modelNotes[name], number].filter(Boolean).join(' ');
  });
}

export function localizeFilmSpec(spec, language) {
  let value = values.get(normalize(spec.value))?.[language] ?? spec.value;
  if (language === 'th') {
    value = value.replace(/^up to\s+/i, 'สูงสุด ')
      .replace(/(\d)\s*years?$/i, '$1 ปี')
      .replace(/(\d)\s*mils?$/i, '$1 มิล')
      .replace(/(\d)\s*mm$/i, '$1 มม.');
  } else {
    value = value.replace(/^สูงสุด\s*/u, 'Up to ')
      .replace(/(\d)\s*ปี$/u, (_, number) => `${number} ${/^\s*1\s*ปี$/u.test(value) ? 'year' : 'years'}`)
      .replace(/(\d)\s*มิล$/u, '$1 mil')
      .replace(/(\d)\s*มม\.?$/u, '$1 mm');
  }
  return {
    ...spec,
    label: headings.get(normalize(spec.label))?.[language] ?? spec.label,
    value,
  };
}
