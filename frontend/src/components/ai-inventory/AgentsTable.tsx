import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SensitiveActionsModal } from "./SensitiveActionsModal";
import { getStatusPillClass, formatNumber, getRiskLevel, getRiskBadgeClass } from "@/data/utils";
import { InventoryItem } from "@/data/inventory";
import { Search, Filter, AlertTriangle } from "lucide-react";

interface AgentsTableProps {
  agents: InventoryItem[];
  onItemClick: (itemId: string) => void;
  activeFilter?: string | null;
}

export function AgentsTable({ agents, onItemClick, activeFilter }: AgentsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [sensitiveActionsModalOpen, setSensitiveActionsModalOpen] = useState(false);
  const [selectedAgentName, setSelectedAgentName] = useState("");

  // Apply active filter from KPI clicks
  useEffect(() => {
    if (activeFilter === 'high-risk') {
      setRiskFilter('High');
    }
  }, [activeFilter]);

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    const riskLevel = getRiskLevel(agent.status === 'Unsanctioned' ? 80 : Math.random() * 50 + 25);
    const matchesRisk = riskFilter === "all" || riskLevel === riskFilter;
    const matchesVendor = vendorFilter === "all" || agent.vendor === vendorFilter;
    
    return matchesSearch && matchesRisk && matchesVendor;
  });
  
  // Get unique vendors for filter
  const vendors = [...new Set(agents.map(agent => agent.vendor))].sort();
  const AgentRow = ({ agent }: { agent: InventoryItem }) => {
    // Mock data for agent-specific metrics
    const agentsDeployed = Math.floor(Math.random() * 10) + 1;
    const riskScore = agent.status === 'Unsanctioned' ? 80 : Math.random() * 50 + 25;
    const riskLevel = getRiskLevel(riskScore);
    const sensitiveActions = Math.floor(Math.random() * 5);
    
    const isHighRisk = riskLevel === 'High';
    
    const handleSensitiveActionsClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedAgentName(agent.name);
      setSensitiveActionsModalOpen(true);
    };

    return (
      <div 
        className={`grid grid-cols-12 items-center gap-3 px-4 py-4 hover:bg-muted/30 cursor-pointer transition-colors border-b last:border-b-0 ${
          isHighRisk ? 'bg-risk-high/5 border-l-4 border-l-risk-high' : ''
        }`}
        onClick={() => onItemClick(agent.id)}
      >
        {/* Agent (Vendor) */}
        <div className="col-span-12 md:col-span-4">
          <Badge className={getStatusPillClass(agent.status)} variant="outline">
            {agent.status === 'Unsanctioned' && <div className="w-2 h-2 bg-risk-high rounded-full mr-1" />}
            {agent.status}
          </Badge>
          <div className="font-medium text-heading-text mt-1">
            {agent.name}
          </div>
          <div className="text-sm text-subtext">
            {agent.vendor}
          </div>
        </div>

        {/* # of Agents Deployed */}
        <div className="col-span-4 md:col-span-2 text-center">
          <div className="font-medium text-body-text">{agentsDeployed}</div>
        </div>

        {/* Integrations */}
        <div className="col-span-4 md:col-span-2 text-center">
          <div className="font-medium text-body-text">{agent.integrations?.length || 0}</div>
        </div>

        {/* Risk Assessment */}
        <div className="col-span-4 md:col-span-2 text-center">
          <Badge className={`${getRiskBadgeClass(riskLevel)} text-xs`}>
            {riskLevel}
          </Badge>
        </div>

        {/* Sensitive Actions Flagged */}
        <div className="col-span-4 md:col-span-2 text-center">
          {sensitiveActions > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSensitiveActionsClick}
              className={`font-medium text-risk-high hover:text-risk-high hover:bg-risk-high/10 p-1`}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              {sensitiveActions}
            </Button>
          ) : (
            <div className="font-medium text-body-text">{sensitiveActions}</div>
          )}
        </div>
      </div>
    );
  };

  if (agents.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-subtext">No agents found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="px-4 py-3 bg-muted/30 border-b">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-subtext" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="flex-1">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map(vendor => (
                  <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Header Row */}
      <div className="hidden md:grid grid-cols-12 text-xs font-medium text-subtext px-4 pb-2 border-b bg-muted/20">
        <div className="col-span-4">Agent (Vendor)</div>
        <div className="col-span-2 text-center"># of Agents</div>
        <div className="col-span-2 text-center">Integrations</div>
        <div className="col-span-2 text-center">Risk Assessment</div>
        <div className="col-span-2 text-center">Sensitive Actions</div>
      </div>

      {/* Agent Rows */}
      <div className="divide-y divide-border">
        {filteredAgents.length > 0 ? (
          filteredAgents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-subtext">
              {searchQuery || riskFilter !== "all" || vendorFilter !== "all" 
                ? "No agents match your filters" 
                : "No agents found"}
            </div>
          </div>
        )}
      </div>

      {/* Sensitive Actions Modal */}
      <SensitiveActionsModal
        open={sensitiveActionsModalOpen}
        onOpenChange={setSensitiveActionsModalOpen}
        agentName={selectedAgentName}
        actions={[]}
      />
    </div>
  );
}