"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatPhone } from "@/lib/utils";
import { lookupCustomerAction, quickCreatePetAction } from "@/lib/pet-actions";
import { Spinner } from "@/components/spinner";

const BREEDS = [
  "말티즈", "푸들", "포메라니안", "비숑프리제", "시츄", "요크셔테리어",
  "치와와", "골든리트리버", "진돗개", "믹스", "코카스파니엘", "닥스훈트",
  "슈나우저", "웰시코기", "비글", "사모예드", "허스키", "불독", "래브라도리트리버", "스피츠",
];

type Customer = { id: string; name: string; phone: string };

export function QuickPetForm() {
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [result, setResult] = useState<{ petId: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const lookupPhone = useCallback((value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length < 10) { setFoundCustomer(null); return; }
    setLookingUp(true);
    lookupCustomerAction(digits).then(({ customer: c }) => {
      setFoundCustomer(c);
      setLookingUp(false);
    });
  }, []);

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lookupPhone(formatted), 300);
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!petName.trim()) { toast.error("펫 이름을 입력해주세요."); return; }
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length < 10) { toast.error("전화번호를 확인해주세요."); return; }
    if (!foundCustomer && !customerName.trim()) { toast.error("보호자 이름을 입력해주세요."); return; }

    const fd = new FormData();
    fd.set("pet_name", petName.trim());
    fd.set("customer_phone", digits);
    fd.set("breed", breed);
    if (foundCustomer) fd.set("customer_id", foundCustomer.id);
    else fd.set("customer_name", customerName.trim());

    startTransition(async () => {
      const res = await quickCreatePetAction(fd);
      if (res?.error) { toast.error(res.error); return; }
      if (res?.petId) { toast.success("펫이 등록되었습니다."); setResult({ petId: res.petId }); }
    });
  }

  if (result) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-light">
          <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        </div>
        <p className="text-[16px] font-bold text-ink">{petName} 등록 완료</p>
        <p className="mt-1 text-[13px] text-ink-caption">차트에서 나머지 정보를 완성할 수 있어요.</p>
        <div className="mt-5 flex gap-2">
          <Link
            href={`/calendar?book=${result.petId}`}
            className="flex-1 rounded-md bg-primary py-2.5 text-center text-[14px] font-medium text-white hover:bg-primary-hover"
          >
            예약 잡기
          </Link>
          <Link
            href={`/pets/${result.petId}`}
            className="flex-1 rounded-md border border-border py-2.5 text-center text-[14px] font-medium text-ink hover:bg-bg"
          >
            차트 보기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 rounded-lg bg-white p-5 ${isPending ? "pointer-events-none" : ""}`}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-secondary">보호자 전화번호 *</span>
        <input type="tel" value={phone} onChange={handlePhoneChange} required
          className="rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
          placeholder="010-0000-0000" />
      </label>
      {lookingUp && <p className="text-xs text-ink-disabled">조회 중...</p>}
      {foundCustomer && (
        <p className="rounded-md bg-success-light px-3 py-2 text-[13px] text-success">기존 보호자: {foundCustomer.name}님과 연결됩니다</p>
      )}
      {!foundCustomer && phone.replace(/[^0-9]/g, "").length >= 10 && !lookingUp && (
        <>
          <p className="text-[12px] text-ink-caption">새 보호자로 등록됩니다</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">보호자 이름 *</span>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required
              className="rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="홍길동" />
          </label>
        </>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-secondary">펫 이름 *</span>
        <input type="text" value={petName} onChange={(e) => setPetName(e.target.value)} required
          className="rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
          placeholder="멍멍이" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-secondary">견종</span>
        <input type="text" value={breed} onChange={(e) => setBreed(e.target.value)} list="qf-breed-list"
          className="rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
          placeholder="말티즈" />
        <datalist id="qf-breed-list">{BREEDS.map((b) => <option key={b} value={b} />)}</datalist>
      </label>
      <button type="submit" disabled={isPending}
        className="mt-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50">
        {isPending && <Spinner />}
        빠른 등록
      </button>
    </form>
  );
}
