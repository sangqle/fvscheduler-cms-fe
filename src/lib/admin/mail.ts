import { ApiError } from '@/types/api';
import type { AdminMailVariableGroup, MailCampaignStatus, MailContextGroup } from '@/types/admin';

/** `^[a-z0-9][a-z0-9-]{2,63}$` — mã template, không đổi được sau khi tạo. */
const TEMPLATE_CODE = /^[a-z0-9][a-z0-9-]{2,63}$/;
/** Tên biến hợp lệ của Pebble. */
const VARIABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const TEMPLATE_NAME_MAX = 160;
export const TEMPLATE_DESCRIPTION_MAX = 2000;
export const CAMPAIGN_NAME_MAX = 160;

/** Partial dùng chung có sẵn từ seed V92; nút "Chèn chân trang chung" chèn đúng chuỗi này. */
export const FOOTER_INCLUDE = '{% include "footer-vi" %}';

export function validateTemplateCode(code: string): string | undefined {
  const value = code.trim();
  if (!value) return 'Nhập mã template.';
  if (!TEMPLATE_CODE.test(value))
    return 'Chữ thường, số và gạch nối, 3 đến 64 ký tự, bắt đầu bằng chữ hoặc số.';
  return undefined;
}

/**
 * Tên biến tự do. Backend từ chối tên trùng biến catalog ở **bất kỳ** nhóm nào, kể cả nhóm template
 * chưa khai, nên kiểm luôn ở client để người dùng không phải đợi 422 mới biết.
 */
export function validateCustomVariable(
  name: string,
  catalog: AdminMailVariableGroup[] | undefined,
  existing: string[] = [],
): string | undefined {
  const value = name.trim();
  if (!value) return 'Nhập tên biến.';
  if (!VARIABLE_NAME.test(value)) return 'Chữ cái, số và gạch dưới, không bắt đầu bằng số.';
  if (existing.includes(value)) return 'Biến này đã khai rồi.';
  const catalogNames = (catalog ?? []).flatMap((g) => g.variables.map((v) => v.name));
  if (catalogNames.includes(value)) return `${value} đã là biến catalog, không dùng làm biến tự do được.`;
  return undefined;
}

/**
 * Chi tiết của 422: `UnprocessableEntityException` trả `data` là **danh sách** mọi lỗi cùng lúc
 * (không dừng ở lỗi đầu). Mọi status khác trả mảng rỗng để nơi gọi rơi về `apiErrorMessage`.
 */
export function validationProblems(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.status !== 422) return [];
  const data = (error.payload as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  return data.filter((d): d is string => typeof d === 'string');
}

/** `syntax error at line 12: ...` → 12. Dùng để nhảy con trỏ tới dòng hỏng trong editor. */
export function problemLine(problem: string): number | undefined {
  const m = /at line (\d+)/.exec(problem);
  return m ? Number(m[1]) : undefined;
}

/** Cùng một chuỗi `unknown variable:` mang hai nghĩa khác nhau ở hai màn, xem `explainProblem`. */
export type ProblemContext = 'template' | 'campaign';

/**
 * Tiền tố lỗi backend là chuỗi tiếng Anh ổn định. Dịch phần diễn giải sang tiếng Việt nhưng giữ
 * nguyên tên biến / thông điệp kỹ thuật, đúng luật "enum và mã giữ nguyên".
 *
 * `context` là bắt buộc về mặt nghĩa: `unknown variable: x` lúc lưu template nghĩa là nội dung đọc
 * một tên chưa khai, còn lúc tạo chiến dịch nghĩa là request gửi thừa một khóa mà version không
 * khai. Lời khuyên của hai ca ngược nhau nên không thể dùng chung một câu.
 */
