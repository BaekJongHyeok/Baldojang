import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();

  let shopName = "내 샵";
  if (staff?.shop_id) {
    const { data: shop } = await supabase
      .from("shops")
      .select("name")
      .eq("id", staff.shop_id)
      .single();
    if (shop) shopName = shop.name;
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppNav shopName={shopName} />
      <main className="pb-20 lg:pl-56 lg:pb-0">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
