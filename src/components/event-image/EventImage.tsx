// EventImage: an event's picture, or its CategoryCover when there is none.
//
//   <EventImage category={event.category} />
//   <EventImage category={event.category} imageUrl={url} ratio="1 / 1" />
//
// - The API has no image field yet, so callers pass only the category for now. imageUrl is ready
//   for when it does.
// - The photo loads lazily and fills the frame (object-fit: cover). If it fails to load, the cover
//   takes its place.
// - alt defaults to "": the event's title is always written next to the image.

import { useState } from "react";
import type { Category } from "../../api/types";
import { cn } from "../../lib/cn";
import { CategoryCover, type CoverRatio } from "../category-cover/CategoryCover";

export type EventImageProps = {
  category: Category;
  imageUrl?: string;
  alt?: string;
  ratio?: CoverRatio;
  className?: string;
};

export function EventImage({ category, imageUrl, alt = "", ratio = "16 / 9", className }: EventImageProps) {
  // The url that failed, so a new url gets its own try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!imageUrl || failedUrl === imageUrl) {
    return <CategoryCover category={category} ratio={ratio} className={className} />;
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(imageUrl)}
      className={cn("block w-full object-cover", className)}
      style={{ aspectRatio: ratio }}
    />
  );
}
