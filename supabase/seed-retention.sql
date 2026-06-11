-- 재방문 추천 검증용 시드
-- 실행 전: 샵, 펫, 시술이 등록되어 있어야 함
-- 기존 펫의 마지막 visit을 다양한 시점으로 설정

DO $$
DECLARE
  v_shop_id uuid;
  v_pet_ids uuid[];
  v_svc_id uuid;
BEGIN
  SELECT id INTO v_shop_id FROM shops LIMIT 1;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION '샵이 없습니다.'; END IF;

  SELECT array_agg(id) INTO v_pet_ids
  FROM (SELECT id FROM pets WHERE shop_id = v_shop_id AND is_active = true LIMIT 4) sub;
  IF v_pet_ids IS NULL OR array_length(v_pet_ids, 1) < 3 THEN
    RAISE EXCEPTION '펫이 3마리 이상 필요합니다.';
  END IF;

  SELECT id INTO v_svc_id FROM services WHERE shop_id = v_shop_id AND is_active = true LIMIT 1;
  IF v_svc_id IS NULL THEN RAISE EXCEPTION '시술이 없습니다.'; END IF;

  -- 3주 전 방문 (기본 5주 주기 → 다가옴 상태: 남은 2주 < 7일이 아니므로 아직 안 뜸)
  -- 4주 전 방문 (→ 다가옴: 남은 1주)
  INSERT INTO visits (shop_id, pet_id, service_id, visited_at, price_final)
  VALUES (v_shop_id, v_pet_ids[1], v_svc_id, now() - interval '4 weeks', 50000);

  -- 6주 전 방문 (→ 권장: 1주 초과)
  INSERT INTO visits (shop_id, pet_id, service_id, visited_at, price_final)
  VALUES (v_shop_id, v_pet_ids[2], v_svc_id, now() - interval '6 weeks', 50000);

  -- 9주 전 방문 (→ 지남: 4주 초과)
  INSERT INTO visits (shop_id, pet_id, service_id, visited_at, price_final)
  VALUES (v_shop_id, v_pet_ids[3], v_svc_id, now() - interval '9 weeks', 50000);

  -- 4번째 펫이 있으면: 3주 전 + 미래 예약 있음 (리스트 제외 대상)
  IF array_length(v_pet_ids, 1) >= 4 THEN
    INSERT INTO visits (shop_id, pet_id, service_id, visited_at, price_final)
    VALUES (v_shop_id, v_pet_ids[4], v_svc_id, now() - interval '6 weeks', 50000);
    INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
    VALUES (v_shop_id, v_pet_ids[4], v_svc_id, now() + interval '3 days', now() + interval '3 days 1 hour', 'confirmed');
  END IF;

  RAISE NOTICE '재방문 시드 완료: 펫 %', array_length(v_pet_ids, 1);
END $$;
