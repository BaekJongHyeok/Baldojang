"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    return { error: authError.message };
  }

  const { error: rpcError } = await supabase.rpc("create_shop_with_owner", {
    shop_name: shopName,
    owner_name: ownerName,
  });
  if (rpcError) {
    return { error: rpcError.message };
  }

  redirect("/dashboard");
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
