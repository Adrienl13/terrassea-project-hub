import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useStripePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = async (params: {
    orderId: string;
    amount: number; // in euros
    customerEmail: string;
    description: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          orderId: params.orderId,
          amount: params.amount,
          currency: "eur",
          customerEmail: params.customerEmail,
          description: params.description,
          successUrl: `${window.location.origin}/account?section=orders&payment=success`,
          cancelUrl: `${window.location.origin}/account?section=orders&payment=cancelled`,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // Redirect to Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      }

      return data;
    } catch (err: any) {
      setError(err.message || "Payment failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { initiatePayment, isLoading, error };
}
