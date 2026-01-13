import React, { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (content: string, fileName: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.tex') && !file.name.endsWith('.txt')) {
      alert('Please upload a .tex or .txt file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileName(file.name);
      onFileSelect(text, file.name);
    };
    reader.readAsText(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  const clearFile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
    onFileSelect('', '');
    // Reset file input value if needed via ref, but state management usually sufficient
  }, [onFileSelect]);

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
        ${isDragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}
        ${fileName ? 'bg-teal-50 border-teal-500' : 'bg-white'}
      `}
      onClick={() => document.getElementById('fileInput')?.click()}
    >
      <input
        type="file"
        id="fileInput"
        className="hidden"
        accept=".tex,.txt"
        onChange={handleChange}
      />
      
      {fileName ? (
        <div className="flex items-center justify-center gap-3 animate-fade-in">
          <FileText className="w-10 h-10 text-teal-600" />
          <div className="text-left">
            <p className="font-semibold text-slate-800">{fileName}</p>
            <p className="text-xs text-teal-600 font-medium">Ready to parse</p>
          </div>
          <button 
            onClick={clearFile}
            className="ml-4 p-2 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">
            Upload LaTeX File
          </h3>
          <p className="text-slate-500 text-sm">
            Drag & drop or click to browse (.tex, .txt)
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
