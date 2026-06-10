"use client";

import { useTransition, useState, useCallback, useEffect, useRef } from "react";
import { formatPhone, resizeImage } from "@/lib/utils";
import { lookupCustomerAction } from "@/lib/pet-actions";
import { createClient } from "@/lib/supabase/client";

const BREEDS = [
  "말티즈",
  "푸들",
  "포메라니안",
  "비숑프리제",
  "시츄",
  "요크셔테리어",
  "치와와",
  "골든리트리버",
  "진돗개",
  "믹스",
  "코카스파니엘",
  "닥스훈트",
  "슈나우저",
  "웰시코기",
  "비글",
  "사모예드",
  "허스키",
  "불독",
  "래브라도리트리버",
  "스피츠",
];

const DEFAULT_CAUTION_TAGS = [
  "입질",
  "분리불안",
  "심장질환",
  "슬개골",
  "피부질환",
  "노령견",
  "임신/수유",
];

type Pet = {
  id: string;
  name: string;
  breed: string | null;
  size: "small" | "medium" | "large" | null;
  birth_date: string | null;
  weight_kg: number | null;
  photo_url: string | null;
  caution_tags: string[];
  caution_memo: string | null;
  vaccinated: boolean | null;
  neutered: boolean | null;
  customer_id: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
};

export function PetForm({
  action,
  pet,
  customer,
  shopId,
  initialPhotoSignedUrl,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  pet?: Pet;
  customer?: Customer;
  shopId: string;
  initialPhotoSignedUrl?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 보호자
  const [phone, setPhone] = useState(customer?.phone ? formatPhone(customer.phone) : "");
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(customer ?? null);
  const [customerName, setCustomerName] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 주의사항 태그
  const [tags, setTags] = useState<string[]>(pet?.caution_tags ?? []);
  const [customTag, setCustomTag] = useState("");

  // 사진: photoUrl은 DB 저장용 경로, previewUrl은 표시용 signed/blob URL
  const [photoUrl, setPhotoUrl] = useState(pet?.photo_url ?? "");
  const [previewUrl, setPreviewUrl] = useState(initialPhotoSignedUrl ?? "");
  const [uploading, setUploading] = useState(false);

  const isEdit = !!pet;

  const lookupPhone = useCallback(
    (value: string) => {
      if (isEdit) return;
      const digits = value.replace(/[^0-9]/g, "");
      if (digits.length < 10) {
        setFoundCustomer(null);
        return;
      }
      setLookingUp(true);
      lookupCustomerAction(digits).then(({ customer: c }) => {
        setFoundCustomer(c);
        setLookingUp(false);
      });
    },
    [isEdit],
  );

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lookupPhone(formatted), 300);
  }

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setCustomTag("");
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const resized = await resizeImage(file);
      const ext = "webp";
      const path = `${shopId}/${pet?.id ?? crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("pet-photos")
        .upload(path, resized, { upsert: true, contentType: "image/webp" });
      if (upErr) throw upErr;
      // DB에는 스토리지 경로만 저장
      setPhotoUrl(path);
      // 미리보기용 signed URL 생성
      const { data: signed } = await supabase.storage
        .from("pet-photos")
        .createSignedUrl(path, 3600);
      if (signed?.signedUrl) setPreviewUrl(signed.signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(formData: FormData) {
    formData.set("caution_tags", tags.join(","));
    formData.set("photo_url", photoUrl);
    formData.set("customer_phone", phone.replace(/[^0-9]/g, ""));
    if (foundCustomer) formData.set("customer_id", foundCustomer.id);
    if (pet) formData.set("pet_id", pet.id);
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      {/* 보호자 섹션 */}
      {!isEdit && (
        <fieldset className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
          <legend className="text-sm font-bold text-stone-900">보호자</legend>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">전화번호</span>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              required
              className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              placeholder="010-0000-0000"
            />
          </label>
          {lookingUp && (
            <p className="text-xs text-stone-400">조회 중...</p>
          )}
          {foundCustomer && (
            <p className="text-sm text-green-600">
              기존 보호자: {foundCustomer.name}님
            </p>
          )}
          {!foundCustomer && phone.replace(/[^0-9]/g, "").length >= 10 && !lookingUp && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">
                보호자 이름 (신규)
              </span>
              <input
                type="text"
                name="customer_name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                placeholder="홍길동"
              />
            </label>
          )}
        </fieldset>
      )}

      {/* 펫 정보 섹션 */}
      <fieldset className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <legend className="text-sm font-bold text-stone-900">펫 정보</legend>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">이름 *</span>
          <input
            name="pet_name"
            type="text"
            required
            defaultValue={pet?.name ?? ""}
            className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
            placeholder="멍멍이"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">견종</span>
          <input
            name="breed"
            type="text"
            list="breed-list"
            defaultValue={pet?.breed ?? ""}
            className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
            placeholder="말티즈"
          />
          <datalist id="breed-list">
            {BREEDS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">체급</span>
          <select
            name="size"
            defaultValue={pet?.size ?? ""}
            className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
          >
            <option value="">선택 안 함</option>
            <option value="small">소형</option>
            <option value="medium">중형</option>
            <option value="large">대형</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">생일</span>
            <input
              name="birth_date"
              type="date"
              defaultValue={pet?.birth_date ?? ""}
              className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">
              몸무게 (kg)
            </span>
            <input
              name="weight_kg"
              type="number"
              step="0.1"
              min="0"
              defaultValue={pet?.weight_kg ?? ""}
              className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              placeholder="3.5"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">사진</span>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="text-sm text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-stone-700"
          />
          {uploading && <p className="text-xs text-stone-400">업로드 중...</p>}
          {previewUrl && (
            <img
              src={previewUrl}
              alt="펫 사진"
              className="mt-1 h-20 w-20 rounded-xl object-cover"
            />
          )}
        </label>
      </fieldset>

      {/* 케어 정보 섹션 */}
      <fieldset className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <legend className="text-sm font-bold text-stone-900">케어 정보</legend>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">주의사항</span>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_CAUTION_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  tags.includes(tag)
                    ? "bg-red-100 text-red-700"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                {tag}
              </button>
            ))}
            {tags
              .filter((t) => !DEFAULT_CAUTION_TAGS.includes(t))
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition"
                >
                  {tag} ✕
                </button>
              ))}
          </div>
          <div className="mt-1 flex gap-1.5">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs outline-none focus:border-stone-400"
              placeholder="직접 입력"
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="shrink-0 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600"
            >
              추가
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-stone-700">
            주의사항 메모
          </span>
          <textarea
            name="caution_memo"
            rows={2}
            defaultValue={pet?.caution_memo ?? ""}
            className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
            placeholder="자유 서술 주의사항"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">접종 여부</span>
            <select
              name="vaccinated"
              defaultValue={
                pet?.vaccinated === null ? "" : String(pet?.vaccinated)
              }
              className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
            >
              <option value="">모름</option>
              <option value="true">완료</option>
              <option value="false">미완료</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">중성화</span>
            <select
              name="neutered"
              defaultValue={
                pet?.neutered === null ? "" : String(pet?.neutered)
              }
              className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
            >
              <option value="">모름</option>
              <option value="true">완료</option>
              <option value="false">미완료</option>
            </select>
          </label>
        </div>
      </fieldset>

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isPending || uploading}
        className="rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
      >
        {isPending ? "저장 중..." : isEdit ? "수정" : "등록"}
      </button>
    </form>
  );
}
