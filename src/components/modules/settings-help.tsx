"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/app-shell/demo-provider";
import { useOperations } from "./operations-store";
import { Filter, ModuleHeading, Tabs } from "./module-ui";
import { useLocalRepository } from "@/lib/local-repository";
import {
  calculateRemainingDays,
  INITIAL_BUSINESSES,
  type PlatformBusiness,
} from "@/lib/super-admin-data";
import { CRAFTSMAN_BRANCHES } from "@/lib/branch-profiles";

const groups:Record<string,{key:string;label:string;options?:string[];type?:string}[]>={
 "İşletme":[
   {key:"business",label:"İşletme adı"},
   {key:"trade",label:"İşletme Branşı / Uzmanlık Alanı",options:CRAFTSMAN_BRANCHES.map(b=>b.name)},
   {key:"phone",label:"Telefon",type:"tel"},
   {key:"address",label:"Adres"}
 ],
 "Abonelik":[],
 "Şubeler":[{key:"dortyol",label:"Dörtyol şube adı"},{key:"iskenderun",label:"İskenderun şube adı"}],
 "Kullanıcılar & Yetkiler":[{key:"userRole",label:"Varsayılan çalışan rolü",options:["Usta","Servis Danışmanı","Muhasebe","İşletme Sahibi"]}],
 "İş Akışı":[{key:"workflow",label:"İşlem öncesi müşteri onayı",options:["Onay gerekli","Danışman kontrolü"]}],
 "Araç Kabul":[{key:"checklist",label:"Kabul kontrol listesi",options:["Zorunlu","İsteğe bağlı"]},{key:"fuel",label:"Varsayılan yakıt seviyesi (%)",type:"number"}],
 "Stok":[{key:"minimum",label:"Yeni parça için minimum stok",type:"number"}],
 "Finans":[{key:"currency",label:"Para birimi",options:["TRY"]},{key:"vat",label:"KDV oranı (%)",type:"number"}],
 "Bildirimler":[{key:"notifications",label:"Uygulama içi hatırlatmalar",options:["Açık","Kapalı"]}],
};
export function SettingsPage(){
  const {data,update}=useOperations(),demo=useDemo();
  const [tab,setTab]=useState("İşletme");
  const [businesses] = useLocalRepository<PlatformBusiness[]>(
    "super-admin:businesses",
    INITIAL_BUSINESSES,
  );
  const currentBiz = businesses[0];
  const remainingDays = currentBiz ? calculateRemainingDays(currentBiz.endDate) : 30;

  if (demo.currentUser.isTechnician) {
    return (
      <div className="module-page">
        <div className="app-empty-state" style={{ maxWidth: 540, margin: "40px auto", textAlign: "center" }}>
          <h2>Yönetici Yetkisi Gereklidir</h2>
          <p>İşletme ayarları ve şube yetkileri yalnızca İşletme Sahibi / Admin tarafından değiştirilebilir.</p>
          <Button asChild style={{ marginTop: 16 }}>
            <Link href="/app/work-orders">İş Emirlerine Git</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <ModuleHeading title="Ayarlar" subtitle="İşletme ve operasyon tercihlerinizi yönetin."/>
      <Tabs items={Object.keys(groups)} value={tab} onChange={setTab}/>
      <section className="app-panel module-section">
        {tab === "Abonelik" ? (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: 16 }}>
              <div>
                <p className="app-overline">SANAYİPRO LİSANS DURUMU</p>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                  {currentBiz?.packageName || "Pro Paket"}
                </h2>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                  İşletmeniz için aktif lisans süresi ve yetkili özellikler.
                </p>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "4px 12px",
                  borderRadius: 9999,
                  background: remainingDays <= 7 ? "#fef3c7" : "#dcfce7",
                  color: remainingDays <= 7 ? "#b45309" : "#15803d",
                  border: "1px solid",
                  borderColor: remainingDays <= 7 ? "#fde68a" : "#bbf7d0",
                }}
              >
                {remainingDays <= 0 ? "Süresi Doldu" : `${remainingDays} Gün Kaldı`}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>BAŞLANGIÇ TARİHİ</span>
                <strong style={{ fontSize: 14, color: "#0f172a", display: "block", marginTop: 4 }}>{currentBiz?.startDate || "01 Ekim 2026"}</strong>
              </div>

              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>BİTİŞ TARİHİ</span>
                <strong style={{ fontSize: 14, color: "#0f172a", display: "block", marginTop: 4 }}>{currentBiz?.endDate || "01 Kasım 2026"}</strong>
              </div>

              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block" }}>LİSANS SAHİBİ</span>
                <strong style={{ fontSize: 14, color: "#0f172a", display: "block", marginTop: 4 }}>{currentBiz?.ownerName || "Ahmet Yılmaz"}</strong>
              </div>
            </div>

            <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: 16, color: "#581c87" }}>
              <strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Dahil Olan Özellikler (Pro Paket)</strong>
              <ul style={{ fontSize: 12.5, lineHeight: 1.8, paddingLeft: 18, listStyleType: "disc" }}>
                <li>Sınırsız Şube & Personel Yönetimi</li>
                <li>Kamera ile Hızlı Araç Plaka Okuma (OCR)</li>
                <li>Gelişmiş Finans, Bakiye & Tahsilat Modülleri</li>
                <li>7/24 Kesintisiz Bulut Yedekleme & Güvenlik</li>
              </ul>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 12.5, color: "#64748b" }}>
                Paket sürenizi uzatmak veya plan değişikliği yapmak için platform yöneticisi ile görüşebilirsiniz.
              </p>
              <Button asChild style={{ background: "#7c3aed", color: "#fff", fontWeight: 700 }}>
                <a href="https://wa.me/905324112233" target="_blank" rel="noopener noreferrer">
                  Destek / Yenileme İletişimi
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <form key={tab} className="module-settings" onSubmit={e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;update(s=>({...s,settings:{...s.settings,...values}}));demo.announce("Ayarlar kaydedildi.");}}>
            {groups[tab].map(f=><label key={f.key}>{f.label}{f.options?<select name={f.key} defaultValue={data.settings[f.key]}>{f.options.map(o=><option key={o}>{o}</option>)}</select>:<input name={f.key} type={f.type??"text"} min={f.type==="number"?0:undefined} max={f.key==="fuel"||f.key==="vat"?100:undefined} required={f.key==="business"||tab==="Şubeler"||f.type==="number"} maxLength={250} defaultValue={data.settings[f.key]}/>}</label>)}
            {tab==="Kullanıcılar & Yetkiler"&&<p className="app-tab-footnote">Çalışanların rol ve durumlarını <Link href="/app/team">Ekip</Link> ekranından düzenleyin. Bu tercih, sunucu erişim yetkilerini değiştirmez.</p>}
            <Button type="submit">Değişiklikleri Kaydet</Button>
          </form>
        )}
      </section>
    </div>
  );
}
const guides=[
 {title:"Araç nasıl kabul edilir?",body:"Hızlı İşlem → Araç Kabul ile başlayın. Plaka veya müşteri seçin; kilometre, yakıt, şikâyet ve hasarı girin. Kontrol listesini tamamlayıp fotoğrafları ekleyin. Usta ve teslim hedefini belirleyerek kabulü kaydedin.",href:"/app/intake",action:"Araç Kabul"},
 {title:"İş emri nasıl açılır?",body:"Araç kabulünü tamamladığınızda iş emri otomatik açılır. Kayıtlı bir araç için araç detayındaki Araç Kabul butonunu da kullanabilirsiniz. Aynı araçta açık bir iş varsa mevcut işe devam edin.",href:"/app/work-orders",action:"İş Emirleri"},
 {title:"Parça nasıl kullanılır?",body:"İş emri → Parçalar → Parça Ekle. Stoktaki parçayı ve miktarı seçip ayırın veya kullanın. Ayrılan miktar kullanılabilir stoğu azaltır. Kullan işlemi fiziksel stoğu düşürür ve hareket geçmişine eklenir.",href:"/app/stock",action:"Stok"},
 {title:"Tahsilat nasıl eklenir?",body:"Hızlı İşlem → Tahsilat Ekle veya Finans → Açık Hesaplar yolunu izleyin. İş emrini seçin, bakiyeyi aşmayan tutarı girin ve kaydedin. Tahsilat listesi ve açık bakiye birlikte güncellenir.",href:"/app/finance",action:"Finans"},
 {title:"Araç nasıl teslim edilir?",body:"İş emrindeki Sıradaki İşlem ile son kontrolü tamamlayın ve Teslime Hazır durumuna geçin. Aracı Teslim Et işleminde hesap ve teslim bilgisini kontrol edip onaylayın.",href:"/app/work-orders",action:"İş Emirleri"},
 {title:"Servis geçmişi nasıl bulunur?",body:"Üst bardaki aramaya plaka yazın veya Araçlar listesinden aracı açın. Servis geçmişi zaman çizelgesindeki kayıtlar ilgili iş emrine götürür. Müşteri detayından tüm araçlarına da ulaşabilirsiniz.",href:"/app/vehicles",action:"Araçlar"},
];
export function HelpPage(){const [query,setQuery]=useState("");const list=guides.filter(g=>`${g.title} ${g.body}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));return <div className="module-page"><ModuleHeading title="Yardım" subtitle="SanayiPro kullanım rehberi. İşinizi birkaç adımda tamamlayın."/><Filter value={query} onChange={setQuery} placeholder="Rehberde ara"/><section className="app-panel module-help">{list.map(g=><details key={g.title}><summary>{g.title}</summary><p>{g.body}</p><p><Link href={g.href}>{g.action} →</Link></p></details>)}{!list.length&&<p className="module-empty">Aramanızla eşleşen konu yok.</p>}</section></div>;}
