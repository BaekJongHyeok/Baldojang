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
    .select("name, phone, address, open_hours, slot_minutes")
    .eq("id", staff.shop_id)
    .single();

  if (!shop) redirect("/dashboard");

  const openHours =
    typeof shop.open_hours === "object" && shop.open_hours !== null
      ? (shop.open_hours as Record<string, { open: string; close: string }>)
      : {};

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900">샵 정보</h1>
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <ShopSettingsForm
          name={shop.name}
          phone={shop.phone ?? ""}
          address={shop.address ?? ""}
          openHours={openHours}
          slotMinutes={shop.slot_minutes}
          defaultCycleWeeks={5}
        />
      </div>
    </div>
  );
}
