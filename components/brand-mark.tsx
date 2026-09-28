import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <Link href="/" className={cn("inline-flex items-center gap-3", className)} aria-label={`${brand.name} home`}>
    <Image
      src="/brand-logo.png"
      alt=""
      width={1254}
      height={1254}
      sizes="48px"
      loading="eager"
      className="size-12 shrink-0 rounded-full border border-[var(--line)] object-cover shadow-lg shadow-violet-500/20"
    />
    {!compact && <span>
      <span className="block text-[13px] font-black leading-4 tracking-[0.035em]">PLACEMENT PREP</span>
      <span className="block text-[11px] font-semibold tracking-[0.18em] text-[var(--brand-strong)]">BY HRU&apos;S</span>
    </span>}
  </Link>;
}
