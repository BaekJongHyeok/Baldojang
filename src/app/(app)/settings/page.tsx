import Link from "next/link";

const ITEMS = [
  {
    href: "/settings/shop",
    title: "샵 정보",
    desc: "상호, 전화번호, 주소, 영업시간, 슬롯 단위",
    enabled: true,
  },
  {
    href: "/settings/services",
    title: "시술 메뉴",
    desc: "시술 항목, 가격, 소요시간 관리",
    enabled: true,
  },
  {
    href: "/settings/notifications",
    title: "알림톡 설정",
    desc: "6주차 예정",
    enabled: false,
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900">설정</h1>
      <div className="mt-6 flex flex-col gap-3">
        {ITEMS.map((item) =>
          item.enabled ? (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm transition hover:bg-stone-50"
            >
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">{item.desc}</p>
              </div>
              <ChevronRight />
            </Link>
          ) : (
            <div
              key={item.href}
              className="flex items-center justify-between rounded-2xl bg-white p-5 opacity-50 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-stone-400">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">{item.desc}</p>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg
      className="h-4 w-4 text-stone-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}
