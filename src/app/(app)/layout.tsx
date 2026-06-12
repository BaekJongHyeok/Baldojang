import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { getAuthContext } from "@/lib/auth-cache";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div className="min-h-screen bg-bg">
      <AppNav shopName={ctx.shop?.name ?? "내 샵"} />
      <main className="pb-16 lg:pl-[200px] lg:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
