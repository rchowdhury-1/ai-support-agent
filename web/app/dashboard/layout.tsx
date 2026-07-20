'use client';

import { getNavBadges, getSessionUser } from '@/lib/api';
import { useData } from '@/lib/use-data';
import { Loading } from '@/lib/ui-state';
import { NavChips, Sidebar, type NavItem } from './_components/Sidebar';

// Icon paths from the approved design.
const ICONS = {
  overview: 'M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z',
  insights:
    'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.4 10.9c.6.5 1 1.2 1.2 2.1h4.4c.2-.9.6-1.6 1.2-2.1A6 6 0 0 0 12 3z',
  conversations: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  enquiries: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5.5h13L22 12v6a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18v-6z',
  billing: 'M2 7.5A2.5 2.5 0 0 1 4.5 5h15A2.5 2.5 0 0 1 22 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 16.5zM2 10h20',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data } = useData(async () => {
    const user = await getSessionUser();
    const badges = await getNavBadges().catch(() => ({ insights: 0, enquiries: 0 }));
    return { user, badges };
  });

  if (!data) return <Loading />;

  const items: NavItem[] = [
    { key: 'overview', label: 'Overview', href: '/dashboard', icon: ICONS.overview },
    { key: 'insights', label: 'Insights', href: '/dashboard/insights', icon: ICONS.insights, badge: data.badges.insights || undefined },
    { key: 'conversations', label: 'Conversations', href: '/dashboard/conversations', icon: ICONS.conversations },
    { key: 'enquiries', label: 'Enquiries', href: '/dashboard/enquiries', icon: ICONS.enquiries, badge: data.badges.enquiries || undefined },
    { key: 'billing', label: 'Billing', href: '/dashboard/billing', icon: ICONS.billing },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} user={data.user} />
      <main className="flex-1 min-w-0 px-[clamp(18px,3.4vw,44px)] pb-16">
        <NavChips items={items} />
        {children}
      </main>
    </div>
  );
}
