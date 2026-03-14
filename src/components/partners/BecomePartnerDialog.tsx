import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BecomePartnerDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [partnerType, setPartnerType] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      company_name: form.get("company_name") as string,
      country: form.get("country") as string,
      partner_type: partnerType as "brand" | "manufacturer" | "reseller" | "designer",
      website: form.get("website") as string,
      product_category: form.get("product_category") as string,
      certifications: form.get("certifications") as string,
      contact_name: form.get("contact_name") as string,
      contact_email: form.get("contact_email") as string,
    };

    const { error } = await supabase.from("partner_applications").insert(payload);

    setLoading(false);
    if (error) {
      toast.error("Failed to submit application. Please try again.");
      return;
    }

    toast.success("Application submitted! We'll review it shortly.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Become a Terrassea Partner
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">Company Name *</Label>
              <Input name="company_name" required className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">Country *</Label>
              <Input name="country" required className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="font-display text-xs">Partner Type *</Label>
            <Select value={partnerType} onValueChange={setPartnerType} required>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Brand</SelectItem>
                <SelectItem value="manufacturer">Manufacturer</SelectItem>
                <SelectItem value="reseller">Reseller / Distributor</SelectItem>
                <SelectItem value="designer">Designer / Architect</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">Contact Name</Label>
              <Input name="contact_name" className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">Contact Email *</Label>
              <Input name="contact_email" type="email" required className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="font-display text-xs">Website</Label>
            <Input name="website" placeholder="https://…" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">Product Category</Label>
              <Input name="product_category" placeholder="Chairs, Tables…" className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">Certifications</Label>
              <Input name="certifications" placeholder="ISO, FSC…" className="mt-1" />
            </div>
          </div>
          <Button type="submit" disabled={loading || !partnerType} className="w-full rounded-full font-display font-semibold">
            {loading ? "Submitting…" : "Submit Application"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
