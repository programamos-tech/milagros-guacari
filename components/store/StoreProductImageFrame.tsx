import Image from "next/image";
import { STORE_IMAGE_QUALITY } from "@/lib/store-image";
import {
  storeProductImageFrameClass,
  storeProductImageMediaClass,
} from "@/lib/store-theme";
import { shouldUnoptimizeStorageImageUrl } from "@/lib/storage-public-url";

type Props = {
  src: string | null;
  alt: string;
  bgClass: string;
  sizes: string;
  /** Clases extra en la imagen (p. ej. hover del grupo). */
  imageClassName?: string;
  placeholderClassName?: string;
  dimmed?: boolean;
};

/** Foto de producto en vitrina: marco 4:5, imagen cubre todo el cuadro (`object-cover`). */
export function StoreProductImageFrame({
  src,
  alt,
  bgClass,
  sizes,
  imageClassName = "",
  placeholderClassName = "text-3xl text-stone-200",
  dimmed = false,
}: Props) {
  return (
    <div
      className={`${storeProductImageFrameClass} ${bgClass} transition-colors duration-300 ${
        dimmed ? "opacity-[0.78]" : ""
      }`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={STORE_IMAGE_QUALITY}
          className={`${storeProductImageMediaClass} ${imageClassName}`.trim()}
          unoptimized={shouldUnoptimizeStorageImageUrl(src)}
        />
      ) : (
        <span
          className={`flex size-full items-center justify-center ${placeholderClassName}`}
          aria-hidden
        >
          ◆
        </span>
      )}
    </div>
  );
}
