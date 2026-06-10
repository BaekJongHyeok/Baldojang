import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signOutAction } from "@/lib/auth-actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // staff.id = auth.uid() (PK가 곧 유저 ID)
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-stone-900">발도장</h1>
        <p className="mb-8 text-sm text-stone-500">대시보드</p>

        <div className="mb-6 rounded-xl bg-stone-50 p-4">
          <dl className="flex flex-col gap-3 text-sm">
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

        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
