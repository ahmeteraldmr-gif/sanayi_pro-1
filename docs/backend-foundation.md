# Backend temeli

Bu aşama Supabase Auth, Prisma ve tenant yetkilendirmesini kurar. Müşteri, araç ve iş emri ekranları hâlâ React demo state'ini kullanır. Demo şube seçicisi, demo kullanıcı adı ve demo rolü **gerçek yetki kaynağı değildir**; hiçbir veritabanı çağrısı bu değerlerle yetkilendirilmez.

## Proje henüz yokken

`.env.local` olmadan build, Prisma client üretimi ve `pnpm test:security` çalışır. `/` tanıtım sayfası açıktır. `/app` ve tüm alt sayfaları giriş sayfasına yönlenir; `/api/tenant/context` 503 döner. Gizli bir demo-login veya auth bypass anahtarı yoktur. Giriş formu bağlantı kurulana kadar kapalıdır. Gerçek Supabase giriş/refresh testi bir proje oluşturulduktan sonra yapılmalıdır.

## Gerçek Supabase kurulumu

1. Yeni Supabase projesi oluşturun. Auth email/password sağlayıcısını ve giriş yapacak doğrulanmış kullanıcıyı hazırlayın. Bu aşama herkese açık kayıt, davet gönderimi veya şifre sıfırlama eklemez.
2. `.env.example` dosyasını `.env.local` olarak kopyalayın. Gerçek proje URL'si ve **publishable key** (ya da legacy anon key) girin. `sb_secret_` ve JWT `service_role` anahtarları uygulama tarafından reddedilir. Auth için admin key gerekmez.
3. `prisma/bootstrap.sql` dosyasını yeni projenin yönetici SQL oturumunda gözden geçirip çalıştırın. Ayrı `sanayipro_migrator` ve `sanayipro_runtime` login'leri oluşturulur; parolalar dosyada yoktur. İki rolün farklı parolalarını güvenilir yönetim oturumunda/secret manager'da atayın. Mevcut güvensiz rol veya farklı schema sahibi bulunursa bootstrap durur; rolü sessizce genişletmez.
4. Gerçek bağlantıları yerel env dosyasına girin. `DATABASE_URL` yalnız `sanayipro_runtime` kullanır. `MIGRATION_DATABASE_URL` yalnız `sanayipro_migrator` kullanır. Supabase pooler kullanıcı adındaki `.project-ref` eki desteklenir. Bağlantılarda `schema=sanayipro` ve uzaktan bağlantıda `sslmode=verify-full` kullanın; paroladaki özel karakterleri URL-encode edin. TLS doğrulamasını kapatmayın. Sağlayıcının CA gereksinimini kendi bağlantı panelinden doğrulayın.
   Env dosyası `pg` formatını kullanır. Prisma CLI için `verify-full`, yalnız CLI yapılandırmasında `sslmode=require&sslaccept=strict` olarak çevrilir; sertifika/hostname doğrulaması korunur. Özel CA gerekiyorsa sağlayıcının sertifikasını güvenilir certificate store üzerinden hazırlayın; native Prisma ve Node/pg CA çözümlemesini gerçek projede ayrı doğrulayın.

5. Migration bağlantısında direct veya session pooler kullanın. Runtime bağlantısı transaction pooler kullanabilir; tenant/JWT context'i yalnız transaction-local `set_config(..., true)` ile aktarılır, oturum düzeyinde `SET` kullanılmaz.
6. `pnpm db:validate`, ardından **`pnpm db:migrate`** çalıştırın. Bu komut `prisma migrate deploy` kullanır. Migration tek transaction içinde uygulanır ve additive'dir; `DROP`, `TRUNCATE`, reset veya `db push` yoktur. Gerçek projeye burada migration uygulanmamıştır.
7. Auth kullanıcısının gerçek UUID'si ile yetkili yönetim ortamında bir işletme/şube oluşturun:

   ```sh
   pnpm tenant:provision --user <SUPABASE_AUTH_USER_UUID> --name "Ad Soyad" --organization "İşletme Adı" --branch "Şube Adı"
   ```

   CLI yalnız migration login'iyle çalışır, Auth'ta kullanıcı oluşturmaz veya mesaj göndermez. Profil, işletme, şube, owner rolü ve iki üyelik aynı transaction'da eklenir. Auth UUID'si yoksa FK işlemi geri alır. Mevcut profil pasifse kendiliğinden aktif edilmez. İkinci çağrı ikinci bir işletme oluşturur; existing tenant üzerinde gizli upsert/overwrite yapılmaz.
