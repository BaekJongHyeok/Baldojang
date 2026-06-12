import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-cache";
import { ServiceList } from "./service-list";

export default async function ServicesSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, recommend_cycle_weeks, sort_order, is_active")
    .eq("shop_id", ctx.staff.shopId)
    .order("sort_order", { ascending: true });

  return (
    <div>
      <h1 className="text-[20px] font-bold text-ink">시술 메뉴</h1>
      <ServiceList services={services ?? []} />
    </div>
  );
}
