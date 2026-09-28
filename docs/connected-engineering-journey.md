# Connected Engineering Journey

This extension keeps the existing career goals, roadmaps, tasks, projects, skills and interview records as the source of truth. It does not create parallel workflow systems.

## Connected workflow

Career goal → time/equipment constraints → Today’s Mission → reviewed project implementation → testing → evidence → interview explanation → readiness → next action.

`/journey` derives its view from the same records used by the Dashboard, Roadmap, Projects, Assessments, Interview Prep and Portfolio modules. Completing a mission task updates the existing task record and roadmap journey. It never creates a second completion record or automatically verifies a skill.

## New entities

- `user_equipment`: private inventory with exact model, quantity, condition and category.
- `build_preferences`: budget, currency, time, knowledge, target role, difficulty and hardware/simulation preference.
- `project_templates` and `project_template_components`: shared reviewed catalog, revision, source and compatibility boundary.
- `evidence_submissions`: private project evidence with expected/actual results, contribution, debugging notes, limitations and a duplicate-resistant fingerprint.
- `evidence_reviews`: AI or authorized mentor review with rubric, feedback, limitations and an explicit code-executed flag.
- `evidence_skill_links`: scoped links from one submission to existing skills.
- `role_exploration_activities` and `role_exploration_attempts`: shared trials and private reflections.
- `plan_adjustments`: reversible before/after task snapshots and deadline-impact explanations.
- `mentor_authorizations`: explicit student-to-mentor authorization required before mentor review.
- `integration_connections`: future provider permissions and explicitly selected resources. It does not imply an integration is active.

## Verification and readiness policy

- Submitted evidence is not mastery.
- AI-reviewed evidence is not human certification and never implies code execution.
- A skill is shown as Verified only when an assessment exists and authorized mentor-reviewed evidence covers a stated scope.
- Readiness counts at most one reviewed record for each project, evidence type and linked-skill scope.
- AI-reviewed evidence has lower readiness weight than mentor-reviewed evidence.
- Duplicate fingerprints are rejected in the demo state and by a database uniqueness constraint.

## Safety and privacy

- Exact hardware connections are paused when a model or power detail affects safe guidance.
- Simulation evidence is labelled and does not claim physical testing.
- The `evidence-private` Storage bucket is private, owner-folder scoped, MIME-limited and capped at 15 MB per object.
- Mentor read/review access requires an active authorization relationship.
- GitHub links are student-selected text records. Repository import and code execution are not implemented.

## Setup

Run migrations in filename order, then run `supabase/seed.sql`. Migration `202609210004_connected_engineering_journey.sql` depends on the initial schema and its `set_updated_at()` trigger function.

Demo mode stores all connected workflow state in the existing browser-local application state. Live Supabase adapters currently cover profiles, roadmaps/tasks and interviews. Equipment, evidence, exploration and adjustment tables are ready for their route-by-route live repositories but should not be described as multi-device synced until those adapters are connected.

## Extension priorities

1. Connect equipment, evidence, exploration and adjustment repositories to Supabase.
2. Add minimum-scope GitHub OAuth and selection UI; treat imported repository text as untrusted data and never execute it on the application server.
3. Complete Realtime WebRTC audio streaming while preserving text fallback.
4. Add mentor review screens on top of `mentor_authorizations` and `evidence_reviews`.
5. Add supported circuit-simulator adapters and image-assisted troubleshooting with explicit capability and safety boundaries.
