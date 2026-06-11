"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { formatTimestampKST } from "@/lib/calendar-utils";
import { resizeImage } from "@/lib/utils";
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
  visit: {
    id: string;
    visitedAt: string;
    styleMemo: string | null;
    beforePhotos: PhotoItem[];
    afterPhotos: PhotoItem[];
  };
  pet: { id: string; name: string; breed: string };
  serviceName: string;
  shop: { name: string; phone: string; logoUrl: string | null; brandColor: string | null };
  shopId: string;
};

// 카드 실제 해상도
const CARD_SIZES = {
  "4:5": { w: 1080, h: 1350 },
  "9:16": { w: 1080, h: 1920 },
} as const;

export function CardClient({ visit, pet, serviceName, shop, shopId }: Props) {
  const router = useRouter();
  const renderRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<"minimal" | "photo">("minimal");
  const [ratio, setRatio] = useState<"4:5" | "9:16">("4:5");
  const [showBefore, setShowBefore] = useState(false);

  // 로컬 사진 상태 (즉시 갱신용)
  const [beforePhotos, setBeforePhotos] = useState(visit.beforePhotos);
  const [afterPhotos, setAfterPhotos] = useState(visit.afterPhotos);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [message, setMessage] = useState(MESSAGES[0]);
  const [customMsg, setCustomMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadType, setUploadType] = useState<"before" | "after">("after");

  const brandColor = shop.brandColor || "#292524";
  const hasPhotos = afterPhotos.length > 0;
  const mainPhoto = afterPhotos[selectedPhoto]?.url ?? afterPhotos[0]?.url ?? "";
  const displayMsg = customMsg || message;
  const size = CARD_SIZES[ratio];

  const handleDownload = useCallback(async () => {
    if (!renderRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(renderRef.current, {
        canvasWidth: size.w * 2,
        canvasHeight: size.h * 2,
        pixelRatio: 1,
        cacheBust: true,
        fetchRequestInit: { mode: "cors" },
        style: { transform: "scale(1)", transformOrigin: "top left" },
      });
      setPreviewUrl(dataUrl);
      const link = document.createElement("a");
      link.download = `${pet.name}_${formatTimestampKST(visit.visitedAt, "yyyyMMdd")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      toast.error("이미지 생성에 실패했습니다.");
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }, [size, pet.name, visit.visitedAt]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, typeOverride?: "before" | "after") {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const type = typeOverride ?? uploadType;
    startTransition(async () => {
      const supabase = createClient();
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const resized = await resizeImage(files[i], 1600);
        const path = `${shopId}/${visit.id}/${type}-${Date.now()}-${i}.webp`;
        const { error } = await supabase.storage.from("visit-photos").upload(path, resized, { contentType: "image/webp" });
        if (error) { toast.error(`업로드 실패: ${error.message}`); return; }
        urls.push(path);
      }
      const fd = new FormData();
      fd.set("visit_id", visit.id);
      fd.set("type", type);
      fd.set("urls", urls.join(","));
      const result = await addVisitPhotosAction(fd);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("사진이 등록되었습니다.");
        router.refresh();
      }
    });
  }

  const [confirmDelete, setConfirmDelete] = useState<{ path: string; type: "before" | "after" } | null>(null);

  function handleDelete() {
    if (!confirmDelete) return;
    const { path, type } = confirmDelete;

    // 낙관적 제거
    const prevBefore = beforePhotos;
    const prevAfter = afterPhotos;
    if (type === "before") {
      const next = beforePhotos.filter((p) => p.path !== path);
      setBeforePhotos(next);
      if (next.length === 0) setShowBefore(false);
    } else {
      const next = afterPhotos.filter((p) => p.path !== path);
      setAfterPhotos(next);
      if (selectedPhoto >= next.length) setSelectedPhoto(Math.max(0, next.length - 1));
    }
    setConfirmDelete(null);

    const fd = new FormData();
    fd.set("visit_id", visit.id);
    fd.set("path", path);
    fd.set("type", type);
    startTransition(async () => {
      const result = await deleteVisitPhotoAction(fd);
      if (result?.error) {
        toast.error(result.error);
        // 롤백
        setBeforePhotos(prevBefore);
        setAfterPhotos(prevAfter);
      } else {
        router.refresh();
      }
    });
  }

  // 카드 공통 props
  const cardProps = {
    photo: mainPhoto,
    beforePhoto: showBefore && beforePhotos.length > 0 ? beforePhotos[0].url : null,
    petName: pet.name,
    breed: pet.breed,
    serviceName,
    date: formatTimestampKST(visit.visitedAt, "yyyy.M.d"),
    message: displayMsg,
    shopName: shop.name,
    shopPhone: shop.phone,
    brandColor,
  };

  if (!hasPhotos) {
    return (
      <div>
        <h1 className="text-xl font-bold text-stone-900">완료 카드</h1>
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm text-center">
          <p className="text-4xl">📷</p>
          <p className="mt-3 text-sm font-medium text-stone-700">시술 사진을 먼저 등록해주세요</p>
          <p className="mt-1 text-xs text-stone-500">시술 후 사진이 있어야 완료 카드를 만들 수 있어요</p>
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2 justify-center">
              <button onClick={() => setUploadType("before")} className={`rounded-lg px-3 py-1 text-xs font-medium ${uploadType === "before" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>시술 전</button>
              <button onClick={() => setUploadType("after")} className={`rounded-lg px-3 py-1 text-xs font-medium ${uploadType === "after" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>시술 후</button>
            </div>
            <label className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white cursor-pointer hover:bg-stone-800">
              {isPending ? <Spinner /> : null}
              사진 선택
              <input type="file" accept="image/*" multiple onChange={(e) => handleUpload(e, uploadType)} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900">완료 카드</h1>

      {/* 컨트롤 */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg bg-stone-100 p-0.5">
          <button onClick={() => setTemplate("minimal")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${template === "minimal" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>미니멀</button>
          <button onClick={() => setTemplate("photo")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${template === "photo" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>포토</button>
        </div>
        <div className="flex rounded-lg bg-stone-100 p-0.5">
          <button onClick={() => setRatio("4:5")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${ratio === "4:5" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>4:5</button>
          <button onClick={() => setRatio("9:16")} className={`rounded-md px-2.5 py-1 text-xs font-medium ${ratio === "9:16" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>9:16</button>
        </div>
        {beforePhotos.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            <input type="checkbox" checked={showBefore} onChange={(e) => setShowBefore(e.target.checked)} className="rounded" />
            Before/After
          </label>
        )}
      </div>

      {(beforePhotos.length > 0 || afterPhotos.length > 1) && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {beforePhotos.map((photo, i) => (
            <div key={`b-${i}`} className="relative h-12 w-12 shrink-0">
              <div className="h-full w-full overflow-hidden rounded-lg opacity-70">
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </div>
              <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/50 text-center text-[8px] font-bold text-white leading-tight">전</span>
              <button
                type="button"
                onClick={() => setConfirmDelete({ path: photo.path, type: "before" })}
                className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow"
              >×</button>
            </div>
          ))}
          {afterPhotos.map((photo, i) => (
            <div key={`a-${i}`} className="relative h-12 w-12 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPhoto(i)}
                className={`h-full w-full overflow-hidden rounded-lg border-2 ${i === selectedPhoto ? "border-stone-900" : "border-transparent"}`}
              >
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-stone-900/50 text-center text-[8px] font-bold text-white leading-tight pointer-events-none">후</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete({ path: photo.path, type: "after" }); }}
                className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 */}
      {confirmDelete && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
          <p className="flex-1 text-xs text-red-700">이 사진을 삭제할까요?</p>
          <button onClick={() => setConfirmDelete(null)} className="text-xs text-stone-500">취소</button>
          <button onClick={handleDelete} disabled={isPending}
            className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
            {isPending && <Spinner className="h-3 w-3" />}삭제
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {MESSAGES.map((m) => (
          <button key={m} onClick={() => { setMessage(m); setCustomMsg(""); }}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${message === m && !customMsg ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>{m}</button>
        ))}
      </div>
      <input type="text" value={customMsg} onChange={(e) => setCustomMsg(e.target.value)}
        placeholder="직접 입력" className="mt-1.5 w-full min-w-0 rounded-lg border border-stone-200 px-3 py-1.5 text-xs outline-none focus:border-stone-400" />

      {/* 사진 추가 / Before 안내 */}
      <div className="mt-3">
        {beforePhotos.length > 0 ? (
          <div className="flex gap-2 items-center">
            <div className="flex rounded-lg bg-stone-100 p-0.5">
              <button onClick={() => setUploadType("before")} className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${uploadType === "before" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>전</button>
              <button onClick={() => setUploadType("after")} className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${uploadType === "after" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>후</button>
            </div>
            <label className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-600 cursor-pointer hover:bg-stone-50">
              {isPending && <Spinner className="h-3 w-3" />}
              + 사진 추가
              <input type="file" accept="image/*" multiple onChange={(e) => handleUpload(e, uploadType)} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2">
            <p className="flex-1 text-[11px] text-stone-500">전 사진을 추가하면 비포/애프터 카드를 만들 수 있어요</p>
            <label className="flex shrink-0 items-center gap-1.5 rounded-lg bg-stone-900 px-2.5 py-1 text-[11px] font-medium text-white cursor-pointer hover:bg-stone-800">
              {isPending && <Spinner className="h-3 w-3" />}
              + 전 사진
              <input type="file" accept="image/*" multiple onChange={(e) => handleUpload(e, "before")} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {/* 미리보기: aspect-ratio wrapper + 내부 카드를 100%로 채움 */}
      <div
        className="mx-auto mt-4 w-full overflow-hidden rounded-2xl"
        style={{ maxWidth: 400, aspectRatio: `${size.w} / ${size.h}` }}
      >
        <div
          ref={renderRef}
          className="relative h-full w-full origin-top-left"
          style={{ width: size.w, height: size.h, transform: `scale(var(--card-scale))`, "--card-scale": "1" } as React.CSSProperties}
        >
          {template === "minimal" ? <MinimalCard {...cardProps} w={size.w} h={size.h} /> : <PhotoCard {...cardProps} w={size.w} h={size.h} />}
        </div>
        {/* JS로 scale 계산 */}
        <ScaleInjector targetW={size.w} />
      </div>

      <button onClick={handleDownload} disabled={downloading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
        {downloading && <Spinner />}
        이미지 저장
      </button>

      {previewUrl && (
        <div className="mt-3 rounded-xl border border-stone-200 p-2">
          <p className="mb-1 text-center text-[11px] text-stone-400">길게 눌러 저장할 수 있어요</p>
          <img src={previewUrl} alt="완료 카드" className="w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

/** 부모 wrapper의 실제 폭을 측정해서 CSS 변수로 scale 주입 */
function ScaleInjector({ targetW }: { targetW: number }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>
      <style>{`
        @container (min-width: 0px) {
          /* fallback */
        }
      `}</style>
      {/* ResizeObserver로 scale 계산 */}
      <ScaleObserver targetW={targetW} />
    </div>
  );
}

function ScaleObserver({ targetW }: { targetW: number }) {
  const measured = useRef(false);
  const refCb = useCallback((el: HTMLDivElement | null) => {
    if (!el || measured.current) return;
    measured.current = true;
    const wrapper = el.closest("[style*='aspect-ratio']") as HTMLElement | null;
    if (!wrapper) return;
    const update = () => {
      const containerW = wrapper.clientWidth;
      const scale = containerW / targetW;
      const inner = wrapper.querySelector("[style*='--card-scale']") as HTMLElement | null;
      if (inner) inner.style.setProperty("--card-scale", String(scale));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
  }, [targetW]);
  return <div ref={refCb} />;
}

// === 템플릿 ===

type CardTemplateProps = {
  photo: string;
  beforePhoto: string | null;
  petName: string;
  breed: string;
  serviceName: string;
  date: string;
  message: string;
  shopName: string;
  shopPhone: string;
  brandColor: string;
  w: number;
  h: number;
};

function MinimalCard({ photo, beforePhoto, petName, breed, serviceName, date, message, shopName, shopPhone, brandColor, w, h }: CardTemplateProps) {
  const p = Math.round(w * 0.055); // ~60px at 1080
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
  const gap = 2;

  if (beforePhoto) {
    // 좌우 50:50 분할 모드
    return (
      <div style={{ width: w, height: h, display: "flex", flexDirection: "column", overflow: "hidden", background: "#111" }}>
        {/* 상단 로고 */}
        <div style={{ padding: `${w * 0.03}px ${w * 0.044}px`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: w * 0.022, fontWeight: 700, color: "white" }}>{shopName}</span>
          <span style={{ fontSize: w * 0.015, color: "rgba(255,255,255,0.6)" }}>{date}</span>
        </div>
        {/* 사진 분할 */}
        <div style={{ height: photoH, display: "flex", gap, flexShrink: 0 }}>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <img src={beforePhoto} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", bottom: w * 0.015, left: w * 0.015, background: "rgba(0,0,0,0.6)", color: "white", padding: `${w * 0.004}px ${w * 0.012}px`, borderRadius: w * 0.006, fontSize: w * 0.013, fontWeight: 700, letterSpacing: 1 }}>BEFORE</span>
          </div>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", bottom: w * 0.015, left: w * 0.015, background: brandColor, color: "white", padding: `${w * 0.004}px ${w * 0.012}px`, borderRadius: w * 0.006, fontSize: w * 0.013, fontWeight: 700, letterSpacing: 1 }}>AFTER</span>
          </div>
        </div>
        {/* 하단 텍스트 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: `0 ${w * 0.044}px`, overflow: "hidden" }}>
          <p style={{ fontSize: w * 0.044, fontWeight: 800, color: "white", letterSpacing: -1, lineHeight: 1.2 }}>{petName}</p>
          <p style={{ fontSize: w * 0.02, color: "rgba(255,255,255,0.7)", marginTop: h * 0.005 }}>{serviceName}</p>
          <p style={{ fontSize: w * 0.02, color: textColor, marginTop: h * 0.012, fontWeight: 600 }}>{message}</p>
        </div>
      </div>
    );
  }

  // 단일 사진 풀블리드
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
