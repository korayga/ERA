# ERA – Earthquake Relief Assistant

**Akıllı Afet Yardım Platformu | Hackathon Projesi**

---

# Tanıtım

Depremler yalnızca fiziksel yıkıma yol açmakla kalmaz, aynı zamanda bilgi kirliliği, iletişim kopukluğu ve organizasyonel dağınıklık gibi ikincil krizleri de beraberinde getirir. 6 Şubat 2023'te meydana gelen Kahramanmaraş merkezli depremler bu durumu acı şekilde gözler önüne sermiştir. Bu gerçeklikten yola çıkarak geliştirilen **ERA (Earthquake Relief Assistant)**, afet anında ve sonrasında hayat kurtaracak verileri toplayan, işleyen ve sahaya sunan bir dijital çözüm sunar.

# Özellikler

* **Sesli Yardım Çağrısı:** Kullanıcıdan alınan ses kaydı, GPS verisiyle birleştirilir ve analiz edilerek yardım özeti çıkarılır.
* **Harita Tabanlı Görselleştirme:** Gıda, barınma, tıbbi yardım gibi destek noktaları OpenStreetMap tabanlı interaktif haritada gösterilir.
* **Kullanıcı Rolleri:** Giriş yapmayan kullanıcılar acil yardım çağrısı yapabilirken, giriş yapan kullanıcılar harita üzerinde bilgi işaretleyebilir.
* **Gerçek Zamanlı Veri Akışı:** Tüm noktalar harita üzerinde anlık güncellenir.
* **Gizlilik Odaklı:** Acil çağrılar için kullanıcı girişi zorunlu değildir.

# Kullanım Senaryosu

> **Senaryo: Enkaz Altındaki Birey**
>
> Ayşe, bir depremde evinin enkazı altında kalır. Telefonu elindedir. ERA uygulamasını açar, giriş yapmadan sadece “Acil Yardım” tuşuna basar. Sesini kaydeder: “Ayşe ben, sesimi duyan var mı? Üçüncü kattayım, sol kolum kırık.” Uygulama, konumunu alır, sesi kaydeder ve AWS altyapısına gönderir. Ses yazıya çevrilir, yardım özeti çıkarılır ve haritada işaretlenir. Arama kurtarma ekipleri haritadan bu noktayı görüp ulaşır.

# Teknoloji ve Altyapı

## Mobil (Frontend)

* **React Native (Expo):** Platformlar arası hızlı mobil geliştirme
* **react-native-maps:** Harita entegrasyonu
* **expo-av, expo-location:** Ses ve konum verisi alma
* **aws-amplify:** Cognito ile kullanıcı yönetimi

## Backend (Serverless - AWS)

* **AWS Lambda (Python):** Olay tabanlı fonksiyonlar
* **Amazon API Gateway:** HTTP istek yönetimi
* **Amazon S3:** Ses, konum ve transkript verisi saklama
* **Amazon Transcribe:** Ses -> Metin
* **Amazon Bedrock (Claude 3):** Metin -> Yapılandırılmış yardım özeti
* **Amazon DynamoDB:** Coğrafi veriler için NoSQL veritabanı

## Diğer

* **Geohash Algoritması:** Coğrafi yakınlık tabanlı sorgular
* **Python (boto3):** AWS SDK

# Sistem Mimarisi

ERA iki temel veri akışı üzerine kuruludur:

## 1. Sesli Yardım Çağrısı Akışı

* Mobil uygulama ses ve konum verisini toplar.
* Veriler base64 ile API Gateway'e gönderilir.
* Lambda, verileri işleyerek S3'e kaydeder.
* Transcribe ve Bedrock sırasıyla ses analizi yapar.
* JSON çıktısı DynamoDB'ye kaydedilir.

## 2. Harita Noktası Ekleme

* Kullanıcılar yardım noktası (gıda, barınma vb.) ekler.
* Noktalar Geohash'e çevrilerek DynamoDB'ye yazılır.
* Haritada filtreleme için prefix sorgusu yapılır.

# Kurulum ve Çalıştırma

```bash
# Projeyi klonlayın
git clone https://github.com/kullaniciniz/era.git
cd era

# Gerekli bağımlılıkları yükleyin
npm install

# Mobil uygulamayı çalıştırın
npx expo start
```

> **Not:** AWS hizmetlerini kullanabilmek için `.env` dosyasına erişim bilgileri girilmelidir.

# Test Stratejisi

* **Backend:** Python `unittest`, `pytest`, `moto`
* **Frontend:** Jest & React Native Testing Library
* **Entegrasyon:** Tüm Lambda zinciri uçtan uca test edilmiştir

# Gizlilik ve Etik

ERA, afet anlarında hayati verileri işlerken kullanıcı gizliliğini öncelikli olarak ele alır:

* Konum ve ses kayıtları yalnızca yardım amacıyla işlenir.
* Kullanıcı girişi zorunlu değildir.
* Tüm veriler güvenli şekilde AWS üzerinden saklanır.

# Gelecek Geliştirmeler

* Push bildirim sistemi
* Afet bölgelerine göre otomatik uyarılar
* Web tabanlı yönetim paneli (resmi kurumlar için)
* Veri analiz ve görselleştirme araçları
* Sel, yangın gibi afet türlerine uyarlama

# Hackathon Bilgisi

Bu proje, Dijital Deprem Çözümleri Hackathonu kapsamında 24 saat içinde geliştirildi.

# Geliştiriciler
* Koray GARİP
* Ahmet YUMUTKAN
* Alihan GÜNDOĞDU
* Kerem ÖZCAN



**"Teknoloji doğru kullanıldığında, hayat kurtarır."**
