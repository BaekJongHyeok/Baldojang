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
    <div className="min-h-screen bg-bg">
      <AppNav shopName={shopName} />
      <main className="pb-16 lg:pl-[200px] lg:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
