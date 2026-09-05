# <Module>

Updated: YYYY-MM-DD · Thiết kế: CMS-0x · Backend: `../fvscheduler/docs/vi/admin/flows/ADM-FLOW-0x`

## Mục đích

Một đoạn: module này cho admin làm gì, không làm gì.

## Màn hình

### `/route` (CMS-0x)
- Thành phần: `components/admin/<module>/<Screen>.tsx` → …
- Filter/URL: `?a=&b=`
- Trạng thái: loading · empty · error · 404

## Hooks ↔ API

| Hook (`src/hooks/`) | Method · path | Query key | Invalidate sau ghi |
|---|---|---|---|
| `useX` | `GET /api/admin/...` | `['admin','x']` | … |

## Rule FE phải giữ

- …

## Types

`src/types/admin.ts`: `AdminX`, `AdminXDetail`, `XInput`.
