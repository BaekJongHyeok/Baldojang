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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pet } = await supabase
    .from("pets")
    .select(
      "id, name, breed, size, birth_date, weight_kg, photo_url, caution_tags, caution_memo, vaccinated, neutered, is_active, customer_id, customers(id, name, phone)",
    )
    .eq("id", petId)
    .single();

  if (!pet) notFound();

  const photoSignedUrl = await getPetPhotoUrl(pet.photo_url);

  const customer = Array.isArray(pet.customers)
    ? pet.customers[0]
    : pet.customers;

  // 방문 이력
  const { data: visits } = await supabase
    .from("visits")
    .select(
      "id, visited_at, style_memo, behavior_memo, before_photos, after_photos, services(name)",
    )
    .eq("pet_id", petId)
    .order("visited_at", { ascending: false });

  // 선불권 (보호자 기준)
  let passBadge: { label: string; balance: string } | null = null;
  if (customer) {
    const { data: passes } = await supabase
      .from("passes")
      .select("type, name, balance, remaining, expires_at")
      .eq("customer_id", customer.id);
    const active = (passes ?? []).filter((p) => {
      if (p.expires_at && new Date(p.expires_at) < new Date()) return false;
      if (p.type === "amount") return (p.balance ?? 0) > 0;
      return (p.remaining ?? 0) > 0;
    });
    if (active.length > 0) {
      const p = active[0];
      passBadge = {
        label: p.name,
        balance: p.type === "amount" ? `₩${(p.balance ?? 0).toLocaleString()}` : `${p.remaining ?? 0}회`,
      };
    }
  }

  const details = [pet.breed, sizeLabel(pet.size)]
    .filter(Boolean)
    .join(" · ");
  const age = pet.birth_date ? calcAge(pet.birth_date) : null;
  const weight = pet.weight_kg ? `${pet.weight_kg}kg` : null;
  const subtitle = [details, age, weight].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      {/* ── 히어로 ── */}
      <div className="flex flex-col items-center rounded-card bg-surface-card px-5 pt-7 pb-5">
        {/* 사진 96px */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-warm-100 text-[32px] font-bold text-ink-tertiary overflow-hidden">
          {photoSignedUrl ? (
            <img
              src={photoSignedUrl}
              alt={pet.name}
              className="h-full w-full object-cover"
            />
          ) : (
            (pet.breed ?? pet.name).charAt(0)
          )}
        </div>

        {/* 이름 — 디스플레이 */}
        <h1 className="mt-3 text-[28px] font-bold text-ink">{pet.name}</h1>
        {subtitle && (
          <p className="mt-0.5 text-[15px] text-ink-tertiary">{subtitle}</p>
        )}

        {!pet.is_active && (
          <span className="mt-2 rounded-badge bg-warm-200 px-2.5 py-0.5 text-[11px] font-medium text-ink-tertiary">
            비활성
          </span>
        )}

        {/* 보호자 + 선불권 */}
        {customer && (
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/customers/${customer.id}`}
              className="text-[15px] font-medium text-ink hover:underline"
            >
              {customer.name}
            </Link>
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex h-8 items-center gap-1 rounded-button bg-warm-100 px-3 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-warm-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              {formatPhone(customer.phone)}
            </a>
            {passBadge && (
              <span className="rounded-badge bg-accent-subtle px-2 py-0.5 text-[11px] font-medium text-accent">
                {passBadge.label} {passBadge.balance}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── 주의사항 ── */}
      {(pet.caution_tags.length > 0 || pet.caution_memo) && (
        <div className="rounded-card border border-status-danger/20 bg-status-danger-subtle p-4">
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-status-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-[13px] font-bold text-status-danger">주의사항</p>
          </div>
          {pet.caution_tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {pet.caution_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-badge bg-white/60 px-2.5 py-1 text-[13px] font-medium text-status-danger"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {pet.caution_memo && (
            <p className="mt-2 text-[15px] text-status-danger/80">{pet.caution_memo}</p>
          )}
        </div>
      )}

      {/* ── 기본 정보 ── */}
      <div className="rounded-card bg-surface-card p-5">
        <p className="text-[13px] font-bold text-ink-tertiary">기본 정보</p>
        <dl className="mt-3 flex flex-col gap-2 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-ink-tertiary">접종</dt>
            <dd className="text-ink">
              {pet.vaccinated === null
                ? "모름"
                : pet.vaccinated
                  ? "완료"
                  : "미완료"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-tertiary">중성화</dt>
            <dd className="text-ink">
              {pet.neutered === null
                ? "모름"
                : pet.neutered
                  ? "완료"
                  : "미완료"}
            </dd>
          </div>
        </dl>
      </div>

      {/* ── 방문 이력 (사진 중심) ── */}
      <div className="rounded-card bg-surface-card p-5">
        <p className="text-[13px] font-bold text-ink-tertiary">방문 이력</p>
        {!visits || visits.length === 0 ? (
          <p className="mt-4 text-center text-[15px] text-ink-tertiary">
            방문 기록이 없습니다
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {visits.map((v) => {
              const service = Array.isArray(v.services)
                ? v.services[0]
                : v.services;
              const hasPhotos = v.before_photos.length > 0 || v.after_photos.length > 0;

              return (
                <div
                  key={v.id}
                  className="rounded-button border border-border-light p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-ink-tertiary tabular-nums">
                        {new Date(v.visited_at).toLocaleDateString("ko-KR")}
                      </p>
                      {service && (
                        <p className="text-[15px] font-medium text-ink">
                          {service.name}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/visits/${v.id}/card`}
                      className="rounded-badge bg-warm-100 px-2.5 py-1 text-[11px] font-medium text-ink-secondary transition-colors hover:bg-warm-200"
                    >
                      완료 카드
                    </Link>
                  </div>

                  {/* 전후 사진 썸네일 */}
                  {hasPhotos && (
                    <div className="mt-2.5 flex gap-2 overflow-x-auto">
                      {v.before_photos.map((url, i) => (
                        <div key={`b-${i}`} className="relative shrink-0">
                          <img
                            src={url}
                            alt="전"
                            className="h-16 w-16 rounded-input object-cover"
                          />
                          <span className="absolute bottom-0.5 left-0.5 rounded-badge bg-ink/50 px-1 py-px text-[9px] font-medium text-white">전</span>
                        </div>
                      ))}
                      {v.after_photos.map((url, i) => (
                        <div key={`a-${i}`} className="relative shrink-0">
                          <img
                            src={url}
                            alt="후"
                            className="h-16 w-16 rounded-input object-cover"
                          />
                          <span className="absolute bottom-0.5 left-0.5 rounded-badge bg-accent/80 px-1 py-px text-[9px] font-medium text-white">후</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 메모 */}
                  {v.style_memo && (
                    <p className="mt-2 text-[13px] text-ink-secondary">{v.style_memo}</p>
                  )}
                  {v.behavior_memo && (
                    <p className="mt-0.5 text-[13px] text-ink-tertiary">
                      행동: {v.behavior_memo}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 액션 버튼 ── */}
      <div className="flex gap-2">
        <Link
          href={`/pets/${petId}/edit`}
          className="flex-1 rounded-button border border-border py-2.5 text-center text-[15px] font-medium text-ink transition-colors hover:bg-surface-hover"
        >
          수정
        </Link>
        {pet.is_active && <DeactivateButton petId={petId} />}
      </div>
    </div>
  );
}