8. `pnpm dev` sonrası `/login` üzerinden giriş yapın. Yalnız gerçek aktif üyelik ve `app.access` izni olan şubeler seçilebilir. Seçim sunucuda yeniden kontrol edilip HttpOnly cookie'ye yazılır. Çıkış, `/auth/tenant` sayfasındaki POST formuyla yapılır.

Migration credential'ını **runtime deployment ortamına koymayın**. Build job'u bağımlılıkları ve generated Prisma client'ı üretir; migration job'u ayrı secret ile `db:migrate` çalıştırır. Web runtime yalnız Supabase public config ve kısıtlı `DATABASE_URL` alır. `.env.local` Git tarafından dışlanır.

## Gerçek proje doğrulaması

Yerel `.env.local` dosyasındaki dört bağlantı değişkenine ek olarak `SUPABASE_TEST_USER_A_EMAIL`, `SUPABASE_TEST_USER_A_PASSWORD`, `SUPABASE_TEST_USER_B_EMAIL`, `SUPABASE_TEST_USER_B_PASSWORD` tanımlayın. Bunlar Supabase Auth'ta önceden oluşturulmuş, e-postası doğrulanmış iki ayrı test hesabına aittir. Değerleri sohbete, loglara veya runtime deployment'a koymayın. Service-role key kullanılmaz.

Bootstrap ve rol parolaları yönetim oturumunda hazırlandıktan sonra sırasıyla:

```sh
pnpm db:validate
pnpm exec prisma migrate status
pnpm db:migrate
pnpm exec prisma migrate status
pnpm tenant:provision:demo
pnpm build
pnpm exec next start --hostname 127.0.0.1 --port 3210
# Ayrı terminal:
pnpm test:security:live --http-base http://127.0.0.1:3210
```

`tenant:provision:demo` gerçek Auth girişleriyle elde edilen UUID'lere bağlı, kalıcı iki **test işletmesi** ve her birinde bir atanmış/bir atanmamış test şubesi oluşturur. ID'ler deterministiktir; tekrar çalıştırmak yeni kopyalar üretmez. Mevcut kayıtları güncellemez veya silmez; uyuşmazlıkta durur. Normal müşteri/araç/iş emri verisi yazmaz. İki test işletmesi doğrulama sonrası test hesaplarıyla giriş yapmak için korunur.

`test:security:live` migration veya provisioning yapmaz. Gerçek Auth, Prisma runtime rolü, sekiz tabloda FORCE RLS, filtresiz tenant okumaları, sahte işletme/şube, atanmamış şube, izinler, yetkisiz yazma ve transaction context temizliğini doğrular. Yazma reddi denemesi her durumda rollback edilir. HTTP seçeneği yalnız localhost adresine cookie gönderir; anonim erişim reddini, tenant seçimi gereğini, yetkili `/app` erişimini, tenant API'sini ve RSC üzerinden sahte tenant reddini kontrol eder. Her test oturumu sonunda yalnız kendi Auth oturumundan çıkış yapılır; tokenlar saklanmaz/yazdırılmaz. Node `react-server` koşulu yalnız test komutunda gerçek server-only DAL'ı kullanmak içindir; uygulamanın yetki kontrolünü atlamaz.

Gerçek sunucu erişimi veya yerel değişkenler henüz yoksa canlı test **başarılı sayılmaz**. Offline `test:security` sonucu hosted Supabase sonucu olarak raporlanmamalıdır. Bu adımların gerçek çalışma durumu ayrıca raporlanır.

## Yetki sınırı

