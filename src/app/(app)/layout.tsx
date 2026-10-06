import { BottomNav } from '@/components/borrower/BottomNav';
import { DownloadAppButton } from '@/components/pwa/DownloadAppButton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-page">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
      <DownloadAppButton />
    </div>
  );
}