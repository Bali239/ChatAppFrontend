"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}

const dimensions = {
  sm: "size-9",
  md: "size-11",
  lg: "size-20",
} as const;

export function Avatar({ src, name, size = "md", online }: AvatarProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e6f0eb] font-semibold text-[#245f4b] ${dimensions[size]}`}
    >
      {src && failedSource !== src ? (
        <Image
          src={src}
          alt={`${name} avatar`}
          fill
          sizes={size === "lg" ? "80px" : size === "md" ? "44px" : "36px"}
          unoptimized
          className="object-cover"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <span aria-hidden="true" className={size === "lg" ? "text-2xl" : "text-sm"}>
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
      {online ? (
        <span
          aria-label="Online"
          className="absolute right-0.5 bottom-0.5 size-2.5 rounded-full border-2 border-white bg-[#35a77a]"
        />
      ) : null}
    </span>
  );
}
