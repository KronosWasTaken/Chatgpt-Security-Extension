export function AlertDonutLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, payload, total } = props;
  const RAD = Math.PI / 180;
  const r = outerRadius + 26; // outside the arc
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  const anchor = x > cx ? 'start' : 'end';
  
  const familyLabels: Record<string, string> = {
    'UNSANCTIONED_USE': 'Unsanctioned Use',
    'SENSITIVE_DATA': 'Sensitive Data',
    'AGENT_RISK': 'Agent Risk',
    'POLICY_VIOLATION': 'Policy Violation',
    'USAGE_ANOMALY': 'Usage Anomaly',
    'COMPLIANCE_GAP': 'Compliance Gap',
    'CONFIG_DRIFT': 'Config Drift',
    'ENFORCEMENT': 'Enforcement'
  };
  
  const family = familyLabels[payload.family] || payload.family;
  const pct = Math.max(0, Math.min(100, Math.round((payload.count / total) * 100)));
  
  // Skip labels for very small slices (< 4%)
  if ((payload.count / total) * 100 < 4) return null;

  // Split family name into words for better wrapping
  const words = family.split(' ');
  
  // Use foreignObject to guarantee wrapping across browsers
  return (
    <foreignObject x={anchor === 'start' ? x : x - 100} y={y - 20} width={100} height={50}>
      <div style={{
        fontSize: 11, 
        lineHeight: '13px', 
        color: '#334155', 
        textAlign: anchor === 'start' ? 'left' : 'right',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        wordBreak: 'break-word',
        hyphens: 'auto'
      }}>
        {words.map((word, index) => (
          <div key={index} style={{ marginBottom: index === words.length - 1 ? '2px' : '0' }}>
            {word}
          </div>
        ))}
        <div style={{opacity: 0.7, fontWeight: '500'}}>{pct}%</div>
      </div>
    </foreignObject>
  );
}