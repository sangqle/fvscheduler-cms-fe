# framevis-admin

CMS quản trị nền tảng Framevis (platform admin): workspace, subscription, đơn hàng, catalog gói.
Một tài khoản allowlist, đăng nhập bằng auth ERP thường. Backend đã có sẵn: `/api/admin/**`.

**Mục tiêu của repo này: vibe nhanh nhưng giữ thống nhất.** Đọc file này + `docs/specs/` là đủ
context; không có changelog, feature-docs hay plan-doc.

## Tech Stack (giống framevis-erp)

- Next.js 16 App Router, `--webpack` (không Turbopack), React 19, TypeScript strict
- Tailwind v4 + tokens ở `src/styles/tokens/` (copy 1:1 từ ERP), primitives shadcn-style ở `src/components/ui/`
- TanStack Query v5, React Hook Form + Zod, NextAuth v5 (JWT, Credentials + google-backend)
- Node 20, port **3002**

```bash
npm install
npm run dev          # http://localhost:3002
npm run build        # next build --webpack
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src   (npm run lint:ds = eslint + stylelint)
```

## Cấu trúc

```
src/app/(auth)/login, auth/callback/google   # đăng nhập (cùng flow ERP)
src/app/(admin)/layout.tsx                    # gate: session + probe allowlist → /forbidden
src/app/(admin)/workspaces, [workspaceId]     # CMS-01..04
src/app/(admin)/orders                        # CMS-05/06 (?code= mở drawer, ?workspaceId= lọc)
src/app/(admin)/plans, [planCode]             # CMS-07 (?tab=plans|items|vocabulary)
src/app/(admin)/mail, templates/[code], campaigns/[campaignCode]  # CMS-10..14 (?tab=templates|campaigns|messages)
src/app/forbidden                             # 403 allowlist
src/components/ui/                            # primitives (KHÔNG style tại feature)
src/components/admin/{layout,shared,workspaces,orders,plans,mail}/
src/hooks/useAdmin*.ts                        # TanStack hooks, query key ở đầu mỗi file
src/hooks/useUrlState.ts                      # filter/phân trang sống trên URL
src/lib/api/http.ts                           # apiFetch duy nhất (envelope, ApiError, 401/429 events)
src/lib/auth.ts                               # NextAuth
src/lib/admin/labels.ts                       # enum → nhãn + Badge variant (một chỗ duy nhất)
src/types/admin.ts                            # DTO của /api/admin/** (không duplicate ở nơi khác)
docs/specs/                                   # spec ngắn mỗi module: màn hình + endpoint + rule
```

## Luật (rút gọn từ ERP, bắt buộc)

1. **Component-first.** Tìm primitive ở `src/components/ui/` trước (`ls src/components/ui/`).
   Feature chỉ compose. Kích thước/màu đi bằng `size`/`variant`, **không** truyền `h-*`, `px-*`,
   `rounded-*`, `text-[13px]`, `bg-*`/`text-*` màu vào primitive. `className` chỉ để layout
   (`w-full`, `flex-1`, `gap-2`, `mt-4`). Thiếu primitive → thêm/mở rộng primitive, không style tại chỗ.
2. **Không hardcode màu.** Không hex/rgb/hsl, không `bg-blue-500`. Chỉ token class: `bg-primary`,
   `text-muted-foreground`, `border-border`, `bg-success-soft`, `text-destructive-deep`… ESLint +
   stylelint chặn. Ngoại lệ duy nhất: chữ G của Google trong `GoogleAuthButton`.
3. **Tiếng Việt, một ngôn ngữ.** Wording viết thẳng trong component, không i18n. Cấm em dash "—"
   trong câu (dùng dấu phẩy, hai chấm, `·`); "—" chỉ làm placeholder ô trống trong bảng.
   Enum backend (`ACTIVE`, `SEPAY`, `PENDING`) giữ nguyên chữ hoa mono, không dịch.
4. **HTTP** chỉ qua `apiFetch<T>()`; header `Authorization` lấy từ `useAuthHeaders()`.
   **Types** chỉ import từ `src/types/`. Server state = TanStack Query; không Zustand (chưa cần).
