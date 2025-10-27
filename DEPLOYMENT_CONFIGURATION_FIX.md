# LiLove Production Deployment - Custom Domain Konfigürasyon Rehberi

## Mevcut Durum
- ✅ Build başarılı (dist/ klasöründe production dosyaları hazır)
- ✅ Kod tarafında sıfır hata
- ❌ lilove.org custom domain'de API routing sorunu

## Sorunun Kaynağı

Custom domain (lilove.org) muhtemelen Google Cloud Platform veya Firebase Hosting üzerinden host ediliyor. Ancak routing kuralları yalnızca birkaç endpoint'i Express backend'e yönlendiriyor, geri kalanlar statik SPA'ya düşüyor.

## Çözüm Adımları

### Seçenek 1: Google Cloud Load Balancer Konfigürasyonu

Google Cloud Console'da:

1. **Load Balancing** > **Backend Services**'e git
2. Express backend service'ini bul
3. **Frontend Configuration** > **Host and path rules** kısmını düzenle
4. Şu kuralları ekle:

```yaml
Host: lilove.org
Path rules:
  - /api/* → express-backend-service
  - /api/** → express-backend-service  
  - /healthz → express-backend-service
  - /* → static-frontend-service (default)
```

### Seçenek 2: Firebase Hosting Konfigürasyonu

Eğer Firebase Hosting kullanıyorsanız, `firebase.json` oluşturun:

```json
{
  "hosting": {
    "public": "dist/public",
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "lilove-backend",
          "region": "us-central1"
        }
      },
      {
        "source": "/healthz",
        "run": {
          "serviceId": "lilove-backend"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/api/**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          }
        ]
      }
    ]
  }
}
```

Sonra deploy edin:
```bash
firebase deploy --only hosting
```

### Seçenek 3: Nginx Reverse Proxy (Eğer kullanıyorsanız)

`/etc/nginx/sites-available/lilove.org`:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name lilove.org;

    # SSL konfigürasyonu...

    # API endpoint'leri backend'e yönlendir
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /healthz {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }

    # Statik dosyalar
    location / {
        root /var/www/lilove/dist/public;
        try_files $uri $uri/ /index.html;
    }
}
```

Sonra nginx'i restart edin:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Seçenek 4: Replit Deployment Kullan (ÖNERİLEN)

**En kolay ve hatasız çözüm:**

1. Bu Replit projesinde "Publish" butonuna tıklayın
2. Autoscale deployment seçeneğini kullanın
3. Replit size bir `.replit.app` domain verecek
4. Custom domain (lilove.org) DNS ayarlarını değiştirin:

**DNS Ayarları:**
```
Type: CNAME
Name: @ (veya www)
Value: [replit-deployment-url].replit.app
TTL: 3600
```

Veya Replit Console'da:
```
Deployments → Custom Domains → Add Domain → lilove.org
```

## Test Adımları

Konfigürasyon değişikliğinden sonra:

```bash
# 1. Health check
curl https://lilove.org/healthz
# Beklenen: {"status":"healthy"}

# 2. API health
curl https://lilove.org/api/health
# Beklenen: {"ok":true,"ts":...}

# 3. Pricing endpoint
curl https://lilove.org/api/pricing
# Beklenen: JSON pricing data

# 4. AI mentor (authentication gerekli)
curl -X POST https://lilove.org/api/ai-mentor/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
# Beklenen: {"message":"Unauthorized"} (HTML değil!)
```

## Hızlı Kontrol Listesi

- [ ] API endpoint'leri JSON döndürüyor (HTML değil)
- [ ] /healthz endpoint'i erişilebilir
- [ ] /api/pricing çalışıyor
- [ ] /api/ai-mentor/* endpoint'leri backend'e ulaşıyor
- [ ] OAuth callback'leri çalışıyor
- [ ] Paddle webhook'ları alınıyor
- [ ] iOS app backend'e bağlanabiliyor

## Önemli Notlar

1. **DNS değişiklikleri 24-48 saat sürebilir**
2. **CDN cache'ini temizleyin** (Cloudflare, CloudFront vb.)
3. **SSL sertifikası custom domain için yeniden yapılandırılmalı**
4. **Environment variables production'da doğru set edilmeli**

## Hızlı Test

Production deployment çalışıyor mu test etmek için:

```bash
# Çalışan endpoint
curl -I https://lilove.org/api/health

# Çalışması gereken ama şu an broken olan
curl -I https://lilove.org/api/pricing
curl -I https://lilove.org/healthz
```

Her ikisi de JSON dönmeli, HTML dönmemeli!