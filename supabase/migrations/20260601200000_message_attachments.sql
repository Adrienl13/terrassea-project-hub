-- ============================================================
-- Messaging — attachments (negotiation: photos / PDFs)
-- Date : 2026-06-01
--
-- Adds messages.attachments (jsonb array of {path,name,type}) and a
-- PRIVATE storage bucket. Access is via signed URLs; RLS restricts
-- upload/read to participants of the conversation (the conversation_id
-- is the first path segment).
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments', 'message-attachments', false, 26214400,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "msg_attach_participant_insert" ON storage.objects;
CREATE POLICY "msg_attach_participant_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "msg_attach_participant_select" ON storage.objects;
CREATE POLICY "msg_attach_participant_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = (SELECT auth.uid())
    )
  );
