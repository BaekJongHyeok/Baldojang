import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShopSettingsForm } from "./shop-form";

export default async function ShopSettingsPage() {
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

  const { data: shop } = await supabase
    .from("shops")
    .select("name, phone, address, open_hours, slot_minutes, default_cycle_weeks")
    .eq("id", staff.shop_id)
    .single();

  if (!shop) redirect("/dashboard");

  const openHours =
    typeof shop.open_hours === "object" && shop.open_hours !== null
      ? (shop.open_hours as Record<string, { open: string; close: string }>)
      : {};

  return (
    <div>
      <h1 className="text-[20px] font-bold text-ink">샵 정보</h1>
      <div className="mt-6 rounded-lg border border-border bg-white p-6">
        <ShopSettingsForm
          name={shop.name}
          phone={shop.phone ?? ""}
          address={shop.address ?? ""}
          openHours={openHours}
          slotMinutes={shop.slot_minutes}
          defaultCycleWeeks={shop.default_cycle_weeks}
        />
      </div>
    </div>
  );
}
