import { useState } from "react";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/utils/imageOptimization";

interface SmartImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  /** Transform bounding box (px). When set, the Supabase Render API resizes
   *  the image (contain, WebP). Omit to use the URL as-is. */
  box?: number;
  quality?: number;
}

/**
 * Image with a smooth fade-in on load + on-the-fly Supabase resize.
 * Gives a progressive "appears as it loads" feel over a neutral placeholder,
 * so the page never looks blank/broken while images stream in.
 */
export function SmartImg({ src, box, quality, className, onLoad, alt = "", ...rest }: SmartImgProps) {
  const [loaded, setLoaded] = useState(false);
  const finalSrc = box ? getOptimizedImageUrl(src, { width: box, quality }) : (src ?? "");
  return (
    <img
      {...rest}
      alt={alt}
      src={finalSrc}
      loading={rest.loading ?? "lazy"}
      onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
      className={cn("transition-opacity duration-700 ease-out", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}
