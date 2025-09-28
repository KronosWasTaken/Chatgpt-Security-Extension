import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, RoleBasedRedirect } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Client from "./pages/Client";
import Policies from "./pages/Policies";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import MSPAIEngagement from "./pages/MSPAIEngagement";
import MSPCompliance from "./pages/MSPCompliance";
import MSPAIInventory from "./pages/MSPAIInventory";
import ClientAIEngagement from "./pages/ClientAIEngagement";
import ClientCompliance from "./pages/ClientCompliance";
import ClientAIInventory from "./pages/ClientAIInventory";
import ClientAIControlCenter from "./pages/ClientAIControlCenter";
import ClientFacing from "./pages/ClientFacing";
import MSPReports from "./pages/MSPReports";
import ClientReports from "./pages/ClientReports";
import EducationHub from "./pages/EducationHub";

const queryClient = new QueryClient();

const App = () => (

  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
<Route path="/" element={<RoleBasedRedirect />} />


          <Route path="/login" element={<Login />} />


           <Route element={<ProtectedRoute requiredRole={['msp_admin', 'msp_user']} />}>
                            

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/msp/ai-inventory" element={<MSPAIInventory />} />
          <Route path="/msp/ai-engagement" element={<MSPAIEngagement />} />
          <Route path="/msp/compliance" element={<MSPCompliance />} />
          <Route path="/reports/msp" element={<MSPReports />} />
          </Route>


          {/* Protected Client routes */}
           <Route element={<ProtectedRoute requiredRole={['client_admin', 'end_user']}/>}>
                    

          <Route path="/client" element={<Client />} />
          <Route path="/client/ai-inventory" element={<ClientAIInventory />} />
          <Route path="/client/ai-engagement" element={ <ClientAIEngagement />} />
          <Route path="/client/compliance" element={   <ClientCompliance />} />
          <Route path="/client/ai-control" element={ <ClientAIControlCenter />} />
          <Route path="/client/client-facing" element={<ClientFacing />} />
          <Route path="/reports/client" element={<ClientReports /> } />
          </Route>
          
          {/* Shared routes */}
          <Route path="/policies" element={
              <Policies />
          } />
          <Route path="/reports" element={<Navigate to="/reports/msp" replace />} />
          <Route path="/education" element={
              <EducationHub />
          } />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;



   

