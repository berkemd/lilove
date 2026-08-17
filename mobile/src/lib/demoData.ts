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
  zones: any[];
  traits: Record<string, any[]>;
  equipped: any[];
  owned: any[];
  coinBalance: number;
}

// EKRANLARIN GERCEK TIPLERINE GORE. Ilk yazimda alan adlarini
// tahmin etmistim; simulatorde BAKTIGIMDA sonucu gordum: Hedefler
// "%0,6" yaziyordu (ilerleme 0-1 degil 0-100 ve METIN), Ana ekran
// "0 Aktif Hedef / 0 Seri" diyordu (goal.status ve habit.currentStreak
// yoktu), Avatar sekmesi bombostu (bolge uc noktalari hic yoktu).
// Alanlar artik ekranlarin arayuzlerinden birebir alindi.
const ZONE = (key: string, name: string, layerOrder: number) => ({
  id: `z_${key}`, key, name, layerOrder, isRequired: false, allowMultiple: false,
});

const TRAIT = (zoneKey: string, n: number, name: string,
               rarity: string, coinCost: number, isDefault = false) => ({
  id: `t_${zoneKey}_${n}`, zoneId: `z_${zoneKey}`, name, rarity,
  layerOrder: n, unlockType: coinCost > 0 ? 'purchase' : 'default',
  coinCost, isDefault, isActive: true,
});

