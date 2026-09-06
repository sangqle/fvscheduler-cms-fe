# Mail: template + chiến dịch gửi

Updated: 2026-09-06 · Thiết kế: CMS-10..14 · Backend: `../fvscheduler/docs/features/mail-module.md`

## Mục đích

Soạn và phát hành mail template lưu ở DB (mỗi lần lưu là một version bất biến), xem trước bản đã
lưu, gửi thử một địa chỉ, rồi tạo chiến dịch gửi hàng loạt tới chủ workspace hoặc tài khoản và
theo dõi tiến độ, nhật ký gửi (outbox).

**Không có**: trang tạo template riêng (tạo bằng dialog), xem trước bản nháp chưa lưu, tìm kiếm
tài khoản (chỉ có id dán tay hoặc suy từ workspace), xóa template (chỉ tắt `active`), rollback
version (restore = PUT lại nội dung cũ thành version mới), id/chi tiết/gửi lại từng message, hẹn
giờ gửi, trigger tự động (phase 2, nhóm ngữ cảnh `SUBSCRIPTION`).

## Màn hình

### `/mail?tab=templates|campaigns|messages`
`components/admin/mail/MailScreen.tsx` · ba tab trên `?tab=` giống `/plans?tab=`, `templates` mặc
định. Màn cha giữ **toàn bộ giá trị lọc trên URL** và truyền xuống bảng bằng `values`, đúng khuôn
`WorkspaceFilters` / `CatalogFilters`; hàng lọc là `components/admin/mail/MailFilters.tsx`, một
hàng `flex-wrap` duy nhất (ô tìm co giãn, dropdown `w-auto`, "Xóa bộ lọc" chỉ hiện khi đang lọc,
ghi chú đẩy sát phải). Sắp xếp template nằm trong slot `actions` của `PageHeader`
(`TemplateSortControl`), không nằm trong hàng lọc. Khóa URL tách theo tab: `q` / `category` /
`active` / `sort` cho template, `cStatus` cho chiến dịch, `mCode` / `mStatus` / `mEmail` / `mSort`
cho nhật ký, nên chuyển tab không làm mất bộ lọc của tab kia.

- **Tab Template** → `TemplateTable` (props `values`, `onCreate`, `onClearFilters`). Cột: mã + tên, `CategoryBadge`,
  `ContextChips` (`requiredContext`, ẩn `COMMON`), `VersionChip` (`v{currentVersion}`), `Switch`
  bật/tắt ghi thẳng `PATCH .../active`, **không hỏi lại**: tắt chỉ chặn tạo chiến dịch mới và bật
  lại là một cú bấm, dialog xác nhận để dành cho thao tác không lùi được. Nút "Tạo template" mở `TemplateFormDialog`; tạo xong
  chuyển thẳng sang `/mail/templates/{code}`. Bấm hàng mở trang chi tiết.
- **Tab Chiến dịch** → `CampaignTable` (props `values`, `onCreate`, `onClearFilters`). Lọc trạng
  thái chạy **tại client trên trang đang xem** vì endpoint không nhận bộ lọc nào. Nút "Tạo chiến dịch" mở
  `CreateCampaignDialog` (nhận `initialTemplateCode` khi mở từ trang template). Bấm hàng mở
  `/mail/campaigns/{campaignCode}`.
- **Tab Nhật ký gửi** → `MessageTable` (props `values`, `onClearFilters`, `campaignCode?`,
  `hideCampaignColumn?`); bảng chỉ giữ trang và cỡ trang. Lọc `email` là **khớp chính xác** cả địa
  chỉ, không phải tìm chuỗi con; `campaignCode` sai trả `404` nên hiện "Không có chiến dịch này"
  chứ không phải bảng rỗng.

