"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { localizeAuthError } from "@/lib/error-messages";

/**
 * 가입 플로우: Auth 가입 → create_shop_with_owner RPC로 샵 + staff 행 생성
 * (RLS 때문에 일반 insert로는 최초 샵 생성 불가 — security definer 함수 사용)
 */
export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const shopName = String(formData.get("shopName"));
  const ownerName = String(formData.get("ownerName"));

  const supabase = await createClient();

  const { error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) {
    return { error: localizeAuthError(authError.message) };
  }

  const { error: rpcError } = await supabase.rpc("create_shop_with_owner", {
    shop_name: shopName,
    owner_name: ownerName,
  });
  if (rpcError) {
    return { error: "샵 생성 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  redirect("/dashboard");
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: localizeAuthError(error.message) };
  }
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * 회원 탈퇴: 비밀번호 재확인 → shop 삭제(CASCADE로 모든 데이터 제거) → auth 계정 삭제
 * service_role 키로 auth.users 삭제 (일반 사용자 권한으로는 불가)
 */
export async function deleteAccountAction(formData: FormData) {
  const password = String(formData.get("password"));
  const confirmShopName = String(formData.get("confirm_shop_name"));

  if (!password || !confirmShopName) {
    return { error: "비밀번호와 샵 이름을 입력해주세요." };
  }

  const supabase = await createClient();

  // 1. 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증이 필요합니다." };

  // 2. 비밀번호 재확인 (재로그인으로 검증)
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });
  if (authError) return { error: "비밀번호가 일치하지 않습니다." };

  // 3. staff → shop_id 확인 + 샵 이름 대조
  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) return { error: "계정 정보를 찾을 수 없습니다." };

  const { data: shop } = await supabase
    .from("shops")
    .select("name")
    .eq("id", staff.shop_id)
    .single();
  if (!shop) return { error: "샵 정보를 찾을 수 없습니다." };

  if (confirmShopName.trim() !== shop.name.trim()) {
    return { error: "샵 이름이 일치하지 않습니다." };
  }

  // 4. service_role 클라이언트로 데이터 삭제 (RLS 우회)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { error: "서버 설정 오류입니다. 관리자에게 문의해주세요." };

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  );

  // 5. shops 삭제 — CASCADE로 staff, customers, pets, services, reservations,
  //    visits, passes, pass_logs, payments, notifications, retention_contacts 모두 삭제
  const { error: deleteShopError } = await adminClient
    .from("shops")
    .delete()
    .eq("id", staff.shop_id);
  if (deleteShopError) return { error: "데이터 삭제에 실패했습니다. 다시 시도해주세요." };

  // 6. auth.users 삭제 (개인정보 완전 제거)
  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteUserError) return { error: "계정 삭제에 실패했습니다. 다시 시도해주세요." };

  // 7. 세션 정리 + 로그아웃
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password"));
  const confirmPassword = String(formData.get("confirm_password"));

  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 합니다." };
  if (password !== confirmPassword) return { error: "비밀번호가 일치하지 않습니다." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: localizeAuthError(error.message) };

  return { success: true };
}
