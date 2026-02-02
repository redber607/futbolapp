# 🏆 FutbolApp - SofaScore Style Live Score App

SofaScore tarzı, premium tasarıma sahip gerçek zamanlı futbol canlı skor uygulaması.

## 🚀 Özellikler
- **Canlı Skorlar:** Gerçek zamanlı (simüle veya API bazlı) maç takibi.
- **Maç Detayları:** Tıklanabilir maç kartları ile taktik diziliş ve istatistik paneli.
- **Premium UI:** Koyu tema, glassmorphism efektleri ve akıcı animasyonlar.
- **API Entegrasyonu:** API-Football (RapidAPI) desteği.

## 🛠 Kurulum ve Çalıştırma
Uygulama Vanilla JS/CSS ile yapıldığı için herhangi bir sunucuda doğrudan çalışabilir.

1. Bağımlılıkları yükleyin (Opsiyonel - `serve` için):
   ```bash
   npm install
   ```
2. Uygulamayı başlatın:
   ```bash
   npm start
   ```

## 🌐 Deploy (Vercel / Netlify)
Bu projeyi saniyeler içinde yayına alabilirsiniz:

### Vercel
1. Proje klasörünü GitHub'a yükleyin.
2. [Vercel](https://vercel.com/) üzerinden "New Project" deyin.
3. Reponuzu seçin ve "Deploy" butonuna basın.

### Netlify
1. Proje klasörünü Netlify dashboard'una sürükleyip bırakın.
2. Veya GitHub entegrasyonunu kullanın.

## 🔑 API Ayarları
Gerçek verileri aktif etmek için `app.js` içerisindeki `API_CONFIG` objesini güncelleyin:
```javascript
const API_CONFIG = {
    ENABLED: true,
    KEY: 'YOUR_RAPIDAPI_KEY',
    // ...
};
```
