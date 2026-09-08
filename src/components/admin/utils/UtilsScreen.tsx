import { PageHeader } from '@/components/admin/shared/PageHeader';
import { DecodeIdsCard } from '@/components/admin/utils/DecodeIdsCard';

/**
 * Hộp công cụ vận hành: những thao tác tra cứu một lần, không thuộc màn nghiệp vụ nào và không
 * ghi gì vào hệ thống. Hiện có một công cụ (giải mã id mờ); mỗi công cụ là một thẻ trong cột này.
 */
export function UtilsScreen() {
  return (
    <>
      <PageHeader
        title="Tiện ích"
        description="Công cụ tra cứu cho người trực hỗ trợ, chạy thẳng trên API admin và không ghi gì vào hệ thống"
      />
      <div className="flex flex-col gap-4">
        <DecodeIdsCard />
      </div>
    </>
  );
}
