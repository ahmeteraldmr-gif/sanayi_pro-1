import { ArrowRight, Check, MoveUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreviewButton } from "./marketing-actions";
import { DashboardPreview } from "./dashboard-preview";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
            <span className="eyebrow-dot" /> SERVİSİNİZİN GÜNLÜK ÇALIŞMA ALANI
          </p>
          <h1 id="hero-title">
            Servise giren her araç için <span>net bir sonraki adım.</span>
          </h1>
          <p className="hero-description">
            Araç kabulünü, ustaya atanan işleri, kullanılan parçaları ve
            tahsilatları aynı akışta takip edin. Günün hangi işe ihtiyaç
            duyduğunu görün.
          </p>
          <div className="hero-actions">
            <PreviewButton size="lg">
              Demo Talep Et <ArrowRight aria-hidden="true" />
            </PreviewButton>
            <Button asChild variant="outline" size="lg">
              <a href="#urun-akisi">
                İş Akışını Gör <MoveUpRight aria-hidden="true" />
              </a>
            </Button>
          </div>
          <div className="hero-points">
            <span>
              <Check size={15} aria-hidden="true" /> Kabulden teslimata
            </span>
            <span>
              <Check size={15} aria-hidden="true" /> Masaüstü, tablet, telefon
            </span>
          </div>
        </div>
        <DashboardPreview />
      </div>
      <div className="container hero-bottom">
        <p>
          Servisinize odaklanın.
          <br />
          <strong>İşin akışı gözünüzün önünde olsun.</strong>
        </p>
        <div>
          <span>
            01 <b>Aracı kabul edin</b>
          </span>
          <span>
            02 <b>İşi ilerletin</b>
          </span>
          <span>
            03 <b>Kontrolle teslim edin</b>
          </span>
        </div>
      </div>
    </section>
  );
}
