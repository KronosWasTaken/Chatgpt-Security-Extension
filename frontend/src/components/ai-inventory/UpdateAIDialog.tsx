import { Select,SelectContent, SelectItem, SelectValue,SelectTrigger,SelectGroup } from "@/components/ui/select";
import { Label } from "../ui/label";
import { Dialog,DialogTrigger,DialogTitle,DialogDescription,DialogContent,DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";
import { useState } from "react";

import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { useUpdateAIApplication } from "@/hooks/useApi";
import { AIApplication } from "@/services/api";

interface UpdateAIDialogProps {
  app: AIApplication;
}

export default function UpdateAIDialog({ app }: UpdateAIDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: app.name || "",
    vendor: app.vendor || "",
    type: app.type || "",
    status: app.status || "Under_Review",
    risk_level: app.risk_level || "Medium",
  });

  const { toast } = useToast();
  const updateMutation = useUpdateAIApplication();

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const emptyField = Object.entries(formData).find(([_, value]) => !value || value.trim() === "");
    if (emptyField) {
      toast({
        title: "Validation Error",
        description: `Please fill in the ${emptyField[0]} field.`,
        variant: "destructive"
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({ 
        appId: app.id, 
        appData: formData 
      });
      // Success toast is handled by the React Query hook
      setOpen(false);
    } catch (error) {
      // Error toast is handled by the React Query hook
      // Just close the dialog on error
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update AI Application</DialogTitle>
          <DialogDescription>
            Update the details for "{app.name}". All fields are required.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input
              id="name"
              className="col-span-3"
              value={formData.name}
              onChange={e => handleChange("name", e.target.value)}
              placeholder="Enter application name"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vendor" className="text-right">Vendor</Label>
            <Select value={formData.vendor} onValueChange={v => handleChange("vendor", v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Microsoft">Microsoft</SelectItem>
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="Anthropic">Anthropic</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Meta">Meta</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Type</Label>
            <Select value={formData.type} onValueChange={v => handleChange("type", v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select App type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Application">Application</SelectItem>
                  <SelectItem value="API">API</SelectItem>
                  <SelectItem value="Plugin">Plugin</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                  <SelectItem value="Model">Model</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            <Select value={formData.status} onValueChange={v => handleChange("status", v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Permitted">Permitted</SelectItem>
                  <SelectItem value="Unsanctioned">Unsanctioned</SelectItem>
                  <SelectItem value="Under_Review">Under Review</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="risk_level" className="text-right">Risk Level</Label>
            <Select value={formData.risk_level} onValueChange={v => handleChange("risk_level", v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Application"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
