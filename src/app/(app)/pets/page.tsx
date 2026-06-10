import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PetListClient } from "./pet-list";
import { getPetPhotoUrls } from "@/lib/storage";

export default async function PetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) redirect("/dashboard");

  // 샵의 전체 펫 로드 (활성+비활성 모두, 클라이언트에서 필터)
  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, breed, size, photo_url, caution_tags, is_active, customer_id, customers(name, phone)")
    .eq("shop_id", staff.shop_id)
    .order("created_at", { ascending: false });

  // 마지막 방문일 조회
  const petIds = (pets ?? []).map((p) => p.id);
  let lastVisitMap: Record<string, string> = {};
  if (petIds.length > 0) {
    const { data: visits } = await supabase
      .from("visits")
      .select("pet_id, visited_at")
      .in("pet_id", petIds)
      .order("visited_at", { ascending: false });
    if (visits) {
      for (const v of visits) {
        if (!lastVisitMap[v.pet_id]) lastVisitMap[v.pet_id] = v.visited_at;
      }
    }
  }

  // signed URL 일괄 생성
  const photoPaths = (pets ?? [])
    .map((p) => p.photo_url)
    .filter((u): u is string => !!u);
  const photoUrlMap = await getPetPhotoUrls(photoPaths);

  const allPets = (pets ?? []).map((p) => ({
    ...p,
    photoSignedUrl: p.photo_url ? (photoUrlMap[p.photo_url] ?? null) : null,
    lastVisit: lastVisitMap[p.id] ?? null,
  }));

  return <PetListClient pets={allPets} />;
}
