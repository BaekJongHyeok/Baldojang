// 기능 플래그 — 단일 파일에서 관리, UI on/off 전환 시 여기만 수정
// 백그라운드 발송 로직(cron, confirm 기록)은 이 플래그와 무관하게 동작합니다.
// UI가 꺼져 있어도 ALIMTALK_TEST_MODE=true 상태에서 skipped 레코드가 축적되며,
// 카카오 채널 승인 후 이 값을 true로 바꾸면 UI가 복구됩니다.
export const ALIMTALK_UI_ENABLED = false;
