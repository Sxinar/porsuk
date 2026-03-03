# 🦫 Porsuk - Temiz Okuma Ortamı

Porsuk senin için istediğin sayfayı tarar istek ve takipçi kodlarını siler,sana sadece takipcisiz bir okuma bırakır.

Porsuk, web sayfalarını reklam, çerez bannerları ve gereksiz görsel kirlilikten arındıran, **gizlilik odaklı** ve **maliyetsiz** bir "Reader Mode" uygulamasıdır.

##  Kullanılan Teknolijiler

* **Framework:** Next.js 15 (App Router)
* **Styling:** Tailwind CSS + shadcn/ui
* **Parsing:** `@mozilla/readability` + `jsdom` 
* **Theme:** Toprak tonları (amber, stone, brown) - Karanlık mod

## Başlarken

```bash
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışır.

## Özellikler

- **Gelişmiş Temizleme Motoru:** `@mozilla/readability` ile içerik temizleme
- **Fallback Sistem:** Readability başarısız olduğunda manuel içerik çıkarma
- **Gelişmiş Hata Yönetimi:** Spesifik hata mesajları ve timeout handling
- **API Endpoint:** `/api/porsukla` - URL temizleme servisi
- **Modern UI:** shadcn/ui bileşenleri
- **Karanlık Tema:** Toprak tonları ile göz yormayan tasarım
- **Yükleme Animasyonu:** Skeleton bileşeni
- **Biçimlendirme:** Otomatik paragraf, başlık ve liste formatlama
- **Bot Koruması:** Gelişmiş User-Agent ve header'lar

##  Kullanım

1. Herhangi bir makale URL'sini girin
2. "Porsukla" butonuna tıklayın
3. Temizlenmiş ve biçimlendirilmiş içeriği okuyun

##  Hata Çözümleri

- **"Could not access this URL"**: Site botları engelliyor olabilir
- **"Request timeout"**: Site çok yavaş yanıt veriyor
- **"Could not extract content"**: Sayfa yapısı desteklenmiyor
- **"Invalid URL format"**: URL formatı hatalı

##  Yapılacaklar

- [ ] Supabase entegrasyonu
- [ ] Kullanıcı auth sistemi (şimdilik misafir erişimi)
- [ ] Okuma listesi ve kitaplık
- [ ] Metin boyutu ve font ayarları
- [ ] PWA özellikleri
- [ ] Paylaşım fonksiyonu
- [ ] Otomatik URL tamamlama ve önerileri

## Not

- 15 saniye timeout ile sitelerin yanıt süresi kontrol edilir
- Türkçe dil desteği ve yerel hata mesajları
- Otomatik içerik biçimlendirme (paragraflar, başlıklar, listeler)
- CSS uyarıları görünebilir ama uygulama sorunsuz çalışır


Kendime not: İleride isim kazıma ve sinsi ozelliginden dolayı Sansar olabilir ve kullanıcılar icin hafif ve kolay selfhost edilebilen bir rss uygulamasina dondurulebilir.
