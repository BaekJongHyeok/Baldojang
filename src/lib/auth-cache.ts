import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** 요청 단위 캐시: getUser + staff + shop 한 번만 조회 */
export const getAuthContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff } = await supabase
    .from("staff")
    .select("id, shop_id, name")
    .eq("id", user.id)
    .single();
  if (!staff) return null;

  const { data: shop } = await supabase
    .from("shops")
    .select("name, phone, address, open_hours, slot_minutes, default_cycle_weeks")
    .eq("id", staff.shop_id)
    .single();

  return {
    user,
    staff: { id: staff.id, shopId: staff.shop_id, name: staff.name },
    shop: shop
      ? {
          name: shop.name,
          phone: shop.phone as string | null,
          address: shop.address as string | null,
          openHours: shop.open_hours,
          slotMinutes: shop.slot_minutes,
          defaultCycleWeeks: shop.default_cycle_weeks,
        }
      : null,
  };
});
