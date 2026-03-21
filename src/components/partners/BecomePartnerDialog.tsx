import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast.error(t('partners.submitError'));
      return;
    }

    toast.success(t('partners.submitSuccess'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {t('partners.becomePartnerDialogTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">{t('partners.companyName')} *</Label>
              <Input name="company_name" required className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">{t('partners.country')} *</Label>
              <Input name="country" required className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="font-display text-xs">{t('partners.partnerType')} *</Label>
            <Select value={partnerType} onValueChange={setPartnerType} required>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('partners.selectType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">{t('partners.typeBrand')}</SelectItem>
                <SelectItem value="manufacturer">{t('partners.typeManufacturer')}</SelectItem>
                <SelectItem value="reseller">{t('partners.resellerDistributor')}</SelectItem>
                <SelectItem value="designer">{t('partners.designerArchitect')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">{t('partners.contactName')}</Label>
              <Input name="contact_name" className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">{t('partners.contactEmail')} *</Label>
              <Input name="contact_email" type="email" required className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="font-display text-xs">{t('partners.website')}</Label>
            <Input name="website" placeholder="https://…" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="font-display text-xs">{t('partners.productCategory')}</Label>
              <Input name="product_category" placeholder={t('partners.productCategoryPlaceholder')} className="mt-1" />
            </div>
            <div>
              <Label className="font-display text-xs">{t('partners.certifications')}</Label>
              <Input name="certifications" placeholder={t('partners.certificationsPlaceholder')} className="mt-1" />
            </div>
          </div>
          <Button type="submit" disabled={loading || !partnerType} className="w-full rounded-full font-display font-semibold">
            {loading ? t('partners.submitting') : t('partners.submitApplication')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
