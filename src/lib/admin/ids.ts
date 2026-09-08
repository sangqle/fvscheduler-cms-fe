/**
 * Chuẩn bị đầu vào cho `POST /api/admin/ids/decode`.
 *
 * Backend nhận id mờ nguyên văn và echo lại đúng chuỗi đó, nên tách và làm sạch là việc của FE:
 * người vận hành dán vào từ đủ chỗ (một cột Excel, một mảng JSON trong log, một câu chat khách gửi)
 * và không ai muốn phải sửa tay thành danh sách chuẩn trước khi bấm.
 */

/** Trần của `AdminDecodeIdsRequest.ids`; quá số này backend trả 400 chứ không cắt bớt. */
export const MAX_DECODE_IDS = 200;

/**
 * Tách khối văn bản thành danh sách id: xuống dòng, tab, khoảng trắng, dấu phẩy và chấm phẩy đều
 * là dấu ngăn; nháy và ngoặc vuông ở hai đầu (dán từ JSON) bị bóc.
 *
 * Phần lõi giữ NGUYÊN, kể cả chuỗi rác: id sai không phải lỗi HTTP mà là một dòng `error` trong
 * kết quả, nên nó phải hiện lại đúng như người dùng đã dán thì họ mới soi ra chỗ gõ nhầm. Thứ tự
 * lần đầu xuất hiện được giữ vì kết quả khớp đầu vào theo vị trí.
 *
 * Id trùng chỉ tính một lần: một cột SQL dán vào thường lặp, mà lặp thì vừa tốn suất trong 200
 * id vừa cho ra hai dòng y hệt nhau trong bảng kết quả.
 */
export function parseDecodeIds(raw: string): string[] {
  const seen = new Set<string>();
  for (const token of raw.split(/[\s,;]+/)) {
    const id = token.replace(/^[[\]"'`]+|[[\]"'`]+$/g, '');
    if (id) seen.add(id);
  }
  return [...seen];
}
