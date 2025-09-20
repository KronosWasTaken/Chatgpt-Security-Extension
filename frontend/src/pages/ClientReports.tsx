import { AppLayout } from "@/components/AppLayout";

export default function ClientReports() {
  return (
    <AppLayout headerTitle="Client Reports">
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <img 
              src="/lovable-uploads/7bbfb6c2-0905-4d3b-bad5-8ca1383e3980.png" 
              alt="Cybercept" 
              className="max-h-40 mx-auto mb-6"
            />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Coming Soon
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Executive level, white-labelled client reports coming soon
          </p>
        </div>
      </div>
    </AppLayout>
  );
}