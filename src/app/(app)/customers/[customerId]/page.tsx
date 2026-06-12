import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatPhone, sizeLabel } from "@/lib/utils";
import { getPetPhotoUrls } from "@/lib/storage";
import { PetAvatar } from "@/components/pet-avatar";
import { PhoneButton } from "@/components/phone-button";
import { PassSection } from "./pass-section";
import { CustomerEditForm } from "./customer-edit-form";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, memo, source, created_at")
    .eq("id", customerId)
    .single();

  if (!customer) notFound();

  // 1차 병렬: 펫, 선불권
  const [petsResult, passesResult] = await Promise.all([
    supabase
      .from("pets")
      .select("id, name, breed, size, photo_url, caution_tags, is_active")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("passes")
      .select("id, type, name, total_amount, balance, total_count, remaining, expires_at, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ]);

  const pets = petsResult.data ?? [];
  const passes = passesResult.data ?? [];

  // 2차 병렬: 방문 이력 + signed URL
  const petIds = pets.map((p) => p.id);
  const photoPaths = pets.map((p) => p.photo_url).filter((u): u is string => !!u);

  const [visitsResult, photoUrlMap] = await Promise.all([
    petIds.length > 0
      ? supabase
          .from("visits")
          .select("id, pet_id, visited_at, services(name)")
          .in("pet_id", petIds)
          .order("visited_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as { id: string; pet_id: string; visited_at: string; services: { name: string } | { name: string }[] | null }[] }),
    getPetPhotoUrls(photoPaths),
  ]);

  const petNameMap: Record<string, string> = {};
  for (const p of pets) petNameMap[p.id] = p.name;

  const allVisits = (visitsResult.data ?? []).map((v) => {
    const svc = Array.isArray(v.services) ? v.services[0] : v.services;
    return {
      id: v.id, visited_at: v.visited_at,
      petName: petNameMap[v.pet_id] ?? "", petId: v.pet_id,
      serviceName: svc?.name ?? "—",
    };
  });

  const activePets = pets.filter((p) => p.is_active);
  const bookHref = activePets.length === 1
    ? `/calendar?book=${activePets[0].id}`
    : "/calendar";

  return (
    <div>
      <Link href="/pets?tab=customer" className="text-[13px] text-ink-caption hover:text-ink-secondary">&larr; 보호자 목록</Link>

      <div className="mt-3 grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* ── 좌측: 정보 패널 ── */}
        <div className="flex flex-col gap-4">
          {/* 보호자 정보 + 수정 */}
          <CustomerEditForm
            customerId={customer.id}
            name={customer.name}
            phone={customer.phone}
            memo={customer.memo}
            source={customer.source}
            createdAt={customer.created_at}
          />

          {/* 빠른 액션 */}
          <div className="flex gap-2">
            <PhoneButton
              phone={customer.phone}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-2.5 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-bg"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              전화
            </PhoneButton>
            <Link
              href={bookHref}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
            >
              예약 잡기
            </Link>
          </div>

          {/* 반려견 목록 */}
          <div>
            <p className="text-[13px] font-bold text-ink-secondary">반려견 ({pets.length})</p>
            <div className="mt-2 flex flex-col gap-2">
              {pets.map((pet) => (
                <Link
                  key={pet.id}
                  href={`/pets/${pet.id}`}
                  className={`flex items-center gap-3 rounded-lg border border-border bg-white p-3.5 transition hover:bg-bg ${!pet.is_active ? "opacity-50" : ""}`}
                >
                  <PetAvatar name={pet.name} photoUrl={pet.photo_url && photoUrlMap[pet.photo_url] ? photoUrlMap[pet.photo_url] : null} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-ink">{pet.name}</p>
                      {pet.caution_tags.length > 0 && (
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger-light">
                          <svg className="h-2.5 w-2.5 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-caption">{[pet.breed, sizeLabel(pet.size)].filter(Boolean).join(" · ")}</p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </Link>
              ))}
              {pets.length === 0 && (
                <p className="py-6 text-center text-sm text-ink-caption">등록된 반려견이 없습니다</p>
              )}
            </div>
          </div>

          {/* 선불권 */}
          <PassSection customerId={customerId} passes={passes.map((p) => ({ ...p, type: p.type as string }))} />
        </div>

        {/* ── 우측: 방문 이력 통합 ── */}
        <div className="rounded-lg border border-border bg-white">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[14px] font-semibold text-ink">방문 이력</h2>
          </div>
          {allVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-border-light">
                <svg className="h-6 w-6 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                </svg>
              </div>
              <p className="mt-3 text-[14px] font-medium text-ink-caption">아직 방문 기록이 없어요</p>
            </div>
          ) : (
            <>
              {/* 데스크톱 테이블 */}
              <div className="hidden lg:block">
                <table className="w-full text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-border-light bg-border-light text-[12px] font-medium text-ink-caption">
                      <th className="px-4 py-2">날짜</th>
                      <th className="px-4 py-2">펫</th>
                      <th className="px-4 py-2">시술</th>
                      <th className="px-4 py-2 text-right">카드</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allVisits.map((v) => (
                      <tr key={v.id} className="border-b border-border-light last:border-b-0 hover:bg-bg transition-colors">
                        <td className="px-4 py-2.5 tabular-nums text-ink-secondary whitespace-nowrap">{new Date(v.visited_at).toLocaleDateString("ko-KR")}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/pets/${v.petId}`} className="font-medium text-ink hover:text-primary">{v.petName}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-ink-secondary">{v.serviceName}</td>
                        <td className="px-4 py-2.5 text-right"><Link href={`/visits/${v.id}/card`} className="text-[12px] font-medium text-primary hover:underline">보기</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* 모바일 리스트 */}
              <div className="lg:hidden">
                {allVisits.map((v) => (
                  <Link
                    key={v.id}
                    href={`/visits/${v.id}/card`}
                    className="flex items-center justify-between border-b border-border-light px-4 py-3 last:border-b-0 transition-colors active:bg-bg"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-ink">{v.petName}</span>
                        <span className="text-[12px] text-ink-caption">{v.serviceName}</span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-ink-caption">{new Date(v.visited_at).toLocaleDateString("ko-KR")}</p>
                    </div>
                    <span className="ml-3 shrink-0 text-[12px] font-medium text-primary">카드</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
