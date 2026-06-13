import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-cache";
import { NotificationForm } from "./notification-form";

export default async function NotificationSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  // notification_enabled, reminder_hour는 migration 0012에서 추가 — generated types 미반영
  const { data: shop } = await supabase
    .from("shops")
    .select("name")
    .eq("id", ctx.staff.shopId)
    .single();
  const shopRow = shop as unknown as { notification_enabled?: boolean; reminder_hour?: number } | null;

  return (
    <div>
      <h1 className="text-[20px] font-bold text-ink">알림톡 설정</h1>
      <NotificationForm
        enabled={shopRow?.notification_enabled ?? false}
        reminderHour={shopRow?.reminder_hour ?? 18}
      />
    </div>
  );
}
