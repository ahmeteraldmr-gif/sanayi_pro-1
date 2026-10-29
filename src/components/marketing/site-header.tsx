import { navigation } from "@/lib/marketing-data";
import { Brand } from "./brand";
import { MobileNavigation, PreviewButton } from "./marketing-actions";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="#baslangic" aria-label="SanayiPro ana sayfa">
          <Brand />
        </a>
        <nav className="desktop-nav" aria-label="Ana menü">
          {navigation.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <PreviewButton
            action="login"
            variant="ghost"
            className="header-login"
          >
            Giriş Yap
          </PreviewButton>
          <PreviewButton size="sm" className="header-demo">
            Demo Talep Et
          </PreviewButton>
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}