function tohum(): DemoStore {
  const zones = [
    ZONE('skin', 'Skin tone', 1), ZONE('body', 'Body', 2),
    ZONE('eyes', 'Eyes', 4), ZONE('mouth', 'Mouth', 6),
    ZONE('hair', 'Hair', 10), ZONE('glasses', 'Glasses', 12),
    ZONE('clothing_top', 'Top', 20), ZONE('shoes', 'Shoes', 22),
    ZONE('hat', 'Hat', 30), ZONE('aura', 'Aura', 40),
  ];
  const traits: Record<string, any[]> = {
    z_skin: [TRAIT('skin', 1, 'Warm', 'common', 0, true), TRAIT('skin', 2, 'Cool', 'common', 0),
             TRAIT('skin', 3, 'Deep', 'common', 0)],
    z_body: [TRAIT('body', 1, 'Standard', 'common', 0, true), TRAIT('body', 2, 'Athletic', 'uncommon', 150)],
    z_eyes: [TRAIT('eyes', 1, 'Round', 'common', 0, true), TRAIT('eyes', 2, 'Focused', 'uncommon', 120)],
    z_mouth: [TRAIT('mouth', 1, 'Calm', 'common', 0, true), TRAIT('mouth', 2, 'Grin', 'common', 60)],
    z_hair: [TRAIT('hair', 1, 'Short', 'common', 0, true), TRAIT('hair', 2, 'Waves', 'rare', 400),
             TRAIT('hair', 3, 'Undercut', 'epic', 900)],
    z_glasses: [TRAIT('glasses', 1, 'Readers', 'uncommon', 200)],
    z_clothing_top: [TRAIT('clothing_top', 1, 'Tee', 'common', 0, true),
                     TRAIT('clothing_top', 2, 'Runner jacket', 'rare', 500)],
    z_shoes: [TRAIT('shoes', 1, 'Trainers', 'common', 0, true)],
    z_hat: [TRAIT('hat', 1, 'Cap', 'uncommon', 250)],
    z_aura: [TRAIT('aura', 1, 'Streak glow', 'legendary', 2000)],
  };
  return {
    profile: {
      id: "demo-user", email: "demo@lilove.app", displayName: "Demo",
      firstName: "Demo", subscriptionTier: "free", isPremium: false,
      coinBalance: 1250,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
      createdAt: gunOnce(28),
      onboardingCompleted: true,
      settings: { theme: 'light', notifications: true, language: 'en' },
      stats: { totalGoals: 2, completedGoals: 1, currentStreak: 12,
               longestStreak: 19, totalXP: 2480, level: 7 },
    },
    habits: [
      { id: "h1", title: "Morning walk", description: "20 minutes before anything else",
        icon: "walk", color: "#8B5CF6", category: "health", frequency: "daily",
        currentStreak: 12, longestStreak: 19, totalCompletions: 46,
        completedToday: true, createdAt: gunOnce(28), sample: true },
      { id: "h2", title: "Read 20 pages", description: "Paper, not a screen",
        icon: "book", color: "#3B82F6", category: "learning", frequency: "daily",
        currentStreak: 5, longestStreak: 11, totalCompletions: 23,
        completedToday: false, createdAt: gunOnce(21), sample: true },
      { id: "h3", title: "No phone after 23:00", description: "Charger stays in the hall",
        icon: "moon", color: "#10B981", category: "focus", frequency: "daily",
        currentStreak: 3, longestStreak: 8, totalCompletions: 14,
        completedToday: false, createdAt: gunOnce(14), sample: true },
    ],
    goals: [
      { id: "g1", title: "Run a 10K", description: "Finish without walking",
        category: "health", status: "active", progress: "60",
        targetOutcome: "10 km, one run, no stops",
        estimatedDuration: 90, createdAt: gunOnce(26), sample: true,
        steps: [
          { id: "g1s1", title: "Run 3K without stopping", done: true },
          { id: "g1s2", title: "Run 5K under 30 min", done: true },
          { id: "g1s3", title: "Run 8K", done: false },
        ] },
      { id: "g2", title: "Finish the portfolio site", description: "Three case studies, live",
        category: "career", status: "active", progress: "25",
        targetOutcome: "Site online with three projects",
        estimatedDuration: 45, createdAt: gunOnce(9), sample: true,
        steps: [
          { id: "g2s1", title: "Pick the three projects", done: true },
          { id: "g2s2", title: "Write the case studies", done: false },
        ] },
      { id: "g3", title: "Read 12 books this year", description: "One a month",
        category: "learning", status: "completed", progress: "100",
        targetOutcome: "12 finished books", createdAt: gunOnce(200),
        completedAt: gunOnce(3), sample: true, steps: [] },
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
        unlocked: true, coinReward: 500 },
      { id: "a4", title: "Thirty days", description: "A full month unbroken",
        unlocked: false, coinReward: 1000 },
    ],
    zones,
    traits,
    // Varsayilanlar zaten sahipli; magazanin bir sey SATTIGI gorulsun
    // diye biri satin alinmis olarak isaretli.
    owned: [
      { id: "u1", userId: "demo-user", traitId: "t_hair_2", unlockedAt: gunOnce(4),
        unlockSource: "purchase" },
    ],
    equipped: [
      { id: "e1", userId: "demo-user", zoneId: "z_skin", traitId: "t_skin_1" },
      { id: "e2", userId: "demo-user", zoneId: "z_hair", traitId: "t_hair_2" },
      { id: "e3", userId: "demo-user", zoneId: "z_clothing_top", traitId: "t_clothing_top_1" },
    ],
    coinBalance: 1250,
  };
}

let depo: DemoStore = tohum();

export function demoSifirla(): void {
  depo = tohum();
}

/** Giris ekrani ile demo kumesi AYNI profili kullansin diye tek kaynak. */
export function demoProfil(): any {
  return depo.profile;
}

/**
 * Demo yonlendiricisi. Bilinmeyen yol -> `undefined`; cagiran bunu
 * ACIKCA ele aliyor. Sessizce bos nesne dondurmek, ekranin "verin yok"
 * diye yalan soylemesine yol acardi.
 */
