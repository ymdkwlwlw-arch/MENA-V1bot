const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "اعلام",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "لعبة تخمين أعلام الدول مع نظام مكافآت افتراضية",
    usePrefix: true,
    commandCategory: "تسلية",
    usages: "اعلام",
    cooldowns: 3
};

// ===============================
// إعدادات اللعبة
// ===============================

const START_MONEY = 500;

// قاعدة بيانات بسيطة للأرصدة
const DATA_DIR = path.join(__dirname, "cache");
const DATA_FILE = path.join(DATA_DIR, "flags-money.json");

fs.ensureDirSync(DATA_DIR);

if (!fs.existsSync(DATA_FILE)) {
    fs.writeJsonSync(DATA_FILE, {}, { spaces: 2 });
}

// ===============================
// الدول والأعلام
// ===============================

const countries = [
    { name: "السودان", code: "sd", aliases: ["سودان"] },
    { name: "مصر", code: "eg", aliases: ["مصر"] },
    { name: "السعودية", code: "sa", aliases: ["السعوديه", "السعودية"] },
    { name: "الإمارات", code: "ae", aliases: ["الامارات", "الإمارات"] },
    { name: "قطر", code: "qa", aliases: [] },
    { name: "الكويت", code: "kw", aliases: [] },
    { name: "العراق", code: "iq", aliases: [] },
    { name: "الأردن", code: "jo", aliases: ["الاردن"] },
    { name: "سوريا", code: "sy", aliases: [] },
    { name: "لبنان", code: "lb", aliases: [] },
    { name: "المغرب", code: "ma", aliases: [] },
    { name: "الجزائر", code: "dz", aliases: [] },
    { name: "تونس", code: "tn", aliases: [] },
    { name: "ليبيا", code: "ly", aliases: [] },
    { name: "الصين", code: "cn", aliases: [] },
    { name: "اليابان", code: "jp", aliases: [] },
    { name: "الهند", code: "in", aliases: [] },
    { name: "تركيا", code: "tr", aliases: [] },
    { name: "فرنسا", code: "fr", aliases: [] },
    { name: "ألمانيا", code: "de", aliases: ["المانيا"] },
    { name: "إيطاليا", code: "it", aliases: ["ايطاليا"] },
    { name: "إسبانيا", code: "es", aliases: ["اسبانيا"] },
    { name: "البرازيل", code: "br", aliases: [] },
    { name: "الأرجنتين", code: "ar", aliases: ["الارجنتين"] },
    { name: "كندا", code: "ca", aliases: [] },
    { name: "أمريكا", code: "us", aliases: ["الولايات المتحدة", "امريكا"] },
    { name: "بريطانيا", code: "gb", aliases: ["المملكة المتحدة", "انجلترا", "إنجلترا"] },
    { name: "روسيا", code: "ru", aliases: [] },
    { name: "أستراليا", code: "au", aliases: ["استراليا"] },
    { name: "جنوب أفريقيا", code: "za", aliases: ["جنوب افريقيا"] }
];

// ===============================
// وظائف مساعدة
// ===============================

function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/\s+/g, " ");
}

function getData() {
    try {
        return fs.readJsonSync(DATA_FILE);
    } catch {
        return {};
    }
}

function saveData(data) {
    fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

function randomCountry() {
    return countries[
        Math.floor(Math.random() * countries.length)
    ];
}

function getMoney(data, uid) {
    if (!data[uid]) {
        data[uid] = {
            money: START_MONEY,
            wins: 0,
            losses: 0
        };
    }

    return data[uid];
}

function isCorrect(answer, country) {
    const input = normalize(answer);
    const valid = [
        country.name,
        ...(country.aliases || [])
    ].map(normalize);

    return valid.includes(input);
}

// ===============================
// اللعبة
// ===============================

module.exports.run = async function ({
    api,
    event
}) {

    const uid = event.senderID;
    const data = getData();
    const player = getMoney(data, uid);

    const country = randomCountry();

    const imageURL =
        `https://flagcdn.com/w640/${country.code}.png`;

    try {

        const response = await axios.get(
            imageURL,
            {
                responseType: "stream",
                timeout: 15000
            }
        );

        const imageStream = response.data;

        return api.sendMessage(
            {
                body:
                    "╭─── ◸ لـعـبـة الأعـلام ◿ ───╮\n\n" +
                    "⊸ ما اسم هذه الدولة؟\n\n" +
                    `⊸ رصيدك الحالي: ${player.money}$\n` +
                    "⊸ أرسل اسم الدولة للإجابة.\n\n" +
                    "✦ إجابة صحيحة: ×2\n" +
                    "✦ إجابة خاطئة: -50%\n\n" +
                    "╰────────────────────────╯",
                attachment: imageStream
            },
            event.threadID,
            (err, info) => {

                if (err) {
                    console.error("[اعلام]", err);
                    return;
                }

                global.client.handleReply.push({
                    name: "اعلام",
                    messageID: info.messageID,
                    author: uid,
                    country,
                    moneyBefore: player.money
                });

            },
            event.messageID
        );

    } catch (error) {

        console.error("[اعلام]", error);

        return api.sendMessage(
            "⎔ تعذر تحميل صورة العلم حالياً، حاول مرة أخرى.",
            event.threadID,
            event.messageID
        );
    }
};

// ===============================
// استقبال الإجابة
// ===============================

module.exports.handleReply = async function ({
    api,
    event,
    handleReply
}) {

    if (event.senderID !== handleReply.author) {
        return;
    }

    const data = getData();
    const player = getMoney(data, event.senderID);

    const answer = event.body || "";

    // ===============================
    // إجابة صحيحة
    // ===============================

    if (isCorrect(answer, handleReply.country)) {

        const oldMoney = player.money;

        // مضاعفة المكافأة
        player.money = oldMoney * 2;
        player.wins += 1;

        saveData(data);

        return api.sendMessage(
            "╭─── ◸ إجـابـة صـحـيـحـة ◿ ───╮\n\n" +
            "✦ أحسنت! 🎉\n" +
            `⊸ الدولة: ${handleReply.country.name}\n\n` +
            `⊸ قبل: ${oldMoney}$\n` +
            `⊸ بعد: ${player.money}$\n` +
            `⊞ المكافأة: ×2\n\n` +
            `⊸ انتصاراتك: ${player.wins}\n\n` +
            "╰────────────────────────╯",
            event.threadID,
            event.messageID
        );

    }

    // ===============================
    // إجابة خاطئة
    // ===============================

    player.money = Math.floor(
        player.money * 0.5
    );

    player.losses += 1;

    saveData(data);

    return api.sendMessage(
        "╭─── ◸ إجـابـة خـاطـئـة ◿ ───╮\n\n" +
        "⊸ للأسف، الإجابة غير صحيحة.\n" +
        `⊸ الإجابة الصحيحة: ${handleReply.country.name}\n\n` +
        `⊸ الرصيد السابق: ${handleReply.moneyBefore}$\n` +
        `⊸ الرصيد الحالي: ${player.money}$\n` +
        "⊞ الخسارة: -50%\n\n" +
        `⊸ إجابات صحيحة: ${player.wins}\n` +
        `⊸ إجابات خاطئة: ${player.losses}\n\n` +
        "╰────────────────────────╯",
        event.threadID,
        event.messageID
    );
};
