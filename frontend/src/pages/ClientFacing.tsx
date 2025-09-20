import { AppLayout } from "@/components/AppLayout";

export default function ClientFacing() {
  return (
    <AppLayout headerTitle="Client-Facing Dashboard">
      <div className="space-y-6">
        <div className="bg-card rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Client-Facing Dashboard</h2>
          <p className="text-muted-foreground">
            Export-ready reports and dashboards for sharing with end clients.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}