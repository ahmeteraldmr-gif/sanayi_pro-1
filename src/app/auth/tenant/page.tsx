import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { getVerifiedUser } from "@/server/auth";
import { getTenantChoices } from "@/server/tenant";
import { AccessError, type TenantContext } from "@/server/security";
import { selectTenantAction, signOutAction } from "../actions";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "İşletme ve Şube | SanayiPro",
  robots: { index: false, follow: false },
};
export default async function TenantPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  try {
    await getVerifiedUser();
  } catch (error) {
    redirect(
      error instanceof AccessError && error.code === "CONFIGURATION"
        ? "/login?setup=required"
        : "/login",
    );
  }
  const { denied } = await searchParams;
  let choices: TenantContext[] = [];
  let unavailable = false;
  try {
    choices = await getTenantChoices();
  } catch {
    unavailable = true;
  }
  return (
    <AuthFrame>
      <p className="eyebrow">YETKİLİ ÇALIŞMA ALANLARI</p>
      <h1>İşletme ve şube seçin.</h1>
      <p>
        Yalnızca aktif üyeliğiniz ve uygulama erişim izniniz olan şubeler
        gösterilir.
      </p>
      {denied && (
        <p className="auth-error" role="alert">
          Bu işletme ve şube için erişim doğrulanamadı.
        </p>
      )}
      {unavailable ? (
        <div className="auth-setup">
          Yetki bilgilerine şu anda ulaşılamıyor. Bağlantı ve migration kurulumu
          doğrulanmalıdır.
        </div>
      ) : choices.length ? (
        <ul className="auth-tenants">
          {choices.map((choice) => (
            <li key={choice.branchId}>
              <form action={selectTenantAction}>
                <input
                  type="hidden"
                  name="organizationId"
                  value={choice.organizationId}
                />
                <input type="hidden" name="branchId" value={choice.branchId} />
                <button type="submit">
                  <span>
                    <strong>{choice.organizationName}</strong>
                    <small>{choice.branchName}</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <div className="auth-setup">
          Aktif bir işletme ve şube erişiminiz bulunmuyor. Yetkili yönetici
          üyelik ve rol atamasını tamamlamalıdır.
        </div>
      )}
      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Çıkış Yap
        </Button>
      </form>
    </AuthFrame>
  );
}
