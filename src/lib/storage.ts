import { createClient } from "@/lib/supabase/server";

/**
 * 단일 pet-photos 경로에 대한 signed URL 생성 (1시간)
 * photo_url이 없거나 빈 문자열이면 null 반환
 */
export async function getPetPhotoUrl(
  photoPath: string | null,
): Promise<string | null> {
  if (!photoPath) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("pet-photos")
    .createSignedUrl(photoPath, 3600);
  return data?.signedUrl ?? null;
}

/**
 * 여러 pet-photos 경로에 대한 signed URL 일괄 생성 (N+1 방지)
 * 반환: Record<path, signedUrl>
 */
export async function getPetPhotoUrls(
  photoPaths: string[],
): Promise<Record<string, string>> {
  const validPaths = photoPaths.filter(Boolean);
  if (validPaths.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("pet-photos")
    .createSignedUrls(validPaths, 3600);
  if (!data) return {};
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.signedUrl && item.path) {
      map[item.path] = item.signedUrl;
    }
  }
  return map;
}
