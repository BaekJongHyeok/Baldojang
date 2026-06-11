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

function getCustomer(pet: Pet) {
  if (!pet.customers) return null;
  if (Array.isArray(pet.customers)) return pet.customers[0] ?? null;
  return pet.customers;
}

export function PetListClient({ pets }: { pets: Pet[] }) {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const filtered = useMemo(() => {
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

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-bold text-ink">펫</h1>
        <Link href="/pets/new" className="shrink-0 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-white hover:bg-primary-hover">
          + 펫 등록
        </Link>
      </div>

      {/* 검색 + 필터 */}
      <div className="mt-4 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 보호자, 전화번호 검색"
          className="min-w-0 flex-1 rounded-md border border-border bg-white px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        <label className="flex shrink-0 items-center gap-1.5 text-[12px] text-ink-caption">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          비활성 포함
        </label>
      </div>

      {/* 테이블 */}
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-[14px] text-ink-caption">
            {search ? "검색 결과가 없습니다." : "등록된 펫이 없습니다."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-border bg-border-light text-[12px] font-medium text-ink-caption">
                  <th className="px-4 py-2.5">펫</th>
                  <th className="px-4 py-2.5">견종</th>
                  <th className="px-4 py-2.5 hidden sm:table-cell">보호자</th>
                  <th className="px-4 py-2.5 hidden sm:table-cell">연락처</th>
                  <th className="px-4 py-2.5">마지막 방문</th>
                  <th className="px-4 py-2.5 w-8">주의</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pet) => {
                  const customer = getCustomer(pet);
                  const hasCaution = pet.caution_tags.length > 0;
                  return (
                    <tr
                      key={pet.id}
                      className={`border-b border-border-light last:border-b-0 hover:bg-bg transition-colors ${!pet.is_active ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-2.5">
                        <Link href={`/pets/${pet.id}`} className="flex items-center gap-2.5 hover:text-primary">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-border-light text-[12px] font-bold text-ink-caption overflow-hidden">
                            {pet.photoSignedUrl ? (
                              <img src={pet.photoSignedUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (pet.breed ?? pet.name).charAt(0)
                            )}
                          </div>
                          <span className="font-medium text-ink">{pet.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary">
                        {[pet.breed, sizeLabel(pet.size)].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary hidden sm:table-cell">
                        {customer?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary hidden sm:table-cell tabular-nums">
                        {customer ? formatPhone(customer.phone) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-ink-caption tabular-nums">
                        {pet.lastVisit
                          ? new Date(pet.lastVisit).toLocaleDateString("ko-KR")
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {hasCaution && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger-light">
                            <svg className="h-3 w-3 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
