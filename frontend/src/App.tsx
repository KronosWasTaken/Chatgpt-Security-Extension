import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, RoleBasedRoute } from "@/components/ProtectedRoute";
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
          <Route path="/" element={<RoleBasedRoute><Navigate to="/login" replace /></RoleBasedRoute>} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected MSP routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole={['msp_admin', 'msp_user']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/msp/ai-inventory" element={
            <ProtectedRoute requiredRole={['msp_admin', 'msp_user']}>
              <MSPAIInventory />
            </ProtectedRoute>
          } />
          <Route path="/msp/ai-engagement" element={
            <ProtectedRoute requiredRole={['msp_admin', 'msp_user']}>
              <MSPAIEngagement />
            </ProtectedRoute>
          } />
          <Route path="/msp/compliance" element={
            <ProtectedRoute requiredRole={['msp_admin', 'msp_user']}>
              <MSPCompliance />
            </ProtectedRoute>
          } />
          <Route path="/reports/msp" element={
            <ProtectedRoute requiredRole={['msp_admin', 'msp_user']}>
              <MSPReports />
            </ProtectedRoute>
          } />
          
          {/* Protected Client routes */}
          <Route path="/client" element={
            <ProtectedRoute requiredRole={['client_admin', 'end_user']}>
              <Client />
            </ProtectedRoute>
          } />
          <Route path="/client/ai-inventory" element={
            <ProtectedRoute requiredRole={['client_admin', 'end_user']}>
              <ClientAIInventory />
            </ProtectedRoute>
          } />
          <Route path="/client/ai-engagement" element={
            <ProtectedRoute requiredRole={['client_admin', 'end_user']}>
              <ClientAIEngagement />
            </ProtectedRoute>
          } />
          <Route path="/client/compliance" element={
            <ProtectedRoute requiredRole={['client_admin', 'end_user']}>
              <ClientCompliance />
            </ProtectedRoute>
          } />
          <Route path="/client/ai-control" element={
            <ProtectedRoute requiredRole={['client_admin', 'end_user']}>
              <ClientAIControlCenter />
            </ProtectedRoute>
          } />
          <Route path="/client/client-facing" element={
            <ProtectedRoute requiredRole={['client_admin', 'end_user']}>
              <ClientFacing />
            </ProtectedRoute>
          } />
          <Route path="/reports/client" element={
            <ProtectedRoute requiredRole={['client_admin', 'end_user']}>
              <ClientReports />
            </ProtectedRoute>
          } />
          
          {/* Shared routes */}
          <Route path="/policies" element={
            <ProtectedRoute>
              <Policies />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={<Navigate to="/reports/msp" replace />} />
          <Route path="/education" element={
            <ProtectedRoute>
              <EducationHub />
            </ProtectedRoute>
          } />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
