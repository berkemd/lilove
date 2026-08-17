// =====================================================================
//  DEMO KİPİ — hesapsız giriş
//
//  NEDEN VAR
//    1) İNCELEME. LiLove giriş duvarıyla açılıyor ve App Review'a demo
//       hesabı verilmediği sürece kesin 2.1 reddi. Sunucuda hesap açmak
//       tek çözüm değil: uygulamanın kendisi hesapsız gezilebilir hâle
//       gelirse sorun kökten kalkar.
//    2) DÖNÜŞÜM. Bu kategoride zorunlu kayıt, ilk açılıştaki en büyük
//       terk sebebi. Streaks ve Loop hesap istemiyor; Habitify ve Finch
//       istiyor. Kayıt duvarını kaldırmak ürünün kendisine de iyi gelir.
//
//  NE DEĞİL
//    Bu bir "çevrimdışı kip" DEĞİL ve öyle anlatılmayacak. Demo verisi
//    cihazda duran, ÖRNEK bir veri kümesi; gerçek hesabın yerine geçmez,
//    senkron olmaz ve koç çalışmaz (koç sunucuya bağlı). Ekranda kalıcı
//    bir şerit bunu söylüyor.
//
//  VERİ UYDURULMUYOR, ÖRNEK OLDUĞU SÖYLENİYOR
//    Demo kümesindeki her kalem açıkça örnek. Kullanıcıya "senin
//    verilerin" diye gösterilen hiçbir şey yok.
// =====================================================================

export const DEMO_TOKEN = "demo-session";

