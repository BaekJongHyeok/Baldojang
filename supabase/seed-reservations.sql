-- 예약 시드 데이터 (10건)
-- 실행 전: 등록된 pets, services, shops가 있어야 함
-- 실행 방법: Supabase 대시보드 SQL Editor에서 실행
-- 또는: psql로 직접 실행

-- 1) 먼저 변수 설정: 본인 샵의 첫 번째 pet_id들과 service_id들 가져오기
DO $$
DECLARE
  v_shop_id uuid;
  v_pet_ids uuid[];
  v_svc_ids uuid[];
  v_base_date date := date_trunc('week', current_date + interval '1 day')::date; -- 이번 주 월요일
  v_i int;
BEGIN
  -- 첫 번째 샵
  SELECT id INTO v_shop_id FROM shops LIMIT 1;
  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION '샵이 없습니다. 먼저 가입하세요.';
  END IF;

  -- 펫 목록 (최대 5마리)
  SELECT array_agg(id) INTO v_pet_ids
  FROM (SELECT id FROM pets WHERE shop_id = v_shop_id AND is_active = true LIMIT 5) sub;
  IF v_pet_ids IS NULL OR array_length(v_pet_ids, 1) = 0 THEN
    RAISE EXCEPTION '펫이 없습니다. 먼저 펫을 등록하세요.';
  END IF;

  -- 시술 목록 (최대 3개)
  SELECT array_agg(id) INTO v_svc_ids
  FROM (SELECT id FROM services WHERE shop_id = v_shop_id AND is_active = true ORDER BY sort_order LIMIT 3) sub;
  IF v_svc_ids IS NULL OR array_length(v_svc_ids, 1) = 0 THEN
    RAISE EXCEPTION '시술이 없습니다. 먼저 시술을 등록하세요.';
  END IF;

  -- 예약 10건 삽입
  -- 1: 월 10:00-11:00 확정
  INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
  VALUES (v_shop_id, v_pet_ids[1], v_svc_ids[1],
    (v_base_date + interval '10 hours') AT TIME ZONE 'Asia/Seoul',
    (v_base_date + interval '11 hours') AT TIME ZONE 'Asia/Seoul',
    'confirmed');

  -- 2: 월 14:00-15:30 확정
  INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
  VALUES (v_shop_id, v_pet_ids[1 + (array_length(v_pet_ids,1)-1) % (array_length(v_pet_ids,1))], v_svc_ids[1 + (array_length(v_svc_ids,1)-1) % (array_length(v_svc_ids,1))],
    (v_base_date + interval '14 hours') AT TIME ZONE 'Asia/Seoul',
    (v_base_date + interval '15 hours 30 minutes') AT TIME ZONE 'Asia/Seoul',
    'confirmed');

  -- 3: 화 10:30-11:30 완료
  INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
  VALUES (v_shop_id, v_pet_ids[1], v_svc_ids[1],
    (v_base_date + interval '1 day 10 hours 30 minutes') AT TIME ZONE 'Asia/Seoul',
    (v_base_date + interval '1 day 11 hours 30 minutes') AT TIME ZONE 'Asia/Seoul',
    'completed');

  -- 4: 화 15:00-16:00 확정
  INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
  VALUES (v_shop_id, v_pet_ids[1 + (1 % array_length(v_pet_ids,1))], v_svc_ids[1],
    (v_base_date + interval '1 day 15 hours') AT TIME ZONE 'Asia/Seoul',
    (v_base_date + interval '1 day 16 hours') AT TIME ZONE 'Asia/Seoul',
    'confirmed');

  -- 5: 수 11:00-12:30 확정
  INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
  VALUES (v_shop_id, v_pet_ids[1], v_svc_ids[1 + (1 % array_length(v_svc_ids,1))],
    (v_base_date + interval '2 days 11 hours') AT TIME ZONE 'Asia/Seoul',
    (v_base_date + interval '2 days 12 hours 30 minutes') AT TIME ZONE 'Asia/Seoul',
    'confirmed');

  -- 6: 수 16:00-17:00 노쇼
  INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
  VALUES (v_shop_id, v_pet_ids[1 + (2 % array_length(v_pet_ids,1))], v_svc_ids[1],
    (v_base_date + interval '2 days 16 hours') AT TIME ZONE 'Asia/Seoul',
    (v_base_date + interval '2 days 17 hours') AT TIME ZONE 'Asia/Seoul',
    'no_show');

  -- 7: 목 10:00-11:00 확정
  INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
  VALUES (v_shop_id, v_pet_ids[1], v_svc_ids[1],
    (v_base_date + interval '3 days 10 hours') AT TIME ZONE 'Asia/Seoul',
    (v_base_date + interval '3 days 11 hours') AT TIME ZONE 'Asia/Seoul',
    'confirmed');

  -- 8: 목 13:00-14:30 완료
  INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
  VALUES (v_shop_id, v_pet_ids[1 + (1 % array_length(v_pet_ids,1))], v_svc_ids[1 + (1 % array_length(v_svc_ids,1))],
    (v_base_date + interval '3 days 13 hours') AT TIME ZONE 'Asia/Seoul',
    (v_base_date + interval '3 days 14 hours 30 minutes') AT TIME ZONE 'Asia/Seoul',
    'completed');

  -- 9: 금 11:00-12:00 취소
  INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
  VALUES (v_shop_id, v_pet_ids[1], v_svc_ids[1],
    (v_base_date + interval '4 days 11 hours') AT TIME ZONE 'Asia/Seoul',
    (v_base_date + interval '4 days 12 hours') AT TIME ZONE 'Asia/Seoul',
    'cancelled');

  -- 10: 금 14:00-15:00 확정
  INSERT INTO reservations (shop_id, pet_id, service_id, starts_at, ends_at, status)
  VALUES (v_shop_id, v_pet_ids[1 + (3 % array_length(v_pet_ids,1))], v_svc_ids[1 + (2 % array_length(v_svc_ids,1))],
    (v_base_date + interval '4 days 14 hours') AT TIME ZONE 'Asia/Seoul',
    (v_base_date + interval '4 days 15 hours') AT TIME ZONE 'Asia/Seoul',
    'confirmed');

  RAISE NOTICE '예약 10건 생성 완료 (% ~ %)', v_base_date, v_base_date + 4;
END $$;
