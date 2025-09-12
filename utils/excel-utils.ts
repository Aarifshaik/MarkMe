// import * as XLSX from 'xlsx';
// import { Student } from '@/types/attendance';

// export const parseExcelFile = (file: File): Promise<Student[]> => {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
    
//     reader.onload = (e) => {
//       try {
//         const data = new Uint8Array(e.target?.result as ArrayBuffer);
//         const workbook = XLSX.read(data, { type: 'array' });
//         const worksheet = workbook.Sheets[workbook.SheetNames[0]];
//         const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
//         const students: Student[] = [];
        
//         // Skip header row if it exists
//         const startRow = jsonData.length > 0 && typeof jsonData[0][0] === 'string' 
//           && isNaN(Number(jsonData[0][0])) ? 1 : 0;
        
//         for (let i = startRow; i < jsonData.length; i++) {
//           const row = jsonData[i] as any[];
//           if (row && row[0]) {
//             students.push({
//               regNo: String(row[0]).trim(),
//               name: row[1] ? String(row[1]).trim() : undefined,
//               status: null
//             });
//           }
//         }
        
//         resolve(students);
//       } catch (error) {
//         reject(new Error('Failed to parse Excel file'));
//       }
//     };
    
//     reader.onerror = () => reject(new Error('Failed to read file'));
//     reader.readAsArrayBuffer(file);
//   });
// };

// export const exportAttendanceToExcel = (students: Student[], fileName: string = 'attendance') => {
//   const data = [
//     ['Registration Number', 'Name', 'Status'],
//     ...students.map(student => [
//       student.regNo,
//       student.name || '',
//       student.status ? (student.status === 'present' ? 'Present' : 'Absent') : 'Not Marked'
//     ])
//   ];

//   const worksheet = XLSX.utils.aoa_to_sheet(data);
  
//   // Set column widths
//   worksheet['!cols'] = [
//     { width: 20 },
//     { width: 25 },
//     { width: 15 }
//   ];

//   // Apply styling (basic coloring based on status)
//   const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
//   for (let row = 1; row <= range.e.r; row++) {
//     const statusCell = `C${row + 1}`;
//     const cell = worksheet[statusCell];
    
//     if (cell && cell.v) {
//       if (cell.v === 'Present') {
//         cell.s = {
//           fill: { fgColor: { rgb: 'D4F6D4' } },
//           font: { color: { rgb: '166534' } }
//         };
//       } else if (cell.v === 'Absent') {
//         cell.s = {
//           fill: { fgColor: { rgb: 'FED7D7' } },
//           font: { color: { rgb: 'DC2626' } }
//         };
//       }
//     }
//   }

//   const workbook = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  
//   const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
//   XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`);
// };




import * as XLSX from 'xlsx';
import { Student } from '@/types/attendance';

export const parseExcelFile = (file: File): Promise<Student[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Cast to array of arrays
        const jsonData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, { header: 1 });

        const students: Student[] = [];
        
        // Skip header row if it looks like text (not a reg number)
        const startRow =
          jsonData.length > 0 &&
          typeof jsonData[0][0] === 'string' &&
          isNaN(Number(jsonData[0][0]))
            ? 1
            : 0;
        
        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row[0]) {
            students.push({
              regNo: String(row[0]).trim(),
              name: row[1] ? String(row[1]).trim() : undefined,
              status: null,
            });
          }
        }
        
        resolve(students);
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const exportAttendanceToExcel = (
  students: Student[],
  fileName: string = 'attendance'
) => {
  const data = [
    ['Registration Number', 'Name', 'Status'],
    ...students.map((student) => [
      student.regNo,
      student.name || '',
      student.status
        ? student.status === 'present'
          ? 'Present'
          : 'Absent'
        : 'Not Marked',
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { width: 20 },
    { width: 25 },
    { width: 15 },
  ];

  // Apply styling (basic coloring based on status)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let row = 1; row <= range.e.r; row++) {
    const statusCell = `C${row + 1}`;
    const cell = worksheet[statusCell];

    if (cell && cell.v) {
      if (cell.v === 'Present') {
        (cell as any).s = {
          fill: { fgColor: { rgb: 'D4F6D4' } },
          font: { color: { rgb: '166534' } },
        };
      } else if (cell.v === 'Absent') {
        (cell as any).s = {
          fill: { fgColor: { rgb: 'FED7D7' } },
          font: { color: { rgb: 'DC2626' } },
        };
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`);
};
