'use client';

import { useState, useCallback, PropsWithChildren } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, File, X } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  acceptedFiles?: string[];
  maxSize?: number;
  children?: React.ReactNode;
}

export function FileUploader({ onFileUpload, acceptedFiles = ['image/png', 'image/jpeg', 'application/pdf'], maxSize = 5 * 1024 * 1024, children }: PropsWithChildren<FileUploaderProps>) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], fileRejections: FileRejection[]) => {
    setError(null);
    if (fileRejections.length > 0) {
      setError(fileRejections[0].errors[0].message);
      setFile(null);
      return;
    }

    if (accepted.length > 0) {
      const uploadedFile = accepted[0];
      setFile(uploadedFile);
      onFileUpload(uploadedFile);
      // Reset file state after upload to allow re-uploading the same file if needed
      setTimeout(() => setFile(null), 1000);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFiles.reduce((acc, type) => ({...acc, [type]: []}), {}),
    maxSize,
    multiple: false,
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setError(null);
  };
  
  if (children) {
      return (
          <div {...getRootProps()} className="cursor-pointer">
              <input {...getInputProps()} />
              {children}
          </div>
      )
  }

  return (
    <div className="w-full">
      {file ? (
        <div className="w-full min-h-[12rem] relative flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-primary/50 bg-primary/10">
          <div className="text-center">
            <File className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-2 text-sm text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button onClick={removeFile} className="absolute top-2 right-2 p-1 rounded-full bg-destructive/50 text-destructive-foreground hover:bg-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`w-full min-h-[12rem] flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed transition-colors ${
            isDragActive ? 'border-accent bg-accent/10' : 'border-primary/50 hover:border-accent'
          } cursor-pointer`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`h-12 w-12 transition-colors ${isDragActive ? 'text-accent' : 'text-primary'}`} />
          <p className="mt-4 text-center">
            {isDragActive ? 'Drop the file here...' : "Drag 'n' drop a file here, or click to select"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {acceptedFiles.map(f => f.split('/')[1].toUpperCase()).join(', ')} up to {maxSize / 1024 / 1024}MB
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
