import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayKST, formatTimestampKST } from "@/lib/calendar-utils";

/* ── helpers ── */

function statusVariant(s: string) {
  switch (s) {
    case "confirmed":
      return "info" as const;
    case "completed":
      return "success" as const;
    case "no_show":
      return "danger" as const;
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

function timeGreeting() {
  const h = new Date().getUTCHours() + 9; // KST
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "좋은 오후예요";
  return "수고한 하루예요";
}

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
    .select(
      "id, starts_at, ends_at, status, pets(name, photo_url), services(name)",
    )
    .eq("shop_id", staff.shop_id)
    .gte("starts_at", todayStart)
    .lte("starts_at", todayEnd)
    .order("starts_at");

  const reservations = todayRes ?? [];
  const totalCount = reservations.filter(
    (r) => r.status !== "cancelled",
  ).length;
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
  const retentionPetIds = [...oldPetIds].filter(
    (id) => !futurePetIds.has(id),
  );
  const retentionCount = retentionPetIds.length;

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

  /* ── 빈 상태 브리핑용 추가 데이터 ── */

  // 재방문 미리보기 (최대 3마리)
  let retentionPreview: { id: string; name: string }[] = [];
  if (activeReservations.length === 0 && retentionPetIds.length > 0) {
    const previewIds = retentionPetIds.slice(0, 3);
    const { data: previewPets } = await supabase
      .from("pets")
      .select("id, name")
      .in("id", previewIds);
    retentionPreview = previewPets ?? [];
  }

  // 이번 주 매출 (월요일~오늘)
  let weekRevenue = 0;
  if (activeReservations.length === 0) {
    const todayDate = new Date(today + "T00:00:00+09:00");
    const dayOfWeek = todayDate.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(todayDate);
    monday.setDate(monday.getDate() - mondayOffset);
    const weekStart = monday.toISOString();
    const { data: weekPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("shop_id", staff.shop_id)
      .gte("paid_at", weekStart)
      .lte("paid_at", todayEnd);
    weekRevenue = (weekPayments ?? []).reduce(
      (sum, p) => sum + p.amount,
      0,
    );
  }

  // 최근 완료 미용 (최대 2건)
  let recentVisits: { pet_name: string; service_name: string; visited_at: string }[] = [];
  if (activeReservations.length === 0) {
    const { data: rv } = await supabase
      .from("visits")
      .select("visited_at, pets(name), services(name)")
      .eq("shop_id", staff.shop_id)
      .order("visited_at", { ascending: false })
      .limit(2);
    recentVisits = (rv ?? []).map((v) => {
      const pet = Array.isArray(v.pets) ? v.pets[0] : v.pets;
      const svc = Array.isArray(v.services) ? v.services[0] : v.services;
      return {
        pet_name: pet?.name ?? "?",
        service_name: svc?.name ?? "",
        visited_at: v.visited_at,
      };
    });
  }

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
      {nextReservation
        ? (() => {
            const pet = Array.isArray(nextReservation.pets)
              ? nextReservation.pets[0]
              : nextReservation.pets;
            const svc = Array.isArray(nextReservation.services)
              ? nextReservation.services[0]
              : nextReservation.services;
            return (
              <Link
                href={`/calendar?date=${today}`}
                className="mt-3 block rounded-card border border-accent/15 bg-accent-subtle press-scale transition-transform duration-150"
              >
                <div className="flex flex-col items-center px-6 pt-8 pb-7">
                  {/* 펫 아바타 — 크게 */}
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-surface-card text-accent shadow-float">
                    {pet?.photo_url ? (
                      <img
                        src={pet.photo_url}
                        alt=""
                        className="h-[72px] w-[72px] rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-[28px] font-bold">
                        {pet?.name?.charAt(0) ?? "?"}
                      </span>
                    )}
                  </div>

                  {/* 카운트다운 — 디스플레이 사이즈 */}
                  <p className="mt-4 text-[28px] font-bold leading-tight text-accent tabular-nums">
                    {minutesUntilNext !== null
                      ? formatCountdown(minutesUntilNext)
                      : "곧 시작"}
                  </p>

                  {/* 펫 이름 — 디스플레이 사이즈 */}
                  <p className="mt-1 truncate text-[28px] font-bold leading-tight text-ink">
                    {pet?.name}
                  </p>

                  {/* 시술 · 시간 — 보조 */}
                  <p className="mt-2 text-[15px] text-ink-secondary">
                    {svc?.name}
                    <span className="mx-1.5 text-ink-faint">·</span>
                    <span className="tabular-nums">
                      {formatTimestampKST(nextReservation.starts_at, "HH:mm")}–
                      {formatTimestampKST(nextReservation.ends_at, "HH:mm")}
                    </span>
                  </p>
                </div>
              </Link>
            );
          })()
        : activeReservations.length === 0
          ? /* ── 빈 상태 브리핑 ── */
            retentionCount > 0
            ? (
              /* 재방문 대상 있음 → 준히어로 */
              <div className="mt-3 rounded-card border border-accent/15 bg-accent-subtle px-6 pt-7 pb-6">
                <p className="text-[15px] text-ink-secondary">
                  오늘은 예약이 없어요
                </p>
                <p className="mt-1 text-[20px] font-bold text-ink">
                  연락할 때가 된 친구들이{" "}
                  <span className="text-accent">{retentionCount}마리</span>{" "}
                  있어요
                </p>

                {/* 미리보기 */}
                {retentionPreview.length > 0 && (
                  <div className="mt-4 flex flex-col gap-1.5">
                    {retentionPreview.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2.5 rounded-button bg-surface-card/70 px-3 py-2"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-[12px] font-bold text-accent">
                          {p.name.charAt(0)}
                        </span>
                        <span className="text-[15px] font-medium text-ink">
                          {p.name}
                        </span>
                      </div>
                    ))}
                    {retentionCount > 3 && (
                      <p className="text-[13px] text-ink-tertiary pl-1">
                        외 {retentionCount - 3}마리
                      </p>
                    )}
                  </div>
                )}

                <Link
                  href="/retention"
                  className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-button bg-accent px-5 text-[15px] font-medium text-white press-scale transition-transform duration-150"
                >
                  재방문 연락 보기
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

                {/* 보조 정보 */}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {weekRevenue > 0 && (
                    <div className="rounded-button bg-surface-card/70 px-3 py-2.5">
                      <p className="text-[11px] text-ink-tertiary">이번 주 매출</p>
                      <p className="mt-0.5 text-[18px] font-bold text-ink tabular-nums">
                        ₩{weekRevenue.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {recentVisits.length > 0 && (
                    <div className="rounded-button bg-surface-card/70 px-3 py-2.5">
                      <p className="text-[11px] text-ink-tertiary">최근 미용</p>
                      {recentVisits.map((v, i) => (
                        <p
                          key={i}
                          className="mt-0.5 truncate text-[13px] text-ink-secondary"
                        >
                          {v.pet_name}
                          <span className="text-ink-faint"> · {v.service_name}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
            : (
              /* 재방문도 0 → 진짜 빈 상태 */
              <div className="mt-3 rounded-card bg-surface-card px-6 pt-10 pb-8 text-center">
                <p className="text-[28px] font-bold text-ink">
                  {timeGreeting()}
                </p>
                <p className="mt-1 text-[15px] text-ink-tertiary">
                  오늘은 예약이 없어요
                </p>

                {/* 보조 정보 */}
                {(weekRevenue > 0 || recentVisits.length > 0) && (
                  <div className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-2 text-left">
                    {weekRevenue > 0 && (
                      <div className="rounded-button bg-surface px-3 py-2.5">
                        <p className="text-[11px] text-ink-tertiary">이번 주 매출</p>
                        <p className="mt-0.5 text-[18px] font-bold text-ink tabular-nums">
                          ₩{weekRevenue.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {recentVisits.length > 0 && (
                      <div className="rounded-button bg-surface px-3 py-2.5">
                        <p className="text-[11px] text-ink-tertiary">최근 미용</p>
                        {recentVisits.map((v, i) => (
                          <p
                            key={i}
                            className="mt-0.5 truncate text-[13px] text-ink-secondary"
                          >
                            {v.pet_name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 빠른 액션 */}
                <div className="mx-auto mt-6 flex max-w-xs gap-2">
                  <Link
                    href="/calendar?new=1"
                    className="flex flex-1 items-center justify-center gap-2 rounded-button bg-accent px-4 py-3 text-[15px] font-medium text-white press-scale transition-transform duration-150"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    예약 등록
                  </Link>
                  <Link
                    href="/pets/new"
                    className="flex flex-1 items-center justify-center gap-2 rounded-button bg-warm-100 px-4 py-3 text-[15px] font-medium text-ink press-scale transition-transform duration-150"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    펫 등록
                  </Link>
                </div>
              </div>
            )
          : (
            /* 모든 예약 완료됨 */
            <div className="mt-3 rounded-card bg-surface-card px-6 pt-8 pb-7 text-center">
              <p className="text-[28px] font-bold text-ink">
                {timeGreeting()}
              </p>
              <p className="mt-1 text-[15px] text-ink-tertiary">
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
                  className={`flex items-center gap-3 rounded-card bg-surface-card px-4 py-3 press-scale transition-all duration-150 hover:bg-surface-hover ${
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

                  {/* 상태 뱃지 (완료·확정 제외) */}
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

      {/* ── 보조 카드: 매출 · 재방문 (예약 있을 때만) ── */}
      {activeReservations.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <div className="rounded-card bg-surface-card p-4">
            <p className="text-[13px] text-ink-tertiary">오늘 매출</p>
            <p className="mt-1 text-[24px] font-bold text-ink tabular-nums">
              {todayRevenue > 0 ? `₩${todayRevenue.toLocaleString()}` : "—"}
            </p>
          </div>

          {retentionCount > 0 ? (
            <Link
              href="/retention"
              className="rounded-card bg-status-warning-subtle p-4 press-scale transition-transform duration-150"
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
      )}
    </div>
  );
}