5. **Mọi màn phải có 4 trạng thái**: loading (`Skeleton`/DataTable `isLoading`), empty
   (`EmptyState`), error (`ErrorState`/`NotFoundState` ở `components/admin/shared/QueryState`),
   pending khi ghi (nút disabled + `Spinner`). Lỗi ghi: giữ nguyên `message` backend
   (`apiErrorMessage`), 409 hiện trong dialog, 429 đã có toast chung.
6. **Mobile-first nhưng ưu tiên desktop 1440.** Base = phone, `md:`/`lg:` scale lên. Sidebar
   hiện ở `lg+`, dưới đó dùng menu trong Topbar. Bảng rộng: `min-w-[Nvw]` cho cột co giãn.
7. **Thiết kế claude.ai/design là tham chiếu, không copy className.** Dịch hex → token,
   px → `size`, `<div class="rounded-xl border">` → `<Card>`, `<button>` → `<Button>`.

## Domain nhanh (chi tiết ở docs/specs)

- Trạng thái gói **suy theo đồng hồ lúc đọc**: `NONE · TRIALING · ACTIVE · PAST_DUE · EXPIRED`.
  Lịch sử có thêm `status` lưu DB (`CANCELED`) vs `effectiveStatus`.
- Nguồn: `TRIAL · SEPAY · MANUAL · LEGACY`. Cấp tay chỉ `MANUAL/LEGACY/TRIAL` (SEPAY bị 400).
- Thao tác ghi trên workspace: **grant** (POST subscriptions, thay dòng live), **extend** (PATCH
  subscription), **cancel** (POST subscription/cancel), **mark-paid** (POST orders/{code}/mark-paid,
  nhận PENDING + EXPIRED, từ chối 409 nếu gói ngừng bán). Mọi thao tác ghi cần `note` 3..400 ký tự.
- Catalog ghi được: gói (tạo / sửa / bật tắt bán / xóa), thành phần gói (PUT composition thay TOÀN
  BỘ nhóm + ghi đè item + limits), và item (tạo / sửa / bật tắt / xóa). Chi tiết ở `docs/specs/plans.md`.
- Không có: CRUD nhóm item, thêm feature key / limit key mới, sửa override, audit log riêng, phân
  quyền theo role (chỉ allowlist).
- Mọi id là id mờ (`wk…`, `mb…`, `ac…`); dòng subscription không có id; đơn hàng theo `orderCode`.
- Mail: template lưu ở DB với version bất biến (mỗi lần lưu là version mới, 409 khi hai người cùng
  lưu); xem trước chỉ render bản đã lưu; chiến dịch ghim version lúc tạo và gửi tới chủ workspace
  hoặc tài khoản; message không có id; 422 trả danh sách lỗi trong `data`. Chi tiết ở
  `docs/specs/mail.md`.

## Workflow

- Việc nhỏ/vừa: làm thẳng, chạy `npm run typecheck && npm run lint` trước khi xong.
- Việc đổi hành vi/thêm màn: đọc `docs/specs/<module>.md` → sửa code → **cập nhật spec đó**
  (skill `spec`). Không cần plan, không changelog.
- UI: skill `ui-ux-promax` (tra primitive + token). Mockup mới: đọc từ claude.ai/design project
  `3edcc4b1-dd62-4c86-a0a9-ca6cc4417936` (file `CMS Platform Admin.dc.html`) qua DesignSync.
- Backend doc gốc: `../fvscheduler/docs/vi/admin/` (feature-contract, flows ADM-FLOW-01..07,
  business-rules). DTO: `../fvscheduler/src/main/java/framevis/booking/fvscheduler/admin/dto/`.

## Auth

Cùng pattern ERP: `POST /auth/login` (hoặc Google code → `POST /auth/google/callback`) → cặp
token backend nằm trong NextAuth JWT, tự refresh qua `POST /auth/refresh`. Token trơn (không
claim workspace) là đủ cho `/api/admin/**`. `(admin)/layout.tsx` probe `GET /api/admin/plans`
server-side: 403 → `/forbidden`, 401 → `/login?reason=session-expired`.