export function demoCevap(method: string, endpoint: string, body?: any): unknown | undefined {
  const yol = endpoint.split("?")[0] ?? endpoint;

  if (method === "GET") {
    const bolgeIz = yol.match(/^\/api\/avatar-system\/zones\/([^/]+)\/traits$/);
    if (bolgeIz) return depo.traits[bolgeIz[1]] ?? [];
    switch (yol) {
      case "/api/auth/me":
      case "/api/user":
      case "/api/user/profile":
        return depo.profile;
      case "/api/user/stats":
        return { profile: { currentLevel: depo.profile.stats.level,
                            totalXp: depo.profile.stats.totalXP,
                            streakCount: depo.profile.stats.currentStreak } };
      case "/api/habits":       return depo.habits;
      case "/api/goals":        return depo.goals;
      case "/api/tasks":        return depo.tasks;
      case "/api/achievements": return depo.achievements;
      case "/api/coin-balance": return { balance: depo.coinBalance };
      case "/api/avatar":       return { health: 82, maxHealth: 100, mana: 55, maxMana: 100 };
      case "/api/avatar-system/zones":       return depo.zones;
      case "/api/avatar-system/my-traits":   return depo.owned;
      case "/api/avatar-system/my-equipped":
        return depo.equipped.map((e) => ({
          ...e,
          zone: depo.zones.find((z) => z.id === e.zoneId),
          trait: (depo.traits[e.zoneId] ?? []).find((t) => t.id === e.traitId),
        }));
      case "/api/environment": {
        // Rozetle bandin ayrisamamasi icin ayni istatistikten turetiliyor.
        const sv = depo.profile.stats.level;
        return { environmentLevel: sv, environmentXp: depo.profile.stats.totalXP % 1000,
                 xpToNextLevel: 1000, theme: "day", season: "summer" };
      }
      case "/api/health":       return { ok: true };
      case "/api/subscription/status":
        return { subscriptionTier: "free", subscriptionStatus: "active", isPremium: false };
      case "/api/analytics":
        // Alan adlari Profil ekraninin OKUDUGU adlar; degerler depodan
        // turetiliyor ki ekranlar arasinda ayrisma imkani olmasin.
        return { currentStreak: Math.max(...depo.habits.map((h) => h.currentStreak ?? 0)),
                 totalGoals: depo.goals.length,
                 completedTasks: depo.tasks.filter((t) => t.completed).length,
                 completionRate: 0.68, bestHour: 8, worstDay: "Saturday",
                 days: depo.habits.map((h) => ({ title: h.title, streak: h.currentStreak })),
                 sample: true };
    }
  }

  if (method === "POST" || method === "PATCH" || method === "PUT") {
    // DEMO'DA YAZMA GERCEKTEN YAZAR - ama yalniz cihazda ve oturum
    // boyunca. Yazamiyormus gibi yapmak urunu denemeyi anlamsiz kilardi.
    if (yol === "/api/habits") {
      const yeni = { id: `h${Date.now()}`, currentStreak: 0, longestStreak: 0,
        totalCompletions: 0, completedToday: false, icon: "star", color: "#8B5CF6",
        category: "general", frequency: "daily",
        createdAt: new Date().toISOString(), ...body };
      depo.habits = [yeni, ...depo.habits];
      return yeni;
    }
    if (yol === "/api/goals") {
      const yeni = { id: `g${Date.now()}`, status: "active", progress: "0", steps: [],
        category: "general", targetOutcome: "",
        createdAt: new Date().toISOString(), ...body };
      depo.goals = [yeni, ...depo.goals];
      return yeni;
    }
    if (yol === "/api/tasks") {
      const yeni = { id: `t${Date.now()}`, completed: false, ...body };
      depo.tasks = [yeni, ...depo.tasks];
      return yeni;
    }
    if (yol === "/api/avatar-system/equip") {
      const { zoneId, traitId } = body ?? {};
      depo.equipped = [...depo.equipped.filter((e) => e.zoneId !== zoneId),
        { id: `e${Date.now()}`, userId: "demo-user", zoneId, traitId }];
      return { ok: true };
    }
    const takip = yol.match(/^\/api\/habits\/([^/]+)\/track$/);
    if (takip) {
      depo.habits = depo.habits.map((h) =>
        h.id === takip[1]
          ? { ...h, completedToday: true, currentStreak: (h.currentStreak ?? 0) + 1,
              totalCompletions: (h.totalCompletions ?? 0) + 1 }
          : h
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
