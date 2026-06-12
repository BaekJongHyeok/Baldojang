import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("name")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1 className="text-[20px] font-bold text-ink">계정 정보</h1>
      <AccountForm email={user.email ?? ""} staffName={staff?.name ?? ""} />
    </div>
  );
}
