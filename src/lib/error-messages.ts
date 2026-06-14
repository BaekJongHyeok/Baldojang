// Supabase auth/DB 영어 에러를 한국어로 변환
// 매핑에 없는 에러는 기본 메시지로 대체 (영어 원문 노출 방지)

const AUTH_ERRORS: Record<string, string> = {
  "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "Email not confirmed": "이메일 인증이 완료되지 않았습니다.",
  "User already registered": "이미 가입된 이메일입니다.",
  "Password should be at least 6 characters": "비밀번호는 6자 이상이어야 합니다.",
  "New password should be different from the old password.": "새 비밀번호는 기존 비밀번호와 달라야 합니다.",
  "Auth session missing!": "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
  "User not found": "사용자를 찾을 수 없습니다.",
  "Email rate limit exceeded": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "For security purposes, you can only request this after 60 seconds.": "보안을 위해 60초 후에 다시 시도해주세요.",
};

const DB_ERRORS: Record<string, string> = {
  "23505": "이미 존재하는 데이터입니다.",
  "23503": "연관된 데이터가 있어 처리할 수 없습니다.",
  "23P01": "이 시간에 이미 예약이 있습니다.",
};

export function localizeAuthError(message: string): string {
  // 정확한 매치
  if (AUTH_ERRORS[message]) return AUTH_ERRORS[message];
  // 부분 매치
  for (const [key, value] of Object.entries(AUTH_ERRORS)) {
    if (message.includes(key)) return value;
  }
  return "오류가 발생했습니다. 다시 시도해주세요.";
}

export function localizeDbError(message: string, code?: string): string {
  if (code && DB_ERRORS[code]) return DB_ERRORS[code];
  // 영어 문자가 포함되어 있으면 기본 메시지로 대체
  if (/[a-zA-Z]{3,}/.test(message)) return "오류가 발생했습니다. 다시 시도해주세요.";
  // 이미 한국어면 그대로
  return message;
}
