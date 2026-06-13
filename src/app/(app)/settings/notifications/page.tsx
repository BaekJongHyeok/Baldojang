import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-cache";
import { NotificationForm } from "./notification-form";

export default async function NotificationSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("notification_enabled, reminder_hour")
    .eq("id", ctx.staff.shopId)
    .single();

  return (
    <div>
      <h1 className="text-[20px] font-bold text-ink">알림톡 설정</h1>
      <NotificationForm
        enabled={shop?.notification_enabled ?? true}
        reminderHour={shop?.reminder_hour ?? 18}
      />
    </div>
  );
}