/** Bugünden geriye n gün. Sabit tarih yazmıyoruz: demo hep taze görünsün. */
function gunOnce(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export interface DemoStore {
  profile: any;
  habits: any[];
  goals: any[];
  tasks: any[];
  achievements: any[];
  coinBalance: number;
}

function tohum(): DemoStore {
  return {
    profile: {
      id: "demo-user",
      email: "demo@lilove.app",
      displayName: "Demo",
      firstName: "Demo",
      subscriptionTier: "free",
      coinBalance: 1250,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
      createdAt: gunOnce(28),
    },
    habits: [
      { id: "h1", title: "Morning walk", icon: "🚶", streak: 12, bestStreak: 19,
        completedToday: true, createdAt: gunOnce(28), sample: true },
      { id: "h2", title: "Read 20 pages", icon: "📖", streak: 5, bestStreak: 11,
        completedToday: false, createdAt: gunOnce(21), sample: true },
      { id: "h3", title: "No phone after 23:00", icon: "🌙", streak: 3, bestStreak: 8,
        completedToday: false, createdAt: gunOnce(14), sample: true },
    ],
    goals: [
      { id: "g1", title: "Run a 10K", progress: 0.6, createdAt: gunOnce(26), sample: true,
        steps: [
          { id: "g1s1", title: "Run 3K without stopping", done: true },
          { id: "g1s2", title: "Run 5K under 30 min", done: true },
          { id: "g1s3", title: "Run 8K", done: false },
        ] },
      { id: "g2", title: "Finish the portfolio site", progress: 0.25, createdAt: gunOnce(9),
        sample: true,
        steps: [
          { id: "g2s1", title: "Pick the three projects", done: true },
          { id: "g2s2", title: "Write the case studies", done: false },
        ] },
    ],
    tasks: [
      { id: "t1", title: "Book the dentist", completed: false, dueDate: gunOnce(-1), sample: true },
      { id: "t2", title: "Reply to Elif", completed: true, dueDate: gunOnce(0), sample: true },
      { id: "t3", title: "Plan Saturday", completed: false, dueDate: gunOnce(-2), sample: true },
    ],
    achievements: [
      { id: "a1", title: "First week", description: "Seven days in a row", unlocked: true,
        coinReward: 100 },
      { id: "a2", title: "Ten day streak", description: "Ten days without a gap", unlocked: true,
        coinReward: 250 },
      { id: "a3", title: "Goal finisher", description: "Complete a goal end to end",
        unlocked: false, coinReward: 500 },
    ],
    coinBalance: 1250,
  };
}

let depo: DemoStore = tohum();

export function demoSifirla(): void {
  depo = tohum();
}

/**
 * Demo yönlendiricisi.
 *
 * `lib/api.ts` içindeki tek noktadan çağrılıyor. Bilinmeyen bir yol
 * gelirse `undefined` dönüyor ve çağıran BUNU AÇIKÇA ele alıyor —
 * sessizce boş nesne döndürmek, ekranın "veri yok" diye yalan
 * söylemesine yol açardı.
 */
export function demoCevap(method: string, endpoint: string, body?: any): unknown | undefined {
  const yol = endpoint.split("?")[0] ?? endpoint;

  if (method === "GET") {
    switch (yol) {
      case "/api/auth/me":
      case "/api/user/profile":
        return depo.profile;
      case "/api/habits":
        return depo.habits;
      case "/api/goals":
        return depo.goals;
      case "/api/tasks":
        return depo.tasks;
      case "/api/achievements":
        return depo.achievements;
      case "/api/coin-balance":
        return { balance: depo.coinBalance };
      case "/api/subscription/status":
        return { subscriptionTier: "free", subscriptionStatus: "active", isPremium: false };
      case "/api/analytics":
        return {
          completionRate: 0.68,
          bestHour: 8,
          worstDay: "Saturday",
          days: depo.habits.map((h) => ({ title: h.title, streak: h.streak })),
          sample: true,
        };
    }
  }

  if (method === "POST" || method === "PATCH" || method === "PUT") {
    // DEMO'DA YAZMA GERÇEKTEN YAZAR — ama yalnız cihazda ve yalnız
    // oturum boyunca. Yazamıyormuş gibi yapmak, ürünü denemeyi
    // anlamsız kılardı.
    if (yol === "/api/habits") {
      const yeni = { id: `h${Date.now()}`, streak: 0, bestStreak: 0, completedToday: false,
        icon: "🎯", createdAt: new Date().toISOString(), ...body };
      depo.habits = [yeni, ...depo.habits];
      return yeni;
    }
    if (yol === "/api/goals") {
      const yeni = { id: `g${Date.now()}`, progress: 0, steps: [],
        createdAt: new Date().toISOString(), ...body };
      depo.goals = [yeni, ...depo.goals];
      return yeni;
    }
    if (yol === "/api/tasks") {
      const yeni = { id: `t${Date.now()}`, completed: false, ...body };
      depo.tasks = [yeni, ...depo.tasks];
      return yeni;
    }
    const takip = yol.match(/^\/api\/habits\/([^/]+)\/track$/);
    if (takip) {
      depo.habits = depo.habits.map((h) =>
        h.id === takip[1] ? { ...h, completedToday: true, streak: (h.streak ?? 0) + 1 } : h
      );
      return depo.habits.find((h) => h.id === takip[1]);
    }
    const bitir = yol.match(/^\/api\/tasks\/([^/]+)\/complete$/);
    if (bitir) {
      depo.tasks = depo.tasks.map((t) => (t.id === bitir[1] ? { ...t, completed: true } : t));
      return depo.tasks.find((t) => t.id === bitir[1]);
    }
  }

  return undefined;
}

/** Demo'da gerçekten çalışmayan yollar — sessizce boş dönmek yerine söyler. */
export function demoDisi(endpoint: string): string | null {
  const yol = endpoint.split("?")[0] ?? endpoint;
  if (yol.startsWith("/api/ai-coach")) {
    return "The coach needs an account — it runs on the server, not on your phone.";
  }
  if (yol.startsWith("/api/subscription/verify") || yol.startsWith("/api/payments")) {
    return "Purchases need an account.";
  }
  if (yol.startsWith("/api/leaderboard") || yol.startsWith("/api/social")) {
    return "Community features need an account.";
  }
  return null;
}
