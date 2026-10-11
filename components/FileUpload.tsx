'use client';

import React, { useState } from 'react';

export interface FileUploadProps {
  onUploadSuccess?: (uploadedKey: string) => void;
  className?: string;
}

export function FileUpload({ onUploadSuccess, className = '' }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string>('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);
    setUploadedKey(null);
    setProgressText('Requesting presigned upload URL...');

    try {
      // Step 1: Request presigned upload URL from API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const { uploadUrl, key } = (await response.json()) as {
        uploadUrl: string;
        key: string;
      };

      if (!uploadUrl) {
        throw new Error('No uploadUrl returned by server.');
      }

      // Step 2: Upload file directly to Cloudflare R2 using PUT request
      setProgressText('Uploading file directly to Cloudflare R2...');
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Direct R2 upload failed with status ${uploadResponse.status}`);
      }

      setProgressText('Upload complete!');
      setUploadedKey(key);
      if (onUploadSuccess) {
        onUploadSuccess(key);
      }
    } catch (err: any) {
      console.error('[FileUpload Error]:', err);
      setErrorMessage(err?.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`p-4 border border-gray-200 rounded-lg max-w-md ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload File to Cloudflare R2
      </label>
      <input
        type="file"
        disabled={isUploading}
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 cursor-pointer"
      />

      {isUploading && (
        <p className="mt-2 text-sm text-blue-600 animate-pulse">{progressText}</p>
      )}

      {uploadedKey && !isUploading && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
          <strong>Uploaded Successfully:</strong> {uploadedKey}
        </div>
      )}

      {errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Upload Error:</strong> {errorMessage}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
