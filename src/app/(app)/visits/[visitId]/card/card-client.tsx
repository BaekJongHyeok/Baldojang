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
  "오늘도 예뻐졌어요 🐾",
  "우리 아이 미용 완료!",
  "깨끗하고 예쁘게 변신 ✨",
  "사랑이 담긴 미용이에요",
];

type PhotoItem = { path: string; url: string };

type Props = {
  visit: { id: string; visitedAt: string; styleMemo: string | null; beforePhotos: PhotoItem[]; afterPhotos: PhotoItem[] };
  pet: { id: string; name: string; breed: string };
  serviceName: string;
  shop: { name: string; phone: string; logoUrl: string | null; brandColor: string | null };
  shopId: string;
};

const CARD_SIZES = { "4:5": { w: 1080, h: 1350 }, "9:16": { w: 1080, h: 1920 } } as const;

export function CardClient({ visit, pet, serviceName, shop, shopId }: Props) {
  const router = useRouter();
  const renderRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState<"minimal" | "photo" | "ba">(
    visit.beforePhotos.length > 0 && visit.afterPhotos.length > 0 ? "ba" : "minimal"
  );
  const [ratio, setRatio] = useState<"4:5" | "9:16">("4:5");

  const [beforePhotos, setBeforePhotos] = useState(visit.beforePhotos);
  const [afterPhotos, setAfterPhotos] = useState(visit.afterPhotos);
  const [message, setMessage] = useState(MESSAGES[0]);
  const [customMsg, setCustomMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadTarget, setUploadTarget] = useState<"before" | "after" | "single" | null>(null);

  const brandColor = shop.brandColor || "#292524";
  const isBA = template === "ba";
  const singlePhoto = afterPhotos[0]?.url ?? beforePhotos[0]?.url ?? "";
  const beforeUrl = beforePhotos[0]?.url ?? null;
  const afterUrl = afterPhotos[0]?.url ?? null;
  const hasPhotos = (afterPhotos.length + beforePhotos.length) > 0;

  const displayMsg = customMsg || message;
  const size = CARD_SIZES[ratio];

  const cardProps = {
    photo: isBA && afterUrl ? afterUrl : singlePhoto,
    beforePhoto: isBA && beforeUrl && afterUrl ? beforeUrl : null,
    petName: pet.name,
    breed: pet.breed,
    serviceName,
    date: formatTimestampKST(visit.visitedAt, "M월 d일"),
    message: displayMsg,
    shopName: shop.name,
    shopPhone: shop.phone ? formatPhone(shop.phone) : "",
    brandColor,
  };

  const handleDownload = useCallback(async () => {
    if (!renderRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(renderRef.current, {
        canvasWidth: size.w * 2, canvasHeight: size.h * 2, pixelRatio: 1,
        cacheBust: true, fetchRequestInit: { mode: "cors" },
        style: { transform: "scale(1)", transformOrigin: "top left" },
      });
      setPreviewUrl(dataUrl);
      const link = document.createElement("a");
      link.download = `${pet.name}_${formatTimestampKST(visit.visitedAt, "yyyyMMdd")}.png`;
      link.href = dataUrl;
      link.click();
    } catch { toast.error("이미지 생성에 실패했어요."); }
    finally { setDownloading(false); }
  }, [size, pet.name, visit.visitedAt]);

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

  // 공유
  async function handleShare() {
    if (!renderRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(renderRef.current, {
        canvasWidth: size.w * 2, canvasHeight: size.h * 2, pixelRatio: 1,
        cacheBust: true, fetchRequestInit: { mode: "cors" },
        style: { transform: "scale(1)", transformOrigin: "top left" },
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${pet.name}_${formatTimestampKST(visit.visitedAt, "yyyyMMdd")}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${pet.name} 미용 완료` });
      } else {
        // 폴백: 이미지 저장
        const link = document.createElement("a");
        link.download = file.name; link.href = dataUrl; link.click();
        toast("모바일에서 카톡 공유 가능해요", { duration: 3000 });
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
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <div className="flex rounded-lg bg-border-light p-0.5">
                {(["minimal", "photo", "ba"] as const).map((t) => (
                  <button key={t} onClick={() => setTemplate(t)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${template === t ? "bg-white text-ink shadow-sm" : "text-ink-caption"}`}>
                    {t === "minimal" ? "미니멀" : t === "photo" ? "포토" : "비포·애프터"}
                  </button>
                ))}
              </div>
              <div className="flex rounded-lg bg-border-light p-0.5">
                <button onClick={() => setRatio("4:5")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${ratio === "4:5" ? "bg-white text-ink shadow-sm" : "text-ink-caption"}`}>4:5</button>
                <button onClick={() => setRatio("9:16")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${ratio === "9:16" ? "bg-white text-ink shadow-sm" : "text-ink-caption"}`}>9:16</button>
              </div>
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
              {(template === "minimal" || template === "ba") ? <MinimalCard {...cardProps} w={size.w} h={size.h} /> : <PhotoCard {...cardProps} w={size.w} h={size.h} />}
            </div>
            <ScaleInjector targetW={size.w} />
          </div>

          {/* 액션 */}
          <div className="mx-auto mt-3 flex gap-2" style={{ maxWidth: 400 }}>
            <button onClick={handleShare} disabled={downloading}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-[14px] font-medium text-white hover:bg-primary-hover disabled:opacity-50">
              {downloading && <Spinner />}공유하기
            </button>
            <button onClick={handleDownload} disabled={downloading}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border py-2.5 text-[14px] font-medium text-ink hover:bg-bg disabled:opacity-50">
              이미지 저장
            </button>
          </div>

          {previewUrl && (
            <div className="mx-auto mt-3 rounded-md border border-border p-2" style={{ maxWidth: 400 }}>
              <p className="mb-1 text-center text-[11px] text-ink-disabled">길게 눌러 저장할 수 있어요</p>
              <img src={previewUrl} alt="완료 카드" className="w-full rounded-lg" />
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

function MinimalCard({ photo, beforePhoto, petName, breed, serviceName, date, message, shopName, shopPhone, brandColor, w, h }: CardTemplateProps) {
  const p = Math.round(w * 0.055);
  const photoH = Math.round(h * (beforePhoto ? 0.45 : 0.55));
  return (
    <div style={{ width: w, height: h, background: "#FFFBF5", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      <div style={{ padding: `${p * 0.8}px ${p}px ${p * 0.4}px`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: w * 0.026, fontWeight: 700, color: brandColor }}>{shopName}</span>
        <span style={{ fontSize: w * 0.017, color: "#a8a29e" }}>{date}</span>
      </div>
      <div style={{ height: photoH, padding: `0 ${p}px`, display: "flex", gap: w * 0.015, flexShrink: 0 }}>
        {beforePhoto && (
          <div style={{ flex: 1, borderRadius: w * 0.022, overflow: "hidden", position: "relative" }}>
            <img src={beforePhoto} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", top: w * 0.015, left: w * 0.015, background: "rgba(0,0,0,0.5)", color: "white", padding: `${w * 0.004}px ${w * 0.011}px`, borderRadius: w * 0.007, fontSize: w * 0.013, fontWeight: 600 }}>Before</span>
          </div>
        )}
        <div style={{ flex: 1, borderRadius: w * 0.022, overflow: "hidden", position: "relative" }}>
          <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {beforePhoto && <span style={{ position: "absolute", top: w * 0.015, left: w * 0.015, background: brandColor, color: "white", padding: `${w * 0.004}px ${w * 0.011}px`, borderRadius: w * 0.007, fontSize: w * 0.013, fontWeight: 600 }}>After</span>}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: `${p * 0.5}px ${p}px ${p * 0.8}px`, textAlign: "center", overflow: "hidden" }}>
        <p style={{ fontSize: w * 0.044, fontWeight: 800, color: "#1c1917", letterSpacing: -1, lineHeight: 1.2 }}>{petName}</p>
        <p style={{ fontSize: w * 0.02, color: "#78716c", marginTop: h * 0.006 }}>{serviceName}{breed ? ` · ${breed}` : ""}</p>
        <p style={{ fontSize: w * 0.022, color: brandColor, marginTop: h * 0.018, fontWeight: 600 }}>{message}</p>
        <p style={{ fontSize: w * 0.015, color: "#a8a29e", marginTop: h * 0.012 }}>{shopName}{shopPhone ? ` · ${shopPhone}` : ""}</p>
      </div>
    </div>
  );
}

function PhotoCard({ photo, beforePhoto, petName, serviceName, date, message, shopName, brandColor, w, h }: CardTemplateProps) {
  const textColor = brandColor === "#292524" ? "#f5f0eb" : brandColor;
  const photoH = Math.round(h * 0.65);
  if (beforePhoto) {
    return (
      <div style={{ width: w, height: h, display: "flex", flexDirection: "column", overflow: "hidden", background: "#111" }}>
        <div style={{ padding: `${w * 0.03}px ${w * 0.044}px`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: w * 0.022, fontWeight: 700, color: "white" }}>{shopName}</span>
          <span style={{ fontSize: w * 0.015, color: "rgba(255,255,255,0.6)" }}>{date}</span>
        </div>
        <div style={{ height: photoH, display: "flex", gap: 2, flexShrink: 0 }}>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <img src={beforePhoto} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", bottom: w * 0.015, left: w * 0.015, background: "rgba(0,0,0,0.6)", color: "white", padding: `${w * 0.004}px ${w * 0.012}px`, borderRadius: w * 0.006, fontSize: w * 0.013, fontWeight: 700, letterSpacing: 1 }}>BEFORE</span>
          </div>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", bottom: w * 0.015, left: w * 0.015, background: brandColor, color: "white", padding: `${w * 0.004}px ${w * 0.012}px`, borderRadius: w * 0.006, fontSize: w * 0.013, fontWeight: 700, letterSpacing: 1 }}>AFTER</span>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: `0 ${w * 0.044}px`, overflow: "hidden" }}>
          <p style={{ fontSize: w * 0.044, fontWeight: 800, color: "white", letterSpacing: -1, lineHeight: 1.2 }}>{petName}</p>
          <p style={{ fontSize: w * 0.02, color: "rgba(255,255,255,0.7)", marginTop: h * 0.005 }}>{serviceName}</p>
          <p style={{ fontSize: w * 0.02, color: textColor, marginTop: h * 0.012, fontWeight: 600 }}>{message}</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: w, height: h, position: "relative", overflow: "hidden" }}>
      <img src={photo} alt="" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%)" }} />
      <div style={{ position: "absolute", top: w * 0.037, left: w * 0.044, right: w * 0.044, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: w * 0.022, fontWeight: 700, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{shopName}</span>
        <span style={{ fontSize: w * 0.015, color: "rgba(255,255,255,0.8)" }}>{date}</span>
      </div>
      <div style={{ position: "absolute", bottom: w * 0.044, left: w * 0.044, right: w * 0.044, textAlign: "center" }}>
        <p style={{ fontSize: w * 0.048, fontWeight: 800, color: "white", textShadow: "0 2px 12px rgba(0,0,0,0.5)", letterSpacing: -1, lineHeight: 1.2 }}>{petName}</p>
        <p style={{ fontSize: w * 0.02, color: "rgba(255,255,255,0.9)", marginTop: h * 0.006 }}>{serviceName}</p>
        <p style={{ fontSize: w * 0.02, color: textColor, marginTop: h * 0.015, fontWeight: 600 }}>{message}</p>
      </div>
    </div>
  );
}
