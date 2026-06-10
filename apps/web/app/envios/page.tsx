import ContentPage from '../_contentPage';
import PublicSectionGuard from '@/components/layout/PublicSectionGuard';

export default function Page() {
  return (
    <PublicSectionGuard setting="showShippingInfo">
      <ContentPage kind="envios" />
    </PublicSectionGuard>
  );
}
