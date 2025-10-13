import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuditLog } from '@/services/auditLogService';
import { toast } from '@/hooks/use-toast';

interface FileUploadResult {
  file: File;
  status: 'pending' | 'scanning' | 'allowed' | 'blocked' | 'error';
  scanResult?: any;
  error?: string;
}

export const FileUploadWithAudit: React.FC = () => {
  const [files, setFiles] = useState<FileUploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auditLog = useAuditLog();

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileUploadResult[] = Array.from(selectedFiles).map(file => ({
      file,
      status: 'pending' as const,
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    // Log file upload initiation
    await auditLog.logFileScan('scan_initiated', {
      file_count: selectedFiles.length,
      file_names: Array.from(selectedFiles).map(f => f.name),
      file_sizes: Array.from(selectedFiles).map(f => f.size),
    });

    // Process each file
    for (let i = 0; i < newFiles.length; i++) {
      await processFile(newFiles[i], files.length + i);
    }
  };

  const processFile = async (fileResult: FileUploadResult, index: number) => {
    const { file } = fileResult;
    
    // Update status to scanning
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'scanning' } : f
    ));

    try {
      // Simulate file scan (replace with actual backend call)
      const scanResult = await simulateFileScan(file);
      
      // Update with scan result
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: scanResult.shouldBlock ? 'blocked' : 'allowed',
          scanResult 
        } : f
      ));

      // Log scan result
      if (scanResult.shouldBlock) {
        await auditLog.logFileScan('file_blocked', {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          block_reason: scanResult.blockReason,
          risk_level: scanResult.riskLevel,
          scan_result: scanResult,
        });
      } else {
        await auditLog.logFileScan('file_allowed', {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          risk_level: scanResult.riskLevel,
          scan_result: scanResult,
        });
      }

    } catch (error) {
      // Update with error
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        } : f
      ));

      // Log scan failure
      await auditLog.logFileScan('scan_failed', {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const simulateFileScan = async (file: File): Promise<any> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate different scan results based on file type/name
    const fileName = file.name.toLowerCase();
    const fileSize = file.size;
    
    // Simulate sensitive file detection
    if (fileName.includes('.env') || fileName.includes('config') || fileName.includes('secret')) {
      return {
        shouldBlock: true,
        blockReason: 'Sensitive file detected',
        riskLevel: 'high',
        isSensitiveFile: true,
        isMaliciousFile: false,
        piiDetection: { hasPII: false, count: 0 },
        threats: ['sensitive_file'],
      };
    }
    
    // Simulate malicious file detection
    if (fileName.endsWith('.exe') || fileName.endsWith('.bat') || fileName.endsWith('.cmd')) {
      return {
        shouldBlock: true,
        blockReason: 'Potentially dangerous executable file',
        riskLevel: 'high',
        isSensitiveFile: false,
        isMaliciousFile: true,
        piiDetection: { hasPII: false, count: 0 },
        threats: ['malicious_file'],
      };
    }
    
    // Simulate PII detection
    if (fileName.includes('personal') || fileName.includes('private') || fileSize > 10 * 1024 * 1024) {
      return {
        shouldBlock: true,
        blockReason: 'PII detected or file too large',
        riskLevel: 'medium',
        isSensitiveFile: false,
        isMaliciousFile: false,
        piiDetection: { hasPII: true, count: 3 },
        threats: ['pii_detected'],
      };
    }
    
    // Safe file
    return {
      shouldBlock: false,
      blockReason: null,
      riskLevel: 'safe',
      isSensitiveFile: false,
      isMaliciousFile: false,
      piiDetection: { hasPII: false, count: 0 },
      threats: [],
    };
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: FileUploadResult['status']) => {
    switch (status) {
      case 'pending':
        return <File className="h-4 w-4 text-gray-500" />;
      case 'scanning':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'allowed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'blocked':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: FileUploadResult['status']) => {
    const variants = {
      pending: 'bg-gray-100 text-gray-800',
      scanning: 'bg-blue-100 text-blue-800',
      allowed: 'bg-green-100 text-green-800',
      blocked: 'bg-red-100 text-red-800',
      error: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Upload with Security Scanning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mb-4"
          >
            <Upload className="h-4 w-4 mr-2" />
            Select Files to Upload
          </Button>
          <p className="text-sm text-gray-500">
            Files will be automatically scanned for security threats
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Uploaded Files</h3>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
            
            <div className="space-y-2">
              {files.map((fileResult, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(fileResult.status)}
                    <div>
                      <div className="font-medium">{fileResult.file.name}</div>
                      <div className="text-sm text-gray-500">
                        {formatFileSize(fileResult.file.size)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(fileResult.status)}
                    
                    {fileResult.scanResult && (
                      <Badge variant="outline">
                        Risk: {fileResult.scanResult.riskLevel}
                      </Badge>
                    )}
                    
                    {fileResult.status === 'blocked' && fileResult.scanResult && (
                      <div className="text-sm text-red-600 max-w-xs">
                        {fileResult.scanResult.blockReason}
                      </div>
                    )}
                    
                    {fileResult.status === 'error' && (
                      <div className="text-sm text-red-600 max-w-xs">
                        {fileResult.error}
                      </div>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {files.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Upload Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Total Files</div>
                <div className="font-medium">{files.length}</div>
              </div>
              <div>
                <div className="text-gray-500">Allowed</div>
                <div className="font-medium text-green-600">
                  {files.filter(f => f.status === 'allowed').length}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Blocked</div>
                <div className="font-medium text-red-600">
                  {files.filter(f => f.status === 'blocked').length}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Errors</div>
                <div className="font-medium text-red-600">
                  {files.filter(f => f.status === 'error').length}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
