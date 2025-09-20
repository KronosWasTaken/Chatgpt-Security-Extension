import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { KPITiles } from "@/components/ai-engagement/KPITiles";
import { DepartmentUsage } from "@/components/ai-engagement/DepartmentUsage";
import { ApplicationEngagementTable } from "@/components/ai-engagement/ApplicationEngagementTable";
import { AgentEngagementTable } from "@/components/ai-engagement/AgentEngagementTable";
import { ProductivityInsights } from "@/components/ai-engagement/ProductivityInsights";
import { RecommendationsPanel } from "@/components/ai-engagement/RecommendationsPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

export default function MSPAIEngagement() {
  const [dateRange, setDateRange] = useState("30");
  const [activeSection, setActiveSection] = useState<string>("");

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest' 
      });
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-app-bg">
        {/* Header Section */}
        <div className="bg-surface border-b border-border-color sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-heading-text">AI Engagement</h1>
                <p className="text-subtext text-sm mt-1">
                  Portfolio Overview
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* KPI Tiles */}
          <KPITiles onTileClick={scrollToSection} />

          {/* Department Usage */}
          <DepartmentUsage id="departments" />

          {/* Application Engagement */}
          <ApplicationEngagementTable id="applications" />

          {/* Agent Engagement */}
          <AgentEngagementTable id="agents" />

          {/* Productivity Insights */}
          <ProductivityInsights id="productivity" />

          {/* Recommendations */}
          <RecommendationsPanel id="recommendations" />
        </div>
      </div>
    </AppLayout>
  );
}