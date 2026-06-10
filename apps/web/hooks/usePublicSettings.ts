"use client";

import { useQuery } from "@tanstack/react-query";
import { dropApi } from "@/services/api";

export type PublicSettings = {
  showModels?: boolean;
  showDrops?: boolean;
  showNews?: boolean;
  showCategories?: boolean;
  showFeatured?: boolean;
  showFooter?: boolean;
  showShippingInfo?: boolean;
};

type SiteState = {
  publicSettings?: PublicSettings;
};

export function usePublicSettings() {
  const query = useQuery<SiteState>({
    queryKey: ["site-state"],
    queryFn: () => dropApi.siteState().then(({ data }) => data),
  });

  return {
    ...query,
    settings: query.data?.publicSettings,
  };
}
