import Image from "next/image";
import {
  resolveCategoryListingHeroSrc,
} from "@/lib/category-listing-hero-url";
import { shouldUnoptimizeStorageImageUrl } from "@/lib/storage-public-url";

type Props = {
  imagePath: string;
  title: string;
  alt?: string | null;
};

export function CategoryListingHero({ imagePath, title, alt }: Props) {
  const src = resolveCategoryListingHeroSrc(imagePath);
  if (!src) return null;

  const altText = (alt?.trim() || title).trim() || "Categoría";

  return (
    <section
      className="relative w-full overflow-hidden bg-stone-200"
      aria-label={title}
    >
      <div className="relative mx-auto aspect-[21/9] min-h-[220px] w-full max-h-[min(70vh,640px)] sm:min-h-[280px] md:aspect-[2.4/1]">
        <Image
          src={src}
          alt={altText}
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          unoptimized={shouldUnoptimizeStorageImageUrl(src)}
        />
      </div>
      <div className="border-b border-stone-200 bg-white px-4 py-5 text-center sm:py-6">
        <h1 className="text-base font-semibold uppercase tracking-[0.22em] text-stone-900 sm:text-lg md:text-xl">
          {title}
        </h1>
      </div>
    </section>
  );
}
