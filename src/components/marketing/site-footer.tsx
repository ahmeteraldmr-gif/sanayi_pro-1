import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { PreviewButton } from "./marketing-actions";

export function FinalCta() {
  return (
    <section id="demo" className="final-cta" aria-labelledby="cta-title">
      <div className="container final-cta-inner">
        <div>
          <p className="eyebrow">SERVİSİNİZ İÇİN BİR SONRAKİ ADIM</p>
          <h2 id="cta-title">
            Kendi servis akışınız
            <br />
            üzerinden inceleyin.
          </h2>
          <p>
            Bir aracın kabulünden teslimine kadar SanayiPro’nun
            <br className="desktop-break" /> nasıl kullanılacağını birlikte
            değerlendirelim.
          </p>
        </div>
        <div className="final-cta-actions">
          <PreviewButton size="lg">
            Servisim İçin Demo Talep Et <ArrowRight aria-hidden="true" />
          </PreviewButton>
          <PreviewButton action="login" variant="ghost">
            Giriş Yap <ArrowUpRight aria-hidden="true" />
          </PreviewButton>
          <span>Demo talepleri için iletişime geçin.</span>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div>
            <a href="#baslangic" aria-label="SanayiPro sayfa başına dön">
              <Brand />
            </a>
            <p>
              Servisin günlük akışı.
              <br />
              Tek çalışma alanında.
            </p>
          </div>
          <nav aria-label="Alt menü">
            <strong>Ürün</strong>
            <a href="#nasil-calisir">Nasıl Çalışır</a>
            <a href="#urun-akisi">Ürün Akışı</a>
            <a href="#kimler-icin">Kimler İçin</a>
            <a href="#sik-sorulanlar">Sık Sorulanlar</a>
          </nav>
          <div className="footer-access">
            <strong>SanayiPro’yu İnceleyin</strong>
            <PreviewButton action="login" variant="ghost">
              Giriş Yap <ArrowUpRight aria-hidden="true" />
            </PreviewButton>
            <PreviewButton variant="outline">
              Demo Talep Et <ArrowRight aria-hidden="true" />
            </PreviewButton>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getUTCFullYear()} SanayiPro · Tüm hakları saklıdır.</span>
          <a href="#baslangic">Başa dön ↑</a>
        </div>
      </div>
    </footer>
  );
}
