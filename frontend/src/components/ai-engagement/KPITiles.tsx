import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Users, Building, Zap, AlertTriangle, Loader2 } from "lucide-react";
import { getTotalInteractions, getTotalActiveUsers, getMostActiveDepartment, getTopApplication, getUnderutilizedAppsCount } from "@/data/aiEngagement";
import { useAIEngagementData } from "@/hooks/useAIEngagementData";

const KPITile = ({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  onClick,
  isLoading = false
}: { 
  title: string; 
  value: string | number; 
  trend: number; 
  icon: any; 
  onClick?: () => void;
  isLoading?: boolean;
}) => {
  const isPositive = trend >= 0;
  
  return (
    <Card 
      className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:bg-muted/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="text-2xl font-bold mb-2">
        {isLoading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : (
          value
        )}
      </div>
      <div className="flex items-center text-sm">
        {isLoading ? (
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        ) : (
          <>
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={isPositive ? "text-emerald-500" : "text-red-500"}>
              {isPositive ? "+" : ""}{trend}%
            </span>
            <span className="text-muted-foreground ml-1">vs. last 7 days</span>
          </>
        )}
      </div>
    </Card>
  );
};

export const KPITiles = ({ 
  onTileClick,
  days
}: { 
  onTileClick?: (section: string) => void;
  days?: number;
}) => {
  const { data, isLoading } = useAIEngagementData(days);
  
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="border-0 shadow-elegant">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  const totalInteractions = getTotalInteractions(data);
  const totalUsers = getTotalActiveUsers(data);
  const mostActiveDept = getMostActiveDepartment(data);
  const topApp = getTopApplication(data);
  const underutilizedCount = getUnderutilizedAppsCount(data);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <KPITile
        title="Total AI Interactions"
        value={totalInteractions.toLocaleString()}
        trend={9}
        icon={Zap}
        onClick={() => onTileClick?.('departments')}
        isLoading={isLoading}
      />
      <KPITile
        title="Active Users"
        value={totalUsers}
        trend={8}
        icon={Users}
        onClick={() => onTileClick?.('departments')}
        isLoading={isLoading}
      />
      <KPITile
        title="Most Active Department"
        value={mostActiveDept.department || "Loading..."}
        trend={mostActiveDept.pct_change_vs_prev_7d || 0}
        icon={Building}
        onClick={() => onTileClick?.('departments')}
        isLoading={isLoading}
      />
      <KPITile
        title="Top Application by Usage"
        value={topApp.application || "Loading..."}
        trend={topApp.trend_pct_7d || 0}
        icon={Zap}
        onClick={() => onTileClick?.('applications')}
        isLoading={isLoading}
      />
      <KPITile
        title="Underutilized Applications"
        value={underutilizedCount}
        trend={-2}
        icon={AlertTriangle}
        onClick={() => onTileClick?.('applications')}
        isLoading={isLoading}
      />
    </div>
  );
};