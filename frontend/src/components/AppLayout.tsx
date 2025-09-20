import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerActions?: React.ReactNode;
}

export function AppLayout({ children, headerTitle, headerActions }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-app-bg">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center px-6 gap-4">
            <SidebarTrigger>
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            
            <div className="flex-1 flex items-center justify-between">
              {headerTitle && (
                <h1 className="text-xl font-semibold text-heading-text">
                  {headerTitle}
                </h1>
              )}
              
              {headerActions && (
                <div className="flex items-center gap-4">
                  {headerActions}
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}