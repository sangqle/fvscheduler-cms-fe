# Mail: template + chiến dịch gửi

Updated: 2026-09-06 · Thiết kế: CMS-10..14 · Backend: `../fvscheduler/docs/features/mail-module.md`

## Mục đích

Soạn và phát hành mail template lưu ở DB (mỗi lần lưu là một version bất biến), xem trước bản nháp
đang gõ và bản đã lưu, gửi thử một địa chỉ, rồi tạo chiến dịch gửi hàng loạt tới chủ workspace hoặc
tài khoản và theo dõi tiến độ, nhật ký gửi (outbox).

**Không có**: trang tạo template riêng (tạo bằng dialog), server render nội dung chưa lưu, tìm kiếm
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
`TemplateEditorScreen` (prop `code`) · màn duy nhất chạy **trọn bề ngang**: `isFullWidthRoute` trong
`lib/admin/nav.ts` cho `AdminShell` bỏ `max-w-350` ở route này, vì bó vào 1400px thì mỗi cột còn
dưới 700px, hẹp hơn cột thư 600px mà khung xem trước phải dựng.

Một **thanh công cụ dính** đỉnh vùng cuộn (`sticky top-0`, bleed `-mx-4 sm:-mx-6`; `main` là vùng
cuộn duy nhất của app nên `sticky` bám vào nó) mang: công tắc bố cục, nút mở `VersionHistory`, và
cặp `Hoàn tác` / `Lưu thành v{currentVersion + 1}`. Nút lưu nằm ở đây chứ không nằm giữa trang, để
không phải cuộn ngược lên mới bấm được.

**Công tắc bố cục** `?view=edit|split|preview` (`SegmentedControl`, mặc định `split` và bỏ khỏi URL,
giá trị lạ quy về mặc định). `Chia đôi` chỉ có mặt từ `xl`: ở đúng 1024px hai cột còn ~364px mỗi
bên, hẹp hơn cả cột thư, nên dưới `xl` chỉ còn `Soạn` / `Xem trước` và một `split` lưu sẵn hành xử
như `edit`. `useMediaQuery` trả `false` ở lần render đầu nên lượt sơn đầu tiên rơi vào `Soạn`, một
bố cục hợp lệ chứ không phải thứ phải vá sau hydrate. **Hai cột luôn mount**, ẩn hiện bằng class:
unmount `CodeEditor` là mất vị trí con trỏ và chỗ đang cuộn, unmount `TemplatePreview` là vứt đi một
lượt render của server.

Từ `xl` hai cột đứng cạnh nhau `flex-45` / `flex-55` (khung thư không cuộn ngang được, ô soạn mã thì
có, nên preview lấy phần hơn), cột phải `sticky top-14` cao đúng `calc(100dvh - 137px)` (topbar 57 +
thanh công cụ 53 + 3 hở + đệm dưới 24) nên nó đứng yên trong lúc form cuộn. Dưới `xl` khung thư chốt
`44rem` (`split`) hoặc `52rem` (`full`) và kéo cao được.

Nội dung cột trái: form metadata (tên, mô tả, category, `ChipListEditor` cho `requiredContext` không
gồm `COMMON`) + `VariablePanel` thu thành **dải ngang** ngay trên ô soạn (chip bấm để chèn tại con
trỏ, nhóm chưa khai thì mờ và bấm vào sẽ mời khai thêm, kèm `Chèn chân trang chung` và lối mở
`VariableCatalogDialog`; trạng thái mở mặc định đi bằng **container query** `@lg` chứ không phải
media query, vì bề ngang cột không đơn điệu theo viewport: xếp chồng ở 1279px nó rộng ~1000px rồi
tụt còn ~443px đúng lúc hàng tách đôi ở `xl`) + editor `subjectTemplate` / `htmlBody`
(`components/ui/CodeEditor.tsx`: đánh số dòng, tô cú pháp HTML + Pebble bằng token, cuộn và tô lại
dòng lỗi mà `422` chỉ ra).

