"use client"

import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import Image from "next/image"
import { useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  title?: string
}

const ImageGallery = ({ images, title }: ImageGalleryProps) => {
  const [active, setActive] = useState(0)

  if (!images?.length) {
    return (
      <div className="aspect-square w-full rounded-xl border border-line bg-sand-50" />
    )
  }

  const activeImage = images[Math.min(active, images.length - 1)]
  const hasThumbs = images.length > 1

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-5">
      {/* Main image — warm tile, contained so packaging/illustrations never crop */}
      <div className="relative min-w-0 flex-1">
        <div className="group relative aspect-square w-full overflow-hidden rounded-xl border border-line bg-gradient-to-b from-white to-sand-50 shadow-sm">
          {!!activeImage?.url && (
            <Image
              key={activeImage.id}
              src={activeImage.url}
              priority
              className="object-contain p-4 transition-transform duration-500 ease-editorial group-hover:scale-[1.04] sm:p-8"
              alt={title ? `${title}` : "Product image"}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          )}

          {hasThumbs && (
            <span className="absolute bottom-3 right-3 rounded-pill bg-ink/70 px-2.5 py-1 text-xs font-medium text-cream backdrop-blur-sm">
              {active + 1} / {images.length}
            </span>
          )}
        </div>
      </div>

      {/* Thumbnail rail — horizontal on mobile, vertical on desktop */}
      {hasThumbs && (
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto lg:w-20 lg:flex-col lg:overflow-visible">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1}`}
              aria-current={index === active}
              className={clx(
                "relative aspect-square w-14 shrink-0 overflow-hidden rounded-lg border bg-sand-50 transition-all duration-150 sm:w-16 lg:w-full",
                index === active
                  ? "border-evergreen-600 ring-2 ring-evergreen-600/30"
                  : "border-line hover:border-line-strong"
              )}
            >
              {!!image.url && (
                <Image
                  src={image.url}
                  alt=""
                  className="object-contain p-1.5"
                  fill
                  sizes="80px"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageGallery
