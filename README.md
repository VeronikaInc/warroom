# 🎖️ WAR ROOM — Kişisel Stratejik Komuta Merkezi

Askeri temayla tasarlanmış kişisel verimlilik uygulaması. **IndexedDB** yerel veritabanı ile çalışır, **Capacitor** ile native Android uygulamasına dönüşür.

## 📱 Telefona Kurulum (3 Adım)

### Adım 1: GitHub'a yükle
```bash
# Yeni repo oluştur: https://github.com/new
# Repo adı: warroom

git init
git add .
git commit -m "🎖️ War Room v1.0"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/warroom.git
git push -u origin main
```

### Adım 2: APK otomatik build edilecek
GitHub'a push ettikten sonra **Actions** sekmesine git. `Build Android APK` workflow'u otomatik çalışacak. ~3-5 dakika sürer.

### Adım 3: APK'yı indir ve kur
1. GitHub repo > **Actions** > Son başarılı build'e tıkla
2. **Artifacts** bölümünden `warroom-debug` indir
3. ZIP'i aç, `app-debug.apk` dosyasını telefonuna aktar
4. Telefonunda: **Ayarlar > Güvenlik > Bilinmeyen Kaynaklar**'ı aç
5. APK'yı aç ve kur

> 💡 **Alternatif:** Repo'nun **Releases** bölümünde de APK otomatik oluşturulur.

## 🏗️ Proje Yapısı

```
warroom/
├── src/
│   ├── main.jsx          # Entry point
│   ├── App.jsx           # Ana uygulama + tüm ekranlar
│   ├── db.js             # IndexedDB veritabanı katmanı
│   ├── Icons.jsx         # SVG ikon kütüphanesi
│   └── UI.jsx            # Paylaşılan UI bileşenleri
├── android/              # Capacitor Android projesi
├── .github/workflows/    # Otomatik APK build
├── capacitor.config.json # Capacitor yapılandırması
├── vite.config.js        # Vite build yapılandırması
└── index.html            # HTML entry
```

## 💾 Veritabanı (IndexedDB)

localStorage yerine **IndexedDB** kullanır:
- **6 tablo:** operations, directives, intel, pt, operation_logs, reminders
- **İndexlenmiş sorgular** — hızlı arama ve filtreleme
- **Büyük veri desteği** — localStorage'ın 5MB limitinden bağımsız
- **Yapılandırılmış** — foreign key benzeri ilişkiler, cascade delete

## 🖥️ Lokal Geliştirme

```bash
npm install
npm run dev         # http://localhost:3000
npm run build       # Production build
npm run cap:sync    # Android sync
npm run cap:open    # Android Studio'da aç
```

## 🔧 Android Studio ile Build (Manuel)

Eğer Android Studio kuruluysa:
```bash
npm run build
npx cap sync android
npx cap open android
```
Android Studio'da **Build > Build Bundle(s) / APK(s) > Build APK(s)** seç.

## 📋 Özellikler

- **Brifing** — Günlük özet, motivasyon sözleri, kritik uyarılar
- **Operasyonlar** — Proje yönetimi, ilerleme takibi, yorum/günlük sistemi
- **Direktifler** — Görev yönetimi, öncelik filtreleme, operasyona bağlama
- **İstihbarat** — Not, fikir, araştırma, iletişim kayıtları
- **Fiziksel Hazırlık** — Antrenman günlüğü, set/tekrar/ağırlık takibi
- **Hatırlatıcılar** — Görevlere zamanlı hatırlatıcı ekleme
- **Bildirimler** — Yerel bildirim desteği

---
**BOZBEY Labs** tarafından geliştirilmiştir.
