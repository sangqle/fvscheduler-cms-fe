import { AlertTriangle, CheckCircle2, Clock, Send, Slash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Heading } from '@/components/ui/Heading';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import {
  CardSkeleton,
  DetailHeaderSkeleton,
  FilterBarSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
  TabsListSkeleton,
} from '@/components/admin/shared/PageSkeleton';

/** Cột lấy đúng từ `TemplateTable`, tab mặc định của màn. */
const TEMPLATE_COLUMNS = [
  { header: 'Template', className: 'min-w-56' },
  { header: 'Loại' },
  { header: 'Ngữ cảnh cần', className: 'min-w-40' },
  { header: 'Bản hiện hành' },
  { header: 'Bật' },
  { header: 'Sửa lần cuối' },
  { header: '', className: 'w-12' },
];

/** Cột lấy đúng từ `MessageTable` ở chế độ trong chiến dịch (không có cột Chiến dịch). */
const MESSAGE_COLUMNS = [
  { header: 'Email', className: 'min-w-52' },
  { header: 'Template' },
  { header: 'Workspace' },
  { header: 'Trạng thái' },
  { header: 'Lần thử' },
  { header: 'Mốc kế tiếp' },
  { header: 'Ghi chú', className: 'min-w-40' },
];

/** CMS-10 lúc tải: khung của tab `templates`, tab mặc định khi vào màn. */
export function MailSkeleton() {
  return (
    <>
      <PageHeaderSkeleton title="Email hệ thống" actions={2} />
      <TabsListSkeleton labels={['Template', 'Chiến dịch', 'Nhật ký gửi']} />
      <div className="mt-4 flex flex-col gap-4">
        <FilterBarSkeleton fields={2} />
        <TableSkeleton columns={TEMPLATE_COLUMNS} rows={6} mobileCards />
      </div>
    </>
  );
}

/** CMS-11/12 lúc tải: cột soạn bên trái, khung xem trước bên phải từ `xl`, đúng khung màn soạn. */
export function TemplateEditorSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <DetailHeaderSkeleton badges={2} actions={2} />
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-45">
          <CardSkeleton lines={6} />
          <CardSkeleton lines={8} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 xl:flex-55">
          <CardSkeleton lines={12} />
        </div>
      </div>
    </div>
  );
}

/** Năm ô số của thẻ tiến độ: nhãn, biểu tượng và sắc thái biết trước, chỉ con số là phải chờ. */
const PROGRESS_STATS = [
  { label: 'Đã gửi', icon: <CheckCircle2 />, intent: 'success' },
  { label: 'Chờ gửi', icon: <Clock />, intent: 'warning' },
  { label: 'Đang gửi', icon: <Send />, intent: 'info' },
  { label: 'Thất bại', icon: <AlertTriangle />, intent: 'destructive' },
  { label: 'Đã hủy', icon: <Slash />, intent: 'muted' },
] as const;

/** CMS-13 lúc tải: banner ghim version, thẻ tiến độ, rồi bảng người nhận. */
export function CampaignDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <DetailHeaderSkeleton badges={1} actions={2} />
      <CardSkeleton lines={2} title={false} />
      <Card>
        <CardContent standalone className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <Heading level="4">Tiến độ</Heading>
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {PROGRESS_STATS.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={null} icon={stat.icon} intent={stat.intent} isLoading />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3">
        <Heading level="3">Người nhận</Heading>
        <TableSkeleton columns={MESSAGE_COLUMNS} rows={6} mobileCards />
      </div>
    </div>
  );
}
