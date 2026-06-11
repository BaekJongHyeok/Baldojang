import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayKST, formatTimestampKST } from "@/lib/calendar-utils";

function statusVariant(s: string) {
  switch (s) {
    case "confirmed":
      return "info" as const;
    case "completed":
      return "success" as const;
    case "no_show":
      return "danger" as const;
    case "cancelled":
      return "default" as const;
    default:
      return "default" as const;
  }
}
function statusLabel(s: string) {
  switch (s) {
    case "confirmed":
      return "확정";
    case "completed":
      return "완료";
    case "no_show":
      return "노쇼";
    case "cancelled":
      return "취소";
    default:
      return s;
  }
}

const badgeStyles = {
  default: "bg-warm-100 text-ink-tertiary",
  info: "bg-status-info-subtle text-status-info",
  success: "bg-status-success-subtle text-status-success",
  warning: "bg-status-warning-subtle text-status-warning",
  danger: "bg-status-danger-subtle text-status-danger",
} as const;

export default async function DashboardPage() {
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
  if (!staff) redirect("/login");

  const today = todayKST();
  const todayStart = new Date(today + "T00:00:00+09:00").toISOString();
  const todayEnd = new Date(today + "T23:59:59+09:00").toISOString();

  // 오늘 예약
  const { data: todayRes } = await supabase
    .from("reservations")
    .select("id, starts_at, ends_at, status, pets(name, photo_url), services(name)")
    .eq("shop_id", staff.shop_id)
    .gte("starts_at", todayStart)
    .lte("starts_at", todayEnd)
    .order("starts_at");

  const reservations = todayRes ?? [];
  const totalCount = reservations.filter((r) => r.status !== "cancelled").length;
  const completedCount = reservations.filter(
    (r) => r.status === "completed",
  ).length;

  // 오늘 매출
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("shop_id", staff.shop_id)
    .gte("paid_at", todayStart)
    .lte("paid_at", todayEnd);

  const todayRevenue = (todayPayments ?? []).reduce(
    (sum, p) => sum + p.amount,
    0,
  );

  // 재방문 대상 수
  const { data: shopCfg } = await supabase
    .from("shops")
    .select("default_cycle_weeks")
    .eq("id", staff.shop_id)
    .single();
  const defCycle = shopCfg?.default_cycle_weeks ?? 5;
  const cutoff = new Date(
    Date.now() - (defCycle - 1) * 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: oldVisits } = await supabase
    .from("visits")
    .select("pet_id")
    .eq("shop_id", staff.shop_id)
    .lte("visited_at", cutoff);
  const oldPetIds = new Set((oldVisits ?? []).map((v) => v.pet_id));
  const nowISO = new Date().toISOString();
  const { data: futureRes } = await supabase
    .from("reservations")
    .select("pet_id")
    .eq("shop_id", staff.shop_id)
    .eq("status", "confirmed")
    .gte("starts_at", nowISO);
  const futurePetIds = new Set((futureRes ?? []).map((r) => r.pet_id));
  const retentionCount = [...oldPetIds].filter(
    (id) => !futurePetIds.has(id),
  ).length;

  // 다음 예약 (현재 시각 이후 첫 confirmed)
  const nextReservation = reservations.find(
    (r) => r.status === "confirmed" && r.starts_at > nowISO,
  );

  // 시간까지 남은 분
  const minutesUntilNext = nextReservation
    ? Math.max(
        0,
        Math.round(
          (new Date(nextReservation.starts_at).getTime() - Date.now()) / 60000,
        ),
      )
    : null;

  function formatCountdown(mins: number) {
    if (mins < 60) return `${mins}분 후`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}시간 ${m}분 후` : `${h}시간 후`;
  }

  const activeReservations = reservations.filter(
    (r) => r.status !== "cancelled",
  );

  return (
    <div>
      {/* ── 날짜 헤더 ── */}
      <p className="text-[13px] font-medium text-ink-tertiary">
        {new Date(today + "T00:00:00Z").toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
      </p>

      {/* ── 히어로: 다음 예약 ── */}
      {nextReservation ? (
        (() => {
          const pet = Array.isArray(nextReservation.pets)
            ? nextReservation.pets[0]
            : nextReservation.pets;
          const svc = Array.isArray(nextReservation.services)
            ? nextReservation.services[0]
            : nextReservation.services;
          return (
            <Link
              href={`/calendar?date=${today}`}
              className="mt-3 block rounded-card bg-surface-card p-5 transition-colors duration-150 hover:bg-surface-hover"
            >
              <div className="flex items-center gap-4">
                {/* 펫 아바타 */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
                  {pet?.photo_url ? (
                    <img
                      src={pet.photo_url}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[20px] font-bold">
                      {pet?.name?.charAt(0) ?? "?"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-accent tabular-nums">
                    {minutesUntilNext !== null
                      ? formatCountdown(minutesUntilNext)
                      : "곧 시작"}
                  </p>
                  <p className="mt-0.5 truncate text-[20px] font-bold text-ink">
                    {pet?.name}
                  </p>
                  <p className="text-[15px] text-ink-secondary">
                    {svc?.name} ·{" "}
                    <span className="tabular-nums">
                      {formatTimestampKST(nextReservation.starts_at, "HH:mm")}–
                      {formatTimestampKST(nextReservation.ends_at, "HH:mm")}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          );
        })()
      ) : activeReservations.length === 0 ? (
        /* ── 빈 상태 ── */
        <div className="mt-3 rounded-card bg-surface-card px-5 py-10 text-center">
          <p className="text-[32px]" role="img" aria-label="쉬는 강아지">
            🐾
          </p>
          <p className="mt-3 text-[15px] text-ink-secondary">
            오늘은 예약이 없어요
          </p>
          {retentionCount > 0 && (
            <Link
              href="/retention"
              className="mt-3 inline-flex items-center gap-1 text-[15px] font-medium text-accent transition-opacity hover:opacity-80"
            >
              재방문 연락 돌려보기
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </Link>
          )}
        </div>
      ) : (
        /* 모든 예약 완료됨 */
        <div className="mt-3 rounded-card bg-surface-card px-5 py-10 text-center">
          <p className="text-[15px] text-ink-secondary">
            오늘 예약을 모두 마쳤어요
          </p>
        </div>
      )}

      {/* ── 오늘 타임라인 ── */}
      {activeReservations.length > 0 && (
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-medium text-ink-tertiary">
              오늘 일정
            </p>
            <p className="text-[13px] text-ink-faint tabular-nums">
              {completedCount}/{totalCount}
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            {activeReservations.map((r) => {
              const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
              const svc = Array.isArray(r.services)
                ? r.services[0]
                : r.services;
              const isCompleted = r.status === "completed";
              const variant = statusVariant(r.status);

              return (
                <Link
                  key={r.id}
                  href={`/calendar?date=${today}`}
                  className={`flex items-center gap-3 rounded-card bg-surface-card px-4 py-3 transition-colors duration-150 hover:bg-surface-hover ${
                    isCompleted ? "opacity-60" : ""
                  }`}
                >
                  {/* 시간 */}
                  <span className="w-11 shrink-0 text-[13px] font-medium text-ink-tertiary tabular-nums">
                    {formatTimestampKST(r.starts_at, "HH:mm")}
                  </span>

                  {/* 상태 인디케이터 */}
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4 shrink-0 text-status-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-status-info" />
                  )}

                  {/* 정보 */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[15px] font-medium ${
                        isCompleted
                          ? "text-ink-tertiary line-through"
                          : "text-ink"
                      }`}
                    >
                      {pet?.name}
                    </p>
                    <p className="text-[13px] text-ink-tertiary">{svc?.name}</p>
                  </div>

                  {/* 상태 뱃지 (완료 제외) */}
                  {!isCompleted && r.status !== "confirmed" && (
                    <span
                      className={`shrink-0 rounded-badge px-2 py-0.5 text-[11px] font-medium ${badgeStyles[variant]}`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 보조 카드: 매출 · 재방문 ── */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-card bg-surface-card p-4">
          <p className="text-[13px] text-ink-tertiary">오늘 매출</p>
          <p className="mt-1 text-[24px] font-bold text-ink tabular-nums">
            {todayRevenue > 0
              ? `₩${todayRevenue.toLocaleString()}`
              : "—"}
          </p>
        </div>

        {retentionCount > 0 ? (
          <Link
            href="/retention"
            className="rounded-card bg-status-warning-subtle p-4 transition-colors duration-150 hover:opacity-90"
          >
            <p className="text-[13px] text-status-warning">재방문 대상</p>
            <p className="mt-1 text-[24px] font-bold text-status-warning tabular-nums">
              {retentionCount}
            </p>
          </Link>
        ) : (
          <div className="rounded-card bg-surface-card p-4">
            <p className="text-[13px] text-ink-tertiary">재방문 대상</p>
            <p className="mt-1 text-[24px] font-bold text-ink tabular-nums">
              0
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
