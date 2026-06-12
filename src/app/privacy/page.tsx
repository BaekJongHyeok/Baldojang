import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/settings" className="text-[13px] text-ink-caption hover:text-ink-secondary">&larr; 설정</Link>

      <h1 className="mt-4 text-[20px] font-bold text-ink">발도장 개인정보처리방침</h1>
      <p className="mt-1 text-[13px] text-ink-caption">시행일: 2026년 6월 15일</p>

      <p className="mt-4 text-[14px] leading-relaxed text-ink-secondary">
        발도장(이하 &ldquo;서비스&rdquo;) 운영자는 개인정보 보호법 등 관련 법령을 준수하며, 이용자와 정보주체의 개인정보를 보호하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
      </p>

      <div className="mt-6 flex flex-col gap-6 text-[14px] leading-relaxed text-ink-secondary">
        <Section title="1. 처리하는 개인정보의 항목">
          <h3 className="mt-2 text-[14px] font-medium text-ink">가. 이용자(미용샵 운영자) 계정 정보</h3>
          <ul className="mt-1 list-disc pl-5 flex flex-col gap-0.5">
            <li>필수: 이메일 주소, 비밀번호(암호화 저장), 이름(원장명), 샵 정보(상호, 전화번호, 주소)</li>
            <li>자동 수집: 서비스 이용 기록, 접속 로그</li>
          </ul>
          <h3 className="mt-3 text-[14px] font-medium text-ink">나. 이용자가 입력하는 고객 데이터 (보호자 및 반려동물 정보)</h3>
          <ul className="mt-1 list-disc pl-5 flex flex-col gap-0.5">
            <li>보호자: 이름, 휴대전화번호</li>
            <li>반려동물: 이름, 견종, 생일, 몸무게, 건강 관련 주의사항, 사진</li>
            <li>이용 기록: 예약, 방문, 시술, 결제, 선불권 내역</li>
          </ul>
          <p className="mt-2 text-[13px] text-ink-caption">※ 고객 데이터는 이용자(미용샵 운영자)가 자신의 고객 관리를 위해 직접 입력하는 정보입니다. 이 정보의 수집에 대한 정보주체(보호자) 동의 확보 책임은 이용자에게 있으며, 운영자는 이용자의 위탁에 따라 해당 정보를 보관·처리하는 역할을 수행합니다.</p>
        </Section>

        <Section title="2. 개인정보의 처리 목적">
          <ul className="list-disc pl-5 flex flex-col gap-0.5">
            <li>서비스 제공: 계정 관리, 예약·고객·매출 관리 기능 제공</li>
            <li>서비스 운영: 문의 대응, 공지사항 전달, 서비스 개선</li>
            <li>보안: 부정 이용 방지, 장애 대응</li>
          </ul>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          <ul className="list-disc pl-5 flex flex-col gap-0.5">
            <li>계정 정보: 회원 탈퇴 시까지 보유하며, 탈퇴 요청 후 지체 없이 파기합니다 (단, 관련 법령에 따라 보존 의무가 있는 정보는 해당 기간 동안 보존).</li>
            <li>고객 데이터: 이용자가 직접 삭제하거나 회원 탈퇴 시 함께 파기됩니다.</li>
            <li>전자상거래 등에서의 소비자 보호에 관한 법률 등 관련 법령에 따라 보존이 필요한 경우: 해당 법령에서 정한 기간</li>
          </ul>
        </Section>

        <Section title="4. 개인정보 처리의 위탁">
          <p>서비스는 안정적인 제공을 위해 다음 업체에 개인정보 처리를 위탁하고 있습니다.</p>
          {/* 데스크톱 테이블 */}
          <div className="mt-3 hidden sm:block overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-border-light text-[12px] font-medium text-ink-caption">
                  <th className="px-4 py-2">수탁 업체</th>
                  <th className="px-4 py-2">위탁 업무</th>
                  <th className="px-4 py-2">데이터 보관 위치</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-light">
                  <td className="px-4 py-2 font-medium text-ink">Supabase Inc.</td>
                  <td className="px-4 py-2">데이터베이스 및 인증, 파일(사진) 저장</td>
                  <td className="px-4 py-2">대한민국 서울 리전 (AWS ap-northeast-2)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-ink">Vercel Inc.</td>
                  <td className="px-4 py-2">웹 서비스 호스팅</td>
                  <td className="px-4 py-2">서버리스 함수: 대한민국 서울 리전</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* 모바일 카드 */}
          <div className="mt-3 flex flex-col gap-2 sm:hidden">
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-[13px] font-medium text-ink">Supabase Inc.</p>
              <p className="mt-0.5 text-[12px] text-ink-caption">위탁: 데이터베이스 및 인증, 파일(사진) 저장</p>
              <p className="text-[12px] text-ink-caption">위치: 대한민국 서울 리전 (AWS ap-northeast-2)</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-[13px] font-medium text-ink">Vercel Inc.</p>
              <p className="mt-0.5 text-[12px] text-ink-caption">위탁: 웹 서비스 호스팅</p>
              <p className="text-[12px] text-ink-caption">위치: 서버리스 함수: 대한민국 서울 리전</p>
            </div>
          </div>
          <p className="mt-2">운영자는 위탁 계약 시 개인정보가 안전하게 관리되도록 필요한 사항을 규정하고 있습니다.</p>
        </Section>

        <Section title="5. 개인정보의 제3자 제공">
          <p>운영자는 정보주체의 동의가 있거나 법령에 근거한 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.</p>
        </Section>

        <Section title="6. 정보주체의 권리와 행사 방법">
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>이용자는 언제든지 자신의 개인정보를 조회·수정하거나 탈퇴(삭제)를 요청할 수 있습니다.</li>
            <li>보호자(이용자의 고객)는 자신의 정보에 대한 열람·정정·삭제를 해당 미용샵(이용자) 또는 운영자에게 요청할 수 있습니다. 운영자에게 직접 요청이 접수된 경우, 운영자는 해당 이용자에게 이를 전달하거나 법령에 따라 필요한 조치를 합니다.</li>
            <li>권리 행사는 아래 연락처를 통해 할 수 있으며, 운영자는 지체 없이 조치합니다.</li>
          </ol>
        </Section>

        <Section title="7. 개인정보의 파기">
          <ul className="list-disc pl-5 flex flex-col gap-0.5">
            <li>파기 사유 발생 시(탈퇴, 보유 기간 경과 등) 지체 없이 파기합니다.</li>
            <li>전자적 파일은 복구할 수 없는 방법으로 삭제하며, 백업 데이터는 백업 주기에 따라 순차 삭제됩니다.</li>
          </ul>
        </Section>

        <Section title="8. 개인정보의 안전성 확보 조치">
          <ul className="list-disc pl-5 flex flex-col gap-0.5">
            <li>비밀번호 암호화 저장 (인증 시스템 위탁: Supabase Auth)</li>
            <li>데이터베이스 접근 제어 (행 수준 보안 정책으로 샵 간 데이터 격리)</li>
            <li>사진 등 파일의 비공개 저장소 보관 및 서명된 URL 방식의 접근 통제</li>
            <li>전송 구간 암호화 (HTTPS)</li>
          </ul>
        </Section>

        <Section title="9. 개인정보 보호책임자">
          <ul className="list-disc pl-5 flex flex-col gap-0.5">
            <li>성명: 백종혁 (운영자)</li>
            <li>연락처: <a href="mailto:contact.baldojang@gmail.com" className="text-primary hover:underline">contact.baldojang@gmail.com</a></li>
          </ul>
          <p className="mt-2 text-[13px] text-ink-caption">개인정보 처리에 관한 문의, 불만, 피해구제는 위 연락처로 접수할 수 있습니다. 또한 개인정보침해에 대한 신고·상담은 개인정보침해신고센터(국번 없이 118), 개인정보분쟁조정위원회(1833-6972)에 문의할 수 있습니다.</p>
        </Section>

        <Section title="10. 처리방침의 변경">
          <p>이 방침의 내용이 변경되는 경우 적용일 7일 전부터 서비스 내 공지사항을 통해 안내합니다.</p>
          <ul className="mt-2 list-disc pl-5 flex flex-col gap-0.5">
            <li>공고일: 2026년 6월 12일</li>
            <li>시행일: 2026년 6월 15일</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