- `src/proxy.ts` her `/app` ve tenant API isteğinde Supabase `getUser()` ile kullanıcıyı doğrular; `getSession()`, istemci rolü veya header'daki user ID yetki kanıtı değildir. Anonymous Auth kullanıcıları kabul edilmez.
- Proxy'den bağımsız layout ve DAL kontrolü de vardır. Gelecekteki gerçek veri işlemleri `withTenantAuthorization(permission, callback)` kullanmalıdır; callback'in transaction'ı dışına query çıkarılmamalıdır.
- Profil, işletme, organization membership, şube ve branch membership aktif olmalı; rol izni gerekli işlemi karşılamalıdır. Owner da dahil her kullanıcı açık branch membership'e ihtiyaç duyar. Farklı işletmenin branch veya role ID'si composite FK'lerle bağlanamaz.
- Tenant cookie yalnız untrusted organization/branch ID seçimi taşır. Her istekte membership/permission yeniden sorgulanır. Cookie içindeki sahte user, role veya permission alanları kullanılmaz.
- Prisma role guard her transaction'da oturumun `sanayipro_runtime`, non-owner, `NOBYPASSRLS`, `NOINHERIT`, non-superuser ve salt-okunur olduğunu DB catalog üzerinden denetler. Yanlışlıkla fazla GRANT verilmiş runtime da fail-closed olur.
- Sekiz temel tabloda `ENABLE ROW LEVEL SECURITY` ve `FORCE ROW LEVEL SECURITY` vardır. Normal role yalnız SELECT verilir, runtime write policy yoktur. Provisioning'e yalnız ayrı maintenance rolünün açık RLS politikası izin verir. Normal kullanıcı işlemleri `SET ROLE`, `SECURITY DEFINER`, owner veya service-role bypass kullanmaz.
- `sanayipro` özel schema'dır. Supabase Data API'ye expose edilmez; `anon`, `authenticated`, `service_role` schema erişimi almaz. Doğrudan PostgREST client query'leri bu aşamanın parçası değildir.
- Runtime DB credential'ı güvenilir sunucu sınırıdır. Supabase tarafından doğrulanmış subject, bu sınır içinde transaction-local JWT claim olarak DB'ye iletilir. Bu credential istemciye/SQL editörüne verilmemeli; user ID alan herhangi bir public RPC veya serbest SQL arayüzü eklenmemelidir. RLS, ele geçirilmiş bir server credential'ın kendi başına JWT imzasını doğrulayacağı anlamına gelmez.
- Auth/tenant yanıtları `private, no-store` ve `Vary: Cookie` kullanır; protected routes ISR/full-route cache kullanmaz. React `cache()` yalnız tek server request içinde kullanılır; Prisma pool process-wide olabilir, kullanıcı/tenant context'i olamaz.

## Güvenlik testleri

```sh
pnpm test:security
pnpm typecheck
pnpm lint
pnpm build
```

Testler PGlite içinde gerçek PostgreSQL engine'inde **aynı bootstrap ve migration SQL'ini** uygular; query/mock SQL simülasyonu değildir. İki demo organization, atanmamış şube, farklı roller, pasif profil ve iki işletmeye üyeliği olan test kullanıcısı yalnız geçici test DB'sinde oluşturulur. Test `auth.users`/`auth.uid()` karşılığı da yalnız bu DB'ye özeldir; production migration Supabase Auth tablolarını oluşturmaz/değiştirmez.

Kapsam: A/B izolasyonu, çıplak WHERE'siz query'ler, sahte tenant/branch cookie seçimi, aynı işletmede yetkisiz şube, rol izni, pasif üyelik, profil izolasyonu, cross-tenant FK, yetkisiz yazma, yanlış GRANT altında RLS, runtime role guard, connection context temizliği ve eksik secret altında kapalı erişim.

Bunlar hosted Supabase Auth login/refresh veya gerçek pooler/TLS bağlantı testi yerine geçmez. Proje açıldığında bunlar gerçek test kullanıcılarıyla ayrıca doğrulanmalıdır. Demo UI state'i gerçek veri modeline taşınmadan önce her yeni tablo için organization/branch FK, RLS, permission ve izolasyon testleri birlikte eklenmelidir. Gelecekteki Prisma migration diff'leri manuel Auth FK ve SQL policy'lerini koruyacak biçimde incelenmelidir; reset/push kullanılmamalıdır.

## Referanslar

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Supabase session/caching davranışı](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Prisma 7 yapılandırması](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
- [Prisma PostgreSQL driver adapter](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)
- [PGlite PostgreSQL API](https://pglite.dev/docs/api)



