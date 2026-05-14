import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Shield, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProductReviews } from "@/hooks/useProductReviews";
import StarRating from "./StarRating";

interface Props {
  productId: string;
}

function ReviewSummary({ stats }: { stats: { avg_rating: number; review_count: number; stars_5: number; stars_4: number; stars_3: number; stars_2: number; stars_1: number } }) {
  const { t } = useTranslation();
  const bars = [
    { label: "5", count: stats.stars_5 },
    { label: "4", count: stats.stars_4 },
    { label: "3", count: stats.stars_3 },
    { label: "2", count: stats.stars_2 },
    { label: "1", count: stats.stars_1 },
  ];
  const max = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div className="flex gap-8 items-start">
      <div className="text-center flex-shrink-0">
        <p className="font-display text-4xl font-bold text-foreground">{stats.avg_rating}</p>
        <StarRating value={Math.round(stats.avg_rating)} size="sm" />
        <p className="text-xs text-muted-foreground font-body mt-1">
          {t("reviews.count", { count: stats.review_count })}
        </p>
      </div>
      <div className="flex-1 space-y-1.5">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="text-xs font-body text-muted-foreground w-3 text-right">{bar.label}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${(bar.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-body text-muted-foreground w-5">{bar.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewForm({ productId, onSuccess }: { productId: string; onSuccess: () => void }) {
  const { t } = useTranslation();
  const { submitReview } = useProductReviews(productId);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(t("reviews.selectRating", "Please select a rating"));
      return;
    }
    setSubmitting(true);
    try {
      await submitReview.mutateAsync({ rating, title, review });
      toast.success(t("reviews.submitted"));
      setRating(0);
      setTitle("");
      setReview("");
      onSuccess();
    } catch (err: any) {
      if (err?.code === "23505") {
        toast.error(t("reviews.alreadyExists"));
      } else {
        toast.error(err?.message || t("errors.somethingWrong"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-base font-body bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-foreground transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-xl p-5 space-y-4"
    >
      <h4 className="font-display font-semibold text-sm text-foreground">
        {t("reviews.write")}
      </h4>
      <div>
        <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
          {t("reviews.yourRating", "Your rating")} *
        </span>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>
      <div>
        <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
          {t("reviews.titleField")}
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("reviews.titlePlaceholder", "Summarize your experience")}
          className={inputClass}
        />
      </div>
      <div>
        <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
          {t("reviews.bodyField")}
        </span>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={3}
          placeholder={t("reviews.bodyPlaceholder", "Share details about the product quality, comfort, durability...")}
          className={`${inputClass} rounded-xl`}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="px-6 py-2.5 rounded-full bg-foreground text-primary-foreground font-display font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitting ? "..." : t("reviews.submit")}
      </button>
    </motion.div>
  );
}

function ReviewCard({ review }: { review: import("@/hooks/useProductReviews").ProductReview }) {
  const { t } = useTranslation();
  const name = review.user_profiles?.first_name || t("reviews.anonymous", "Anonymous");
  const company = review.user_profiles?.company;
  const date = new Date(review.created_at).toLocaleDateString();

  return (
    <div className="border-b border-border pb-5 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm text-foreground">{name}</span>
              {review.is_verified_purchase && (
                <span className="inline-flex items-center gap-1 text-[10px] font-body text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <Shield className="h-2.5 w-2.5" />
                  {t("reviews.verifiedPurchase")}
                </span>
              )}
            </div>
            {company && (
              <span className="text-[11px] text-muted-foreground font-body">{company}</span>
            )}
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground font-body flex-shrink-0">{date}</span>
      </div>
      <div className="mt-2 ml-11">
        <StarRating value={review.rating} size="sm" />
        {review.title && (
          <p className="font-display font-semibold text-sm text-foreground mt-2">{review.title}</p>
        )}
        {review.review && (
          <p className="text-sm font-body text-muted-foreground mt-1">{review.review}</p>
        )}
      </div>
    </div>
  );
}

export default function ProductReviews({ productId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { stats, reviews, userReview } = useProductReviews(productId);
  const [showForm, setShowForm] = useState(false);

  const canReview = !!user && !userReview;
  const hasReviews = reviews.length > 0 || (stats?.review_count ?? 0) > 0;

  return (
    <section className="px-6 mt-16" id="reviews">
      <div className="container mx-auto">
        <h2 className="font-display text-lg font-bold text-foreground mb-6">
          {t("reviews.title")}
          {stats && stats.review_count > 0 && (
            <span className="text-muted-foreground font-body text-sm font-normal ml-2">
              ({stats.review_count})
            </span>
          )}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: summary + form */}
          <div className="space-y-6">
            {stats && stats.review_count > 0 && <ReviewSummary stats={stats} />}

            {/* Review form or status */}
            {canReview && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full px-4 py-2.5 rounded-full border border-border text-sm font-display font-semibold hover:border-foreground transition-colors"
              >
                {t("reviews.write")}
              </button>
            )}
            {canReview && showForm && (
              <ReviewForm productId={productId} onSuccess={() => setShowForm(false)} />
            )}
            {userReview && userReview.status === "pending" && (
              <p className="text-xs font-body text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                {t("reviews.pending")}
              </p>
            )}
            {!user && (
              <p className="text-xs font-body text-muted-foreground">
                <a href="/login" className="underline hover:text-foreground">
                  {t("reviews.loginToReview")}
                </a>
              </p>
            )}
          </div>

          {/* Right: review list */}
          <div className="md:col-span-2 space-y-5">
            {reviews.length > 0 ? (
              reviews.map((r) => <ReviewCard key={r.id} review={r} />)
            ) : (
              <p className="text-sm text-muted-foreground font-body py-8 text-center">
                {t("reviews.noReviewsYet")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
