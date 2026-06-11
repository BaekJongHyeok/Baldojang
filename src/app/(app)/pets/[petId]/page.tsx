import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { calcAge, sizeLabel, formatPhone } from "@/lib/utils";
import { DeactivateButton } from "./deactivate-button";
import { getPetPhotoUrl } from "@/lib/storage";

export default async function PetChartPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, breed, size, birth_date, weight_kg, photo_url, caution_tags, caution_memo, vaccinated, neutered, is_active, customer_id, customers(id, name, phone)")
    .eq("id", petId)
    .single();

  if (!pet) notFound();

  const photoSignedUrl = await getPetPhotoUrl(pet.photo_url);
  const customer = Array.isArray(pet.customers) ? pet.customers[0] : pet.customers;

  const { data: visits } = await supabase
    .from("visits")
    .select("id, visited_at, style_memo, behavior_memo, before_photos, after_photos, services(name)")
    .eq("pet_id", petId)
    .order("visited_at", { ascending: false });

  // 선불권
  let passBadge: { label: string; balance: string } | null = null;
  if (customer) {
    const { data: passes } = await supabase.from("passes").select("type, name, balance, remaining, expires_at").eq("customer_id", customer.id);
    const active = (passes ?? []).filter((p) => {
      if (p.expires_at && new Date(p.expires_at) < new Date()) return false;
      if (p.type === "amount") return (p.balance ?? 0) > 0;
      return (p.remaining ?? 0) > 0;
    });
    if (active.length > 0) {
      const p = active[0];
      passBadge = { label: p.name, balance: p.type === "amount" ? `₩${(p.balance ?? 0).toLocaleString()}` : `${p.remaining ?? 0}회` };
    }
  }

  const details = [pet.breed, sizeLabel(pet.size)].filter(Boolean).join(" · ");
  const age = pet.birth_date ? calcAge(pet.birth_date) : null;
  const weight = pet.weight_kg ? `${pet.weight_kg}kg` : null;

  return (
    <div>
      {/* 뒤로가기 */}
      <Link href="/pets" className="text-[13px] text-ink-caption hover:text-ink-secondary">&larr; 펫 목록</Link>

      <div className="mt-3 grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* ── 좌측: 정보 패널 ── */}
        <div className="flex flex-col gap-4">
          {/* 프로필 */}
          <div className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-border-light text-[20px] font-bold text-ink-caption overflow-hidden">
                {photoSignedUrl ? (
                  <img src={photoSignedUrl} alt={pet.name} className="h-full w-full object-cover" />
                ) : (
                  (pet.breed ?? pet.name).charAt(0)
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-[20px] font-bold text-ink">{pet.name}</h1>
                <p className="text-[13px] text-ink-caption">{[details, age, weight].filter(Boolean).join(" · ")}</p>
                {!pet.is_active && (
                  <span className="mt-1 inline-block rounded-sm bg-border-light px-1.5 py-0.5 text-[11px] font-medium text-ink-caption">비활성</span>
                )}
              </div>
            </div>

            {/* 보호자 */}
            {customer && (
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-ink-caption">보호자</p>
                  <Link href={`/customers/${customer.id}`} className="text-[14px] font-medium text-ink hover:text-primary">{customer.name}</Link>
                </div>
                <a href={`tel:${customer.phone}`} className="rounded-md border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-secondary hover:bg-bg tabular-nums">
                  {formatPhone(customer.phone)}
                </a>
                {passBadge && (
                  <span className="rounded-sm bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">{passBadge.label} {passBadge.balance}</span>
                )}
              </div>
            )}
          </div>

          {/* 주의사항 */}
          {(pet.caution_tags.length > 0 || pet.caution_memo) && (
            <div className="rounded-lg border border-danger/20 bg-danger-light p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-danger">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                주의사항
              </p>
              {pet.caution_tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {pet.caution_tags.map((tag) => (
                    <span key={tag} className="rounded-sm bg-white/70 px-2 py-0.5 text-[12px] font-medium text-danger">{tag}</span>
                  ))}
                </div>
              )}
              {pet.caution_memo && <p className="mt-2 text-[13px] text-danger/80">{pet.caution_memo}</p>}
            </div>
          )}

          {/* 기본 정보 */}
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-[13px] font-semibold text-ink-caption">기본 정보</p>
            <dl className="mt-2 flex flex-col gap-1.5 text-[14px]">
              <div className="flex justify-between"><dt className="text-ink-caption">접종</dt><dd className="text-ink">{pet.vaccinated === null ? "모름" : pet.vaccinated ? "완료" : "미완료"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-caption">중성화</dt><dd className="text-ink">{pet.neutered === null ? "모름" : pet.neutered ? "완료" : "미완료"}</dd></div>
            </dl>
          </div>

          {/* 액션 */}
          <div className="flex gap-2">
            <Link href={`/pets/${petId}/edit`} className="flex-1 rounded-md border border-border py-2 text-center text-[14px] font-medium text-ink hover:bg-bg">수정</Link>
            {pet.is_active && <DeactivateButton petId={petId} />}
          </div>
        </div>

        {/* ── 우측: 방문 기록 테이블 ── */}
        <div className="rounded-lg border border-border bg-white">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[14px] font-semibold text-ink">방문 이력</h2>
          </div>
          {!visits || visits.length === 0 ? (
            <p className="px-4 py-10 text-center text-[14px] text-ink-caption">방문 기록이 없습니다</p>
          ) : (
            <>
              {/* 데스크톱 테이블 */}
              <div className="hidden lg:block">
                <table className="w-full text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-border-light bg-border-light text-[12px] font-medium text-ink-caption">
                      <th className="px-4 py-2">날짜</th>
                      <th className="px-4 py-2">시술</th>
                      <th className="px-4 py-2">사진</th>
                      <th className="px-4 py-2">메모</th>
                      <th className="px-4 py-2 text-right">카드</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v) => {
                      const service = Array.isArray(v.services) ? v.services[0] : v.services;
                      const photoCount = v.before_photos.length + v.after_photos.length;
                      return (
                        <tr key={v.id} className="border-b border-border-light last:border-b-0 hover:bg-bg transition-colors">
                          <td className="px-4 py-2.5 tabular-nums text-ink-secondary whitespace-nowrap">{new Date(v.visited_at).toLocaleDateString("ko-KR")}</td>
                          <td className="px-4 py-2.5 text-ink">{service?.name ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            {photoCount > 0 ? (
                              <div className="flex gap-1">
                                {v.before_photos.slice(0, 2).map((url, i) => <img key={`b-${i}`} src={url} alt="전" className="h-8 w-8 rounded-sm object-cover" />)}
                                {v.after_photos.slice(0, 2).map((url, i) => <img key={`a-${i}`} src={url} alt="후" className="h-8 w-8 rounded-sm object-cover" />)}
                              </div>
                            ) : <span className="text-ink-disabled">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-ink-secondary max-w-[200px] truncate">{v.style_memo || v.behavior_memo || "—"}</td>
                          <td className="px-4 py-2.5 text-right"><Link href={`/visits/${v.id}/card`} className="text-[12px] font-medium text-primary hover:underline">보기</Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* 모바일 리스트 */}
              <div className="lg:hidden">
                {visits.map((v) => {
                  const service = Array.isArray(v.services) ? v.services[0] : v.services;
                  const photoCount = v.before_photos.length + v.after_photos.length;
                  return (
                    <Link
                      key={v.id}
                      href={`/visits/${v.id}/card`}
                      className="flex items-center justify-between border-b border-border-light px-4 py-3 last:border-b-0 transition-colors active:bg-bg"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-ink">{service?.name ?? "—"}</span>
                          {photoCount > 0 && (
                            <div className="flex gap-0.5">
                              {v.before_photos.slice(0, 1).map((url, i) => <img key={`b-${i}`} src={url} alt="전" className="h-6 w-6 rounded-sm object-cover" />)}
                              {v.after_photos.slice(0, 1).map((url, i) => <img key={`a-${i}`} src={url} alt="후" className="h-6 w-6 rounded-sm object-cover" />)}
                            </div>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-ink-caption">
                          {new Date(v.visited_at).toLocaleDateString("ko-KR")}
                          {(v.style_memo || v.behavior_memo) && ` · ${v.style_memo || v.behavior_memo}`}
                        </p>
                      </div>
                      <span className="ml-3 shrink-0 text-[12px] font-medium text-primary">카드</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
