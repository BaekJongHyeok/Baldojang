/** 전화번호 자동 하이픈 포맷 (010-1234-5678) */
export function formatPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
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
export type PassStatus = "active" | "depleted" | "expired";

export function getPassStatus(pass: {
  type: string;
  balance: number | null;
  remaining: number | null;
  expires_at: string | null;
}): PassStatus {
  if (pass.expires_at && new Date(pass.expires_at) < new Date()) return "expired";
  if (pass.type === "amount" && (pass.balance ?? 0) <= 0) return "depleted";
  if (pass.type === "count" && (pass.remaining ?? 0) <= 0) return "depleted";
  return "active";
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
