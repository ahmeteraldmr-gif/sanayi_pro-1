# SanayiPro

SanayiPro 2.0'ın ilk yerel arayüz aşaması: proje temeli, tasarım sistemi ve responsive tanıtım sayfası.

İkinci frontend aşaması, aynı tasarım sistemiyle uygulama kabuğunu, Bugün ekranını, global aramayı ve iş emri prototiplerini ekler. Landing page `/` altında korunur.

## Çalıştırma

Node.js 20.19 veya üzeri (bu çalışma Node 24.19.0 ile doğrulandı) ve pnpm 11 kullanılır.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Sayfa: http://127.0.0.1:3000

Uygulama demosu: http://127.0.0.1:3000/app

Backend temeli sonrası `/app` yetkili Supabase oturumu ve doğrulanmış işletme/şube ister. Supabase projesi henüz yokken giriş kapalıdır; frontend/demo kaynakları korunmuştur. Gerçek bağlantı, ayrı migration/runtime roller ve provisioning adımları için [backend kurulumunu](docs/backend-foundation.md) izleyin. Secret alanları `.env.example` içinde boş bırakılmıştır.

İş emirleri: http://127.0.0.1:3000/app/work-orders

Ana örnek: http://127.0.0.1:3000/app/work-orders/WO-2026-00142

Bu bilgisayarda pnpm PATH üzerinde yoksa PowerShell alternatifi:

```powershell
& 'C:\Users\ahmet\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' dev
```

