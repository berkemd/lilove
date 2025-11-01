# 📱 LiLove iOS App Store Yayınlama Rehberi

## ✅ MEVCUT DURUM

### Tamamlananlar:
- ✅ Build #37 TestFlight'a yüklendi
- ✅ Tüm App Store görselleri hazırlandı (16 adet)
- ✅ İngilizce ve Türkçe metadata hazır
- ✅ Fastlane otomasyon konfigürasyonu

### Şimdi Yapılması Gerekenler:
- 📝 App Store Connect'te metadata girişi
- 💳 In-App Purchase ürünlerini oluşturma
- 🔐 RevenueCat entegrasyonu
- 📤 App Store Review'a gönderme

---

## 🚀 ADIM 1: APP STORE CONNECT GİRİŞ

1. **App Store Connect'e gidin:**
   https://appstoreconnect.apple.com

2. **Giriş yapın:**
   - Apple ID: brkekahraman@icloud.com
   - Şifreniz ile giriş yapın

3. **LiLove uygulamasını açın:**
   - "My Apps" → "LiLove"
   - Build #37'nin işlendiğini görmelisiniz

---

## 💳 ADIM 2: IN-APP PURCHASE OLUŞTURMA

### App Store Connect'te:

1. **In-App Purchases sekmesine gidin**
2. **"+" butonuna tıklayın**
3. **Aşağıdaki 4 ürünü tek tek oluşturun:**

### Premium Monthly Subscription:
```
Type: Auto-Renewable Subscription
Reference Name: Premium Monthly
Product ID: lilove_premium_monthly
Subscription Group: Premium
Price: Tier 10 ($9.99)
Turkish Price: ₺349.99
```

### Premium Yearly Subscription:
```
Type: Auto-Renewable Subscription  
Reference Name: Premium Yearly
Product ID: lilove_premium_yearly
Subscription Group: Premium
Price: Tier 50 ($99.99)
Turkish Price: ₺3499.99
Promotional: Save 17%
```

### Team Monthly Subscription:
```
Type: Auto-Renewable Subscription
Reference Name: Team Monthly
Product ID: lilove_team_monthly
Subscription Group: Teams
Price: Tier 20 ($19.99)
Turkish Price: ₺699.99
```

### Team Yearly Subscription:
```
Type: Auto-Renewable Subscription
Reference Name: Team Yearly
Product ID: lilove_team_yearly
Subscription Group: Teams
Price: Tier 60 ($199.99)
Turkish Price: ₺6999.99
Promotional: Save 17%
```

### Her ürün için:
1. **Localization ekleyin:**
   - English: Description ve Name
   - Turkish: Açıklama ve İsim
