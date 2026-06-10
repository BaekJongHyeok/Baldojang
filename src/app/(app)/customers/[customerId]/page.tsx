import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatPhone, sizeLabel } from "@/lib/utils";

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

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, breed, size, photo_url, caution_tags, is_active")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      {/* 보호자 정보 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-stone-900">{customer.name}</h1>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">전화번호</span>
            <a
              href={`tel:${customer.phone}`}
              className="font-medium text-stone-900 hover:underline"
            >
              {formatPhone(customer.phone)}
            </a>
          </div>
          {customer.source && (
            <div className="flex justify-between">
              <span className="text-stone-500">유입 경로</span>
              <span className="text-stone-900">{customer.source}</span>
            </div>
          )}
          {customer.memo && (
            <div className="flex justify-between">
              <span className="text-stone-500">메모</span>
              <span className="text-stone-900">{customer.memo}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-stone-500">등록일</span>
            <span className="text-stone-900">
              {new Date(customer.created_at).toLocaleDateString("ko-KR")}
            </span>
          </div>
        </div>
      </div>

      {/* 펫 목록 */}
      <div>
        <p className="text-sm font-bold text-stone-700">
          반려견 ({pets?.length ?? 0})
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {(pets ?? []).map((pet) => (
            <Link
              key={pet.id}
              href={`/pets/${pet.id}`}
              className={`flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:bg-stone-50 ${
                !pet.is_active ? "opacity-50" : ""
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-stone-400 overflow-hidden">
                {pet.photo_url ? (
                  <img
                    src={pet.photo_url}
                    alt={pet.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (pet.breed ?? pet.name).charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-stone-900">
                    {pet.name}
                  </p>
                  {pet.caution_tags.length > 0 && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  {[pet.breed, sizeLabel(pet.size)].filter(Boolean).join(" · ")}
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
          ))}
          {(!pets || pets.length === 0) && (
            <p className="py-8 text-center text-sm text-stone-400">
              등록된 반려견이 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
