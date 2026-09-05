import { redirect } from 'next/navigation';

/** Điểm vào mặc định sau đăng nhập là danh sách workspace (CMS-01). */
export default function Home() {
  redirect('/workspaces');
}
