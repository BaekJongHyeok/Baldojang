import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { calcAge, sizeLabel, formatPhone } from "@/lib/utils";
import { DeactivateButton } from "./deactivate-button";

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

  const details = [pet.breed, sizeLabel(pet.size)]
    .filter(Boolean)
    .join(" · ");
  const age = pet.birth_date ? calcAge(pet.birth_date) : null;
  const weight = pet.weight_kg ? `${pet.weight_kg}kg` : null;
  const subtitle = [details, age, weight].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-stone-100 text-2xl font-bold text-stone-400 overflow-hidden">
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
          <h1 className="text-xl font-bold text-stone-900">{pet.name}</h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>
          )}
          {customer && (
            <p className="mt-1 text-xs text-stone-400">
              보호자{" "}
              <Link
                href={`/customers/${customer.id}`}
                className="font-medium text-stone-600 hover:underline"
              >
                {customer.name}
              </Link>
              {" · "}
              <a
                href={`tel:${customer.phone}`}
                className="text-stone-600 hover:underline"
              >
                {formatPhone(customer.phone)}
              </a>
            </p>
          )}
          {!pet.is_active && (
            <span className="mt-1 inline-block rounded bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-500">
              비활성
            </span>
          )}
        </div>
      </div>

      {/* 주의사항 */}
      {(pet.caution_tags.length > 0 || pet.caution_memo) && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold text-red-700">주의사항</p>
          {pet.caution_tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pet.caution_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {pet.caution_memo && (
            <p className="mt-2 text-sm text-red-800">{pet.caution_memo}</p>
          )}
        </div>
      )}

      {/* 기본 정보 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs font-bold text-stone-500">기본 정보</p>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">접종</dt>
            <dd className="text-stone-900">
              {pet.vaccinated === null
                ? "모름"
                : pet.vaccinated
                  ? "완료"
                  : "미완료"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">중성화</dt>
            <dd className="text-stone-900">
              {pet.neutered === null
                ? "모름"
                : pet.neutered
                  ? "완료"
                  : "미완료"}
            </dd>
          </div>
        </dl>
      </div>

      {/* 방문 이력 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs font-bold text-stone-500">방문 이력</p>
        {!visits || visits.length === 0 ? (
          <p className="mt-4 text-center text-sm text-stone-400">
            방문 기록이 없습니다
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {visits.map((v) => {
              const service = Array.isArray(v.services)
                ? v.services[0]
                : v.services;
              return (
                <div
                  key={v.id}
                  className="border-l-2 border-stone-200 pl-3"
                >
                  <p className="text-xs text-stone-400">
                    {new Date(v.visited_at).toLocaleDateString("ko-KR")}
                    {service && (
                      <span className="ml-1.5 font-medium text-stone-600">
                        {service.name}
                      </span>
                    )}
                  </p>
                  {v.style_memo && (
                    <p className="mt-1 text-sm text-stone-700">
                      {v.style_memo}
                    </p>
                  )}
                  {v.behavior_memo && (
                    <p className="mt-0.5 text-xs text-stone-500">
                      행동: {v.behavior_memo}
                    </p>
                  )}
                  {(v.before_photos.length > 0 ||
                    v.after_photos.length > 0) && (
                    <div className="mt-1.5 flex gap-1.5 overflow-x-auto">
                      {v.before_photos.map((url, i) => (
                        <img
                          key={`b-${i}`}
                          src={url}
                          alt="전"
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      ))}
                      {v.after_photos.map((url, i) => (
                        <img
                          key={`a-${i}`}
                          src={url}
                          alt="후"
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Link
          href={`/pets/${petId}/edit`}
          className="flex-1 rounded-xl border border-stone-200 py-2.5 text-center text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          수정
        </Link>
        {pet.is_active && <DeactivateButton petId={petId} />}
      </div>
    </div>
  );
}
