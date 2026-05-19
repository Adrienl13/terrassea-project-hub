-- Close the chatbot cross-user leak.
--
-- The old policy on chatbot_conversations was :
--   USING ((user_id = auth.uid()) OR (user_id IS NULL))
-- and the messages policy mirrored it through the conversation join.
-- The `OR (user_id IS NULL)` branch made every signed-in user able to
-- read every anonymous conversation ever recorded (3 conversations
-- and 6 messages at the time of the audit).
--
-- Real callers : the `chatbot` edge function uses service_role and
-- bypasses RLS, so it never relied on the OR-NULL branch. Admin stats
-- queries pass through the separate `is_admin()` policy. No client
-- code reads these tables directly. Strict scoping is safe.

DROP POLICY IF EXISTS "Users manage own chatbot convs" ON public.chatbot_conversations;
CREATE POLICY "Users manage own chatbot convs"
ON public.chatbot_conversations
FOR ALL
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Messages via conversation" ON public.chatbot_messages;
CREATE POLICY "Messages via conversation"
ON public.chatbot_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.chatbot_conversations c
    WHERE c.id = chatbot_messages.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chatbot_conversations c
    WHERE c.id = chatbot_messages.conversation_id
      AND c.user_id = (SELECT auth.uid())
  )
);
