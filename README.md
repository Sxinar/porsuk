# 🦫 Porsuk - Temiz Okuma Modu

**Motto:** "İnternetin tozunu pasını kazar, sana sadece huzurlu bir okuma bırakır."

Porsuk, web sayfalarını reklam, çerez bannerları ve gereksiz görsel kirlilikten arındıran, **gizlilik odaklı** ve **maliyetsiz** bir "Reader Mode" uygulamasıdır.

## 🛠️ Teknik Yığın

* **Framework:** Next.js 15 (App Router)
* **Styling:** Tailwind CSS + shadcn/ui
* **Parsing:** `@mozilla/readability` + `jsdom` 
* **Theme:** Toprak tonları (amber, stone, brown) - Karanlık mod

## 🚀 Başlarken

```bash
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışır.

## ✅ Mevcut Özellikler (Aşama 1)

- **Gelişmiş Temizleme Motoru:** `@mozilla/readability` ile içerik temizleme
- **Fallback Sistem:** Readability başarısız olduğunda manuel içerik çıkarma
- **Gelişmiş Hata Yönetimi:** Spesifik hata mesajları ve timeout handling
- **API Endpoint:** `/api/porsukla` - URL temizleme servisi
- **Modern UI:** shadcn/ui bileşenleri
- **Karanlık Tema:** Toprak tonları ile göz yormayan tasarım
- **Yükleme Animasyonu:** Skeleton bileşeni
- **Biçimlendirme:** Otomatik paragraf, başlık ve liste formatlama
- **Bot Koruması:** Gelişmiş User-Agent ve header'lar

## 🔧 Kullanım

1. Herhangi bir makale URL'sini girin
2. "Porsukla" butonuna tıklayın
3. Temizlenmiş ve biçimlendirilmiş içeriği okuyun

## 🐛 Hata Çözümleri

- **"Could not access this URL"**: Site botları engelliyor olabilir
- **"Request timeout"**: Site çok yavaş yanıt veriyor
- **"Could not extract content"**: Sayfa yapısı desteklenmiyor
- **"Invalid URL format"**: URL formatı hatalı

## 📋 Yapılacaklar (Aşama 2)

- [ ] Supabase entegrasyonu
- [ ] Kullanıcı auth sistemi (şimdilik misafir erişimi)
- [ ] Okuma listesi ve kitaplık
- [ ] Metin boyutu ve font ayarları
- [ ] PWA özellikleri
- [ ] Paylaşım fonksiyonu

## 📝 Notlar

- 15 saniye timeout ile sitelerin yanıt süresi kontrol edilir
- Türkçe dil desteği ve yerel hata mesajları
- Otomatik içerik biçimlendirme (paragraflar, başlıklar, listeler)
- CSS uyarıları görünebilir ama uygulama sorunsuz çalışır
