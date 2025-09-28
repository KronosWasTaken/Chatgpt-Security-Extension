import { Select,SelectContent, SelectItem, SelectValue,SelectTrigger,SelectGroup } from "@/components/ui/select";
import { Label } from "../ui/label";
import { Dialog,DialogTrigger,DialogTitle,DialogDescription,DialogContent,DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";
import { useState } from "react";

import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api";
export default function UpdateAiDialog({app}) {

console.log(app.id);
const [formData, setFormData] = useState({
    name: app.name,
    vendor: app.vendor,
    type: app.type,
    status: app.status,
    riskLevel: app.risk_level,
  });
 const { toast } = useToast();
  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };
 const handleSubmit = async () => {
const emptyField = Object.entries(formData).find(([_, value]) => !value || value.trim() === "");
  if (emptyField) {
    toast({
     description: `Please fill in the ${emptyField[0]} field.`
    });
    return;
  }
const data=await apiClient.updateAIApplication(app.id,formData);
console.log(data)
 }


  return (
   <Dialog>
          <DialogTrigger  >
            <Edit className="w-4 h-4" />
          </DialogTrigger>
<DialogContent>
  <DialogHeader>
    <DialogTitle>Update a clients application</DialogTitle>
  </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Label>Name:</Label>
            <Input
              id="name"
              className="col-span-3 bg-muted"
              value={formData.name}
              onChange={e => handleChange("name", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <Label>Vendor:</Label>
            <Select value={formData.vendor} onValueChange={v => handleChange("vendor", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="GitHub">Github</SelectItem>
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="Anthropic">Anthropic</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <Label>Type:</Label>
            <Select value={formData.type} onValueChange={v => handleChange("type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select App type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Application">Application</SelectItem>
                  <SelectItem value="Api">Api</SelectItem>
                  <SelectItem value="Plugin">Plugin</SelectItem>
                  <SelectItem value="Agent">Agent</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <Label>Status:</Label>
            <Select value={formData.status} onValueChange={v => handleChange("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Permitted">Permitted</SelectItem>
                  <SelectItem value="Unsanctioned">Unsanctioned</SelectItem>
                  <SelectItem value="Under_Review">Under_Review</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <Label>Risk Tolerance:</Label>
            <Select value={formData.riskLevel} onValueChange={v => handleChange("riskLevel", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Risk Tolerance" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>

     
  )
}
