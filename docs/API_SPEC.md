# API Specification

Base URL: `{FRONTEND-configured VITE_API_URL}` — locally, `http://localhost:4000/api/v1`.

All routes except `/auth/*` and `/health` require `Authorization: Bearer <accessToken>`.
Routes marked **Faculty/Admin** or **Student** are additionally role-gated —
a mismatched role gets a 403.

## Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create an account (email, password, name, role) |
| POST | `/login` | — | Email/password login, returns access token + sets refresh cookie |
| POST | `/logout` | — | Clears the refresh token cookie |
| POST | `/refresh` | — | Exchanges a refresh token (cookie or body) for a new access token |
| GET | `/google?role=STUDENT\|FACULTY` | — | Starts Google OAuth flow |
| GET | `/google/callback` | — | OAuth callback; redirects to the frontend with tokens |
| GET | `/me` | ✓ | Returns the current authenticated user |

## Courses — `/courses`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Faculty | Create a course (auto-generates a join code) |
| GET | `/` | ✓ | List courses (faculty sees owned, students see enrolled) |
| GET | `/:id` | ✓ | Get a single course |
| GET | `/:id/detail` | ✓ | Course + announcements + exams + role-specific data (roster or grades) |
| GET | `/:id/roster` | Faculty | List enrolled students |
| GET | `/:id/performance` | Faculty | Per-student performance summary |
| DELETE | `/:id/students/:studentId` | Faculty | Unenroll a student |
| POST | `/:id/announcements` | Faculty | Post an announcement |
| GET | `/:id/announcements` | ✓ | List announcements |
| DELETE | `/:id/announcements/:announcementId` | Faculty | Delete an announcement |
| POST | `/enroll` | Student | Join a course by its code |
| POST | `/:id/enroll` | Student | Join a course by ID |
| POST | `/drop` | Student | Drop an enrolled course |

## Questions — `/questions`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Faculty | Create a question (any of the 8 supported types) |
| POST | `/ai-generate` | Faculty | Generate questions on a topic via Gemini |
| POST | `/import` | Faculty | Bulk-import questions |
| GET | `/` | ✓ | List questions for a course |
| GET | `/:id` | ✓ | Get a single question |
| PUT | `/:id` | Faculty | Update a question |
| DELETE | `/:id` | Faculty | Soft-delete a question |

## Exams — `/exams`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Faculty | Create an exam (with optional rules: shuffle, negative marking, pass threshold, etc.) |
| GET | `/` | ✓ | List exams for a course |
| GET | `/:id` | ✓ | Get a single exam |
| PUT | `/:id` | Faculty | Update an exam (blocked once it has started and is published) |
| DELETE | `/:id` | Faculty | Soft-delete an exam |
| POST | `/:id/publish` | Faculty | Publish an exam (visible to students) |
| POST | `/:id/questions` | Faculty | Attach questions to an exam |
| DELETE | `/:id/questions/:questionId` | Faculty | Remove a question from an exam |

## Exam sessions — `/exam-sessions`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Student | Start an exam session |
| GET | `/:id` | ✓ | Get session state |
| POST | `/:id/answers` | Student | Save answers (autosave, called repeatedly) |
| POST | `/:id/webcam-capture` | Student | Record a webcam snapshot event |
| POST | `/:id/suspicious-event` | Student | Log a proctoring violation (face/tab/window/etc.) |
| POST | `/:id/terminate` | Student | End a session early (e.g. left without submitting) |
| POST | `/:id/submit` | Student | Submit the exam; triggers auto-grading |

## Proctoring — `/proctor`

All routes require Faculty/Admin.

| Method | Path | Description |
|---|---|---|
| GET | `/active-sessions` | All currently active exam sessions across every exam |
| GET | `/exam/:examId/sessions` | All sessions for one exam |
| GET | `/session/:sessionId` | Full detail on one session, including its violation log |
| POST | `/session/:sessionId/invalidate` | Flag a session as invalidated (suspected cheating) |

## Results & grading — `/results`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/my-results` | Student | The student's own completed exam results |
| GET | `/:sessionId` | ✓ | A single result (student sees own, faculty sees any in their course) |
| GET | `/faculty/pending` | Faculty | Sessions still awaiting manual grading |
| GET | `/faculty/exam/:examId/sessions` | Faculty | All sessions for an exam, for grading |
| GET | `/faculty/exam/:examId/analytics` | Faculty | Class-wide analytics (pass rate, score distribution, etc.) |
| POST | `/faculty/session/:sessionId/grade` | Faculty | Submit manual scores for essay/code answers |
| PATCH | `/faculty/session/:sessionId/publish` | Faculty | Toggle result visibility for one student |
| PATCH | `/faculty/exam/:examId/publish-all` | Faculty | Publish all results for an exam at once |

## Notifications — `/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | ✓ | List the current user's notifications |
| POST | `/read-all` | ✓ | Mark all as read |
