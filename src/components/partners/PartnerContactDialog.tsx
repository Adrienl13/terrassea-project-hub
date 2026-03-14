import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerName: string;
}

export default function PartnerContactDialog({ open, onOpenChange, partnerId, partnerName }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      partner_id: partnerId,
      contact_name: form.get("name") as string,
      contact_company: form.get("company") as string,
      contact_country: form.get("country") as string,
      project_type: form.get("project_type") as string,
      estimated_quantity: form.get("quantity") as string,
      budget_range: form.get("budget") as string,
      project_date: form.get("date") as string,
      message: form.get("message") as string,
    };

    const { error } = await supabase.from("partner_contact_requests").insert(payload);

    setLoading(false);
    if (error) {
      toast.error("Failed to send request. Please try again.");
      return;
    }

    toast.success("Request sent! Terrassea will connect you shortly.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Contact {partnerName} via Terrassea
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">Name *</Label>
              <Input name="name" required className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">Company</Label>
              <Input name="company" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">Country</Label>
              <Input name="country" className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">Project Type</Label>
              <Input name="project_type" placeholder="Restaurant, Hotel…" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">Estimated Quantity</Label>
              <Input name="quantity" className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">Budget Range</Label>
              <Input name="budget" placeholder="€5k – €20k" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="font-display text-xs">Project Date</Label>
            <Input name="date" placeholder="Q2 2026" className="mt-1" />
          </div>
          <div>
            <Label className="font-display text-xs">Message</Label>
            <Textarea name="message" rows={3} className="mt-1" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full font-display font-semibold">
            {loading ? "Sending…" : "Send Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
