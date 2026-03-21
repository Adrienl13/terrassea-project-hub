import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const quantity = formData.get("quantity") as string;
    const date = formData.get("date") as string;
    const country = formData.get("country") as string;
    const payload = {
      partner_id: partnerId,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      company: formData.get("company") as string || null,
      phone: formData.get("phone") as string || null,
      project_type: formData.get("project_type") as string || null,
      budget_range: formData.get("budget") as string || null,
      message: [
        formData.get("message") as string,
        quantity ? `Quantity: ${quantity}` : null,
        date ? `Date: ${date}` : null,
        country ? `Country: ${country}` : null,
      ].filter(Boolean).join("\n") || null,
    };

    const { error } = await supabase.from("partner_contact_requests").insert(payload);

    setLoading(false);
    if (error) {
      toast.error(t('partners.contactError'));
      return;
    }

    toast.success(t('partners.contactSuccess'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {t('partners.contactDialogTitle', { name: partnerName })}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">{t('partners.name')} *</Label>
              <Input name="name" required className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">{t('auth.email')} *</Label>
              <Input name="email" type="email" required className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">{t('partners.company')}</Label>
              <Input name="company" className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">{t('auth.phone')}</Label>
              <Input name="phone" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">{t('partners.country')}</Label>
              <Input name="country" className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">{t('partners.projectType')}</Label>
              <Input name="project_type" placeholder={t('partners.projectTypePlaceholder')} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">{t('partners.estimatedQuantity')}</Label>
              <Input name="quantity" className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">{t('partners.budgetRange')}</Label>
              <Input name="budget" placeholder={t('partners.budgetPlaceholder')} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="font-display text-xs">{t('partners.projectDate')}</Label>
            <Input name="date" placeholder={t('partners.projectDatePlaceholder')} className="mt-1" />
          </div>
          <div>
            <Label className="font-display text-xs">{t('partners.message')}</Label>
            <Textarea name="message" rows={3} className="mt-1" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full font-display font-semibold">
            {loading ? t('partners.sending') : t('partners.sendRequest')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
