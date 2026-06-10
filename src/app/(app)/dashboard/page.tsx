import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("name, role, shop_id")
    .eq("id", user.id)
    .single();

  let shopName = "샵 정보 없음";
  if (staff?.shop_id) {
    const { data: shop } = await supabase
      .from("shops")
      .select("name")
      .eq("id", staff.shop_id)
      .single();
    if (shop) shopName = shop.name;
  }
  const staffName = staff?.name ?? "이름 없음";

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900">대시보드</h1>
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <dl className="flex flex-col gap-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">샵 이름</dt>
            <dd className="font-medium text-stone-900">{shopName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">원장</dt>
            <dd className="font-medium text-stone-900">{staffName}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
