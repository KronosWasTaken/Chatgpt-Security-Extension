import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, Building, Zap, AlertTriangle } from "lucide-react";
import { getTotalInteractions, getTotalActiveUsers, getMostActiveDepartment, getTopApplication, getUnderutilizedAppsCount } from "@/data/aiEngagement";

const KPITile = ({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  onClick 
}: { 
  title: string; 
  value: string | number; 
  trend: number; 
  icon: any; 
  onClick?: () => void;
}) => {
  const isPositive = trend >= 0;
  
  return (
    <Card 
      className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:bg-muted/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold mb-2">{value}</div>
      <div className="flex items-center text-sm">
        {isPositive ? (
          <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
        )}
        <span className={isPositive ? "text-emerald-500" : "text-red-500"}>
          {isPositive ? "+" : ""}{trend}%
        </span>
        <span className="text-muted-foreground ml-1">vs. last 7 days</span>
      </div>
    </Card>
  );
};

export const KPITiles = ({ 
  onTileClick 
}: { 
  onTileClick?: (section: string) => void;
}) => {
  const totalInteractions = getTotalInteractions();
  const totalUsers = getTotalActiveUsers();
  const mostActiveDept = getMostActiveDepartment();
  const topApp = getTopApplication();
  const underutilizedCount = getUnderutilizedAppsCount();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <KPITile
        title="Total AI Interactions"
        value={totalInteractions.toLocaleString()}
        trend={9}
        icon={Zap}
        onClick={() => onTileClick?.('departments')}
      />
      <KPITile
        title="Active Users"
        value={totalUsers}
        trend={8}
        icon={Users}
        onClick={() => onTileClick?.('departments')}
      />
      <KPITile
        title="Most Active Department"
        value={mostActiveDept.department}
        trend={mostActiveDept.pct_change_vs_prev_7d}
        icon={Building}
        onClick={() => onTileClick?.('departments')}
      />
      <KPITile
        title="Top Application by Usage"
        value={topApp.application}
        trend={topApp.trend_pct_7d}
        icon={Zap}
        onClick={() => onTileClick?.('applications')}
      />
      <KPITile
        title="Underutilized Applications"
        value={underutilizedCount}
        trend={-2}
        icon={AlertTriangle}
        onClick={() => onTileClick?.('applications')}
      />
    </div>
  );
};