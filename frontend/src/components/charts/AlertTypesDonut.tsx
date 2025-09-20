import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertFamily } from '@/data/alerts';
import { AlertDonutLabel } from './AlertDonutLabel';

const PALETTE: Record<AlertFamily, string> = {
  SENSITIVE_DATA: '#1F7AE0',
  AGENT_RISK: '#0B4FA6', 
  POLICY_VIOLATION: '#4F7CAC',
  UNSANCTIONED_USE: '#2A6FDB',
  USAGE_ANOMALY: '#93A4B8',
  COMPLIANCE_GAP: '#B8C2CC',
  CONFIG_DRIFT: '#5B6B7A',
  ENFORCEMENT: '#9BB1C8'
};

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

type AlertTypesDatum = { 
  family: AlertFamily; 
  count: number;
  fullName: string;
};

type Props = {
  data: AlertTypesDatum[];
  total: number;
  rangeLabel: string;
  onFamilyClick?: (family: AlertFamily) => void;
};

export function AlertTypesDonut({ data, total, rangeLabel, onFamilyClick }: Props) {
  if (total === 0) {
    return (
      <div className="mt-3 pt-1 pr-3 pb-3 min-h-[320px] flex items-center justify-center text-sm text-muted-foreground">
        No alerts in {rangeLabel}
      </div>
    );
  }

  // Compute total from actual data counts
  const actualTotal = data.reduce((sum, item) => sum + item.count, 0);
  
  const dataWithPercents = data.map(item => ({
    ...item,
    percent: Math.round((item.count / actualTotal) * 100)
  }));

  const renderCustomLabel = (props: any) => (
    <AlertDonutLabel {...props} total={actualTotal} />
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      const percent = Math.round((data.count / actualTotal) * 100);
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <div className="font-semibold text-sm mb-1">{familyLabels[data.family]} - {percent}%</div>
          <div className="text-sm text-muted-foreground">
            {data.count} occurrences
          </div>
        </div>
      );
    }
    return null;
  };

  const handleSliceClick = (data: any) => {
    if (onFamilyClick) {
      onFamilyClick(data.family);
    }
  };

  return (
    <div className="mt-3 pt-1 pr-3 pb-3">
      <div 
        className="min-h-[320px]"
        role="img"
        aria-label="Alert types distribution"
        style={{ overflow: 'visible' }}
      >
        <ResponsiveContainer width="100%" height={320}>
          <PieChart margin={{ top: 28, right: 56, bottom: 28, left: 56 }} style={{ overflow: 'visible' }}>
            <Pie
              data={dataWithPercents}
              cx="50%"
              cy="50%"
              labelLine={{ stroke: '#C7D2E0', strokeWidth: 1 }}
              label={renderCustomLabel}
              outerRadius={105}
              innerRadius={75}
              paddingAngle={1}
              dataKey="count"
              onClick={handleSliceClick}
              className="cursor-pointer"
              isAnimationActive={false}
            >
              {dataWithPercents.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={PALETTE[entry.family]}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  className="hover:drop-shadow-lg transition-all duration-200"
                  style={{
                    filter: 'drop-shadow(0 0 0 transparent)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))';
                    e.currentTarget.setAttribute('transform-origin', '50% 50%');
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'drop-shadow(0 0 0 transparent)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  aria-label={`${familyLabels[entry.family]}, ${entry.count} alerts, ${entry.percent} percent`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSliceClick(entry);
                    }
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}