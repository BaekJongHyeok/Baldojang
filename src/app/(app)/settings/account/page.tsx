import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth-cache";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div>
      <Link href="/settings" className="text-[13px] text-ink-caption hover:text-ink-secondary">&larr; 설정</Link>
      <h1 className="mt-2 text-[20px] font-bold text-ink">계정 정보</h1>
      <AccountForm email={ctx.user.email ?? ""} staffName={ctx.staff.name} shopName={ctx.shop?.name ?? ""} />
    </div>
  );
}