2. **Review screenshot ekleyin** (herhangi bir app screenshot'ı kullanın)
3. **Save**

---

## 🔐 ADIM 3: REVENUECAT KURULUMU

### RevenueCat Dashboard:

1. **RevenueCat'e gidin:** https://app.revenuecat.com
2. **Giriş yapın veya hesap oluşturun**
3. **New Project → LiLove**

### Configuration:
```
App Name: LiLove
Platform: iOS
Bundle ID: org.lilove.app
App Store Connect Shared Secret: [App Store Connect'ten alın]
```

### Products:
1. **Products sekmesine gidin**
2. **Her IAP için:**
   - Add Product
   - Product ID'yi girin (yukarıdaki listeden)
   - App Store Connect ile senkronize edin

### API Key:
1. **Project Settings → API Keys**
2. **Public API Key'i kopyalayın**
3. **Bu key'i Replit secrets'a ekleyin:**
   - Name: `REVENUECAT_PUBLIC_KEY`
   - Value: [Kopyaladığınız key]

---

## 📝 ADIM 4: APP STORE METADATA GİRİŞİ

### App Store Connect → App Information:

#### General Information:
```
Name: LiLove - AI Life Coach
Subtitle: Transform with AI Coaching
Category: Health & Fitness
Secondary: Lifestyle
Content Rights: No third-party content
Age Rating: 4+
```

#### Pricing & Availability:
```
Price: Free
Availability: All Countries
```

#### App Privacy:
1. **Privacy Policy URL:** https://lilove.org/privacy
2. **Data Collection:** Yes
   - Contact Info (Account creation)
   - Identifiers (Analytics)
   - Usage Data (Analytics)
3. **Data Usage:** 
   - App Functionality
   - Analytics

### Version 1.0.0 Information:

#### Description (English):
```
[attached_assets/app-store/metadata/app-store-listing.md içindeki English description'ı kopyalayın]
```

#### Description (Turkish):
```
[attached_assets/app-store/metadata/app-store-listing.md içindeki Turkish description'ı kopyalayın]
```

#### Keywords:
```
English: ai coach,life coach,habit tracker,goal setting,personal growth,mindfulness,wellness,self care,motivation
Turkish: ai koç,yaşam koçu,alışkanlık takibi,hedef belirleme,kişisel gelişim,farkındalık,sağlık,motivasyon
```

#### Support URL:
```
https://lilove.org/support
```

#### Marketing URL:
```
https://lilove.org
```

#### What's New:
```
Version 1.0.0 - Hello, World!
• Introducing LiLove - Your AI Life Coach
• Personalized AI coaching conversations
• Smart goal and habit tracking
• Team collaboration features
• Beautiful analytics dashboard
• Daily motivational insights
• Premium subscription options
• Support for iOS 13.4 and above
```

---

## 🖼️ ADIM 5: SCREENSHOT YÜKLEME

### App Store Connect → Media Manager:

#### iPhone 6.7" Display:
1. **Upload 5 screenshots:**
```
attached_assets/app-store/screenshots/iphone-6.7/01-welcome.png
attached_assets/app-store/screenshots/iphone-6.7/02-ai-coach.png
attached_assets/app-store/screenshots/iphone-6.7/03-dashboard.png
attached_assets/app-store/screenshots/iphone-6.7/04-teams.png
attached_assets/app-store/screenshots/iphone-6.7/05-analytics.png
```

#### iPhone 5.5" Display:
1. **Upload 5 screenshots:**
```
attached_assets/app-store/screenshots/iphone-5.5/01-welcome.png
attached_assets/app-store/screenshots/iphone-5.5/02-ai-coach.png
attached_assets/app-store/screenshots/iphone-5.5/03-dashboard.png
attached_assets/app-store/screenshots/iphone-5.5/04-teams.png
attached_assets/app-store/screenshots/iphone-5.5/05-analytics.png
```

#### iPad Pro 12.9" Display:
1. **Upload 5 screenshots:**
```
attached_assets/app-store/screenshots/ipad-12.9/01-welcome.png
attached_assets/app-store/screenshots/ipad-12.9/02-ai-coach.png
attached_assets/app-store/screenshots/ipad-12.9/03-dashboard.png
attached_assets/app-store/screenshots/ipad-12.9/04-teams.png
attached_assets/app-store/screenshots/ipad-12.9/05-analytics.png
```

#### App Icon:
```
attached_assets/app-store/icon-1024x1024.png
```

---

## 🔍 ADIM 6: APP REVIEW BİLGİLERİ

### App Review Information:

#### Contact Information:
```
First Name: Berke
Last Name: Kahraman
Email: brkekahraman@icloud.com
Phone: +90 532 XXX XXXX [Telefon numaranızı girin]
```

#### Sign-In Information:
```
Username: demo@lilove.org
Password: DemoLiLove2025!
```

#### Notes for Reviewer:
```
Thank you for reviewing LiLove!

To experience the full app:
1. Use the demo account above or create a new account
2. The AI coach will guide you through onboarding
3. Try creating a goal and chatting with the AI
4. Premium features can be tested with the demo account

The app uses RevenueCat for subscription management and includes both free and premium tiers. All content is appropriate for all ages and focuses on personal development and wellbeing.

For any questions during review, please contact: brkekahraman@icloud.com
```

---

## 📤 ADIM 7: REVIEW'A GÖNDERME

### Son Kontroller:
- [ ] Tüm screenshot'lar yüklendi
- [ ] Description İngilizce ve Türkçe girildi
- [ ] Keywords girildi
- [ ] Support/Privacy URL'leri girildi
- [ ] In-App Purchase'lar oluşturuldu
- [ ] App Review bilgileri dolduruldu
- [ ] Build #37 seçili

### Submit for Review:
1. **"Submit for Review" butonuna tıklayın**
2. **Export Compliance:**
   - Does your app use encryption? **NO**
3. **Advertising Identifier:**
   - Does your app use IDFA? **NO**
4. **Content Rights:**
   - Does your app contain third-party content? **NO**
5. **Submit**

---

## 🎯 OTOMATİK YAYIN (OPSİYONEL)

Eğer manuel adımları yapmak istemezseniz, Fastlane ile otomatik gönderim:

```bash
cd mobile

# Apple API Key dosyasını oluşturun
echo "[API_KEY_CONTENT]" > AuthKey_725AYMVS7J.p8

# Metadata'yı gönderin
fastlane submit_metadata

# Review'a gönderin
fastlane submit_for_review
```

**Not:** API Key'i App Store Connect → Users → Keys'den alabilirsiniz.

---

## ⏰ BEKLENEN SÜRE

- **Processing:** 5-10 dakika (zaten tamamlandı)
- **Waiting for Review:** 24-48 saat
- **In Review:** 1-3 saat
- **Ready for Sale:** Review onayından hemen sonra

---

## 📞 DESTEK

Herhangi bir sorun yaşarsanız:
- Apple Developer Support: https://developer.apple.com/support/
- RevenueCat Support: support@revenuecat.com
- Bana ulaşın: Tüm adımları takip ettim

---

## ✅ KONTROL LİSTESİ

- [ ] In-App Purchase ürünleri oluşturuldu
- [ ] RevenueCat konfigürasyonu tamamlandı
- [ ] App Store metadata girildi
- [ ] Screenshot'lar yüklendi
- [ ] App Review bilgileri dolduruldu
- [ ] Submit for Review tıklandı
- [ ] Apple'dan onay bekleniyor

---

**🎉 TEBRİKLER! App Store yayın süreci başlatıldı!**

Apple genellikle 24-48 saat içinde review yapar. Onaylandıktan sonra uygulama otomatik olarak App Store'da yayınlanacak!