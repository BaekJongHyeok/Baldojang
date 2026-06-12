import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/settings" className="text-[13px] text-ink-caption hover:text-ink-secondary">&larr; 설정</Link>

      <h1 className="mt-4 text-[20px] font-bold text-ink">발도장 이용약관</h1>
      <p className="mt-1 text-[13px] text-ink-caption">시행일: 2026년 6월 15일</p>

      <div className="mt-6 flex flex-col gap-6 text-[14px] leading-relaxed text-ink-secondary">
        <Section title="제1조 (목적)">
          <p>이 약관은 발도장(이하 &ldquo;서비스&rdquo;)의 이용과 관련하여 서비스 운영자(이하 &ldquo;운영자&rdquo;)와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        </Section>

        <Section title="제2조 (정의)">
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>&ldquo;서비스&rdquo;란 반려동물 미용업 종사자를 위한 예약, 고객·반려동물 정보, 매출, 선불권 등의 운영 관리 도구를 말합니다.</li>
            <li>&ldquo;이용자&rdquo;란 이 약관에 동의하고 계정을 생성하여 서비스를 이용하는 자(미용샵 운영자 및 그 직원)를 말합니다.</li>
            <li>&ldquo;고객 데이터&rdquo;란 이용자가 서비스에 입력하는 보호자 및 반려동물에 관한 정보(이름, 연락처, 반려동물 정보, 사진, 방문·결제 기록 등)를 말합니다.</li>
          </ol>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>이 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
            <li>운영자는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경 사유를 명시하여 적용일 7일 전부터 서비스 내에 공지합니다.</li>
            <li>이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제4조 (계정)">
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>서비스 이용을 위해서는 이메일과 비밀번호로 계정을 생성해야 합니다.</li>
            <li>계정 정보의 관리 책임은 이용자에게 있으며, 계정을 제3자에게 양도하거나 대여할 수 없습니다.</li>
            <li>계정 정보가 도용된 사실을 알게 된 경우 이용자는 즉시 운영자에게 알려야 합니다.</li>
          </ol>
        </Section>

        <Section title="제5조 (서비스의 제공 및 변경)">
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>서비스는 현재 베타(시험 운영) 단계로 무료로 제공됩니다.</li>
            <li>운영자는 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 중대한 변경(유료 전환, 주요 기능 종료 등)의 경우 최소 30일 전에 공지합니다.</li>
            <li>정기 점검, 장애 대응 등 운영상 필요한 경우 서비스 제공이 일시 중단될 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제6조 (이용자의 의무와 고객 데이터에 대한 책임)">
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>이용자는 서비스에 입력하는 고객 데이터의 정확성과 적법성에 대한 책임을 부담합니다.</li>
            <li><strong className="text-ink">이용자는 보호자의 개인정보(이름, 연락처 등)를 서비스에 입력하기 전에, 관련 법령(개인정보 보호법 등)에 따라 해당 정보주체로부터 필요한 동의를 얻는 등 적법한 처리 근거를 확보해야 합니다.</strong> 이 의무 위반으로 발생하는 문제에 대한 책임은 이용자에게 있습니다.</li>
            <li>이용자는 다음 행위를 해서는 안 됩니다.
              <ul className="mt-1 list-disc pl-5 flex flex-col gap-0.5">
                <li>타인의 정보를 도용하거나 허위 정보를 입력하는 행위</li>
                <li>서비스의 정상적인 운영을 방해하는 행위 (비정상적 접근, 취약점 악용 등)</li>
                <li>서비스를 본래 목적(미용샵 운영 관리) 외 용도로 무단 사용하는 행위</li>
              </ul>
            </li>
            <li>운영자는 이용자가 본 조를 위반한 경우 서비스 이용을 제한하거나 계정을 정지할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제7조 (데이터의 보관과 백업)">
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>운영자는 이용자의 데이터를 안전하게 보관하기 위해 합리적인 노력을 기울입니다.</li>
            <li>다만 베타 단계의 특성상 데이터의 무손실을 보증하지 않으며, 이용자는 중요한 기록(매출 내역 등)을 CSV 내보내기 등으로 별도 보관할 것을 권장합니다.</li>
          </ol>
        </Section>

        <Section title="제8조 (책임의 제한)">
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>운영자는 천재지변, 통신 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
            <li>서비스는 베타 단계로 &ldquo;있는 그대로&rdquo; 제공되며, 운영자는 고의 또는 중대한 과실이 없는 한 서비스 이용으로 발생한 간접적·부수적 손해에 대해 책임을 지지 않습니다.</li>
            <li>이용자와 보호자(이용자의 고객) 간에 발생한 분쟁에 대하여 운영자는 개입하지 않으며 책임을 지지 않습니다.</li>
          </ol>
        </Section>

        <Section title="제9조 (탈퇴 및 데이터 삭제)">
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>이용자는 언제든지 운영자에게 요청하여 탈퇴할 수 있습니다.</li>
            <li>탈퇴 시 계정 및 고객 데이터는 개인정보처리방침에서 정한 절차에 따라 삭제됩니다.</li>
          </ol>
        </Section>

        <Section title="제10조 (준거법 및 관할)">
          <p>이 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련하여 분쟁이 발생한 경우 민사소송법에 따른 관할 법원에 제소합니다.</p>
        </Section>

        <Section title="부칙">
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>이 약관은 2026년 6월 15일부터 적용됩니다.</li>
            <li>문의: <a href="mailto:contact.baldojang@gmail.com" className="text-primary hover:underline">contact.baldojang@gmail.com</a> (운영자: 백종혁)</li>
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
