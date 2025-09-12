'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { parseExcelFile } from '@/utils/excel-utils';
import { useAttendanceStore } from '@/store/attendance-store';
import { toast } from 'sonner';

export default function FileUpload() {
  const setStudents = useAttendanceStore(state => state.setStudents);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    try {
      const students = await parseExcelFile(file);
      if (students.length === 0) {
        toast.error('No valid student data found in the file');
        return;
      }
      
      setStudents(students);
      toast.success(`Successfully loaded ${students.length} students`);
    } catch (error) {
      toast.error('Failed to parse file. Please check the format.');
      console.error(error);
    }
  }, [setStudents]);
  
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Classroom Attendance
        </h1>
        <p className="text-lg text-gray-600">
          Upload your student list to begin automated attendance tracking
        </p>
      </div>
      
      <motion.div
        {...getRootProps()}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragActive && !isDragReject 
            ? 'border-blue-400 bg-blue-50' 
            : isDragReject
            ? 'border-red-400 bg-red-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="space-y-4"
        >
          {isDragReject ? (
            <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
          ) : (
            <FileSpreadsheet className="mx-auto h-16 w-16 text-blue-500" />
          )}
          
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isDragActive 
                ? isDragReject
                  ? 'File type not supported'
                  : 'Drop the file here'
                : 'Upload Student List'
              }
            </h3>
            
            {!isDragActive && (
              <p className="text-gray-600">
                Drag and drop your Excel file here, or click to browse
              </p>
            )}
          </div>
          
          {!isDragActive && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <Upload className="mr-2 h-5 w-5" />
              Choose File
            </motion.button>
          )}
        </motion.div>
      </motion.div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <p className="mb-2">Supported formats: Excel (.xlsx, .xls) and CSV (.csv)</p>
        <p>
          Expected format: Registration Number in first column, 
          optional Name in second column
        </p>
      </div>
    </motion.div>
  );
}