### `/mail/templates/[code]`
`TemplateEditorScreen` (prop `code`) · **luôn chia đôi**, không có công tắc bố cục: ô soạn bên trái,
`TemplatePreview` dính bên phải (`lg:flex-row`, dưới `lg` hai khối xếp chồng). Bỏ hẳn
`?view=edit|split|preview`: hai chế độ kia chỉ là chia đôi bị che một nửa, nên hàng tab luôn sáng ô
giữa và tốn một dòng ngang mà không nói thêm gì. Từ `lg` cột phải cao đúng `calc(100dvh - 8rem)`
(topbar 57px + thanh công cụ 48px + đệm dưới 24px) và khung thư `flex-1` nuốt hết chỗ còn lại trong
thẻ, sàn `min-h-64`, `resize-none`; dưới `lg` khung chốt `44rem` và kéo cao được. Nội dung: form
metadata (tên, mô tả,
category, `ChipListEditor` cho `requiredContext` không gồm `COMMON`) + editor `subjectTemplate` /
`htmlBody` (`components/ui/CodeEditor.tsx`: đánh số dòng, tô cú pháp HTML + Pebble bằng token,
cuộn và tô lại dòng lỗi mà `422` chỉ ra) + `VariablePanel` (palette biến catalog lọc theo nhóm đã khai, cộng chip biến
tự do, click để chèn tại con trỏ) + `TemplatePreview` (luôn render **bản đã lưu**, có ghi chú khi
form đang dirty) + `VersionHistory` (nằm ngay trong màn, không phải drawer riêng, mới nhất trước) +
nút "Gửi thử" mở `TestSendDialog`, nút "Tạo chiến dịch từ template này" mở `CreateCampaignDialog`.
Nút lưu ghi `Lưu thành v{currentVersion + 1}`.
- Lỗi `422`: render từng dòng `validationProblems(error).map(explainProblem)`, không gộp một câu.
- Lỗi `409`: dialog "Có người vừa lưu, hiện là v{concurrentVersion(error)}", giữ nguyên nội dung
  đang gõ, không tự tải lại và ghi đè.
- **`active === false` chỉ gác đúng một việc: tạo chiến dịch.** Template đã tắt vẫn mở, vẫn sửa,
  vẫn xem trước và **vẫn gửi thử được** (`MailTemplateService.testSend` chỉ từ chối `PARTIAL`).
  Vì vậy hai vị từ tách hẳn: `isSendableTemplate` (bật + không partial) cho nút tạo chiến dịch,
  `isTestSendable` (không partial) cho nút gửi thử. Trộn hai điều kiện là khóa nhầm một nút mà
  backend không chặn. `Tooltip` giải thích đặt trên `span` bọc ngoài vì nút `disabled` không phát
  hover.

### `/mail/campaigns/[campaignCode]`
`CampaignDetailScreen` (prop `campaignCode`) · header tên chiến dịch, `templateCode` +
`templateVersion` ghim lúc tạo (không đổi dù template gốc được sửa sau), badge trạng thái · 5 số
đếm pending/sending/sent/failed/canceled (tổng luôn bằng `total`) · nút Hủy (chỉ PENDING bị hủy,
SENDING vẫn gửi tiếp; hủy chiến dịch DONE hợp lệ, trả `affected: 0`) và Gửi lại (FAILED → PENDING,
`attempts` về 0; chặn `409` nếu chiến dịch đã CANCELED) · `MessageTable campaignCode
hideCampaignColumn` bên dưới. Hủy chỉ bị chặn khi `status === 'CANCELED'`: hủy một chiến dịch
`DONE` là hợp lệ và trả `affected: 0`, nên nút không tắt theo `pending === 0`.

Trạng thái mọi màn: loading = `Skeleton` / `DataTable isLoading` · empty = `EmptyState` · error =
`ErrorState` · 404 = `NotFoundState` · pending khi ghi = nút disabled + `Spinner`.

## Hooks ↔ API

| Hook (`src/hooks/useAdminMail.ts`) | Method · path | Query key (`mailKeys`) | Invalidate sau ghi |
|---|---|---|---|
| `useMailTemplates(params, { enabled })` | `GET /api/admin/mail/templates` | `templates(params)` | — |
| `useMailTemplate(code)` | `GET .../templates/{code}` | `template(code)` | — |
| `useMailTemplateVersions(code)` | `GET .../templates/{code}/versions` | `versions(code)` | — |
| `useMailVariables()` | `GET /api/admin/mail/variables` | `variables` (staleTime 30 phút) | — |
| `useCreateMailTemplate()` | `POST /api/admin/mail/templates` | — | `templates` + detail + versions template mới |
| `useUpdateMailTemplate()` | `PUT .../templates/{code}` | — | `templates` + detail + versions |
| `useSetMailTemplateActive()` | `PATCH .../templates/{code}/active` | — | `templates` + detail + versions |
| `useMailPreview(code)` | `POST .../templates/{code}/preview` | mutation, không cache | — |
| `useMailTestSend(code)` | `POST .../templates/{code}/test-send` | mutation | — |
| `useMailCampaigns(page, size)` | `GET /api/admin/mail/campaigns` | `campaigns(page, size)` | — |
| `useMailCampaign(campaignCode)` | `GET .../campaigns/{campaignCode}` | `campaign(campaignCode)` (refetch 5s khi `isCampaignLive`) | — |
| `useCreateMailCampaign()` | `POST /api/admin/mail/campaigns` | — | `campaigns` + `messages` (bỏ qua khi `dryRun`) |
| `useCampaignAction(campaignCode)` | `POST .../{campaignCode}/cancel` \| `/retry-failed` | — | campaign detail + `campaigns` + `messages` |
| `useMailMessages(params)` | `GET /api/admin/mail/messages` | `messages(params)` | — |

