import { AppLayout } from "@/components/AppLayout";

export default function MSPCompliance() {
  return (
    <AppLayout headerTitle="MSP Compliance">
      <div className="space-y-6">
        <div className="bg-card rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">MSP Compliance Dashboard</h2>
          <p className="text-muted-foreground">
            Manage compliance requirements and monitoring across your MSP infrastructure.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}