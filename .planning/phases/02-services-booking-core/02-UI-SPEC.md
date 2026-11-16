# UI Design Contract — Phase 2: Services & Booking Core

**Phase:** 2 of 4  
**Phase Name:** Services & Booking Core  
**Padded Phase:** 02  
**Date:** 2026-11-16  

## Design System Foundation (inherited from Phase 1 UI-SPEC)

- **Palette:** 60% warm cream `#FAF7F4` background, 30% white cards + sand `#F1E8E3` surfaces, 10% deep rose `#A63D62` accent for CTAs/links/app-bar/focus rings only. Warm ink `#2B2226`, destructive `#B3261E`, 5-status chip palette (color+icon+text).
- **Typography:** Exactly 4 roles — Display 28px/Heading 20px (Playfair Display 600, serif elegance), Body 16px/Label 14px (Roboto 400+500, line-heights 1.5/1.4). No Vuetify default h1–h6 desktop sizes, nothing below 14px.
- **Key conventions:** 4px spacing scale (4→64) + safe-area/48px-touch-target exceptions; Vuetify 4 core only (no Labs, `v-data-table` banned at 360px); pt-PT copy contract (CTA "Entrar"/"Criar conta", one-screen register with no role field, rejection reason canhoto); Capacitor-ready shell from day 1 (`viewport-fit=cover`, `env(safe-area-inset-*)`, hardware-back closes overlays first).

## Phase 2–Specific UI Surfaces

### 1. Service Catalog Screen (Client)

- **Layout:** Vertical scroll, 360px width mobile-first.
- **Header:** App bar with title "Serviços" + cartão "Filtro" (optional: price range slider, duration filter).
- **Grid:** Services displayed in a responsive grid (2 columns on 360px, 3 on 600px, 4 on 768px). Each service card:
  - Service photo (aspect-ratio 4:3, placeholder icon if no photo).
  - Service name — **Display 28px** (Playfair Display 600, serif, color `#2B2226`).
  - Price — format `R$ 25,00` (pt-PT format, right-aligned, Body 14px, color `#5E5E5E`).
  - Duration — `"45min"` (Body 14px, color `#888`).
  - "Adicionar à agenda" button — primary filled, full width.
- **Empty state:** "Nenhum serviço disponível — admin pode adicionar serviços na área administrativa."
- **Vuetify components:** `VCard`, `VRow`, `VCol`, `VBtn`, `VImg` (core only). No `VDataTable` at 360px.

### 2. Booking Flow Screens

#### A. Service Selection (step 1 of 3)
- Full-width dropdown of services (populated from `GET /api/services`).
- First service pre-selected if only one exists.
- Below: "Serviço selecionado: Corte — R$ 25,00 — 45min".

#### B. Date Selection (step 2 of 3)
- `VDatePicker` with `locale: 'pt'`, `v-model` bound to `selectedDate`.
- Min date = today, max date = today + 30 days.
- Above the picker: "Escolha a data do atendimento".
- Inline text: "Horários disponíveis serão mostrados conforme a duração do serviço."

#### C. Slot Picker (step 3 of 3) — **Core UX**
- Generated server-side via `GET /api/services/7/availability?date=2026-12-02`.
- Grid of slot buttons, 15-min steps, `HH:mm` format.
- **Slot states:**
  - **Free** — button enabled, background `var(--v-theme-on-surface)`, text color `var(--v-theme-primary)`.
  - **Booked (pending/confirmed)** — button disabled, background `var(--v-theme-surface)`, text color disabled, opacity 0.4.
  - **Selected** — background `var(--v-theme-primary)`, text color `var(--v-theme-on-primary)`, show checkmark icon.
- Below grid: text counter `"X de Y slots selecionados"` (max 1 slot selection for v1).
- **Navigational:** "Voltar" button (returns to service selection), "Marcar" button (primary, disabled if no slot selected).
- **Error state:** If API returns error or no slots for the date, show alert: "Nenhorário disponível nesta data — escolha outra data ou entre em contato com o salão."

### 3. Minhas Marcações Screen (Client)

