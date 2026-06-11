"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { sizeLabel } from "@/lib/utils";

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
        <Link
          href="/pets/new"
          className="shrink-0 rounded-button bg-accent px-4 py-2 text-[15px] font-medium text-white press-scale transition-all duration-150 hover:bg-accent-hover"
        >
          + 펫 등록
        </Link>
      </div>

      {/* 검색 — sticky */}
      <div className="sticky top-0 z-10 -mx-4 bg-surface px-4 pt-3 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 보호자, 전화번호로 검색"
          className="w-full min-w-0 rounded-input border border-border bg-surface-card px-4 py-2.5 text-[15px] text-ink outline-none transition-colors duration-150 focus:border-accent focus:ring-1 focus:ring-accent/20"
        />

        <label className="mt-2 flex items-center gap-2 text-[13px] text-ink-tertiary">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          비활성 펫 포함
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[15px] text-ink-tertiary">
          {search ? "검색 결과가 없습니다." : "등록된 펫이 없습니다."}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {filtered.map((pet) => {
            const customer = getCustomer(pet);
            const hasCaution = pet.caution_tags.length > 0;
            return (
              <Link
                key={pet.id}
                href={`/pets/${pet.id}`}
                className={`flex items-center gap-3.5 rounded-card bg-surface-card p-4 press-scale transition-all duration-150 hover:bg-surface-hover ${
                  !pet.is_active ? "opacity-50" : ""
                } ${hasCaution ? "border-l-[3px] border-l-status-danger/40" : ""}`}
              >
                {/* 아바타 56px */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-warm-100 text-[18px] font-bold text-ink-tertiary overflow-hidden">
                  {pet.photoSignedUrl ? (
                    <img
                      src={pet.photoSignedUrl}
                      alt={pet.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (pet.breed ?? pet.name).charAt(0)
                  )}
                </div>

                {/* 정보 */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-ink">
                    {pet.name}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-ink-tertiary">
                    {[pet.breed, sizeLabel(pet.size)].filter(Boolean).join(" · ")}
                    {customer && ` · ${customer.name}`}
                  </p>
                  <p className="text-[11px] text-ink-faint">
                    {pet.lastVisit
                      ? `마지막 방문 ${new Date(pet.lastVisit).toLocaleDateString("ko-KR")}`
                      : "방문 기록 없음"}
                  </p>
                </div>

                <svg
                  className="h-4 w-4 shrink-0 text-ink-faint"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
