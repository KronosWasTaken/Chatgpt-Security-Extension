import { InventoryRow } from "./InventoryRow";

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

interface InventoryListProps {
  items: InventoryItem[];
  onItemClick?: (itemId: string) => void;
}

export function InventoryList({ items, onItemClick }: InventoryListProps) {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-subtext">No inventory items found</p>
      </div>
    );
  }

  return (
    <>
      {/* Header row - desktop only */}
      <div className="hidden md:grid grid-cols-11 text-xs text-slate-500 px-3 pb-2 border-b bg-slate-50/50">
        <div className="col-span-5">Application (Vendor)</div>
        <div className="col-span-2 text-right">Active Users</div>
        <div className="col-span-2 text-right">Interactions / day</div>
        <div className="col-span-2 text-right">Integrations</div>
      </div>

      {/* Items */}
      <div className="divide-y divide-border">
        {items.map((item) => (
          <InventoryRow 
            key={item.id} 
            item={item} 
            onClick={onItemClick}
          />
        ))}
      </div>
    </>
  );
}