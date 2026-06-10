"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
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

export function PetListClient({
  pets,
  query,
  showInactive,
}: {
  pets: Pet[];
  query: string;
  showInactive: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(debounce.current);
  }, []);

  function handleSearch(value: string) {
    setSearch(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      if (showInactive) params.set("inactive", "1");
      router.push(`/pets?${params.toString()}`);
    }, 300);
  }

  function toggleInactive() {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (!showInactive) params.set("inactive", "1");
    router.push(`/pets?${params.toString()}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-900">펫</h1>
        <Link
          href="/pets/new"
          className="shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
        >
          + 펫 등록
        </Link>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="강아지 이름으로 검색"
        className="mt-4 w-full min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
      />

      <label className="mt-2 flex items-center gap-2 text-xs text-stone-500">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={toggleInactive}
          className="rounded"
        />
        비활성 펫 포함
      </label>

      {pets.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-400">
          {query ? "검색 결과가 없습니다." : "등록된 펫이 없습니다."}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {pets.map((pet) => {
            const customer = getCustomer(pet);
            return (
              <Link
                key={pet.id}
                href={`/pets/${pet.id}`}
                className={`flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:bg-stone-50 ${
                  !pet.is_active ? "opacity-50" : ""
                }`}
              >
                {/* 아바타 */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-100 text-lg font-bold text-stone-400 overflow-hidden">
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
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {pet.name}
                    </p>
                    {pet.caution_tags.length > 0 && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    )}
                  </div>
                  <p className="truncate text-xs text-stone-500">
                    {[pet.breed, sizeLabel(pet.size)].filter(Boolean).join(" · ")}
                    {customer && ` · ${customer.name}`}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    {pet.lastVisit
                      ? `마지막 방문 ${new Date(pet.lastVisit).toLocaleDateString("ko-KR")}`
                      : "방문 기록 없음"}
                  </p>
                </div>

                <svg
                  className="h-4 w-4 shrink-0 text-stone-300"
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
            );
          })}
        </div>
      )}
    </div>
  );
}
