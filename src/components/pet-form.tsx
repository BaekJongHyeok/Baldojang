"use client";

import { useTransition, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPhone, resizeImage } from "@/lib/utils";
import { lookupCustomerAction } from "@/lib/pet-actions";
import { Spinner } from "@/components/spinner";
import { createClient } from "@/lib/supabase/client";

const BREEDS = [
  "말티즈", "푸들", "포메라니안", "비숑프리제", "시츄", "요크셔테리어",
  "치와와", "골든리트리버", "진돗개", "믹스", "코카스파니엘", "닥스훈트",
  "슈나우저", "웰시코기", "비글", "사모예드", "허스키", "불독", "래브라도리트리버", "스피츠",
];

const DEFAULT_CAUTION_TAGS = [
  "입질", "분리불안", "심장질환", "슬개골", "피부질환", "노령견", "임신/수유",
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
  cycle_weeks: number | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
};

const INPUT_CLASS = "min-w-0 rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20";

export function PetForm({
  action,
  pet,
  customer,
  shopId,
  initialPhotoSignedUrl,
  autoFocusField,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  pet?: Pet;
  customer?: Customer;
  shopId: string;
  initialPhotoSignedUrl?: string;
  autoFocusField?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 보호자
  const [phone, setPhone] = useState(customer?.phone ? formatPhone(customer.phone) : "");
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(customer ?? null);
  const [customerName, setCustomerName] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [confirmPhotoDelete, setConfirmPhotoDelete] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 주의사항 태그
  const [tags, setTags] = useState<string[]>(pet?.caution_tags ?? []);
  const [customTag, setCustomTag] = useState("");

  // 사진
  const [photoUrl, setPhotoUrl] = useState(pet?.photo_url ?? "");
  const [previewUrl, setPreviewUrl] = useState(initialPhotoSignedUrl ?? "");
  const [uploading, setUploading] = useState(false);

  const isEdit = !!pet;

  // ?focus= 자동 포커스
  useEffect(() => {
    if (!autoFocusField) return;
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[name="${autoFocusField}"]`);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
    }, 100);
    return () => clearTimeout(timer);
  }, [autoFocusField]);

  const lookupPhone = useCallback(
    (value: string) => {
      const digits = value.replace(/[^0-9]/g, "");
      if (digits.length < 10) { setFoundCustomer(null); return; }
      setLookingUp(true);
      lookupCustomerAction(digits).then(({ customer: c }) => {
        setFoundCustomer(c);
        setLookingUp(false);
      });
    },
    [],
  );

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setDirty(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lookupPhone(formatted), 300);
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
    setDirty(true);
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setCustomTag("");
    setDirty(true);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setDirty(true);
    try {
      const resized = await resizeImage(file);
      const ext = "webp";
      const path = `${shopId}/${pet?.id ?? crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("pet-photos")
        .upload(path, resized, { upsert: true, contentType: "image/webp" });
      if (upErr) throw upErr;
      setPhotoUrl(path);
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

  function removePhoto() {
    setPhotoUrl("");
    setPreviewUrl("");
    setDirty(true);
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
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  // Hidden file input
  const fileInput = (
    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
  );

  return (
    // onSubmit + preventDefault: React 19 form action 자동 리셋 차단 (에러 시 입력 소실 방지)
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} onChange={() => setDirty(true)} className={`flex flex-col gap-6 pb-20 ${isPending ? "pointer-events-none" : ""}`}>
      {/* 보호자 섹션 */}
      {!isEdit ? (
        <fieldset className="flex flex-col gap-3 rounded-lg bg-white p-5">
          <legend className="text-sm font-bold text-ink">보호자</legend>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">전화번호</span>
            <input type="tel" value={phone} onChange={handlePhoneChange} required className={INPUT_CLASS} placeholder="010-0000-0000" />
          </label>
          {lookingUp && <p className="text-xs text-ink-disabled">조회 중...</p>}
          {foundCustomer && <p className="text-sm text-green-600">기존 보호자: {foundCustomer.name}님</p>}
          {!foundCustomer && phone.replace(/[^0-9]/g, "").length >= 10 && !lookingUp && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-secondary">보호자 이름 (신규)</span>
              <input type="text" name="customer_name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required className={INPUT_CLASS} placeholder="홍길동" />
            </label>
          )}
        </fieldset>
      ) : customer ? (
        <fieldset className="rounded-lg bg-white p-5">
          <legend className="text-sm font-bold text-ink">보호자</legend>
          <a href={`/customers/${customer.id}`} className="flex items-center justify-between transition-colors hover:text-primary">
            <div>
              <p className="text-[14px] font-medium text-ink">{customer.name}</p>
              <p className="text-[12px] text-ink-caption tabular-nums">{formatPhone(customer.phone)}</p>
            </div>
            <svg className="h-4 w-4 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </a>
        </fieldset>
      ) : null}

      {/* 펫 정보 섹션 */}
      <fieldset className="flex flex-col gap-3 rounded-lg bg-white p-5">
        <legend className="text-sm font-bold text-ink">펫 정보</legend>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-secondary">이름 *</span>
          <input name="pet_name" type="text" required defaultValue={pet?.name ?? ""} className={INPUT_CLASS} placeholder="멍멍이" />
        </label>

        <BreedCombobox defaultValue={pet?.breed ?? ""} />


        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-secondary">체급</span>
          <select name="size" defaultValue={pet?.size ?? ""} className={INPUT_CLASS}>
            <option value="">선택 안 함</option>
            <option value="small">소형</option>
            <option value="medium">중형</option>
            <option value="large">대형</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">생일</span>
            <input name="birth_date" type="date" defaultValue={pet?.birth_date ?? ""} className={INPUT_CLASS} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">몸무게 (kg)</span>
            <input name="weight_kg" type="number" step="0.1" min="0" defaultValue={pet?.weight_kg ?? ""} className={INPUT_CLASS} placeholder="예: 3.5" />
          </label>
        </div>

        {/* 사진 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-secondary">프로필 사진</span>
          {fileInput}
          {previewUrl ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="group relative shrink-0">
                  <img src={previewUrl} alt="펫 사진" className="h-[128px] w-[128px] rounded-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/0 transition-colors group-hover:bg-ink/20">
                    <svg className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  </div>
                </button>
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-ink-disabled">차트와 캘린더에<br />이렇게 표시돼요</p>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-ink-secondary hover:bg-bg">
                      {uploading ? "업로드 중..." : "교체"}
                    </button>
                    {!confirmPhotoDelete ? (
                      <button type="button" onClick={() => setConfirmPhotoDelete(true)}
                        className="rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-ink-caption hover:bg-bg">
                        삭제
                      </button>
                    ) : (
                      <button type="button" onClick={() => { removePhoto(); setConfirmPhotoDelete(false); }}
                        className="rounded-md border border-danger/30 bg-danger-light px-3 py-1.5 text-[12px] font-medium text-danger">
                        삭제 확인
                      </button>
                    )}
                  </div>
                  {confirmPhotoDelete && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-caption">프로필 사진을 삭제할까요?</span>
                      <button type="button" onClick={() => setConfirmPhotoDelete(false)} className="text-[11px] text-ink-caption hover:underline">취소</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex h-[128px] w-[128px] flex-col items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-border text-ink-caption transition-colors hover:border-primary hover:text-primary">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
              <span className="text-[11px] font-medium">{uploading ? "업로드 중..." : "사진 추가"}</span>
            </button>
          )}
        </div>
      </fieldset>

      {/* 케어 정보 섹션 */}
      <fieldset className="flex flex-col gap-3 rounded-lg bg-white p-5">
        <legend className="text-sm font-bold text-ink">케어 정보</legend>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-secondary">주의사항</span>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_CAUTION_TAGS.map((tag) => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${tags.includes(tag) ? "bg-danger-light text-danger" : "bg-border-light text-ink-caption"}`}>
                {tag}
              </button>
            ))}
            {tags.filter((t) => !DEFAULT_CAUTION_TAGS.includes(t)).map((tag) => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className="rounded-lg bg-danger-light px-2.5 py-1 text-xs font-medium text-danger transition">
                {tag} ✕
              </button>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5">
            <input type="text" value={customTag} onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
              className="min-w-0 flex-1 rounded-lg border border-border px-3 py-1.5 text-xs outline-none focus:border-primary"
              placeholder="직접 입력" />
            <button type="button" onClick={addCustomTag} className="shrink-0 rounded-lg bg-border-light px-3 py-1.5 text-xs font-medium text-ink-secondary">추가</button>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-secondary">주의사항 메모</span>
          <textarea name="caution_memo" rows={2} defaultValue={pet?.caution_memo ?? ""} className={INPUT_CLASS} placeholder="자유 서술 주의사항" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-secondary">재방문 주기 (주)</span>
          <input name="cycle_weeks" type="number" min={1} max={52} defaultValue={pet?.cycle_weeks ?? ""} className={INPUT_CLASS} placeholder="예: 4" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">접종 여부</span>
            <select name="vaccinated" defaultValue={pet?.vaccinated === null ? "" : String(pet?.vaccinated)} className={INPUT_CLASS}>
              <option value="">미입력</option>
              <option value="true">완료</option>
              <option value="false">미완료</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">중성화</span>
            <select name="neutered" defaultValue={pet?.neutered === null ? "" : String(pet?.neutered)} className={INPUT_CLASS}>
              <option value="">미입력</option>
              <option value="true">완료</option>
              <option value="false">미완료</option>
            </select>
          </label>
        </div>
      </fieldset>

      {error && <p className="text-center text-sm text-danger">{error}</p>}

      {/* 하단 고정 저장 바 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white px-4 py-3 lg:left-[200px]">
        <div className="mx-auto flex max-w-5xl gap-2">
          <button type="button" onClick={() => router.back()}
            className="w-1/3 rounded-md border border-border bg-white py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-bg">
            취소
          </button>
          <button type="submit" disabled={isPending || uploading || (!isDirty && isEdit)}
            className="flex w-2/3 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-[14px] font-medium text-white transition hover:bg-primary-hover disabled:opacity-50">
            {isPending && <Spinner />}
            {isEdit ? "저장" : "등록"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ── 견종 콤보박스 ── */
function BreedCombobox({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? BREEDS.filter((b) => b.toLowerCase().includes(value.toLowerCase()))
    : BREEDS;

  const showList = open || focused;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef}>
      <span className="text-sm font-medium text-ink-secondary">견종</span>
      <div className="relative">
        <input type="hidden" name="breed" value={value} />
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setFocused(true)}
          className={`${INPUT_CLASS} w-full pr-9`}
          placeholder="말티즈"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-caption hover:text-ink"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d={open ? "M4.5 15.75l7.5-7.5 7.5 7.5" : "M19.5 8.25l-7.5 7.5-7.5-7.5"} />
          </svg>
        </button>
        {showList && filtered.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-white py-1 shadow-lg">
            {filtered.map((b) => (
              <li key={b}>
                <button
                  type="button"
                  onClick={() => { setValue(b); setOpen(false); setFocused(false); }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-bg ${b === value ? "font-medium text-primary" : "text-ink"}`}
                >
                  {b}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
