'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

const ADSENSE_CLIENT = 'ca-pub-9187908236156462';
const ADMIN_PREFIXES = ['/admin', '/dixnissowner'];

export default function AdsenseScript() {
  const pathname = usePathname() || '';
  const isAdmin = ADMIN_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (isAdmin) return null;

  return (
    <Script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