export function explainProblem(problem: string, context: ProblemContext = 'template'): string {
  const rules: [RegExp, (m: RegExpExecArray) => string][] = [
    [
      /^unknown variable: (.+)$/,
      (m) =>
        context === 'campaign'
          ? `Biến ${m[1]} không nằm trong danh sách biến tự do của version này: bỏ nó khỏi chiến dịch, hoặc tải lại danh sách biến của template.`
          : `Biến ${m[1]} chưa được khai: thêm nhóm ngữ cảnh chứa nó, hoặc khai nó thành biến tự do.`,
    ],
    [/^unknown attribute: (.+)$/, (m) => `${m[1]} là giá trị phẳng, không đọc thuộc tính con của nó được.`],
    [/^syntax error at line (\d+): (.+)$/, (m) => `Cú pháp hỏng ở dòng ${m[1]}: ${m[2]}`],
    [/^include not found: (.+)$/, (m) => `Không có template nào mã ${m[1]} để include.`],
    [/^subject is required$/, () => 'Template không phải PARTIAL thì phải có tiêu đề.'],
    [/^invalid variable name: (.+)$/, (m) => `Tên biến ${m[1]} không hợp lệ (chữ cái, số, gạch dưới).`],
    [/^custom variable shadows a catalog variable: (.+)$/, (m) => `${m[1]} trùng một biến catalog, đổi tên khác.`],
    [/^template requires WORKSPACE context.*$/, () => 'Template này khai ngữ cảnh WORKSPACE nên chỉ gửi theo workspace được.'],
    [/^missing variable: (.+)$/, (m) => `Thiếu giá trị cho biến ${m[1]}.`],
  ];
  for (const [re, render] of rules) {
    const m = re.exec(problem);
    if (m) return render(m);
  }
  return problem;
}

/** `409` do hai admin cùng lưu: backend nói rõ version hiện hành để tải lại rồi áp lại. */
export function concurrentVersion(error: unknown): number | undefined {
  if (!(error instanceof ApiError) || error.status !== 409) return undefined;
  const message = (error.payload as { message?: unknown } | null)?.message;
  if (typeof message !== 'string') return undefined;
  const m = /current version is now (\d+)/.exec(message);
  return m ? Number(m[1]) : undefined;
}

/**
 * Chiến dịch còn nhúc nhích hay đã chốt. Hợp đồng đóng cửa sổ polling theo `status`, nhưng một
 * chiến dịch vừa bị hủy vẫn có thể còn dòng `SENDING` đang bay, nên cộng thêm hai bộ đếm. Hook
 * polling và chỉ báo "đang theo dõi" trên màn phải dùng CHUNG vị từ này, kẻo màn báo "số liệu đã
 * chốt" trong lúc nó vẫn đang tự đọc lại.
 */
export function isCampaignLive(c: {
  status: MailCampaignStatus;
  pending: number;
  sending: number;
}): boolean {
  return c.status === 'QUEUED' || c.status === 'RUNNING' || c.pending + c.sending > 0;
}

/** Danh sách id dán từ bảng tính: tách theo xuống dòng, dấu phẩy hoặc khoảng trắng, bỏ trùng. */
export function parseIdList(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[\s,;]+/)) {
    const id = part.trim();
    if (id) seen.add(id);
  }
  return [...seen];
}

/** Nhóm biến template dùng được: `COMMON` luôn có, cộng các nhóm đã khai. */
export function declaredGroups(requiredContext: MailContextGroup[]): Set<MailContextGroup> {
  return new Set<MailContextGroup>(['COMMON', ...requiredContext]);
}

/** Chèn một đoạn vào vị trí con trỏ của textarea/input đang điều khiển. */
export function insertAtCursor(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  current: string,
  snippet: string,
): { next: string; caret: number } {
  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? current.length;
  return { next: current.slice(0, start) + snippet + current.slice(end), caret: start + snippet.length };
}

export function insertVariable(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  current: string,
  name: string,
): { next: string; caret: number } {
  return insertAtCursor(el, current, `{{ ${name} }}`);
}

export function lineCount(text: string): number {
  return text.length === 0 ? 0 : text.split('\n').length;
}

/** Vị trí ký tự đầu của dòng thứ `line` (1-based); dùng để đưa con trỏ tới dòng lỗi. */
export function offsetOfLine(text: string, line: number): number {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < Math.min(line - 1, lines.length); i += 1) offset += lines[i].length + 1;
  return offset;
}
