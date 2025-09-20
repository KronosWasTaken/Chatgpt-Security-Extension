import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Code } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ExportDropdownProps {
  data: any[];
  filename: string;
  type: 'applications' | 'agents';
}

export function ExportDropdown({ data, filename, type }: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'csv' | 'pdf' | 'json') => {
    setIsExporting(true);
    
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, this would generate and download the file
      const message = `${filename} exported as ${format.toUpperCase()}`;
      
      toast({
        title: "Export Complete",
        description: message,
      });
      
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="w-4 h-4 mr-2" />
          Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <Code className="w-4 h-4 mr-2" />
          Export JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}