## Rule FE phải giữ

Rút gọn từ "Client-side contract 1 / 2" trong `mail-fe-integration.md`:

- **Editor**: `code` là slug bất biến sau khi tạo, ô mã ở form sửa/tạo chỉ nhập lúc tạo. Mọi biến
  dùng trong template phải nằm trong `requiredContext + COMMON` ∪ `customVariables`, palette chỉ
  gợi ý đúng tập này. `subjectTemplate` bắt buộc trừ khi category `PARTIAL`. Mỗi lần `PUT` luôn
  sinh version mới, không có draft và không có save chỉ đổi metadata. `active` tách riêng khỏi nội
  dung, đổi bằng `PATCH .../active`, không đi qua `PUT`.
- **Chiến dịch**: chỉ chọn template `active` và không `PARTIAL` (409 nếu vi phạm). Đúng một trong
  `workspaceIds` / `accountIds`, không rỗng (400 nếu khác). Template khai `requiredContext` chứa
  `WORKSPACE` thì khóa lựa chọn theo tài khoản trên UI. `variables` gửi đúng và đủ tập
  `template.customVariables`, không thừa không thiếu (422 nếu sai). `dryRun: true` chỉ đếm, response
  không có khóa `campaignCode`; `queued === 0` không phải lỗi, chiến dịch vẫn tạo DONE với
  `total: 0`. Poll chi tiết mỗi 5 giây khi còn `pending + sending > 0`, dừng khi hết.

## Types

`src/types/admin.ts`: `AdminMailTemplateRow`, `AdminMailTemplate`, `AdminMailTemplateVersion`,
`MailTemplateInput`, `AdminMailVariable`, `AdminMailVariableGroup`, `MailContextInput`,
`MailPreviewResult`, `MailTestSendInput`, `MailTestSendResult`, `AdminMailCampaignRow`,
`AdminMailCampaignDetail`, `CreateCampaignInput`, `CreateCampaignResult`, `CampaignActionResult`,
`AdminMailMessageRow`, `AdminMailTemplateListParams`, `AdminMailMessageListParams`, `MailCategory`,
`MailContextGroup`, `MailCampaignStatus`, `MailMessageStatus`.

Primitive mới thêm cho module này: `src/components/ui/CodeEditor.tsx` (`CodeEditor` soạn được +
`CodeBlock` chỉ đọc, dùng ở `VersionHistory`). Không kéo thư viện editor nào: template mail chỉ vài
chục dòng, đổi lại giữ được toàn bộ màu bằng token thay vì một theme mang màu cứng.

Luật dùng chung: `src/lib/admin/mail.ts` (regex mã/biến, `validationProblems` + `explainProblem` +
`problemLine` cho 422, `concurrentVersion` cho 409, `insertVariable`, `declaredGroups`,
`FOOTER_INCLUDE`, `isCampaignLive`). `isCampaignLive` là vị từ dùng chung cho nhịp polling của hook
và chỉ báo "đang theo dõi" trên màn chi tiết: hợp đồng đóng cửa sổ theo `status`, nhưng một chiến
dịch vừa hủy vẫn còn dòng `SENDING` đang bay nên cộng thêm hai bộ đếm; hai nơi lệch vị từ là màn
báo "số liệu đã chốt" trong lúc query vẫn tự đọc lại. `explainProblem(problem, context)` nhận `'template' | 'campaign'` vì
`unknown variable: x` mang hai nghĩa ngược nhau: lúc lưu template là nội dung đọc một tên chưa
khai, lúc tạo chiến dịch là request gửi thừa một khóa version không khai.

Nhãn enum: `src/lib/admin/labels.ts` (`MAIL_CATEGORY`, `MAIL_CAMPAIGN_STATUS`,
`MAIL_MESSAGE_STATUS` theo bảng màu mục 5 của brief, `isSendableTemplate`, `isTestSendable`).

## Liên quan

- FE integration contract (types, error matrix, ghi chú từng endpoint):
  `../fvscheduler/docs/features/admin/technical/mail-fe-integration.md`
- UI/UX design brief (bảng màu badge mục 5, bảng copy mục 6, edge case mục 8):
  `../fvscheduler/docs/features/mail-module-ui-design-brief.md`
- Backend spec gốc: `../fvscheduler/docs/features/mail-module.md`
