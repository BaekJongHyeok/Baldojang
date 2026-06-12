/** 전화번호 자동 하이픈 포맷 (010-1234-5678 / 02-1234-5678 / 031-123-4567) */
export function formatPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 11);
  // 02 지역번호: 2-4-4 또는 2-3-4
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(digits.length - 4)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // 010/011/031 등 3자리: 3-4-4 또는 3-3-4
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(digits.length - 4)}`;
}

/** 생년월일로부터 나이 계산 */
export function calcAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years > 0) return `${years}살`;
  return `${months}개월`;
}

/** 체급 한글 표시 */
export function sizeLabel(size: string | null): string {
  if (size === "small") return "소형";
  if (size === "medium") return "중형";
  if (size === "large") return "대형";
  return "";
}

/** 패스 상태 판정 */
export type PassStatus = "active" | "depleted" | "expired" | "disabled";

export function getPassStatus(pass: {
  type: string;
  balance: number | null;
  remaining: number | null;
  expires_at: string | null;
  disabled_at?: string | null;
}): PassStatus {
  if (pass.disabled_at) return "disabled";
  if (pass.expires_at && new Date(pass.expires_at) < new Date()) return "expired";
  if (pass.type === "amount" && (pass.balance ?? 0) <= 0) return "depleted";
  if (pass.type === "count" && (pass.remaining ?? 0) <= 0) return "depleted";
  return "active";
}

/**
 * active 패스 목록 → 요약 문자열
 * 0개: null, 1개: "이름 · 잔액", 금액 2+: "N개 · 총 ₩합계",
 * 금액+횟수 혼합 2개: "금액명 ₩잔액 · 횟수명 N회", 3+: "선불권 N개"
 */
export function formatPassSummary(
  activePasses: { type: string; name: string; balance: number | null; remaining: number | null }[],
): string | null {
  if (activePasses.length === 0) return null;
  if (activePasses.length === 1) {
    const p = activePasses[0];
    return p.type === "amount"
      ? `${p.name} · ₩${(p.balance ?? 0).toLocaleString()}`
      : `${p.name} · ${p.remaining ?? 0}회`;
  }
  const amounts = activePasses.filter((p) => p.type === "amount");
  const counts = activePasses.filter((p) => p.type === "count");
  if (activePasses.length === 2 && amounts.length === 1 && counts.length === 1) {
    return `${amounts[0].name} ₩${(amounts[0].balance ?? 0).toLocaleString()} · ${counts[0].name} ${counts[0].remaining ?? 0}회`;
  }
  if (activePasses.length >= 3) return `선불권 ${activePasses.length}개`;
  // 2+ same type
  if (amounts.length >= 2) {
    const total = amounts.reduce((s, p) => s + (p.balance ?? 0), 0);
    return `${amounts.length}개 · 총 ₩${total.toLocaleString()}`;
  }
  const totalCount = counts.reduce((s, p) => s + (p.remaining ?? 0), 0);
  return `${counts.length}개 · 총 ${totalCount}회`;
}

/** 클라이언트 이미지 리사이즈 (max 1024px) */
export function resizeImage(file: File, maxSize = 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("resize failed"))),
        "image/webp",
        0.85,
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
