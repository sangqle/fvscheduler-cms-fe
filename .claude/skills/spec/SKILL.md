---
name: spec
description: 'Đọc hoặc cập nhật spec ngắn của một module CMS trong docs/specs/<module>.md (workspaces, orders, plans, auth). USE WHEN bắt đầu sửa/thêm một màn hình hoặc endpoint (đọc spec trước), và khi vừa đổi hành vi (cập nhật spec sau). Không có plan, changelog hay feature-doc; spec là nguồn sự thật duy nhất ngoài code. Triggers: "spec", "cập nhật spec", "đọc spec", "màn này làm gì", sau khi thêm/sửa màn hình, hook, endpoint.'
---

# Spec: một file cho mỗi module

`docs/specs/<module>.md` là bản mô tả **ngắn** (≤ 150 dòng) của một khu vực CMS: màn hình nào,
gọi endpoint gì, rule nghiệp vụ nào FE phải tôn trọng. Không phải tài liệu kỹ thuật đầy đủ;
chi tiết backend nằm ở `../fvscheduler/docs/vi/admin/`.

## Khi bắt đầu một việc

1. `ls docs/specs/` → mở đúng module. Không có → tạo từ `docs/specs/_TEMPLATE.md`.
2. Đọc mục **Màn hình** và **Rule** trước khi mở code. Nếu spec và code lệch nhau, code là
   đúng: sửa spec ngay trong lượt đó.

## Khi kết thúc một việc đổi hành vi

Cập nhật đúng phần bị ảnh hưởng, giữ format template:

- thêm/đổi màn → mục **Màn hình** (route, thành phần chính, trạng thái loading/empty/error)
- thêm/đổi hook hay endpoint → bảng **Hooks ↔ API** (hook · method path · query key · invalidation)
- rule mới FE phải giữ → mục **Rule**
- stamp `Updated: YYYY-MM-DD` ở đầu file

Không viết lịch sử thay đổi, không viết "đã sửa X": spec mô tả **hiện tại**.

## Không làm

- Không tạo `docs/plans/`, `docs/CHANGELOG.md`, `docs/features/`.
- Không chép lại DTO vào spec; trỏ về `src/types/admin.ts`.
- Không tạo spec cho thứ chưa có code.
