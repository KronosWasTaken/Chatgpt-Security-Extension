import React from 'react';
import { AuditLogViewer } from '@/components/AuditLogViewer';

export const AuditLogsPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">
          Monitor and review all system activities and security events
        </p>
      </div>
      
      <AuditLogViewer />
    </div>
  );
};
