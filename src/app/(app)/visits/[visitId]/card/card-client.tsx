"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { formatTimestampKST } from "@/lib/calendar-utils";
import { resizeImage, formatPhone } from "@/lib/utils";
import { addVisitPhotosAction, deleteVisitPhotoAction } from "@/lib/visit-actions";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/spinner";

const MESSAGES = [
  "오늘 저 예뻐졌어요 🐾",
  "뽀송뽀송 목욕 완료!",
  "새 단장하고 기분 최고예요 ✨",
  "다음에 또 올게요!",
  "오늘도 씩씩하게 잘했어요",
];

/**
 * 카드 렌더용 폰트 (앱 UI에 적용하지 않음)
 * - Jua: SIL Open Font License 1.1 (Google Fonts) — 디스플레이/문구용
 * - Nanum Pen Script: SIL Open Font License 1.1 (Google Fonts) — 폴라로이드 손글씨
 * - Pretendard/system-ui: 시술 정보·샵 정보·날짜 (가독 우선)
 */
const CARD_FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Jua&family=Nanum+Pen+Script&display=swap');`;
const DISPLAY_FONT = "'Jua', 'Apple SD Gothic Neo', sans-serif";
const HANDWRITING_FONT = "'Nanum Pen Script', cursive";

type PhotoItem = { path: string; url: string };

type Props = {
  visit: { id: string; visitedAt: string; styleMemo: string | null; beforePhotos: PhotoItem[]; afterPhotos: PhotoItem[] };
  pet: { id: string; name: string; breed: string };
  serviceName: string;
  shop: { name: string; phone: string; logoUrl: string | null; brandColor: string | null };
  shopId: string;
};

const CARD_SIZE = { w: 1080, h: 1350 }; // 4:5 고정

