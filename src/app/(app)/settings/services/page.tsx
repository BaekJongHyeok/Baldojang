import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ServiceList } from "./service-list";

export default async function ServicesSettingsPage() {
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
  if (!staff) redirect("/dashboard");

  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, recommend_cycle_weeks, sort_order, is_active")
    .eq("shop_id", staff.shop_id)
    .order("sort_order", { ascending: true });

  return (
    <div>
      <h1 className="text-[20px] font-bold text-ink">시술 메뉴</h1>
      <ServiceList services={services ?? []} />
    </div>
  );
}
