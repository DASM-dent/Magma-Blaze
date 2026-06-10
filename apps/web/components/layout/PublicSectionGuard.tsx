"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PublicSettings } from "@/hooks/usePublicSettings";
import { usePublicSettings } from "@/hooks/usePublicSettings";

type VisibilitySetting = keyof Pick<
  PublicSettings,
  "showDrops" | "showModels" | "showNews" | "showShippingInfo"
>;

export default function PublicSectionGuard({
  setting,
  children,
}: {
  setting: VisibilitySetting;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { settings, isError } = usePublicSettings();
  const isHidden = settings?.[setting] === false;

  useEffect(() => {
    if (isHidden) router.replace("/");
  }, [isHidden, router]);

  if (isHidden || (!settings && !isError)) {
    return <div className="min-h-screen bg-[#050403]" aria-hidden="true" />;
  }

  if (isError) return <>{children}</>;

  return <>{children}</>;
}
