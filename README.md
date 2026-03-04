# 🦫 Porsuk - Temiz Okuma Ortamı

Porsuk; URL, haber ana sayfası veya RSS kaynağı alıp tracker/çerez kalıntılarını temizleyen ve içeriği okunabilir hale getiren gizlilik odaklı bir okuyucudur.

## Kullanılan Teknolojiler

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Parsing:** `@mozilla/readability` + `jsdom`
- **Tema:** Toprak tonları (dark)

## Başlarken

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışır.

## Özellikler

- Makale temizleme (Reader Mode)
- RSS/Atom feed algılama
- Haber liste sayfası algılama (ana sayfa URL’lerini kartlı haber akışına çevirme)
- Ayarlardan yönetilen öneri kaynak butonları (çoklu seçim)
- Hacker News + teknoloji/haber kaynak paketi (ayarlardan tek tık eklenebilir)
- Ana sayfada öneri kaynaklarından çoklu seçim ve toplu tarama
- Arama kutusunda çoklu URL desteği (virgül / satır ayrımı)
- Kaynak filtresi (çoklu seçim, hızlı sıfırlama)
- Bugünün haberleri filtresi
- Sessiz mod (minimal haber kart görünümü)
- Görsel + okuma süresi gösterimi
- AI kullanmadan özetleme (ilk cümlelerden çıkarım)
- Tracker arındırma raporu (aç/kapat, detaylı metrikler, amaç açıklamaları)
- URL önerileri ve geçmişi
- Tarayıcı uzantısı (Chrome ve Firefox için ayrı paketler) ile `Porsuk ile Oku`
- Ayarlardan öneri kaynaklarını gizleme/gösterme
- `/settings` sayfası: kaynak ekle/sil, geçmiş kaydını kapat/aç, analiz görünürlüğü

## Kullanım

1. URL girin veya hazır kaynaklardan birini seçin (çoklu arama için URL'leri virgül ya da alt satırla ayırın)
2. `Porsukla` butonuna basın
3. Gelen içerik:
   - Makale ise temiz okuma görünümü
   - RSS/liste ise haber kartları
4. Kartlarda filtre, bugünün haberleri ve sessiz modu kullanın
5. Rapor kartında `Raporu Kapat/Raporu Aç` ile analiz görünürlüğünü yönetin
6. `Ayarlar` sayfasından:
   - Ana sayfa öneri kaynaklarını düzenleyin ve çoklu seçim yapın
   - `Önerilenleri Ekle` ile hazır kaynak paketini yükleyin
   - Geçmiş kaydını aç/kapatın
   - Analiz sonuçlarını aç/kapatın
7. Ana sayfada öneri kaynaklarından birden fazla seçip `Seçilenleri Tara` ile birleşik akış alın.

## Tarayıcı Araç Çubuğuna Modern Ekleme (Uzantı)

### Chrome / Edge / Brave
1. `chrome://extensions` veya `edge://extensions` açın.
2. `Developer mode` açın.
3. `Load unpacked` ile `public/extensions/chrome` klasörünü seçin.
4. Uzantı ayarından Porsuk adresinizi tanımlayın (varsayılan: `https://porsuk.vercel.app`).

Detay: `public/extensions/chrome/README.md`  
Hazır paket: `public/extensions/chrome/porsuk-chrome-extension.zip`

### Firefox
1. `about:debugging#/runtime/this-firefox` açın.
2. `Load Temporary Add-on` seçin.
3. `public/extensions/firefox/manifest.json` dosyasını yükleyin.
4. Not: Doğrulanmamış uzantılar Firefox'ta kalıcı kurulumda engellenebilir; kalıcı dağıtım için AMO imzası gerekir.

Detay: `public/extensions/firefox/README.md`  
Hazır paket: `public/extensions/firefox/porsuk-firefox-extension.zip`

## Dosyalar Ne İşe Yarıyor?

- `src/app/page.tsx`: Ana arayüz, modern haber paneli, kaynak filtresi, sessiz mod, rapor aç/kapat
- `src/app/settings/page.tsx`: Ayarlar ekranı, kaynak yönetimi, öneri görünürlüğü, geçmiş/analiz tercihleri, uzantı kurulum paneli
- `src/app/api/porsukla/route.ts`: URL işleme, feed/liste/makale tespiti, tracker temizleme, özet + okuma süresi üretimi, detay metrikleri
- `src/lib/app-settings.ts`: Kalıcı ayar modeli ve localStorage yardımcıları
- `public/extensions/chrome/*`: Chromium tabanlı tarayıcılar için uzantı + ZIP
- `public/extensions/firefox/*`: Firefox için ayrı uzantı + ZIP
- `src/app/globals.css`: Tema ve içerik tipografi stilleri
- `src/app/layout.tsx`: Uygulama kabuğu, global metadata ve font tanımları
- `src/components/ui/*`: shadcn tabanlı ortak UI bileşenleri
- `README.md`: Kurulum, özellikler ve mimari özet

## Not

- İstek zaman aşımı: 15 saniye
- Takip parametreleri (`utm_*`, `fbclid`, `gclid`, vb.) temizlenir
- Bazı siteler bot koruması nedeniyle içerik döndürmeyebilir
- Ayarlar ve geçmiş, tarayıcı `localStorage` üzerinde saklanır
