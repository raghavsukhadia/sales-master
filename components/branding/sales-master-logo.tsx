import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/sales-master-logo.png";

const sizeClasses = {
  /** Compact header / nav mark */
  sm: "h-10 w-auto max-w-[148px]",
  /** Login card and drawer */
  md: "h-16 w-auto max-w-[220px]",
  /** Login hero */
  lg: "h-36 w-auto max-w-[300px]",
} as const;

export type SalesMasterLogoSize = keyof typeof sizeClasses;

interface SalesMasterLogoProps {
  size?: SalesMasterLogoSize;
  className?: string;
  priority?: boolean;
}

export function SalesMasterLogo({
  size = "md",
  className,
  priority = false,
}: SalesMasterLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="Sales Master"
      width={2816}
      height={1536}
      priority={priority}
      className={cn("object-contain", sizeClasses[size], className)}
    />
  );
}
