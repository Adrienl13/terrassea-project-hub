import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getOptimizedImageUrl, getResponsiveSrcSet } from "@/utils/imageOptimization";

interface Props {
  mainImage: string | null;
  galleryUrls: string[];
  environmentUrls: string[];
  selectedVariantImage?: string | null;
  productName: string;
}

export default function ProductGallery({
  mainImage,
  galleryUrls,
  environmentUrls,
  selectedVariantImage,
  productName,
}: Props) {
  const { t } = useTranslation();

  // Build product photos: main image + gallery (up to 5 total)
  const productPhotos = useMemo(() => {
    const photos: string[] = [];
    if (mainImage) photos.push(mainImage);
    for (const url of galleryUrls) {
      if (photos.length >= 5) break;
      if (!photos.includes(url)) photos.push(url);
    }
    return photos;
  }, [mainImage, galleryUrls]);

  // Environment photos (up to 3)
  const envPhotos = useMemo(() => environmentUrls.slice(0, 3), [environmentUrls]);

  // All images combined for display
  const allImages = useMemo(
    () => [...productPhotos, ...envPhotos],
    [productPhotos, envPhotos],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  // When variant image changes, reset to show that as the main display
  useEffect(() => {
    if (selectedVariantImage) {
      setSelectedIndex(-1); // -1 = show variant override
    } else {
      setSelectedIndex(0);
    }
  }, [selectedVariantImage]);

  const displayImage =
    selectedIndex === -1 && selectedVariantImage
      ? selectedVariantImage
      : allImages[selectedIndex] || mainImage || "/placeholder.svg";

  return (
    <div>
      {/* Main image — above-the-fold on /products/:id, served eager + high priority */}
      <div className="aspect-[4/5] overflow-hidden bg-white rounded-sm mb-4">
        <img
          src={getOptimizedImageUrl(displayImage, { width: 800 }) || displayImage}
          srcSet={getResponsiveSrcSet(displayImage, [400, 800, 1200, 1600])}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 600px"
          alt={productName}
          loading="eager"
          fetchPriority="high"
          className="w-full h-full object-contain p-4 mix-blend-multiply transition-all duration-300"
        />
      </div>

      {/* Thumbnails row */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((url, i) => {
            const isEnv = i >= productPhotos.length;
            const isActive =
              selectedIndex === i ||
              (selectedIndex === -1 && i === 0 && !selectedVariantImage);

            return (
              <button
                key={`${url}-${i}`}
                onClick={() => setSelectedIndex(i)}
                aria-label={`${isEnv ? "Environment" : "Product"} photo ${i + 1}`}
                className={`relative flex-shrink-0 w-16 h-16 overflow-hidden rounded-sm border-2 transition-all ${
                  isActive
                    ? isEnv
                      ? "border-green-500"
                      : "border-blue-500"
                    : "border-transparent hover:border-border"
                }`}
              >
                <img
                  src={getOptimizedImageUrl(url, { width: 128, height: 128, resize: "cover" }) || url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Bottom color indicator */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-[3px] ${
                    isEnv ? "bg-green-500" : "bg-blue-500"
                  }`}
                />
                {/* In situ label for environment photos */}
                {isEnv && (
                  <span className="absolute top-0.5 right-0.5 text-[7px] font-display font-semibold bg-green-500/80 text-white px-1 rounded">
                    {t("gallery.inSitu")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
