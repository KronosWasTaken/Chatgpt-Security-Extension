import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertFamily, alerts as allAlerts } from "@/data/alerts";
import { useState } from "react";

const familyLabels: Record<AlertFamily, string> = {
  'UNSANCTIONED_USE': 'Unsanctioned Use',
  'SENSITIVE_DATA': 'Sensitive Data', 
  'AGENT_RISK': 'Agent Risk',
  'POLICY_VIOLATION': 'Policy Violation',
  'USAGE_ANOMALY': 'Usage Anomaly',
  'COMPLIANCE_GAP': 'Compliance Gap',
  'CONFIG_DRIFT': 'Config Drift',
  'ENFORCEMENT': 'Enforcement'
};

interface AlertsRibbonProps {
  clientId?: string;
  onFamilyFilter?: (family: AlertFamily | null) => void;
  selectedFamily?: AlertFamily | null;
}

export function AlertsRibbon({ clientId, onFamilyFilter, selectedFamily }: AlertsRibbonProps) {
  const filteredAlerts = clientId 
    ? allAlerts.filter(alert => alert.clientId === clientId)
    : allAlerts;

  const familyCounts = Object.keys(familyLabels).reduce((acc, family) => {
    acc[family as AlertFamily] = filteredAlerts.filter(alert => alert.family === family).length;
    return acc;
  }, {} as Record<AlertFamily, number>);

  const handleFamilyClick = (family: AlertFamily) => {
    const newSelection = selectedFamily === family ? null : family;
    onFamilyFilter?.(newSelection);
  };

  const handleClearFilters = () => {
    onFamilyFilter?.(null);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground mr-2">Alerts by Type:</span>
        {Object.entries(familyLabels).map(([family, label]) => {
          const count = familyCounts[family as AlertFamily];
          const isSelected = selectedFamily === family;
          
          return (
            <Badge
              key={family}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer transition-colors ${
                isSelected 
                  ? "bg-cybercept-blue text-white hover:bg-cybercept-blue/80" 
                  : "hover:bg-muted"
              }`}
              onClick={() => handleFamilyClick(family as AlertFamily)}
            >
              {label} ({count})
            </Badge>
          );
        })}
        {selectedFamily && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-cybercept-blue hover:text-cybercept-blue/80 underline ml-2"
          >
            Clear filters
          </button>
        )}
      </div>
    </Card>
  );
}