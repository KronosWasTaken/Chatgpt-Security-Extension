import { Badge } from "@/components/ui/badge";

type InventoryItem = {
  id: string;
  type: 'Application' | 'Agent';
  status: 'Permitted' | 'Unsanctioned';
  name: string;
  vendor: string;
  users: number;
  avgDailyInteractions: number;
  integrations: string[];
};

interface InventoryRowProps {
  item: InventoryItem;
  onClick?: (itemId: string) => void;
}

export function InventoryRow({ item, onClick }: InventoryRowProps) {
  const statusClasses =
    item.status === 'Permitted'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';

  const formatInteractions = (interactions: number) => {
    return interactions >= 1000 ? (interactions / 1000).toFixed(1) + 'K' : interactions.toString();
  };

  return (
    <div 
      className="grid grid-cols-11 items-center gap-x-3 px-3 py-2.5 border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onClick?.(item.id)}
    >
      {/* Left: status + name/vendor + italic type */}
      <div className="col-span-11 md:col-span-5">
        <Badge className={`rounded-full border-0 text-xs ${statusClasses} mb-1`}>
          {item.status}
        </Badge>
        <div className="font-medium text-slate-900">
          {item.name} <span className="text-slate-500">({item.vendor})</span>
        </div>
        <div className="text-slate-500 italic text-xs mt-0.5">{item.type}</div>
        
        {/* Mobile view: show stats inline */}
        <div className="md:hidden mt-2 flex items-center gap-4 text-sm text-slate-500">
          <span>{Intl.NumberFormat().format(item.users)} users</span>
          <span>•</span>
          <span>{formatInteractions(item.avgDailyInteractions)} interactions/day</span>
        </div>
      </div>

      {/* Right: values only (labels live in header) */}
      <div className="col-span-6 md:col-span-2 text-right font-medium">{Intl.NumberFormat().format(item.users)}</div>

      <div className="col-span-6 md:col-span-2 text-right font-medium">
        {formatInteractions(item.avgDailyInteractions)}
      </div>

      <div className="col-span-11 md:col-span-2 flex md:justify-end flex-wrap gap-1">
        {item.integrations.slice(0, 3).map(integration => (
          <span key={integration} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
            {integration}
          </span>
        ))}
        {item.integrations.length > 3 && (
          <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 text-xs">
            +{item.integrations.length - 3}
          </span>
        )}
      </div>
    </div>
  );
}