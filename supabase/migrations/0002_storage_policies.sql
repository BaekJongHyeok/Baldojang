-- ============================================================
-- Storage 정책 — pet-photos 버킷
-- Supabase 대시보드에서 실행 (버킷은 미리 생성해둘 것)
-- ============================================================

-- 로그인한 유저는 자기 샵의 폴더에만 업로드/조회/삭제 가능
-- 경로 규칙: {shop_id}/{pet_id}.{ext}

create policy "pet_photos_select" on storage.objects
  for select using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  );

create policy "pet_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  );

create policy "pet_photos_update" on storage.objects
  for update using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  );

create policy "pet_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  );
