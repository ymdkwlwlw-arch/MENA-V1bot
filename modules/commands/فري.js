const axios = require("axios");

module.exports.config = {
  name: "فري",
  version: "10.1.0",
  hasPermssion: 0,
  credits: "MOHAMMAD AKASH",
  description: "عرض معلومات لاعب فري فاير",
  commandCategory: "الألعاب",
  usages: "فري <UID>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  try {
    const uid = args.join(" ").trim();

    // تنبيه بدون استايل
    if (!uid || isNaN(uid)) {
      return api.sendMessage(
        "⚠️ يجب كتابة UID صحيح.\nمثال: فري 123456789",
        event.threadID,
        event.messageID
      );
    }

    // رسالة البحث بدون استايل
    await api.sendMessage(
      `🔎 جاري البحث عن اللاعب ${uid}...`,
      event.threadID,
      event.messageID
    );

    const { data } = await axios.get(
      `https://mahbub-ullash.cyberbot.top/api/player-info?uid=${encodeURIComponent(uid)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        timeout: 10000
      }
    );

    if (!data || !data.message || !data.message.basicInfo) {
      return api.sendMessage(
        "⚠️ لم يتم العثور على اللاعب.\nتأكد من صحة الـ UID أو حاول مرة أخرى لاحقًا.",
        event.threadID,
        event.messageID
      );
    }

    const basic = data.message.basicInfo;
    const clan = data.message.clanBasicInfo || {};
    const pet = data.message.petInfo || {};
    const social = data.message.socialInfo || {};

    const totalMatches = Number(basic.totalMatches) || 0;
    const wins = Number(basic.wins) || 0;

    const winRate = totalMatches > 0
      ? ((wins / totalMatches) * 100).toFixed(2)
      : "0.00";

    const text =
`╭─── ◸ بـيـانـات فـري ◿ ───╮
│
│ ◇ الـمـعـلـومـات
│
│ ◈ الاسم   : ${basic.nickname || "غير معروف"}
│ ◈ الـUID   : ${basic.accountId || uid}
│ ◈ السيرفر : ${basic.region || "غير محدد"}
│ ◈ المستوى : ${basic.level || 0}
│ ◈ النقاط  : ${basic.rankingPoints || 0}
│
│ ─────────────────
│
│ ◇ الـكـلان والـألـيـف
│
│ ◈ الكلان       : ${clan.clanName || "لا يوجد"}
│ ◈ الأليف       : ${pet.id || "لا يوجد"}
│ ◈ مستوى الأليف : ${pet.level || 0}
│
│ ─────────────────
│
│ ◇ إحصائيات المباريات
│
│ ◈ المباريات : ${totalMatches}
│ ◈ الفوز      : ${wins}
│ ◈ النسبة     : ${winRate}%
│
│ ─────────────────
│
│ ◇ معلومات إضافية
│
│ ◈ الألماس : ${data.message.diamondCostRes?.diamondCost || "غير متاح"}
│ ◈ التقييم : ${data.message.creditScoreInfo?.creditScore || "100"}
│
│ ─────────────────
│
│ ◇ الـتـوقـيـع
│
│ ◈ ${social.signature || "لا يوجد توقيع"}
│
╰────────────────────╯`;

    return api.sendMessage(
      text,
      event.threadID,
      event.messageID
    );

  } catch (error) {
    console.error("فري:", error);

    // Error بدون استايل
    return api.sendMessage(
      "❌ حدث خطأ أثناء جلب بيانات اللاعب.\nحاول مرة أخرى لاحقًا.",
      event.threadID,
      event.messageID
    );
  }
};