## Kontroller

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm start
pnpm test:security
```

`start` production derlemesini sunar; öncesinde `build` gerekir.

Bu Windows ortamında Turbopack'ın PostCSS alt süreci bağlantı hatası nedeniyle geliştirme ve build komutları Next.js'in desteklenen `--webpack` seçeneğini kullanır. Next.js sürümü değiştirilmemiştir.

## Dosya düzeni

- `src/app/page.tsx`: Landing page bölümlerinin birleşimi. Varsayılan olarak Server Component.
- `src/app/layout.tsx`: Türkçe dil, yerel Inter fontu ve metadata/OpenGraph.
- `src/app/globals.css`: Merkezi renk token'ları, tipografi, bileşen stilleri ve responsive düzen.
- `src/components/marketing/`: Header, hero, HTML ürün görünümleri, anlatım bölümleri ve footer.
- `src/components/marketing/marketing-actions.tsx`: Demo/giriş açıklama pencereleri ve mobil menü.
- `src/components/marketing/dashboard-preview.tsx`: Yalnız örnek araçlarda arama ve durum filtreleri.
- `src/components/marketing/workflow-preview.tsx`: Klavye ile de kullanılabilen örnek servis aşamaları.
- `src/components/ui/`: SanayiPro token'larıyla uyarlanmış shadcn/ui Button ve Dialog.
- `src/lib/marketing-data.ts`: Örnek araç, ekip, stok, servis geçmişi, bakım ve FAQ verileri.
- `components.json`: shadcn/ui yapılandırması.
- `pnpm-lock.yaml`: Sabitlenmiş bağımlılık çözümü.

## Uygulama prototipi

### Müşteri, araç ve kabul aşaması

`/app/customers` ve `/app/customers/[id]` müşteri kayıtlarını ve ilişkili araçları; `/app/vehicles` ve `/app/vehicles/[id]` araçları, aktif iş emirlerini ve örnek servis geçmişini gösterir. `/app/vehicles/new` yeni müşteriyle veya seçilen mevcut müşteriyle araç oluşturur.

Dashboard, mobil menü, iş emri listesi ve sonuçsuz global arama `/app/intake` altındaki beş adımlı kabul akışını açar. Araç ve müşteri, kabul durumu, checklist, isteğe bağlı fotoğraflar, usta ve teslim hedefi tamamlandığında `RECEIVED` durumunda yerel bir demo iş emri oluşur. Hasar, checklist ve fotoğraflar iş emri detayında korunur; yeni kayıtlar global arama ve diğer listelerde görünür. Aynı plaka tekrar kaydedilemez ve aktif iş emri bulunan araca ikinci kabul açılamaz.

Kabulde JPG, PNG ve WebP seçilebilir (alan başına bir fotoğraf, en fazla 5 MB). Önizlemeler yalnız React state içinde data URL olarak tutulur; sunucuya dosya yüklenmez. Müşteri, araç, iş emri ve fotoğraf verileri uygulama içi gezinmede korunur; tam sayfa yenilemesinde sıfırlanır. Bu nedenle oturumda oluşturulmuş detay bağlantıları yenileme sonrasında açıklamalı boş durum gösterir.

`src/lib/intake-data.ts` kabul adımları, checklist, fotoğraf alanları ve ek örnek servis ziyaretlerini tanımlar. `src/components/records/` liste, detay ve kayıt formunu; `src/components/intake/` wizard'ı içerir. Yeni modül stilleri `src/app/app/records.css` içinde mevcut tasarım token'larını kullanır. Yeni bağımlılık veya backend eklenmemiştir.

- `src/app/app/`: Ayrı uygulama layout'u, dashboard, iş listesi ve dinamik iş emri sayfaları. Uygulama stilleri `application.css` dosyasında ayrı tutulur; landing page token'ları değiştirilmez.
- `src/components/app-shell/`: Responsive sidebar, üst bar, mobil menü ve demo state provider.
- `src/components/dashboard/`: Durum özetleri, operasyon listesi, randevular ve aksiyon uyarıları.
- `src/components/search/`: Ctrl/Cmd+K ile açılan, ok tuşları ve Enter ile kullanılabilen ilişkili araç araması.
- `src/components/work-orders/`: Filtreli liste, Kanban, yedi detay sekmesi ve yerel demo aksiyonları.
- `src/lib/demo-data.ts`: Tipler, iki örnek şube, müşteriler, araçlar, çalışanlar, durumlar ve iş emri verileri. Dörtyol'da 8, İskenderun'da 2 aktif örnek iş vardır.

Üç plaka biçimi (`31ABC123`, `31 ABC 123`, `31-ABC-123`), müşteri adı, telefon ve iş emri numarası aynı ilişkili sonuca ulaşır. Bilinmeyen plakada yalnız açıklama penceresi açan kabul aksiyonu gösterilir. Hazır olmayan modüller 404 sayfasına yönlendirmez.

Not, onay ve durum değişiklikleri yalnız React state içinde tutulur; uygulama içi gezinmede korunur ve tam sayfa yenilemesinde sıfırlanır. Demo iş verileri cookie, localStorage veya gerçek veritabanına yazılmaz. Kabul fotoğrafları yalnız bellekte önizlenir; tahsilat gerçek para işlemi yapmaz. Kimlik ve yetkili tenant seçimi ise ayrı backend temelinde Supabase ve HttpOnly cookie ile yönetilir. Kanban sürükle-bırak içermez.

Ana iş emrinin 8.500 TL hesabı, 2.000 TL işçilik ve 6.500 TL parça satırlarından oluşur. Kullanılmış parçaların 2.600 TL örnek maliyeti, 5.900 TL tahmini brüt kazancı verir. Rezerve temizleyicinin maliyeti tüketilmiş gibi sayılmaz. Kullanıcının verdiği kabul kilometresi (98.450), son servis örneğinden (99.200) düşük olduğu için Genel sekmesinde doğrulama uyarısı gösterilir. Bütün tarihler 21 Ekim 2026 örnek servis gününe göre sunulur.

## Bu aşamanın kapsamı

Supabase Auth ve Prisma tenant temeli hazırlanmıştır; müşteri, araç ve iş emri ekranları henüz gerçek database'e bağlı değildir. Mail, WhatsApp veya gerçek tahsilat servisi yoktur. Demo talep formu gönderilmez; Giriş Yap mevcut tasarım korunarak `/login` sayfasına açılır. Gerçek bağlantı bilgisi yokken giriş ve `/app` erişimi kapalıdır. Gerçek müşteri verisi kullanılmaz.

Bakım geri sayımı görünür örnek tarih olan 21 Ekim 2026'ya göre hesaplanır. Bu sayede tutarsız bir sabit gün sayısı gösterilmez. WhatsApp örneği açıkça planlanan entegrasyon olarak etiketlidir.

Font `@fontsource-variable/inter` ile yerelden sunulur. Build veya ziyaret sırasında Google Fonts isteği gerekmez. Harici görsel, takip servisi veya analiz aracı eklenmemiştir.

## Tasarım ve erişilebilirlik

1440, 1024, 768 ve 390 px hedefleri için düzenler bulunur. Mobilde dashboard'ın sidebar'ı ve ikincil sütunları kaldırılır; mockup bütünü ölçeklenmez. Metinli durumlar, klavye odağı, içeriğe geç bağlantısı, Radix dialog odak yönetimi, yerel FAQ disclosure'ları ve azaltılmış hareket desteği bulunur.

## Bileşen kaynağı

Button ve Dialog, [shadcn/ui new-york](https://ui.shadcn.com) bileşen yaklaşımından uyarlanmıştır; Radix erişilebilir etkileşim temellerini sağlar. Inter, OFL-1.1 lisanslıdır; lisans font paketindedir.