export function CardClient({ visit, pet, serviceName, shop, shopId }: Props) {
  const router = useRouter();
  const renderRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  type Template = "photo" | "sticker" | "ba" | "polaroid" | "minimal";
  const [template, setTemplate] = useState<Template>(
    visit.beforePhotos.length > 0 && visit.afterPhotos.length > 0 ? "ba" : "photo"
  );

  const [beforePhotos, setBeforePhotos] = useState(visit.beforePhotos);
  const [afterPhotos, setAfterPhotos] = useState(visit.afterPhotos);
  const [message, setMessage] = useState(MESSAGES[0]);
  const [customMsg, setCustomMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadTarget, setUploadTarget] = useState<"before" | "after" | "single" | null>(null);

  const brandColor = shop.brandColor || "#292524";
  const isBA = template === "ba";
  const singlePhoto = afterPhotos[0]?.url ?? beforePhotos[0]?.url ?? "";
  const beforeUrl = beforePhotos[0]?.url ?? null;
  const afterUrl = afterPhotos[0]?.url ?? null;
  const hasPhotos = (afterPhotos.length + beforePhotos.length) > 0;
  const baComplete = isBA && !!beforeUrl && !!afterUrl;
  const baIncomplete = isBA && (!beforeUrl || !afterUrl);

  const displayMsg = customMsg || message;
  const size = CARD_SIZE;

  const cardProps = {
    photo: isBA ? (afterUrl ?? "") : singlePhoto,
    beforePhoto: isBA ? (beforeUrl ?? "") : null,
    petName: pet.name,
    breed: pet.breed,
    serviceName,
    date: formatTimestampKST(visit.visitedAt, "M월 d일"),
    message: displayMsg,
    shopName: shop.name,
    shopPhone: shop.phone ? formatPhone(shop.phone) : "",
    brandColor,
  };

  // iOS Safari/PWA에서 <a download> 미지원 감지
  const needsFallback = typeof window !== "undefined" && /iP(hone|ad|od)/.test(navigator.userAgent) && !(window as unknown as Record<string, unknown>).MSStream;

  async function generateImage() {
    if (!renderRef.current) return null;
    return toPng(renderRef.current, {
      canvasWidth: size.w * 2, canvasHeight: size.h * 2, pixelRatio: 1,
      cacheBust: true, fetchRequestInit: { mode: "cors" },
      style: { transform: "scale(1)", transformOrigin: "top left" },
    });
  }

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const dataUrl = await generateImage();
      if (!dataUrl) return;
      if (needsFallback) {
        setFallbackUrl(dataUrl);
      } else {
        const link = document.createElement("a");
        link.download = `${pet.name}_${formatTimestampKST(visit.visitedAt, "yyyyMMdd")}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("이미지가 저장됐어요.");
      }
    } catch { toast.error("이미지 생성에 실패했어요."); }
    finally { setDownloading(false); }
  }, [size, pet.name, visit.visitedAt, needsFallback]);

  async function uploadPhoto(file: File, type: "before" | "after") {
    const supabase = createClient();
    const resized = await resizeImage(file, 1600);
    const path = `${shopId}/${visit.id}/${type}-${Date.now()}.webp`;
    const { error: upErr } = await supabase.storage.from("visit-photos").upload(path, resized, { contentType: "image/webp" });
    if (upErr) { toast.error(`업로드 실패: ${upErr.message}`); return null; }
    const { data: signed } = await supabase.storage.from("visit-photos").createSignedUrl(path, 3600);
    const url = signed?.signedUrl ?? "";
    const fd = new FormData();
    fd.set("visit_id", visit.id); fd.set("type", type); fd.set("urls", path);
    const result = await addVisitPhotosAction(fd);
    if (result?.error) { toast.error(result.error); return null; }
    return { path, url };
  }

  // 슬롯 클릭 → 파일 선택 트리거
  function triggerUpload(target: "before" | "after" | "single") {
    setUploadTarget(target);
    fileRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    e.target.value = ""; // 같은 파일 재선택 허용

    const dbType = uploadTarget === "single" ? "after" : uploadTarget;
    const isReplace = uploadTarget === "single" ? afterPhotos.length > 0 || beforePhotos.length > 0
      : uploadTarget === "before" ? beforePhotos.length > 0 : afterPhotos.length > 0;
    const oldPhoto = uploadTarget === "single" ? (afterPhotos[0] ?? beforePhotos[0])
      : uploadTarget === "before" ? beforePhotos[0] : afterPhotos[0];

    startTransition(async () => {
      // 교체 시 기존 사진 삭제
      if (isReplace && oldPhoto) {
        const oldType = afterPhotos.includes(oldPhoto) ? "after" : "before";
        const fd = new FormData();
        fd.set("visit_id", visit.id); fd.set("path", oldPhoto.path); fd.set("type", oldType);
        await deleteVisitPhotoAction(fd);
        if (oldType === "before") setBeforePhotos([]);
        else setAfterPhotos([]);
      }
      const photo = await uploadPhoto(file, dbType);
      if (photo) {
        if (dbType === "before") setBeforePhotos([photo]);
        else setAfterPhotos([photo]);
        toast.success("사진이 등록됐어요.");
        router.refresh();
      }
    });
    setUploadTarget(null);
  }

  function handleDeleteSlot(type: "before" | "after") {
    const photo = type === "before" ? beforePhotos[0] : afterPhotos[0];
    if (!photo) return;
    const prevB = beforePhotos, prevA = afterPhotos;
    if (type === "before") setBeforePhotos([]);
    else setAfterPhotos([]);
    const fd = new FormData();
    fd.set("visit_id", visit.id); fd.set("path", photo.path); fd.set("type", type);
    startTransition(async () => {
      const result = await deleteVisitPhotoAction(fd);
      if (result?.error) { toast.error(result.error); setBeforePhotos(prevB); setAfterPhotos(prevA); }
      else router.refresh();
    });
  }

  // hidden file input
  const hiddenInput = <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />;

  // === 0장: 안내 화면 ===
  if (!hasPhotos) {
    return (
      <div>
        {hiddenInput}
        <h1 className="text-xl font-bold text-ink">완료 카드</h1>
        <div className="mt-6 rounded-lg border border-border bg-white p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-border-light">
            <svg className="h-6 w-6 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
          </div>
          <p className="mt-3 text-[14px] font-medium text-ink-caption">시술 사진을 등록해주세요</p>
          <p className="mt-1 text-[12px] text-ink-disabled">사진을 등록하면 완료 카드를 만들 수 있어요</p>
          <button onClick={() => triggerUpload("single")} disabled={isPending}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50">
            {isPending && <Spinner />} 사진 추가
          </button>
        </div>
      </div>
    );
  }

  async function handleShare() {
    setDownloading(true);
    try {
      const dataUrl = await generateImage();
      if (!dataUrl) return;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${pet.name}_${formatTimestampKST(visit.visitedAt, "yyyyMMdd")}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${pet.name} 미용 완료` });
      } else {
        // 공유 불가 → 폴백 다이얼로그
        setFallbackUrl(dataUrl);
      }
    } catch { /* 사용자 취소 */ }
    finally { setDownloading(false); }
  }

  // === 1장 이상: 카드 편집 ===
  return (
    <div>
      {hiddenInput}
      <h1 className="text-xl font-bold text-ink">완료 카드</h1>

      <div className="mt-4 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* ── 좌측: 컨트롤 패널 ── */}
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          {/* 템플릿 */}
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-[13px] font-semibold text-ink-caption">템플릿</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([
                { key: "photo", label: "포토" },
                { key: "sticker", label: "스티커" },
                { key: "ba", label: "비포·애프터" },
                { key: "polaroid", label: "폴라로이드" },
                { key: "minimal", label: "미니멀" },
              ] as { key: Template; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => setTemplate(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${template === key ? "bg-primary text-white" : "bg-border-light text-ink-caption hover:text-ink-secondary"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 사진 — 슬롯 기반 */}
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-[13px] font-semibold text-ink-caption">사진</p>
            <div className="mt-2 flex gap-3">
              {isBA ? (
                <>
                  <PhotoSlot label="비포" photo={beforePhotos[0]} isPending={isPending}
                    onUpload={() => triggerUpload("before")} onDelete={() => handleDeleteSlot("before")} />
                  <PhotoSlot label="애프터" photo={afterPhotos[0]} isPending={isPending}
                    onUpload={() => triggerUpload("after")} onDelete={() => handleDeleteSlot("after")} />
                </>
              ) : (
                <PhotoSlot photo={afterPhotos[0] ?? beforePhotos[0]} isPending={isPending}
                  onUpload={() => triggerUpload("single")} onDelete={() => handleDeleteSlot(afterPhotos.length > 0 ? "after" : "before")} />
              )}
            </div>
          </div>

          {/* 문구 */}
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-[13px] font-semibold text-ink-caption">문구</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MESSAGES.map((m) => (
                <button key={m} onClick={() => { setMessage(m); setCustomMsg(""); }}
                  className={`rounded-md px-2.5 py-1.5 text-xs transition ${message === m && !customMsg ? "bg-primary text-white" : "bg-border-light text-ink-secondary"}`}>{m}</button>
              ))}
            </div>
            <input type="text" value={customMsg} onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="직접 입력" className="mt-2 w-full rounded-md border border-border px-3 py-2 text-[13px] outline-none focus:border-primary" />
          </div>

        </div>

        {/* ── 우측: 카드 프리뷰 (모바일에서는 상단) ── */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-20 lg:self-start">
          <div className="mx-auto w-full overflow-hidden rounded-lg" style={{ maxWidth: 400, aspectRatio: `${size.w} / ${size.h}` }}>
            <div ref={renderRef} className="relative h-full w-full origin-top-left"
              style={{ width: size.w, height: size.h, transform: `scale(var(--card-scale))`, "--card-scale": "1" } as React.CSSProperties}>
              {(template === "minimal" || template === "ba") && <MinimalCard {...cardProps} w={size.w} h={size.h} onSlotClick={isBA ? (slot) => triggerUpload(slot) : undefined} />}
              {template === "photo" && <PhotoCard {...cardProps} w={size.w} h={size.h} />}
              {template === "sticker" && <StickerCard {...cardProps} w={size.w} h={size.h} />}
              {template === "polaroid" && <PolaroidCard {...cardProps} w={size.w} h={size.h} />}
            </div>
            <ScaleInjector targetW={size.w} />
          </div>

          {/* 액션 */}
          <div className="mx-auto mt-3 flex flex-col gap-1.5" style={{ maxWidth: 400 }}>
            <div className="flex gap-2">
              <button onClick={handleShare} disabled={downloading || baIncomplete}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-[14px] font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">
                {downloading && <Spinner />}공유하기
              </button>
              <button onClick={handleDownload} disabled={downloading || baIncomplete}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-2.5 text-[14px] font-medium text-ink hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed">
                이미지 저장
              </button>
            </div>
            {baIncomplete && (
              <p className="text-center text-[11px] text-ink-caption">비포/애프터 사진을 모두 추가하면 저장할 수 있어요</p>
            )}
          </div>

          {/* 폴백 다이얼로그: iOS Safari 등 다운로드 불가 환경 */}
          {fallbackUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={() => setFallbackUrl(null)}>
              <div className="w-full max-w-sm rounded-lg border border-border bg-white p-4 shadow-modal" onClick={(e) => e.stopPropagation()}>
                <p className="text-center text-[14px] font-medium text-ink">길게 눌러 사진에 저장하세요</p>
                <img src={fallbackUrl} alt="완료 카드" className="mt-3 w-full rounded-lg" />
                <button onClick={() => setFallbackUrl(null)} className="mt-3 w-full rounded-md border border-border py-2 text-[13px] font-medium text-ink-caption hover:bg-bg">닫기</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === PhotoSlot ===
function PhotoSlot({ label, photo, isPending, onUpload, onDelete }: {
  label?: string; photo?: PhotoItem; isPending: boolean;
  onUpload: () => void; onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  if (!photo) {
    return (
      <button onClick={onUpload} disabled={isPending}
        className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-ink-caption transition-colors hover:border-primary hover:text-primary disabled:opacity-50">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        {label && <span className="text-[10px] font-medium">{label}</span>}
      </button>
    );
  }
  return (
    <div className="relative h-20 w-20" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="h-full w-full overflow-hidden rounded-lg">
        <img src={photo.url} alt="" className="h-full w-full object-cover" />
      </div>
      {label && (
        <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/50 text-center text-[9px] font-bold text-white leading-relaxed pointer-events-none">{label}</span>
      )}
      {hover && (
        <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-lg bg-black/40">
          <button onClick={onUpload} className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-ink">교체</button>
          <button onClick={onDelete} disabled={isPending} className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-danger disabled:opacity-50">삭제</button>
        </div>
      )}
    </div>
  );
}

// === 유틸 ===

function ScaleInjector({ targetW }: { targetW: number }) {
  return <div className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}><ScaleObserver targetW={targetW} /></div>;
}

function ScaleObserver({ targetW }: { targetW: number }) {
  const measured = useRef(false);
  const refCb = useCallback((el: HTMLDivElement | null) => {
    if (!el || measured.current) return;
    measured.current = true;
    const wrapper = el.closest("[style*='aspect-ratio']") as HTMLElement | null;
    if (!wrapper) return;
    const update = () => {
      const scale = wrapper.clientWidth / targetW;
      const inner = wrapper.querySelector("[style*='--card-scale']") as HTMLElement | null;
      if (inner) inner.style.setProperty("--card-scale", String(scale));
    };
    update();
    new ResizeObserver(update).observe(wrapper);
  }, [targetW]);
  return <div ref={refCb} />;
}

// === 템플릿 ===

type CardTemplateProps = {
  photo: string; beforePhoto: string | null; petName: string; breed: string;
  serviceName: string; date: string; message: string; shopName: string; shopPhone: string; brandColor: string; w: number; h: number;
};

function MinimalCard({ photo, beforePhoto, petName, breed, serviceName, date, message, shopName, shopPhone, brandColor, w, h, onSlotClick }: CardTemplateProps & { onSlotClick?: (slot: "before" | "after") => void }) {
  const p = Math.round(w * 0.055);
  const isBA = beforePhoto !== null;
  const photoH = Math.round(h * (isBA ? 0.42 : 0.50));
  const emptySlot = (label: string, slot: "before" | "after") => (
    <div onClick={() => onSlotClick?.(slot)} style={{ flex: 1, borderRadius: w * 0.022, background: "#F2F0ED", border: `${w * 0.003}px dashed #D6D3CE`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: h * 0.008, cursor: onSlotClick ? "pointer" : "default" }}>
      <svg width={w * 0.04} height={w * 0.04} viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
      <span style={{ fontSize: w * 0.018, color: "#a8a29e", fontWeight: 500 }}>{label}</span>
    </div>
  );
  return (
    <div style={{ width: w, height: h, background: "#FFFBF5", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      <style>{CARD_FONT_IMPORT}</style>
      <div style={{ padding: `${p * 0.8}px ${p}px ${p * 0.4}px`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: w * 0.038, fontWeight: 700, color: brandColor }}>{shopName}</span>
        <span style={{ fontSize: w * 0.022, color: "#a8a29e" }}>{date}</span>
      </div>
      <div style={{ height: photoH, padding: `0 ${p}px`, display: "flex", gap: w * 0.015, flexShrink: 0 }}>
        {isBA && (
          beforePhoto ? (
            <div style={{ flex: 1, borderRadius: w * 0.022, overflow: "hidden", position: "relative" }}>
              <img src={beforePhoto} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <span style={{ position: "absolute", top: w * 0.015, left: w * 0.015, background: "rgba(0,0,0,0.5)", color: "white", padding: `${w * 0.006}px ${w * 0.015}px`, borderRadius: w * 0.007, fontSize: w * 0.02, fontWeight: 600 }}>Before</span>
            </div>
          ) : emptySlot("비포 사진 추가", "before")
        )}
        <div style={{ flex: 1, borderRadius: w * 0.022, overflow: "hidden", position: "relative" }}>
          {photo ? (
            <>
              <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {isBA && <span style={{ position: "absolute", top: w * 0.015, left: w * 0.015, background: brandColor, color: "white", padding: `${w * 0.006}px ${w * 0.015}px`, borderRadius: w * 0.007, fontSize: w * 0.02, fontWeight: 600 }}>After</span>}
            </>
          ) : isBA ? emptySlot("애프터 사진 추가", "after") : null}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: `${p * 0.5}px ${p}px ${p * 0.8}px`, textAlign: "center", overflow: "hidden" }}>
        <p style={{ fontFamily: DISPLAY_FONT, fontSize: w * 0.088, fontWeight: 400, color: "#1c1917", letterSpacing: -1, lineHeight: 1.15 }}>{petName}</p>
        <p style={{ fontSize: w * 0.032, color: "#78716c", marginTop: h * 0.008 }}>{serviceName}{breed ? ` · ${breed}` : ""}</p>
        <p style={{ fontFamily: DISPLAY_FONT, fontSize: w * 0.04, color: brandColor, marginTop: h * 0.015, fontWeight: 400, lineHeight: 1.4, maxWidth: "90%", wordBreak: "keep-all" }}>{message}</p>
        <p style={{ fontSize: w * 0.025, color: "#a8a29e", marginTop: h * 0.015 }}>{shopName}{shopPhone ? ` · ${shopPhone}` : ""}</p>
      </div>
    </div>
  );
}

function PhotoCard({ photo, beforePhoto, petName, serviceName, date, message, shopName, brandColor, w, h }: CardTemplateProps) {
  const textColor = brandColor === "#292524" ? "#f5f0eb" : brandColor;
  const photoH = Math.round(h * 0.60);
  if (beforePhoto) {
    return (
      <div style={{ width: w, height: h, display: "flex", flexDirection: "column", overflow: "hidden", background: "#111" }}>
        <style>{CARD_FONT_IMPORT}</style>
        <div style={{ padding: `${w * 0.03}px ${w * 0.044}px`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: w * 0.036, fontWeight: 700, color: "white" }}>{shopName}</span>
          <span style={{ fontSize: w * 0.022, color: "rgba(255,255,255,0.6)" }}>{date}</span>
        </div>
        <div style={{ height: photoH, display: "flex", gap: 2, flexShrink: 0 }}>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <img src={beforePhoto} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", bottom: w * 0.015, left: w * 0.015, background: "rgba(0,0,0,0.6)", color: "white", padding: `${w * 0.006}px ${w * 0.015}px`, borderRadius: w * 0.006, fontSize: w * 0.02, fontWeight: 700, letterSpacing: 1 }}>BEFORE</span>
          </div>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", bottom: w * 0.015, left: w * 0.015, background: brandColor, color: "white", padding: `${w * 0.006}px ${w * 0.015}px`, borderRadius: w * 0.006, fontSize: w * 0.02, fontWeight: 700, letterSpacing: 1 }}>AFTER</span>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: `0 ${w * 0.044}px`, overflow: "hidden" }}>
          <p style={{ fontFamily: DISPLAY_FONT, fontSize: w * 0.08, fontWeight: 400, color: "white", letterSpacing: -1, lineHeight: 1.15 }}>{petName}</p>
          <p style={{ fontSize: w * 0.032, color: "rgba(255,255,255,0.7)", marginTop: h * 0.006 }}>{serviceName}</p>
          <p style={{ fontFamily: DISPLAY_FONT, fontSize: w * 0.038, color: textColor, marginTop: h * 0.012, fontWeight: 400, lineHeight: 1.4, wordBreak: "keep-all" }}>{message}</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: w, height: h, position: "relative", overflow: "hidden" }}>
      <style>{CARD_FONT_IMPORT}</style>
      <img src={photo} alt="" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 35%, rgba(0,0,0,0.75) 100%)" }} />
      <div style={{ position: "absolute", top: w * 0.037, left: w * 0.044, right: w * 0.044, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: w * 0.036, fontWeight: 700, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{shopName}</span>
        <span style={{ fontSize: w * 0.022, color: "rgba(255,255,255,0.8)" }}>{date}</span>
      </div>
      <div style={{ position: "absolute", bottom: w * 0.055, left: w * 0.044, right: w * 0.044, textAlign: "center" }}>
        <p style={{ fontFamily: DISPLAY_FONT, fontSize: w * 0.09, fontWeight: 400, color: "white", textShadow: "0 3px 16px rgba(0,0,0,0.5)", letterSpacing: -1, lineHeight: 1.15 }}>{petName}</p>
        <p style={{ fontSize: w * 0.032, color: "rgba(255,255,255,0.9)", marginTop: h * 0.008 }}>{serviceName}</p>
        <p style={{ fontFamily: DISPLAY_FONT, fontSize: w * 0.04, color: textColor, marginTop: h * 0.015, fontWeight: 400, lineHeight: 1.4, wordBreak: "keep-all" }}>{message}</p>
      </div>
    </div>
  );
}

/**
 * 폴라로이드 — 사진을 폴라로이드 프레임으로, 살짝 회전 + 그림자
 * 폰트: 나눔손글씨 펜 (OFL, Google Fonts)
 */
function PolaroidCard({ photo, petName, date, message, shopName, shopPhone, brandColor, w, h }: CardTemplateProps) {
  const pad = w * 0.08;
  const frameW = w - pad * 2;
  const photoH = frameW;
  const bottomH = h * 0.22;
  const frameH = photoH + bottomH;
  const frameTop = (h - frameH) / 2 - h * 0.02;
  return (
    <div style={{ width: w, height: h, background: "#F5F0EB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", overflow: "hidden", position: "relative" }}>
      <style>{CARD_FONT_IMPORT}</style>
      <div style={{
        width: frameW, height: frameH, background: "white",
        boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        transform: "rotate(-1.5deg)", borderRadius: w * 0.005,
        position: "absolute", top: frameTop, display: "flex", flexDirection: "column",
      }}>
        <div style={{ margin: w * 0.025, marginBottom: 0, flex: `0 0 ${photoH - w * 0.05}px`, overflow: "hidden" }}>
          {photo && <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: `0 ${w * 0.04}px`, textAlign: "center", overflow: "hidden" }}>
          <p style={{ fontFamily: HANDWRITING_FONT, fontSize: w * 0.1, fontWeight: 400, color: "#1c1917", lineHeight: 1.2 }}>{petName}</p>
          <p style={{ fontFamily: HANDWRITING_FONT, fontSize: w * 0.06, color: brandColor, marginTop: h * 0.008, lineHeight: 1.4, wordBreak: "keep-all" }}>{message}</p>
        </div>
        <p style={{ position: "absolute", bottom: w * 0.02, right: w * 0.03, fontSize: w * 0.022, color: "#a8a29e" }}>{date}</p>
      </div>
      <p style={{ position: "absolute", bottom: w * 0.03, fontSize: w * 0.025, color: "#a8a29e" }}>{shopName}{shopPhone ? ` · ${shopPhone}` : ""}</p>
    </div>
  );
}

/**
 * 스티커 — 다이어리 꾸미기 톤, 인라인 SVG 장식
 */
function StickerCard({ photo, petName, date, message, shopName, shopPhone, brandColor, w, h }: CardTemplateProps) {
  const photoSize = w * 0.58;
  const photoTop = h * 0.08;
  const accent = brandColor === "#292524" ? "#3182F6" : brandColor;
  const pink = "#F9A8D4";
  const yellow = "#FDE68A";
  return (
    <div style={{ width: w, height: h, background: "#FFF8F0", position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      <style>{CARD_FONT_IMPORT}</style>

      {/* 사진 — 라운드 크게 */}
      <div style={{ position: "absolute", left: (w - photoSize) / 2, top: photoTop, width: photoSize, height: photoSize, borderRadius: w * 0.06, overflow: "hidden", border: `${w * 0.006}px solid white`, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        {photo && <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>

      {/* 장식 스티커 SVG — 고정 위치 */}
      {/* 발자국 좌상 */}
      <svg style={{ position: "absolute", top: h * 0.03, left: w * 0.06, width: w * 0.09, height: w * 0.09, opacity: 0.7 }} viewBox="0 0 48 48" fill={accent}>
        <ellipse cx="14" cy="14" rx="5" ry="7" /><ellipse cx="26" cy="11" rx="5" ry="7" />
        <ellipse cx="34" cy="18" rx="4" ry="6" /><ellipse cx="6" cy="20" rx="4" ry="6" />
        <ellipse cx="20" cy="30" rx="10" ry="12" />
      </svg>
      {/* 별 우상 */}
      <svg style={{ position: "absolute", top: h * 0.02, right: w * 0.08, width: w * 0.08, height: w * 0.08, opacity: 0.6 }} viewBox="0 0 24 24" fill={yellow}>
        <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.8 5.6 21.2 8 14 2 9.2h7.6z" />
      </svg>
      {/* 하트 좌하 */}
      <svg style={{ position: "absolute", bottom: h * 0.22, left: w * 0.05, width: w * 0.07, height: w * 0.07, opacity: 0.5, transform: "rotate(-15deg)" }} viewBox="0 0 24 24" fill={pink}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      {/* 리본 우하 */}
      <svg style={{ position: "absolute", bottom: h * 0.24, right: w * 0.06, width: w * 0.1, height: w * 0.06, opacity: 0.6, transform: "rotate(8deg)" }} viewBox="0 0 48 24" fill={accent}>
        <path d="M24 12C20 4 10 0 4 6s4 14 20 6c16 8 26 0 20-6s-16-2-20 6z" />
      </svg>
      {/* 작은 별 사진 우측 */}
      <svg style={{ position: "absolute", top: h * 0.35, right: w * 0.08, width: w * 0.05, height: w * 0.05, opacity: 0.5 }} viewBox="0 0 24 24" fill={yellow}>
        <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.8 5.6 21.2 8 14 2 9.2h7.6z" />
      </svg>

      {/* 문구 — 컬러 라벨 띠 (살짝 회전) */}
      <div style={{
        position: "absolute", left: w * 0.08, right: w * 0.08,
        top: photoTop + photoSize + h * 0.035,
        background: accent, borderRadius: w * 0.015, padding: `${h * 0.012}px ${w * 0.04}px`,
        transform: "rotate(-2deg)", textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}>
        <p style={{ fontFamily: DISPLAY_FONT, fontSize: w * 0.042, fontWeight: 400, color: "white", lineHeight: 1.3, wordBreak: "keep-all" }}>{message}</p>
      </div>

      {/* 펫 이름 */}
      <div style={{ position: "absolute", bottom: h * 0.08, left: 0, right: 0, textAlign: "center" }}>
        <p style={{ fontFamily: DISPLAY_FONT, fontSize: w * 0.088, fontWeight: 400, color: "#1c1917", lineHeight: 1.15 }}>{petName}</p>
        <p style={{ fontSize: w * 0.022, color: "#a8a29e", marginTop: h * 0.005 }}>{date}</p>
      </div>

      {/* 샵 정보 */}
      <p style={{ position: "absolute", bottom: h * 0.02, left: 0, right: 0, textAlign: "center", fontSize: w * 0.025, color: "#a8a29e" }}>
        {shopName}{shopPhone ? ` · ${shopPhone}` : ""}
      </p>
    </div>
  );
}
