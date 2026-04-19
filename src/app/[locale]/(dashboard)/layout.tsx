import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/overview`);
  }

  return <DashboardShell>{children}</DashboardShell>;
}
