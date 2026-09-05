import { Card, CardContent } from '@/components/ui/Card';
import { Kicker } from '@/components/ui/Kicker';

/** Khung chung của các màn auth: logo + kicker + nội dung, một cột giữa màn. */
export function AuthCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="w-full max-w-100">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-family-logo text-3xl font-semibold leading-none text-foreground">framevis</span>
            <span className="font-mono text-sm font-medium tracking-[0.09em] text-muted-foreground">admin</span>
          </div>
          <div>
            <Kicker>Platform admin</Kicker>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
