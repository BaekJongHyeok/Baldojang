"use client";

import Link from "next/link";
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
  passBalance: { amount: number; count: number } | null;
};

function getCustomer(pet: Pet) {
  if (!pet.customers) return null;
  if (Array.isArray(pet.customers)) return pet.customers[0] ?? null;
  return pet.customers;
}

type TodayPet = {
  petId: string;
  name: string;
  photoSignedUrl: string | null;
  time: string;
};

function formatPassBalance(b: { amount: number; count: number } | null) {
  if (!b) return null;
  const parts: string[] = [];
  if (b.amount > 0) parts.push(`₩${b.amount.toLocaleString()}`);
  if (b.count > 0) parts.push(`${b.count}회`);
  return parts.length > 0 ? parts.join(" + ") : null;
}

export function PetListClient({ pets, customers, todayPets }: { pets: Pet[]; customers: Customer[]; todayPets: TodayPet[] }) {
  const [tab, setTab] = useState<"pet" | "customer">("pet");
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
    if (!q) return customers;
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.petNames.some((n) => n.toLowerCase().includes(q))
    );
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
          onClick={() => setTab("pet")}
          className={`flex-1 rounded-[5px] py-1.5 text-[13px] font-medium transition-colors ${
            tab === "pet" ? "bg-white text-ink shadow-sm" : "text-ink-caption hover:text-ink-secondary"
          }`}
        >
          펫
        </button>
        <button
          onClick={() => setTab("customer")}
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

/* ── 펫 탭 (기존) ── */
function PetTab({ pets, search }: { pets: Pet[]; search: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
      {pets.length === 0 ? (
        <p className="px-4 py-10 text-center text-[14px] text-ink-caption">
          {search ? "검색 결과가 없습니다." : "등록된 펫이 없습니다."}
        </p>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden lg:block">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-border bg-border-light text-[12px] font-medium text-ink-caption">
                  <th className="px-4 py-2.5">펫</th>
                  <th className="px-4 py-2.5">견종</th>
                  <th className="px-4 py-2.5">보호자</th>
                  <th className="px-4 py-2.5">연락처</th>
                  <th className="px-4 py-2.5">마지막 방문</th>
                  <th className="px-4 py-2.5 w-8">주의</th>
                </tr>
              </thead>
              <tbody>
                {pets.map((pet) => {
                  const customer = getCustomer(pet);
                  const hasCaution = pet.caution_tags.length > 0;
                  return (
                    <tr key={pet.id} className={`border-b border-border-light last:border-b-0 hover:bg-bg transition-colors ${!pet.is_active ? "opacity-50" : ""}`}>
                      <td className="px-4 py-2.5">
                        <Link href={`/pets/${pet.id}`} className="flex items-center gap-2.5 hover:text-primary">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-border-light text-[12px] font-bold text-ink-caption overflow-hidden">
                            {pet.photoSignedUrl ? <img src={pet.photoSignedUrl} alt="" className="h-full w-full object-cover" /> : (pet.breed ?? pet.name).charAt(0)}
                          </div>
                          <span className="font-medium text-ink">{pet.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary">{[pet.breed, sizeLabel(pet.size)].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-4 py-2.5 text-ink-secondary">{customer?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ink-secondary tabular-nums">{customer ? formatPhone(customer.phone) : "—"}</td>
                      <td className="px-4 py-2.5 text-ink-caption tabular-nums">{pet.lastVisit ? new Date(pet.lastVisit).toLocaleDateString("ko-KR") : "—"}</td>
                      <td className="px-4 py-2.5 text-center">
                        {hasCaution && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger-light">
                            <svg className="h-3 w-3 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
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
                    {pet.photoSignedUrl ? <img src={pet.photoSignedUrl} alt="" className="h-full w-full object-cover" /> : (pet.breed ?? pet.name).charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-semibold text-ink">{pet.name}</span>
                      {hasCaution && (
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-danger-light">
                          <svg className="h-2.5 w-2.5 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
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
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
      {customers.length === 0 ? (
        <p className="px-4 py-10 text-center text-[14px] text-ink-caption">
          {search ? "검색 결과가 없습니다." : "등록된 보호자가 없습니다."}
        </p>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden lg:block">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-border bg-border-light text-[12px] font-medium text-ink-caption">
                  <th className="px-4 py-2.5">이름</th>
                  <th className="px-4 py-2.5">연락처</th>
                  <th className="px-4 py-2.5">반려견</th>
                  <th className="px-4 py-2.5">선불권 잔액</th>
                  <th className="px-4 py-2.5">등록일</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const bal = formatPassBalance(c.passBalance);
                  return (
                    <tr key={c.id} className="border-b border-border-light last:border-b-0 hover:bg-bg transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/customers/${c.id}`} className="font-medium text-ink hover:text-primary">{c.name}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary tabular-nums">{formatPhone(c.phone)}</td>
                      <td className="px-4 py-2.5 text-ink-secondary">{c.petNames.length > 0 ? c.petNames.join(", ") : "—"}</td>
                      <td className="px-4 py-2.5">
                        {bal ? (
                          <span className="rounded-sm bg-primary-light px-2 py-0.5 text-[12px] font-medium text-primary">{bal}</span>
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
              const bal = formatPassBalance(c.passBalance);
              return (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="flex items-center justify-between border-b border-border-light px-4 py-3 last:border-b-0 transition-colors active:bg-bg"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink">{c.name}</span>
                      <span className="text-[12px] text-ink-caption tabular-nums">{formatPhone(c.phone)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-caption">
                      {[
                        c.petNames.length > 0 ? c.petNames.join(", ") : null,
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