- List of client's appointments, ordered by `starts_at` descending.
- Each row (card):
  - Date: `DD [de] MMMM` (dayjs format, e.g., "2 de dezembro de 2026"), Body 14px.
  - Time: `HH:mm - HH:mm`, Body 14px.
  - Service name — Display 28px (Playfair Display 600).
  - Status chip:
    - `pendente` — outline chip, color `#A63D62`, text "Aguardando".
    - `confirmada` — filled chip, color `#2Ecc71`, text "Confirmada".
    - `rejeitada` — outline chip, color `#B3261E`, text "Rejeitada".
    - `cancelada` — outline chip, color `#95a5a6`, text "Cancelada".
    - `concluída` — filled chip, color `#9B59B6`, text "Concluída".
  - Action (visible only for `pendente`/ `confirmada`):
    - **Cancel** button (red outline, small) — removes appointment, status → `cancelada`.
    - **Reschedule** (v2, deferred) — not in v1 scope.
- **Empty state:** "Nenhuma marcação encontrada — marque um serviço acima."
- **Pull-to-refresh** behavior: hydrates token-status on app open.

### 4. Admin Appointments Inbox (ADM-01)

- Today's appointments list (default date = today).
- Each row (card):
  - Client phone — Body 14px, right-aligned.
  - Service name + duration — Display 28px + Body 14px.
  - Date + time — Body 14px, centered.
  - Status chip:
    - `pendente` — outline chip, color `#A63D62`, text "Aguardar".
    - `confirmada` — filled chip, color `#2Ecc71`, text "Confirmada".
    - `rejeitada` — outline chip, color `#B3261E`, text "Rejeitada".
    - `cancelada`/`concluída` — gray, non-interactive.
  - Action buttons (visible only for `pendente`):
    - **Confirm** (filled green button) → PATCH `/api/admin/appointments/:id/status` with `{"status":"confirmada"}`.
    - **Reject** (outlined red button) → PATCH with `{"status":"rejeitada","rejectionReason":"..."}`.
    - Reason input: small textarea, max 20 characters, validated on submit.
- **Empty state:** "Nenhuma marcação pendente hoje — ótimo, o salão está livre!"
- **Vuetify components:** `VDataTable` **is allowed** for this screen only (complex columns, filtering, status chips), but mobile layout must avoid horizontal scrolling — use responsive breakpoints and `v-row/v-col`.

### 5. Admin Service Management (CRUD)

- **List page:** Table of services with columns: photo (24x24 thumbnail), name (Display 28px), price (R$ X,XX), duration (XXmin), active toggle.
- **Create/Edit modal:** Form with fields matching the service schema (name, description, price, durationMinutes, imagePath, active).
- **Photo upload:** Drag-and-drop or file browser → `multer` → `/uploads/` → DB `photo_path` → API returns `{url: apiBase}/uploads/filename.jpg`.
- **Empty states and loading skeletons** on all screens.

## Capacitor / Mobile Considerations

- **Safe-area:** All critical content outside `env(safe-area-inset-*)`. Bottom navigation bar height reserved: 56px (standard) or 48px (compact).
- **Hardware back button:** First press closes any open overlay/modal; second press exits the app (or navigates back in history). Global handler registered in `main.ts`.
- **Keyboard:** Input fields have `padding-bottom` adjustment via `v-if` Keyboard Avoider pattern, or use `nativescroll` plugin — avoid `position: fixed` for form footers.
- **Font scaling:** `text-size-adjust: 100%` in `index.html` — prevent iOS Safari auto-zoom.

## Accessibility (A11y)

- All buttons have accessible labels (`aria-label`).
- Color contrast: minimum 4.5:1 against background (verified via WCAG AA).
- Focus ring: `outline: 2px solid var(--v-theme-primary)` on focus.
- Form validation errors announced via live region (`<polite>`).
- Chip text has sufficient contrast (white on dark, dark on light).

## Revision Notes (non-blocking)

- If the design team later decides to add `VTimePicker` (Labs → core in v4.3+), it can replace the slot-grid grid for free-form time selection, but the grid is preferred for salon UX (visual availability).
- The rejection reason input (max 20 chars) may be expanded to 50 chars in v1.x based on admin feedback — flag as acceptable non-blocking change.

## Commit

Commit this UI-SPEC with: `gsd-sdk query commit "docs(02): UI design contract"` --files ".planning/phases/02-services-booking-core/02-UI-SPEC.md"