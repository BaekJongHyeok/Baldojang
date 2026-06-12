import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-cache";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div>
      <h1 className="text-[20px] font-bold text-ink">계정 정보</h1>
      <AccountForm email={ctx.user.email ?? ""} staffName={ctx.staff.name} />
    </div>
  );
}