Cột phải là `TemplatePreview` (prop `pane`), có **hai bản** chọn bằng `SegmentedControl`:

- **Bản nháp** (mặc định) dựng ngay ở trình duyệt từ `form.subjectTemplate` / `form.htmlBody`, cập
  nhật theo từng ký tự qua `useDebouncedValue(300ms)`. Phải nằm ở client vì mỗi lần ghi sinh một
  version bất biến: không thể lưu mỗi nhịp gõ chỉ để nhờ server render, và `MailPreviewRequest` của
  backend cũng không có chỗ nhận nội dung nháp. `renderDraft` chỉ thay `{{ tenBien }}` bằng `sample`
  của catalog (lọc theo `form.requiredContext`) cộng ô "giá trị thử", escape HTML y như autoescape
  của Pebble, biến thiếu rơi về `[tên]`. `{% include %}`, `{% if %}`, `{{ a.b }}`, `{{ a | upper }}`
  giữ **nguyên văn** và `unsupportedPebble` liệt kê chúng trong một `Alert` cảnh báo, chứ không xoá
  đi để người soạn tưởng chỗ đó trống thật.
- **Bản đã lưu v{n}** là `POST /preview` cũ: server render đúng version đang phát hành, chạy đủ
  Pebble, đọc được ngữ cảnh thật của workspace hoặc tài khoản. Đang dirty thì có cảnh báo và nút
  `Lưu và xem trước`.

`iframe` mang `key={mode}`: đổi tab là dựng khung mới, không thay `srcDoc` trên khung cũ rồi giữ lại
chỗ đang cuộn của bản kia. `VersionHistory` là một `SlideOver` mở từ thanh công cụ,
đúng như brief 4.2 và mục 10 yêu cầu; dialog "Xem" của nó ở `z-50` nên vẫn nổi trên panel `z-45`,
cùng khuôn `OrderDrawer` mở `MarkPaidDialog`. Nút `Gửi thử` và `Tạo chiến dịch từ template này` ở
header trang, không nhét vào thanh công cụ: thanh đó phải giữ một dòng ở 1280px và không ai với tới
hai nút kia giữa lúc đang gõ.

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
  nhắm-workspace (`workspaceIds` hoặc `rawWorkspaceIds`) và `accountIds`, không rỗng (400 nếu khác).
  Ô dán id ở bước 2 nhận **cả id mờ `wk…` lẫn id số thô** dán từ truy vấn SQL, tự nhận dạng và gửi
  lên đúng khóa. Trộn hai dạng trong một danh sách thì UI chặn, không phải vì backend báo lỗi mà vì
  backend **im lặng**: thấy `rawWorkspaceIds` khác rỗng là nó dùng danh sách đó và bỏ hẳn
  `workspaceIds`, nên nửa còn lại biến mất không dấu vết. Id số chỉ mở cho workspace, tài khoản
  không có đường này. Template khai `requiredContext` chứa
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

Primitive được mở rộng để màn này khỏi style tại chỗ: `Card padding="sm"` + `CardTitle size="md"`
(truyền `className="p-4"` vào `Card` **không** có tác dụng từ 640px trở lên, vì `sm:p-6` của chính
primitive sống sót qua `tailwind-merge` và thắng ở cascade), `CardContent standalone` cho thẻ không
có header, `Badge mono="plain"` (bản `mono` sẵn có kèm `uppercase` nên sẽ in ra "V3"), và
`SegmentedControl` đổi `role="tablist"` thành `role="radiogroup"` vì mọi chỗ dùng nó trong repo đều
là chọn-một chứ không phải tab (tab thật đi bằng primitive `Tabs`).

Luật dùng chung: `src/lib/admin/mail.ts` (regex mã/biến, `validationProblems` + `explainProblem` +
`problemLine` cho 422, `concurrentVersion` cho 409, `insertVariable`, `declaredGroups`,
`renderDraft` + `unsupportedPebble` cho xem trước bản nháp, `FOOTER_INCLUDE`, `isCampaignLive`). `isCampaignLive` là vị từ dùng chung cho nhịp polling của hook
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
