import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-cache";
import { ShopSettingsForm } from "./shop-form";

export default async function ShopSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx?.shop) redirect("/dashboard");

  const openHours =
    typeof ctx.shop.openHours === "object" && ctx.shop.openHours !== null
      ? (ctx.shop.openHours as Record<string, { open: string; close: string }>)
      : {};

  return (
    <div>
      <h1 className="text-[20px] font-bold text-ink">샵 정보</h1>
      <div className="mt-6 rounded-lg border border-border bg-white p-6">
        <ShopSettingsForm
          name={ctx.shop.name}
          phone={ctx.shop.phone ?? ""}
          address={ctx.shop.address ?? ""}
          openHours={openHours}
          slotMinutes={ctx.shop.slotMinutes}
          defaultCycleWeeks={ctx.shop.defaultCycleWeeks}
        />
      </div>
    </div>
  );
}
