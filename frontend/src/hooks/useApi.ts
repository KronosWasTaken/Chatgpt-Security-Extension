import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, handleApiError } from "@/services/api";
import { toast } from "@/hooks/use-toast";

// Query keys
export const queryKeys = {
  clients: ['clients'] as const,
  client: (id: string) => ['clients', id] as const,
  clientDashboard: (id: string) => ['clients', id, 'dashboard'] as const,
  aiInventory: ['ai-inventory'] as const,
  aiApplication: (id: string) => ['ai-inventory', id] as const,
  alerts: (params?: any) => ['alerts', params] as const,
  alert: (id: string) => ['alerts', id] as const,
  alertsFeed: ['alerts', 'feed'] as const,
  currentUser: ['auth', 'me'] as const,
};

// Client hooks
export const useClients = () => {
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: () => apiClient.getClients(),
    onError: handleApiError,
  });
};

export const useClient = (clientId: string) => {
  return useQuery({
    queryKey: queryKeys.client(clientId),
    queryFn: () => apiClient.getClient(clientId),
    enabled: !!clientId,
    onError: handleApiError,
  });
};

export const useClientDashboard = (clientId: string) => {
  return useQuery({
    queryKey: queryKeys.clientDashboard(clientId),
    queryFn: () => apiClient.getClientDashboard(clientId),
    enabled: !!clientId,
    onError: handleApiError,
  });
};

// AI Inventory hooks
export const useAIInventory = () => {
  return useQuery({
    queryKey: queryKeys.aiInventory,
    queryFn: () => apiClient.getAIInventory(),
    onError: handleApiError,
  });
};

export const useAIApplication = (appId: string) => {
  return useQuery({
    queryKey: queryKeys.aiApplication(appId),
    queryFn: () => apiClient.getAIApplication(appId),
    enabled: !!appId,
    onError: handleApiError,
  });
};

export const useCreateAIApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (appData: any) => apiClient.createAIApplication(appData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInventory });
      toast({
        title: "Success",
        description: "AI application created successfully",
      });
    },
    onError: handleApiError,
  });
};

export const useUpdateAIApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ appId, appData }: { appId: string; appData: any }) => 
      apiClient.updateAIApplication(appId, appData),
    onSuccess: (_, { appId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInventory });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiApplication(appId) });
      toast({
        title: "Success",
        description: "AI application updated successfully",
      });
    },
    onError: handleApiError,
  });
};

export const useDeleteAIApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (appId: string) => apiClient.deleteAIApplication(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiInventory });
      toast({
        title: "Success",
        description: "AI application deleted successfully",
      });
    },
    onError: handleApiError,
  });
};

// Alert hooks
export const useAlerts = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.alerts(params),
    queryFn: () => apiClient.getAlerts(params),
    onError: handleApiError,
  });
};

export const useAlert = (alertId: string) => {
  return useQuery({
    queryKey: queryKeys.alert(alertId),
    queryFn: () => apiClient.getAlert(alertId),
    enabled: !!alertId,
    onError: handleApiError,
  });
};

export const useUpdateAlertStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, status, assignedTo }: { 
      alertId: string; 
      status: string; 
      assignedTo?: string; 
    }) => apiClient.updateAlertStatus(alertId, status, assignedTo),
    onSuccess: (_, { alertId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.alert(alertId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertsFeed });
      toast({
        title: "Success",
        description: "Alert status updated successfully",
      });
    },
    onError: handleApiError,
  });
};

export const useAssignAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ alertId, assignedTo }: { alertId: string; assignedTo: string }) => 
      apiClient.assignAlert(alertId, assignedTo),
    onSuccess: (_, { alertId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.alert(alertId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertsFeed });
      toast({
        title: "Success",
        description: "Alert assigned successfully",
      });
    },
    onError: handleApiError,
  });
};

export const useAlertsFeed = () => {
  return useQuery({
    queryKey: queryKeys.alertsFeed,
    queryFn: () => apiClient.getAlertsFeed(),
    refetchInterval: 30000, // Refetch every 30 seconds
    onError: handleApiError,
  });
};

// Auth hooks
export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => apiClient.getCurrentUser(),
    onError: handleApiError,
  });
};
