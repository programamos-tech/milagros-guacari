import Image from "next/image";
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

/** Foto de producto en vitrina: marco fijo 4:5 con `object-contain` para tamaño uniforme. */
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
