import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CardClient } from "./card-client";

export default async function CardPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) redirect("/dashboard");

  const { data: visit } = await supabase
    .from("visits")
    .select("id, visited_at, style_memo, before_photos, after_photos, pets(id, name, breed), services(name)")
    .eq("id", visitId)
    .single();
  if (!visit) notFound();

  const { data: shop } = await supabase
    .from("shops")
    .select("name, phone, logo_url, brand_color")
    .eq("id", staff.shop_id)
    .single();

  // signed URLs for photos
  const allPaths = [...visit.before_photos, ...visit.after_photos];
  let photoUrlMap: Record<string, string> = {};
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("visit-photos")
      .createSignedUrls(allPaths, 3600);
    if (signed) {
      for (const s of signed) {
        if (s.signedUrl && s.path) photoUrlMap[s.path] = s.signedUrl;
      }
    }
  }

  const pet = Array.isArray(visit.pets) ? visit.pets[0] : visit.pets;
  const service = Array.isArray(visit.services) ? visit.services[0] : visit.services;

  return (
    <CardClient
      visit={{
        id: visit.id,
        visitedAt: visit.visited_at,
        styleMemo: visit.style_memo,
        beforePhotos: visit.before_photos.map((p) => photoUrlMap[p] ?? "").filter(Boolean),
        afterPhotos: visit.after_photos.map((p) => photoUrlMap[p] ?? "").filter(Boolean),
      }}
      pet={{ id: pet?.id ?? "", name: pet?.name ?? "", breed: pet?.breed ?? "" }}
      serviceName={service?.name ?? ""}
      shop={{
        name: shop?.name ?? "",
        phone: shop?.phone ?? "",
        logoUrl: shop?.logo_url ?? null,
        brandColor: shop?.brand_color ?? null,
      }}
      shopId={staff.shop_id}
    />
  );
}
