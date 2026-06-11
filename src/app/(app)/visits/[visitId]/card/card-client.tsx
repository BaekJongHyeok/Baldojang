"use client";

import { useState, useRef, useTransition } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { formatTimestampKST } from "@/lib/calendar-utils";
import { resizeImage } from "@/lib/utils";
import { addVisitPhotosAction } from "@/lib/visit-actions";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/spinner";

const MESSAGES = [
  "오늘도 예뻐졌어요 🐾",
  "우리 아이 미용 완료!",
  "깨끗하고 예쁘게 변신 ✨",
  "사랑이 담긴 미용이에요",
];

type Props = {
  visit: {
    id: string;
    visitedAt: string;
    styleMemo: string | null;
    beforePhotos: string[];
    afterPhotos: string[];
  };
  pet: { id: string; name: string; breed: string };
  serviceName: string;
  shop: { name: string; phone: string; logoUrl: string | null; brandColor: string | null };
  shopId: string;
};

export function CardClient({ visit, pet, serviceName, shop, shopId }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<"minimal" | "photo">("minimal");
  const [ratio, setRatio] = useState<"4:5" | "9:16">("4:5");
  const [showBefore, setShowBefore] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [message, setMessage] = useState(MESSAGES[0]);
  const [customMsg, setCustomMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 사진 업로드
  const [isPending, startTransition] = useTransition();
  const [uploadType, setUploadType] = useState<"before" | "after">("after");

  const brandColor = shop.brandColor || "#292524";
  const hasPhotos = visit.afterPhotos.length > 0;
  const mainPhoto = visit.afterPhotos[selectedPhoto] ?? visit.afterPhotos[0];
  const displayMsg = customMsg || message;

  const cardW = ratio === "4:5" ? 1080 : 1080;
  const cardH = ratio === "4:5" ? 1350 : 1920;
  const scale = 2;

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: cardW,
        height: cardH,
        pixelRatio: scale,
        cacheBust: true,
        fetchRequestInit: { mode: "cors" },
      });
      setPreviewUrl(dataUrl);

      const link = document.createElement("a");
      link.download = `${pet.name}_${formatTimestampKST(visit.visitedAt, "yyyyMMdd")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      toast.error("이미지 생성에 실패했습니다. 다시 시도해주세요.");
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    startTransition(async () => {
      const supabase = createClient();
      const urls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const resized = await resizeImage(files[i], 1600);
        const path = `${shopId}/${visit.id}/${uploadType}-${Date.now()}-${i}.webp`;
        const { error } = await supabase.storage
          .from("visit-photos")
          .upload(path, resized, { contentType: "image/webp" });
        if (error) {
          toast.error(`업로드 실패: ${error.message}`);
          return;
        }
        urls.push(path);
      }

      const fd = new FormData();
      fd.set("visit_id", visit.id);
      fd.set("type", uploadType);
      fd.set("urls", urls.join(","));
      const result = await addVisitPhotosAction(fd);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("사진이 등록되었습니다. 페이지를 새로고침하면 반영됩니다.");
      }
    });
  }

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
              <button type="button" onClick={() => setUploadType("before")}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${uploadType === "before" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>시술 전</button>
              <button type="button" onClick={() => setUploadType("after")}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${uploadType === "after" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>시술 후</button>
            </div>
            <label className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white cursor-pointer hover:bg-stone-800">
              {isPending ? <Spinner /> : null}
              사진 선택
              <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
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
        {visit.beforePhotos.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            <input type="checkbox" checked={showBefore} onChange={(e) => setShowBefore(e.target.checked)} className="rounded" />
            Before/After
          </label>
        )}
      </div>

      {/* 사진 선택 */}
      {visit.afterPhotos.length > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {visit.afterPhotos.map((url, i) => (
            <button key={i} onClick={() => setSelectedPhoto(i)}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 ${i === selectedPhoto ? "border-stone-900" : "border-transparent"}`}>
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* 문구 선택 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {MESSAGES.map((m) => (
          <button key={m} onClick={() => { setMessage(m); setCustomMsg(""); }}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${message === m && !customMsg ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>{m}</button>
        ))}
      </div>
      <input type="text" value={customMsg} onChange={(e) => setCustomMsg(e.target.value)}
        placeholder="직접 입력" className="mt-1.5 w-full min-w-0 rounded-lg border border-stone-200 px-3 py-1.5 text-xs outline-none focus:border-stone-400" />

      {/* 사진 추가 업로드 */}
      <div className="mt-3 flex gap-2 items-center">
        <div className="flex rounded-lg bg-stone-100 p-0.5">
          <button onClick={() => setUploadType("before")} className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${uploadType === "before" ? "bg-white shadow-sm" : "text-stone-500"}`}>전</button>
          <button onClick={() => setUploadType("after")} className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${uploadType === "after" ? "bg-white shadow-sm" : "text-stone-500"}`}>후</button>
        </div>
        <label className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-600 cursor-pointer hover:bg-stone-50">
          {isPending && <Spinner className="h-3 w-3" />}
          + 사진 추가
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
        </label>
      </div>

      {/* 카드 프리뷰 */}
      <div className="mt-4 flex justify-center overflow-hidden rounded-2xl bg-stone-100">
        <div
          ref={cardRef}
          style={{ width: cardW, height: cardH, transform: `scale(${Math.min(343 / cardW, 1)})`, transformOrigin: "top left" }}
        >
          {template === "minimal" ? (
            <MinimalCard
              photo={mainPhoto}
              beforePhoto={showBefore ? visit.beforePhotos[0] : null}
              petName={pet.name}
              breed={pet.breed}
              serviceName={serviceName}
              date={formatTimestampKST(visit.visitedAt, "yyyy.M.d")}
              message={displayMsg}
              shopName={shop.name}
              shopPhone={shop.phone}
              brandColor={brandColor}
              cardW={cardW}
              cardH={cardH}
            />
          ) : (
            <PhotoCard
              photo={mainPhoto}
              beforePhoto={showBefore ? visit.beforePhotos[0] : null}
              petName={pet.name}
              serviceName={serviceName}
              date={formatTimestampKST(visit.visitedAt, "yyyy.M.d")}
              message={displayMsg}
              shopName={shop.name}
              brandColor={brandColor}
              cardW={cardW}
              cardH={cardH}
            />
          )}
        </div>
      </div>

      {/* 다운로드 */}
      <button onClick={handleDownload} disabled={downloading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
        {downloading && <Spinner />}
        이미지 저장
      </button>

      {/* 모바일 길게 눌러 저장용 */}
      {previewUrl && (
        <div className="mt-3 rounded-xl border border-stone-200 p-2">
          <p className="mb-1 text-center text-[11px] text-stone-400">길게 눌러 저장할 수 있어요</p>
          <img src={previewUrl} alt="완료 카드" className="w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

// === 템플릿 컴포넌트 ===

function MinimalCard({
  photo, beforePhoto, petName, breed, serviceName, date, message, shopName, shopPhone, brandColor, cardW, cardH,
}: {
  photo: string; beforePhoto: string | null; petName: string; breed: string; serviceName: string;
  date: string; message: string; shopName: string; shopPhone: string; brandColor: string; cardW: number; cardH: number;
}) {
  const photoH = beforePhoto ? cardH * 0.4 : cardH * 0.55;
  return (
    <div style={{ width: cardW, height: cardH, background: "#FFFBF5", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
      {/* 상단 로고 */}
      <div style={{ padding: "48px 60px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: brandColor }}>{shopName}</span>
        <span style={{ fontSize: 18, color: "#a8a29e" }}>{date}</span>
      </div>

      {/* 사진 */}
      <div style={{ flex: 1, padding: "0 60px", display: "flex", gap: 16, overflow: "hidden" }}>
        {beforePhoto && (
          <div style={{ flex: 1, borderRadius: 24, overflow: "hidden", position: "relative" }}>
            <img src={beforePhoto} alt="before" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <span style={{ position: "absolute", top: 16, left: 16, background: "rgba(0,0,0,0.5)", color: "white", padding: "4px 12px", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>Before</span>
          </div>
        )}
        <div style={{ flex: 1, borderRadius: 24, overflow: "hidden", position: "relative" }}>
          <img src={photo} alt="after" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {beforePhoto && (
            <span style={{ position: "absolute", top: 16, left: 16, background: brandColor, color: "white", padding: "4px 12px", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>After</span>
          )}
        </div>
      </div>

      {/* 하단 정보 */}
      <div style={{ padding: "32px 60px 48px", textAlign: "center" }}>
        <p style={{ fontSize: 48, fontWeight: 800, color: "#1c1917", letterSpacing: -1 }}>{petName}</p>
        <p style={{ fontSize: 22, color: "#78716c", marginTop: 8 }}>{serviceName}{breed ? ` · ${breed}` : ""}</p>
        <p style={{ fontSize: 24, color: brandColor, marginTop: 24, fontWeight: 600 }}>{message}</p>
        <p style={{ fontSize: 16, color: "#a8a29e", marginTop: 16 }}>{shopName}{shopPhone ? ` · ${shopPhone}` : ""}</p>
      </div>
    </div>
  );
}

function PhotoCard({
  photo, beforePhoto, petName, serviceName, date, message, shopName, brandColor, cardW, cardH,
}: {
  photo: string; beforePhoto: string | null; petName: string; serviceName: string;
  date: string; message: string; shopName: string; brandColor: string; cardW: number; cardH: number;
}) {
  return (
    <div style={{ width: cardW, height: cardH, position: "relative", overflow: "hidden" }}>
      {/* 풀블리드 사진 */}
      <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />

      {/* 그라데이션 오버레이 */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%)" }} />

      {/* 상단 */}
      <div style={{ position: "absolute", top: 40, left: 48, right: 48, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{shopName}</span>
        <span style={{ fontSize: 16, color: "rgba(255,255,255,0.8)" }}>{date}</span>
      </div>

      {/* Before 작은 인셋 */}
      {beforePhoto && (
        <div style={{ position: "absolute", top: 100, right: 48, width: 200, height: 260, borderRadius: 16, overflow: "hidden", border: "3px solid white", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
          <img src={beforePhoto} alt="before" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <span style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.6)", color: "white", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>Before</span>
        </div>
      )}

      {/* 하단 텍스트 */}
      <div style={{ position: "absolute", bottom: 48, left: 48, right: 48, textAlign: "center" }}>
        <p style={{ fontSize: 52, fontWeight: 800, color: "white", textShadow: "0 2px 12px rgba(0,0,0,0.5)", letterSpacing: -1 }}>{petName}</p>
        <p style={{ fontSize: 22, color: "rgba(255,255,255,0.9)", marginTop: 8 }}>{serviceName}</p>
        <p style={{ fontSize: 22, color: brandColor === "#292524" ? "#f5f0eb" : brandColor, marginTop: 20, fontWeight: 600 }}>{message}</p>
      </div>
    </div>
  );
}
