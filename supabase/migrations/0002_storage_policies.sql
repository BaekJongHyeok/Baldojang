-- pet-photos
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
  ) with check (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  );

create policy "pet_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  );

-- visit-photos (동일 규칙)
create policy "visit_photos_select" on storage.objects
  for select using (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  );

create policy "visit_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  );

create policy "visit_photos_update" on storage.objects
  for update using (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  ) with check (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  );

create policy "visit_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = (select shop_id::text from staff where id = auth.uid())
  );
