"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { formatTimestampKST } from "@/lib/calendar-utils";
import { resizeImage } from "@/lib/utils";
import { addVisitPhotosAction, deleteVisitPhotoAction, moveVisitPhotoAction } from "@/lib/visit-actions";
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
  const [template, setTemplate] = useState<"minimal" | "photo">("minimal");
  const [ratio, setRatio] = useState<"4:5" | "9:16">("4:5");

  const [beforePhotos, setBeforePhotos] = useState(visit.beforePhotos);
  const [afterPhotos, setAfterPhotos] = useState(visit.afterPhotos);
  const [message, setMessage] = useState(MESSAGES[0]);
  const [customMsg, setCustomMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<{ path: string; type: "before" | "after" } | null>(null);

  // 비포/애프터 모드
  const [baMode, setBaMode] = useState(beforePhotos.length > 0 && afterPhotos.length > 0);
  const [assignStep, setAssignStep] = useState<"ask" | "upload" | null>(null);

  const brandColor = shop.brandColor || "#292524";
  const totalPhotos = beforePhotos.length + afterPhotos.length;
  const hasPhotos = totalPhotos > 0;
  const hasBothPhotos = beforePhotos.length > 0 && afterPhotos.length > 0;

  // 단일 모드: 카드에 표시할 사진 (어느 배열에 있든 첫 장)
  const singlePhoto = afterPhotos[0]?.url ?? beforePhotos[0]?.url ?? "";

  // BA 모드: before/after 각각
  const beforeUrl = beforePhotos[0]?.url ?? null;
  const afterUrl = afterPhotos[0]?.url ?? null;

  const displayMsg = customMsg || message;
  const size = CARD_SIZES[ratio];

  // 카드 props
  const cardProps = {
    photo: baMode && afterUrl ? afterUrl : singlePhoto,
    beforePhoto: baMode && hasBothPhotos ? beforeUrl : null,
    petName: pet.name,
    breed: pet.breed,
    serviceName,
    date: formatTimestampKST(visit.visitedAt, "yyyy.M.d"),
    message: displayMsg,
    shopName: shop.name,
    shopPhone: shop.phone,
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
    } catch { toast.error("이미지 생성에 실패했습니다."); }
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

  // 0장 → 사진 추가 (after로 저장)
  function handleFirstUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      const photo = await uploadPhoto(file, "after");
      if (photo) { setAfterPhotos([photo]); toast.success("사진이 등록되었습니다."); router.refresh(); }
    });
  }

  // BA 모드: 기존 사진 타입 지정
  function handleAssignType(type: "before" | "after") {
    const existingPhoto = afterPhotos[0] ?? beforePhotos[0];
    if (!existingPhoto) return;
    const currentType = afterPhotos.length > 0 ? "after" : "before";
    if (currentType === type) {
      setAssignStep("upload");
      return;
    }
    // 이동 필요
    startTransition(async () => {
      const fd = new FormData();
      fd.set("visit_id", visit.id); fd.set("path", existingPhoto.path);
      fd.set("from", currentType); fd.set("to", type);
      const result = await moveVisitPhotoAction(fd);
      if (result?.error) { toast.error(result.error); return; }
      if (type === "before") {
        setBeforePhotos([existingPhoto]); setAfterPhotos([]);
      } else {
        setAfterPhotos([existingPhoto]); setBeforePhotos([]);
      }
      setAssignStep("upload");
      router.refresh();
    });
  }

  // BA 모드: 나머지 사진 업로드
  function handleSecondUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = afterPhotos.length === 0 ? "after" : "before";
    startTransition(async () => {
      const photo = await uploadPhoto(file, type);
      if (photo) {
        if (type === "before") setBeforePhotos([photo]);
        else setAfterPhotos([photo]);
        setAssignStep(null);
        toast.success("비포/애프터 카드가 준비되었습니다!");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirmDelete) return;
    const { path, type } = confirmDelete;
    const prevB = beforePhotos, prevA = afterPhotos;
    if (type === "before") setBeforePhotos(beforePhotos.filter((p) => p.path !== path));
    else setAfterPhotos(afterPhotos.filter((p) => p.path !== path));
    if (type === "before" && beforePhotos.length <= 1) { setBaMode(false); setAssignStep(null); }
    if (type === "after" && afterPhotos.length <= 1 && beforePhotos.length === 0) { setBaMode(false); setAssignStep(null); }
    setConfirmDelete(null);
    const fd = new FormData();
    fd.set("visit_id", visit.id); fd.set("path", path); fd.set("type", type);
    startTransition(async () => {
      const result = await deleteVisitPhotoAction(fd);
      if (result?.error) { toast.error(result.error); setBeforePhotos(prevB); setAfterPhotos(prevA); }
      else router.refresh();
    });
  }

  function toggleBaMode(on: boolean) {
    setBaMode(on);
    if (on && totalPhotos === 1) setAssignStep("ask");
    else setAssignStep(null);
  }

  // === 0장: 안내 화면 ===
  if (!hasPhotos) {
    return (
      <div>
        <h1 className="text-xl font-bold text-ink">완료 카드</h1>
        <div className="mt-6 rounded-lg bg-white p-6 text-center">
          <p className="text-4xl">📷</p>
          <p className="mt-3 text-sm font-medium text-ink-secondary">시술 사진을 등록해주세요</p>
          <p className="mt-1 text-xs text-ink-caption">사진을 등록하면 완료 카드를 만들 수 있어요</p>
          <label className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white cursor-pointer hover:bg-primary-hover">
            {isPending && <Spinner />} 사진 추가
            <input type="file" accept="image/*" onChange={handleFirstUpload} className="hidden" />
          </label>
        </div>
      </div>
    );
  }

  // === 1장 이상: 카드 편집 ===
  return (
    <div>
      <h1 className="text-xl font-bold text-ink">완료 카드</h1>

      {/* 템플릿/비율 */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg bg-border-light p-0.5">
          <button onClick={() => setTemplate("minimal")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${template === "minimal" ? "bg-white text-ink" : "text-ink-caption"}`}>미니멀</button>
          <button onClick={() => setTemplate("photo")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${template === "photo" ? "bg-white text-ink" : "text-ink-caption"}`}>포토</button>
        </div>
        <div className="flex rounded-lg bg-border-light p-0.5">
          <button onClick={() => setRatio("4:5")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${ratio === "4:5" ? "bg-white text-ink" : "text-ink-caption"}`}>4:5</button>
          <button onClick={() => setRatio("9:16")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${ratio === "9:16" ? "bg-white text-ink" : "text-ink-caption"}`}>9:16</button>
        </div>
      </div>

      {/* 사진 썸네일 (baMode일 때만 배지) */}
      {totalPhotos > 0 && (
        <div className="mt-2 flex gap-1.5">
          {[...afterPhotos.map((p) => ({ ...p, t: "after" as const })), ...beforePhotos.map((p) => ({ ...p, t: "before" as const }))].map((photo, i) => (
            <div key={photo.path} className="relative h-12 w-12 shrink-0">
              <div className={`h-full w-full overflow-hidden rounded-lg border-2 border-primary`}>
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </div>
              {baMode && (
                <span className={`absolute bottom-0 left-0 right-0 rounded-b-lg text-center text-[8px] font-bold text-white leading-tight pointer-events-none ${photo.t === "before" ? "bg-black/50" : "bg-primary/50"}`}>
                  {photo.t === "before" ? "전" : "후"}
                </span>
              )}
              <button type="button" onClick={() => setConfirmDelete({ path: photo.path, type: photo.t })}
                className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">×</button>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 */}
      {confirmDelete && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-danger-light px-3 py-2">
          <p className="flex-1 text-xs text-danger">이 사진을 삭제할까요?</p>
          <button onClick={() => setConfirmDelete(null)} className="text-xs text-ink-caption">취소</button>
          <button onClick={handleDelete} disabled={isPending}
            className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
            {isPending && <Spinner className="h-3 w-3" />}삭제</button>
        </div>
      )}

      {/* 비포/애프터 토글 & 설정 */}
      <div className="mt-3 flex flex-col gap-2">
        {totalPhotos === 1 && !hasBothPhotos && (
          <button
            onClick={() => toggleBaMode(!baMode)}
            className={`self-start rounded-lg px-3 py-1.5 text-xs font-medium transition ${baMode ? "bg-primary text-white" : "bg-border-light text-ink-secondary hover:bg-border"}`}
          >
            {baMode ? "비포/애프터 모드 ON" : "비포/애프터 카드 만들기"}
          </button>
        )}

        {baMode && assignStep === "ask" && (
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs font-medium text-blue-900">지금 있는 사진은?</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => handleAssignType("before")} disabled={isPending}
                className="flex-1 rounded-lg border border-blue-200 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50">시술 전</button>
              <button onClick={() => handleAssignType("after")} disabled={isPending}
                className="flex-1 rounded-lg border border-blue-200 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50">시술 후</button>
            </div>
          </div>
        )}

        {baMode && assignStep === "upload" && (
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs font-medium text-blue-900">
              {afterPhotos.length === 0 ? "시술 후 사진을 추가해주세요" : "시술 전 사진을 추가해주세요"}
            </p>
            <label className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white cursor-pointer hover:bg-blue-700">
              {isPending && <Spinner className="h-3 w-3" />}
              {afterPhotos.length === 0 ? "시술 후 사진 추가" : "시술 전 사진 추가"}
              <input type="file" accept="image/*" onChange={handleSecondUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* 단일 모드에서 사진이 1장이고 BA 아닐 때: 추가 가능 */}
        {!baMode && totalPhotos < 2 && (
          <label className="self-start inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-ink-secondary cursor-pointer hover:bg-bg">
            {isPending && <Spinner className="h-3 w-3" />}
            + 사진 추가
            <input type="file" accept="image/*" onChange={handleFirstUpload} className="hidden" />
          </label>
        )}
      </div>

      {/* 문구 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {MESSAGES.map((m) => (
          <button key={m} onClick={() => { setMessage(m); setCustomMsg(""); }}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${message === m && !customMsg ? "bg-primary text-white" : "bg-border-light text-ink-secondary"}`}>{m}</button>
        ))}
      </div>
      <input type="text" value={customMsg} onChange={(e) => setCustomMsg(e.target.value)}
        placeholder="직접 입력" className="mt-1.5 w-full min-w-0 rounded-lg border border-border px-3 py-1.5 text-xs outline-none focus:border-primary" />

      {/* 카드 미리보기 */}
      <div className="mx-auto mt-4 w-full overflow-hidden rounded-lg" style={{ maxWidth: 400, aspectRatio: `${size.w} / ${size.h}` }}>
        <div ref={renderRef} className="relative h-full w-full origin-top-left"
          style={{ width: size.w, height: size.h, transform: `scale(var(--card-scale))`, "--card-scale": "1" } as React.CSSProperties}>
          {template === "minimal" ? <MinimalCard {...cardProps} w={size.w} h={size.h} /> : <PhotoCard {...cardProps} w={size.w} h={size.h} />}
        </div>
        <ScaleInjector targetW={size.w} />
      </div>

      <button onClick={handleDownload} disabled={downloading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50">
        {downloading && <Spinner />} 이미지 저장
      </button>

      {previewUrl && (
        <div className="mt-3 rounded-md border border-border p-2">
          <p className="mb-1 text-center text-[11px] text-ink-disabled">길게 눌러 저장할 수 있어요</p>
          <img src={previewUrl} alt="완료 카드" className="w-full rounded-lg" />
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
