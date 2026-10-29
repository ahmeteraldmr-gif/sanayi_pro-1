import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function AppNotFound() {
  return (
    <div className="app-empty-state">
      <h1>Kayıt bulunamadı.</h1>
      <p>İş emirleri listesinden bir kayıt seçebilirsiniz.</p>
      <Button asChild>
        <Link href="/app/work-orders">İş Emirlerine Dön</Link>
      </Button>
    </div>
  );
}
