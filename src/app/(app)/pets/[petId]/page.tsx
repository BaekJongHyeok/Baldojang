import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { calcAge, sizeLabel, formatPhone } from "@/lib/utils";
import { DeactivateButton, ReactivateButton } from "./deactivate-button";
import { InlineCycleEdit } from "./inline-cycle-edit";
import { InlineCautionEdit } from "./inline-caution-edit";
import { getPetPhotoUrl } from "@/lib/storage";
import { getAuthContext } from "@/lib/auth-cache";
import { PhoneButton } from "@/components/phone-button";

export default async function PetChartPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const [{ petId }, ctx] = await Promise.all([params, getAuthContext()]);
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, breed, size, birth_date, weight_kg, photo_url, caution_tags, caution_memo, vaccinated, neutered, cycle_weeks, is_active, customer_id, customers(id, name, phone)")
    .eq("id", petId)
    .single();

  if (!pet) notFound();

  const customer = Array.isArray(pet.customers) ? pet.customers[0] : pet.customers;

  // 병렬: signed URL, 방문 이력, 선불권
  const [photoSignedUrl, visitsResult, passesResult] = await Promise.all([
    getPetPhotoUrl(pet.photo_url),
    supabase
      .from("visits")
      .select("id, visited_at, style_memo, behavior_memo, before_photos, after_photos, services(name, recommend_cycle_weeks)")
      .eq("pet_id", petId)
      .order("visited_at", { ascending: false }),
    customer
      ? supabase.from("passes").select("type, name, balance, remaining, expires_at, disabled_at").eq("customer_id", customer.id)
      : Promise.resolve({ data: null }),
  ]);

  const visits = visitsResult.data;

  let passBadge: { label: string; balance: string } | null = null;
  if (customer) {
    const active = (passesResult.data ?? []).filter((p) => {
      if (p.disabled_at) return false;
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

  // 최신 시술 메모 (히어로용)
  const latestVisit = visits?.[0] ?? null;
  const latestService = latestVisit ? (Array.isArray(latestVisit.services) ? latestVisit.services[0] : latestVisit.services) : null;
  const latestStyleMemo = latestVisit?.style_memo || null;

  // 재방문 주기 출처
  const shopDefaultCycle = ctx.shop?.defaultCycleWeeks ?? 5;
  const serviceCycle = latestService && "recommend_cycle_weeks" in latestService ? (latestService as { recommend_cycle_weeks: number | null }).recommend_cycle_weeks : null;
  let effectiveCycle: number;
  let cycleSource: string;
  if (pet.cycle_weeks != null) { effectiveCycle = pet.cycle_weeks; cycleSource = "펫 설정"; }
  else if (serviceCycle != null) { effectiveCycle = serviceCycle; cycleSource = "시술 기준"; }
  else { effectiveCycle = shopDefaultCycle; cycleSource = "샵 기본"; }

  return (
    <div>
      <Link href="/pets" className="text-[13px] text-ink-caption hover:text-ink-secondary">&larr; 펫 목록</Link>

      <div className="mt-3 grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* ── 좌측: 정보 패널 ── */}
        <div className="flex flex-col gap-4">
          {/* 프로필 + 히어로 액션 */}
          <div className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-border-light text-[20px] font-bold text-ink-caption overflow-hidden">
                {photoSignedUrl ? (
                  <img src={photoSignedUrl} alt={pet.name} className="h-full w-full object-cover" />
                ) : (
                  pet.name.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
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
                <PhoneButton phone={customer.phone} className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-secondary hover:bg-bg tabular-nums">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  {formatPhone(customer.phone)}
                </PhoneButton>
                {passBadge && (
                  <span className="rounded-sm bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">{passBadge.label} {passBadge.balance}</span>
                )}
              </div>
            )}

            {/* 히어로 액션 */}
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              {pet.is_active ? (
                <Link
                  href={`/calendar?book=${petId}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  예약 잡기
                </Link>
              ) : (
                <span className="flex flex-1 items-center justify-center rounded-md bg-border-light py-2 text-[13px] font-medium text-ink-disabled">예약 잡기</span>
              )}
              <Link href={`/pets/${petId}/edit`} className="flex flex-1 items-center justify-center rounded-md border border-border py-2 text-[13px] font-medium text-ink transition-colors hover:bg-bg">
                수정
              </Link>
            </div>
            {!pet.is_active && (
              <p className="mt-1 text-center text-[11px] text-ink-disabled">비활성 펫은 예약할 수 없어요</p>
            )}
          </div>

          {/* 지난 시술 히어로 */}
          {latestVisit && (latestStyleMemo || latestService) && (
            <div className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink-caption">지난 미용</p>
                <span className="text-[11px] text-ink-disabled tabular-nums">{new Date(latestVisit.visited_at).toLocaleDateString("ko-KR")}</span>
              </div>
              <p className="mt-1 text-[14px] font-medium text-ink">{latestService?.name ?? ""}</p>
              {latestStyleMemo && (
                <p className="mt-1 text-[13px] text-ink-secondary">{latestStyleMemo}</p>
              )}
            </div>
          )}

          {/* 주의사항 (인라인 편집) */}
          <InlineCautionEdit petId={petId} cautionTags={pet.caution_tags} cautionMemo={pet.caution_memo} />

          {/* 기본 정보 */}
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-[13px] font-semibold text-ink-caption">기본 정보</p>
            <dl className="mt-2 flex flex-col gap-1.5 text-[14px]">
              <InlineCycleEdit petId={petId} cycleWeeks={pet.cycle_weeks} effectiveCycle={effectiveCycle} cycleSource={cycleSource} />
              <div className="flex justify-between">
                <dt className="text-ink-caption">생일</dt>
                <dd className="text-ink">{pet.birth_date ? new Date(pet.birth_date + "T00:00:00").toLocaleDateString("ko-KR") : <Link href={`/pets/${petId}/edit?focus=birth_date`} className="text-ink-disabled hover:text-primary">미입력</Link>}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-caption">몸무게</dt>
                <dd className="text-ink">{pet.weight_kg ? `${pet.weight_kg}kg` : <Link href={`/pets/${petId}/edit?focus=weight_kg`} className="text-ink-disabled hover:text-primary">미입력</Link>}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-caption">접종</dt>
                <dd className="text-ink">{pet.vaccinated === null ? <Link href={`/pets/${petId}/edit?focus=vaccinated`} className="text-ink-disabled hover:text-primary">미입력</Link> : pet.vaccinated ? "완료" : "미완료"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-caption">중성화</dt>
                <dd className="text-ink">{pet.neutered === null ? <Link href={`/pets/${petId}/edit?focus=neutered`} className="text-ink-disabled hover:text-primary">미입력</Link> : pet.neutered ? "완료" : "미완료"}</dd>
              </div>
            </dl>
            {/* 활성 상태 토글 — 기본 정보 카드 내 최하단 */}
            <div className="mt-2 border-t border-border pt-2">
              {pet.is_active ? <DeactivateButton petId={petId} /> : <ReactivateButton petId={petId} />}
            </div>
          </div>
        </div>

        {/* ── 우측: 방문 기록 ── */}
        <div className="rounded-lg border border-border bg-white">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[14px] font-semibold text-ink">방문 이력</h2>
          </div>
          {!visits || visits.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-border-light">
                <svg className="h-6 w-6 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                </svg>
              </div>
              <p className="mt-3 text-[14px] font-medium text-ink-caption">
                {pet.is_active ? "아직 방문 기록이 없어요" : "비활성 펫입니다"}
              </p>
              {pet.is_active && (
                <Link
                  href={`/calendar?book=${petId}`}
                  className="mt-3 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary-hover"
                >
                  첫 예약 잡기
                </Link>
              )}
            </div>
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
