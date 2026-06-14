"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { sizeLabel, formatPhone } from "@/lib/utils";

type Pet = {
  id: string;
  name: string;
  breed: string | null;
  size: string | null;
  photo_url: string | null;
  photoSignedUrl: string | null;
  caution_tags: string[];
  is_active: boolean;
  customer_id: string;
  customers: { name: string; phone: string } | { name: string; phone: string }[] | null;
  lastVisit: string | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  petNames: string[];
  passSummary: string | null;
};

type TodayPet = {
  petId: string;
  name: string;
  photoSignedUrl: string | null;
  time: string;
};

function getCustomer(pet: Pet) {
  if (!pet.customers) return null;
  if (Array.isArray(pet.customers)) return pet.customers[0] ?? null;
  return pet.customers;
}

function formatPetNames(names: string[]) {
  if (names.length === 0) return "—";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} 외 ${names.length - 2}`;
}

function CautionIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-3 w-3"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

export function PetListClient({ pets, customers, todayPets, initialTab = "pet" }: { pets: Pet[]; customers: Customer[]; todayPets: TodayPet[]; initialTab?: "pet" | "customer" }) {
  const [tab, setTab] = useState<"pet" | "customer">(initialTab);

  function switchTab(t: "pet" | "customer") {
    setTab(t);
    window.history.replaceState(null, "", t === "pet" ? "/pets" : "/pets?tab=customer");
  }
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const filteredPets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pets.filter((pet) => {
      if (!showInactive && !pet.is_active) return false;
      if (!q) return true;
      const customer = getCustomer(pet);
      return (
        pet.name.toLowerCase().includes(q) ||
        (customer?.name?.toLowerCase().includes(q) ?? false) ||
        (customer?.phone?.includes(q) ?? false)
      );
    });
  }, [pets, search, showInactive]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? customers.filter((c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.petNames.some((n) => n.toLowerCase().includes(q))
        )
      : [...customers];
    return list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [customers, search]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-bold text-ink">펫</h1>
        <Link href="/pets/new" className="shrink-0 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-white hover:bg-primary-hover">
          + 펫 등록
        </Link>
      </div>

      {/* 세그먼트 탭 */}
      <div className="mt-4 flex rounded-md border border-border bg-border-light p-0.5">
        <button
          onClick={() => switchTab("pet")}
          className={`flex-1 rounded-[5px] py-1.5 text-[13px] font-medium transition-colors ${
            tab === "pet" ? "bg-white text-ink shadow-sm" : "text-ink-caption hover:text-ink-secondary"
          }`}
        >
          펫
        </button>
        <button
          onClick={() => switchTab("customer")}
          className={`flex-1 rounded-[5px] py-1.5 text-[13px] font-medium transition-colors ${
            tab === "customer" ? "bg-white text-ink shadow-sm" : "text-ink-caption hover:text-ink-secondary"
          }`}
        >
          보호자
        </button>
      </div>

      {/* 검색 + 필터 */}
      <div className="mt-3 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === "pet" ? "이름, 보호자, 전화번호 검색" : "보호자, 전화번호, 펫 이름 검색"}
          className="min-w-0 flex-1 rounded-md border border-border bg-white px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        {tab === "pet" && (
          <label className="flex shrink-0 items-center gap-1.5 text-[12px] text-ink-caption">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
            비활성 포함
          </label>
        )}
      </div>

      {/* 오늘 예약 */}
      {tab === "pet" && !search && todayPets.length > 0 && (
        <div className="mt-3">
          <p className="text-[12px] font-semibold text-ink-caption">오늘 예약</p>
          <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
            {todayPets.map((tp, i) => (
              <Link
                key={`${tp.petId}-${i}`}
                href={`/pets/${tp.petId}`}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 transition-colors hover:bg-bg active:bg-bg"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-border-light text-[11px] font-bold text-ink-caption overflow-hidden">
                  {tp.photoSignedUrl ? <img src={tp.photoSignedUrl} alt="" className="h-full w-full object-cover" /> : tp.name.charAt(0)}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink leading-tight">{tp.name}</p>
                  <p className="text-[11px] text-ink-caption tabular-nums">{tp.time}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      {tab === "pet" ? (
        <PetTab pets={filteredPets} search={search} />
      ) : (
        <CustomerTab customers={filteredCustomers} search={search} />
      )}
    </div>
  );
}

/* ── 펫 탭 ── */
function PetTab({ pets, search }: { pets: Pet[]; search: string }) {
  const router = useRouter();

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
      {pets.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-12 text-center">
          {search ? (
            <p className="text-[14px] text-ink-caption">검색 결과가 없습니다.</p>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m7.646-10.36a11.972 11.972 0 00-4.29 5.52M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" /></svg>
              </div>
              <p className="mt-3 text-[14px] font-medium text-ink">아직 등록된 펫이 없어요</p>
              <p className="mt-1 text-[12px] text-ink-caption">고객과 반려견을 등록해보세요</p>
              <Link href="/pets/new" className="mt-4 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary-hover">고객 등록</Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden lg:block">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-border bg-border-light text-[12px] font-medium text-ink-caption">
                  <th className="w-[30%] px-4 py-2.5">펫</th>
                  <th className="w-[18%] px-4 py-2.5">견종</th>
                  <th className="w-[14%] px-4 py-2.5">보호자</th>
                  <th className="w-[16%] px-4 py-2.5">연락처</th>
                  <th className="w-[14%] px-4 py-2.5 whitespace-nowrap">마지막 방문</th>
                  <th className="w-[8%] px-4 py-2.5 text-center whitespace-nowrap">
                    <CautionIcon className="mx-auto h-3.5 w-3.5 text-ink-disabled" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {pets.map((pet) => {
                  const customer = getCustomer(pet);
                  const hasCaution = pet.caution_tags.length > 0;
                  return (
                    <tr
                      key={pet.id}
                      onClick={() => router.push(`/pets/${pet.id}`)}
                      className={`cursor-pointer border-b border-border-light last:border-b-0 hover:bg-bg transition-colors ${!pet.is_active ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-border-light text-[12px] font-bold text-ink-caption overflow-hidden">
                            {pet.photoSignedUrl ? <img src={pet.photoSignedUrl} alt="" className="h-full w-full object-cover" /> : pet.name.charAt(0)}
                          </div>
                          <span className="font-medium text-ink">{pet.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary">{[pet.breed, sizeLabel(pet.size)].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-4 py-2.5 text-ink-secondary">{customer?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ink-secondary tabular-nums">{customer ? formatPhone(customer.phone) : "—"}</td>
                      <td className="px-4 py-2.5 text-ink-caption tabular-nums">{pet.lastVisit ? new Date(pet.lastVisit).toLocaleDateString("ko-KR") : "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        {hasCaution && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger-light">
                            <CautionIcon className="h-3 w-3 text-danger" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* 모바일 리스트 */}
          <div className="lg:hidden">
            {pets.map((pet) => {
              const customer = getCustomer(pet);
              const hasCaution = pet.caution_tags.length > 0;
              return (
                <Link
                  key={pet.id}
                  href={`/pets/${pet.id}`}
                  className={`flex items-center gap-3 border-b border-border-light px-4 py-3 last:border-b-0 transition-colors active:bg-bg ${!pet.is_active ? "opacity-50" : ""}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border-light text-[14px] font-bold text-ink-caption overflow-hidden">
                    {pet.photoSignedUrl ? <img src={pet.photoSignedUrl} alt="" className="h-full w-full object-cover" /> : pet.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-semibold text-ink">{pet.name}</span>
                      {hasCaution && (
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger-light">
                          <CautionIcon className="h-2.5 w-2.5 text-danger" />
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-caption">
                      {[pet.breed, sizeLabel(pet.size), customer?.name, pet.lastVisit ? new Date(pet.lastVisit).toLocaleDateString("ko-KR") : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── 보호자 탭 ── */
function CustomerTab({ customers, search }: { customers: Customer[]; search: string }) {
  const router = useRouter();

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
      {customers.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-12 text-center">
          {search ? (
            <p className="text-[14px] text-ink-caption">검색 결과가 없습니다.</p>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
              </div>
              <p className="mt-3 text-[14px] font-medium text-ink">아직 등록된 보호자가 없어요</p>
              <p className="mt-1 text-[12px] text-ink-caption">고객과 반려견을 등록해보세요</p>
              <Link href="/pets/new" className="mt-4 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary-hover">고객 등록</Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden lg:block">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-border bg-border-light text-[12px] font-medium text-ink-caption">
                  <th className="w-[24%] px-4 py-2.5">이름</th>
                  <th className="w-[18%] px-4 py-2.5">연락처</th>
                  <th className="w-[24%] px-4 py-2.5">반려견</th>
                  <th className="w-[18%] px-4 py-2.5 text-right">선불권 잔액</th>
                  <th className="w-[16%] px-4 py-2.5">등록일</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const bal = c.passSummary;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/customers/${c.id}`)}
                      className="cursor-pointer border-b border-border-light last:border-b-0 hover:bg-bg transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-border-light text-[12px] font-bold text-ink-caption">
                            {c.name.charAt(0)}
                          </div>
                          <span className="font-medium text-ink">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary tabular-nums">{formatPhone(c.phone)}</td>
                      <td className="px-4 py-2.5 text-ink-secondary">{formatPetNames(c.petNames)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {bal ? (
                          bal === "0원"
                            ? <span className="text-ink-disabled">0원</span>
                            : <span className="rounded-sm bg-primary-light px-2 py-0.5 text-[12px] font-medium text-primary">{bal}</span>
                        ) : (
                          <span className="text-ink-disabled">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink-caption tabular-nums">{new Date(c.createdAt).toLocaleDateString("ko-KR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* 모바일 리스트 */}
          <div className="lg:hidden">
            {customers.map((c) => {
              const bal = c.passSummary;
              return (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="flex items-center gap-3 border-b border-border-light px-4 py-3 last:border-b-0 transition-colors active:bg-bg"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border-light text-[14px] font-bold text-ink-caption">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink">{c.name}</span>
                      <span className="text-[12px] text-ink-caption tabular-nums">{formatPhone(c.phone)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-caption">
                      {[
                        formatPetNames(c.petNames) !== "—" ? formatPetNames(c.petNames) : null,
                        bal,
                      ].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
