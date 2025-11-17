create policy "Users own their accounts" on user_accounts
    for select using (auth.uid() = id);

create policy "Users own their sessions" on user_sessions
    for select using (user_id = auth.uid());

create policy "Users own their applications" on applications
    for select using (user_id = auth.uid());

create policy "Users own their documents" on application_documents
    for select using (
        application_id in (select id from applications where user_id = auth.uid())
    );

create policy "Users own their NSFAS applications" on nsfas_applications
    for select using (user_id = auth.uid());

create policy "Users own their NSFAS documents" on nsfas_documents
    for select using (
        nsfas_application_id in (select id from nsfas_applications where user_id = auth.uid())
    );

-- RAG store: allow read-only (public data)
create policy "Allow read-only access to rag embeddings"
on rag_embeddings for select using (true);
