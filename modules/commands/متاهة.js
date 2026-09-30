const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "متاهة",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "لعبة متاهة الظل الأبدية - قصة تفاعلية",
    usePrefix: true,
    commandCategory: "تسلية",
    usages: "متاهة",
    cooldowns: 3
};

// ======================================================
// متاهة الظل الأبدية
// ======================================================

const DATA_DIR = path.join(__dirname, "cache");
const DATA_FILE = path.join(DATA_DIR, "maze-shadow.json");

fs.ensureDirSync(DATA_DIR);

if (!fs.existsSync(DATA_FILE)) {
    fs.writeJsonSync(DATA_FILE, {}, { spaces: 2 });
}

// ======================================================
// بيانات اللعبة
// ======================================================

const players = {};

const MAX_HP = 100;
const START_SCORE = 0;
const START_STAGE = 1;

// ======================================================
// أدوات البيانات
// ======================================================

function loadData() {
    try {
        return fs.readJsonSync(DATA_FILE);
    } catch {
        return {};
    }
}

function saveData(data) {
    fs.writeJsonSync(DATA_FILE, data, {
        spaces: 2
    });
}

function createPlayer(uid) {

    return {
        uid,
        hp: MAX_HP,
        score: START_SCORE,
        stage: START_STAGE,
        keys: 0,
        clues: 3,
        victories: 0,
        active: false,
        room: "gate",
        inventory: [],
        monster: false
    };
}

function getPlayer(uid) {

    if (!players[uid]) {
        players[uid] = createPlayer(uid);
    }

    return players[uid];
}

// ======================================================
// تنظيف النص
// ======================================================

function clean(text) {

    return String(text || "")
        .trim()
        .toLowerCase();
}

// ======================================================
// عشوائي
// ======================================================

function random(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}

// ======================================================
// العنوان
// ======================================================

function title(text) {

    return (
        "╭─── ◸ " +
        text +
        " ◿ ───╮"
    );
}

function footer() {

    return "╰────────────────────────╯";
}

// ======================================================
// البداية
// ======================================================

function intro(player) {

    player.active = true;
    player.stage = 1;
    player.room = "gate";
    player.hp = MAX_HP;
    player.score = 0;
    player.keys = 0;
    player.clues = 3;
    player.victories = 0;
    player.inventory = [];
    player.monster = false;

    return (
        title("مـتـاهـة الـظـل الأبـديـة") +
        "\n\n" +

        ".. تبدأ القصة ..\n\n" +

        "استيقظت في مكان لا تعرفه.\n" +
        "السماء سوداء، والضباب يغطي كل شيء.\n" +
        "أمامك بوابة حجرية ضخمة.\n\n" +

        "على البوابة عبارة قديمة:\n" +
        "« من يدخل حديقة الظل، لا يعود كما كان. »\n\n" +

        "تسمع صوتًا بعيدًا يقول:\n" +
        "« إذا أردت الخروج... اعثر على قلب المتاهة. »\n\n" +

        "أنت الآن أمام ثلاثة طرق.\n\n" +

        "⊸ 1 — الطريق المضيء\n" +
        "⊸ 2 — الطريق الأسود\n" +
        "⊸ 3 — الممر القديم\n\n" +

        "✦ اكتب رقم اختيارك.\n\n" +
        footer()
    );
}

// ======================================================
// المرحلة الأولى
// ======================================================

function stageOne(player) {

    player.stage = 2;

    return (
        title("الـبـوابـة الـمـنـسـيـة") +
        "\n\n" +

        "تدخل إلى حديقة الظل.\n" +
        "الأشجار تتحرك رغم عدم وجود رياح.\n" +
        "ثلاثة ممرات تظهر أمامك.\n\n" +

        "من بعيد تسمع جرسًا قديمًا.\n\n" +

        "⊸ 1 — اتبع صوت الجرس\n" +
        "⊸ 2 — ادخل بين الأشجار\n" +
        "⊸ 3 — افحص الحجارة بجانب الطريق\n\n" +

        "⎔ تلميح:\n" +
        "بعض الأسرار لا توجد في الطريق الواضح.\n\n" +

        footer()
    );
}

// ======================================================
// المرحلة الثانية
// ======================================================

function stageTwo(player) {

    player.stage = 3;

    return (
        title("جـسـر الـضـبـاب") +
        "\n\n" +

        "تصل إلى جسر ضيق فوق وادٍ مظلم.\n" +
        "الجسر مكون من سبع حجارة.\n" +
        "كل حجر يحمل رمزًا مختلفًا.\n\n" +

        "تظهر كتابة:\n" +
        "« لا تعبر إلا إذا عرفت الطريق الصحيح. »\n\n" +

        "أمامك:\n\n" +

        "⊸ 1 — الحجر ذو العين\n" +
        "⊸ 2 — الحجر ذو القمر\n" +
        "⊸ 3 — الحجر ذو المفتاح\n\n" +

        "✦ تلميح:\n" +
        "ما يفتح الأبواب قد لا يفتح الطريق.\n\n" +

        footer()
    );
}

// ======================================================
// المرحلة الثالثة
// ======================================================

function stageThree(player) {

    player.stage = 4;

    return (
        title("مـكـتـبـة الـظـلال") +
        "\n\n" +

        "تدخل قاعة ضخمة مليئة بالكتب.\n" +
        "كل الكتب فارغة إلا ثلاثة.\n\n" +

        "كتاب أبيض.\n" +
        "كتاب أسود.\n" +
        "كتاب أزرق.\n\n" +

        "على الطاولة رسالة:\n" +
        "« الحقيقة لا تسكن دائمًا في الظلام. »\n\n" +

        "⊸ 1 — افتح الكتاب الأبيض\n" +
        "⊸ 2 — افتح الكتاب الأسود\n" +
        "⊸ 3 — افتح الكتاب الأزرق\n\n" +

        footer()
    );
}

// ======================================================
// المرحلة الرابعة
// ======================================================

function stageFour(player) {

    player.stage = 5;

    return (
        title("الـبـئـر الـصـامـت") +
        "\n\n" +

        "تجد بئرًا قديمًا في منتصف الحديقة.\n" +
        "من داخله يأتي ضوء أخضر خافت.\n\n" +

        "تجد بجانبه ثلاثة أشياء:\n\n" +

        "⊸ 1 — مفتاح فضي\n" +
        "⊸ 2 — حجر مضيء\n" +
        "⊸ 3 — مرآة سوداء\n\n" +

        "⎔ تلميح:\n" +
        "المرآة لا تكشف وجهك فقط.\n\n" +

        footer()
    );
}

// ======================================================
// المرحلة الخامسة
// ======================================================

function stageFive(player) {

    player.stage = 6;

    return (
        title("غـابـة الـهـمـس") +
        "\n\n" +

        "تدخل غابة كثيفة.\n" +
        "تسمع أصواتًا تنادي باسمك.\n\n" +

        "ثم تسمع صوتًا يقول:\n" +
        "« لا تثق بمن تعرفه داخل المتاهة. »\n\n" +

        "تظهر أمامك ثلاثة ظلال.\n\n" +

        "⊸ 1 — الظل الطويل\n" +
        "⊸ 2 — الظل القصير\n" +
        "⊸ 3 — الظل الذي لا يتحرك\n\n" +

        "✦ تلميح:\n" +
        "أحيانًا عدم الحركة هو أكثر الأشياء حركة.\n\n" +

        footer()
    );
}

// ======================================================
// الوحش
// ======================================================

function monsterIntro(player) {

    player.stage = 7;
    player.monster = true;

    return (
        title("فـيـركـروث") +
        "\n\n" +

        "تصل إلى ساحة واسعة.\n" +
        "الضباب يتراجع فجأة.\n\n" +

        "ثم يظهر أمامك حارس المتاهة.\n\n" +

        "╭─ وحش المتاهة ─╮\n" +
        "الاسم: فيركروث\n" +
        "الطاقة: 100\n" +
        "الرتبة: حارس الظل\n" +
        "╰────────────────╯\n\n" +

        "فيركروث يقول:\n" +
        "« لن تصل إلى قلب الحديقة بسهولة. »\n\n" +

        "أمامك ثلاثة خيارات:\n\n" +

        "⊸ 1 — واجهه\n" +
        "⊸ 2 — ابحث عن نقطة ضعفه\n" +
        "⊸ 3 — حاول الهروب\n\n" +

        "⎔ تلميح:\n" +
        "القوة ليست دائمًا الطريق الصحيح.\n\n" +

        footer()
    );
}

// ======================================================
// نقطة ضعف الوحش
// ======================================================

function monsterWeakness(player) {

    player.score += 100;

    return (
        title("سـر فـيـركـروث") +
        "\n\n" +

        "تراقب حركات الوحش بدلًا من مهاجمته.\n" +
        "تلاحظ علامة مضيئة على الأرض.\n\n" +

        "فيركروث لا يستطيع الاقتراب منها.\n\n" +

        "تكتشف أن مصدر قوته هو الظلال المحيطة به.\n\n" +

        "تظهر أمامك ثلاثة رموز:\n\n" +

        "⊸ 1 — الشمس\n" +
        "⊸ 2 — القمر\n" +
        "⊸ 3 — العين\n\n" +

        "✦ تلميح:\n" +
        "الظل لا يعيش طويلًا أمام النور.\n\n" +

        footer()
    );
}

// ======================================================
// قلب المتاهة
// ======================================================

function heart(player) {

    player.stage = 9;
    player.keys += 1;
    player.score += 300;

    return (
        title("قـلـب الـمـتـاهـة") +
        "\n\n" +

        "ينفتح الباب الحجري.\n" +
        "خلفه غرفة دائرية ضخمة.\n\n" +

        "في المنتصف توجد بلورة سوداء.\n" +
        "لكن داخلها ضوء أبيض يتحرك.\n\n" +

        "صوت قديم يقول:\n" +
        "« وصلت إلى قلب المتاهة، لكن النهاية لم تبدأ بعد. »\n\n" +

        "ثلاثة أبواب تظهر:\n\n" +

        "⊸ 1 — باب العودة\n" +
        "⊸ 2 — باب الظلام\n" +
        "⊸ 3 — باب النور\n\n" +

        "⎔ تلميح:\n" +
        "النهاية التي تبدو واضحة قد تكون البداية الحقيقية.\n\n" +

        footer()
    );
}

// ======================================================
// النهاية
// ======================================================

function ending(player, type) {

    player.active = false;

    if (type === "light") {

        player.score += 500;
        player.victories += 1;

        return (
            title("نـهـايـة الـنـور") +
            "\n\n" +

            "تختار باب النور.\n\n" +

            "البلورة تتحطم إلى آلاف الجزيئات المضيئة.\n" +
            "تختفي الأشجار والضباب.\n\n" +

            "تظهر أمامك بوابة الخروج.\n\n" +

            "قبل أن تغادر تسمع الصوت القديم:\n" +
            "« لقد نجحت في عبور المتاهة الأولى. »\n\n" +

            "✦ انتصار!\n" +
            `⊸ النقاط: ${player.score}\n` +
            `⊸ الانتصارات: ${player.victories}\n\n` +

            "╰────────────────────────╯"
        );
    }

    if (type === "dark") {

        player.score += 100;

        return (
            title("نـهـايـة الـظـل") +
            "\n\n" +

            "تدخل باب الظلام.\n" +
            "تغلق البوابة خلفك.\n\n" +

            "لكن بدلًا من النهاية...\n" +
            "تجد متاهة أخرى.\n\n" +

            "وعلى الجدار كلمة واحدة:\n\n" +

            "« قريبًا... »\n\n" +

            `⊸ النقاط: ${player.score}\n\n` +

            "╰────────────────────────╯"
        );
    }

    player.score += 250;

    return (
        title("نـهـايـة الـمـجـهـول") +
        "\n\n" +

        "تفتح باب العودة.\n" +
        "لكن المكان خلفه ليس هو المكان الذي جئت منه.\n\n" +

        "ترى مدينة بعيدة مضاءة تحت سماء غريبة.\n\n" +

        "ثم تسمع:\n" +
        "« لقد خرجت من المتاهة...\n" +
        "لكن المتاهة لم تخرج منك. »\n\n" +

        `⊸ النقاط: ${player.score}\n\n` +

        "╰────────────────────────╯"
    );
}

// ======================================================
// خسارة الحياة
// ======================================================

function damage(player, amount) {

    player.hp -= amount;

    if (player.hp < 0) {
        player.hp = 0;
    }
}

function hpBar(player) {

    const blocks =
        Math.max(
            0,
            Math.floor(player.hp / 10)
        );

    return "█".repeat(blocks) +
        "░".repeat(10 - blocks);
}

// ======================================================
// أمر البداية
// ======================================================

module.exports.run = async function ({
    api,
    event,
    args
}) {

    const uid = event.senderID;
    const player = getPlayer(uid);

    if (
        args[0] &&
        ["خروج", "انهاء", "إنهاء"].includes(
            clean(args[0])
        )
    ) {

        player.active = false;

        return api.sendMessage(
            title("الـمـتـاهـة") +
            "\n\n" +
            "⊸ خرجت من اللعبة.\n" +
            "⊸ يمكنك البدء من جديد باستخدام:\n" +
            "⊞ متاهة\n\n" +
            footer(),
            event.threadID,
            event.messageID
        );
    }

    player.active = true;

    return api.sendMessage(
        intro(player),
        event.threadID,
        (err, info) => {

            if (err) return;

            if (!global.client.handleReply) {
                global.client.handleReply = [];
            }

            global.client.handleReply.push({
                name: "متاهة",
                messageID: info.messageID,
                author: uid
            });
        },
        event.messageID
    );
};

// ======================================================
// استقبال اختيارات اللاعب
// ======================================================

module.exports.handleReply = async function ({
    api,
    event,
    handleReply
}) {

    const uid = event.senderID;

    if (uid !== handleReply.author) {
        return;
    }

    const player = getPlayer(uid);
    const choice = clean(event.body);

    if (!player.active) {
        return;
    }

    let output = null;

    // ==================================================
    // المرحلة 1
    // ==================================================

    if (player.stage === 1) {

        if (!["1", "2", "3"].includes(choice)) {
            return api.sendMessage(
                "⎔ اختر رقمًا من 1 إلى 3.",
                event.threadID,
                event.messageID
            );
        }

        if (choice === "1") {
            player.score += 20;
        }

        if (choice === "2") {
            player.score += 40;
        }

        if (choice === "3") {
            player.score += 60;
            player.clues += 1;
        }

        output = stageOne(player);
    }

    // ==================================================
    // المرحلة 2
    // ==================================================

    else if (player.stage === 2) {

        if (!["1", "2", "3"].includes(choice)) {
            return api.sendMessage(
                "⎔ اختر رقمًا من 1 إلى 3.",
                event.threadID,
                event.messageID
            );
        }

        if (choice === "1") {
            damage(player, 10);
            player.score += 30;
        }

        if (choice === "2") {
            player.score += 50;
        }

        if (choice === "3") {
            player.keys += 1;
            player.score += 80;
        }

        output = stageTwo(player);
    }

    // ==================================================
    // المرحلة 3
    // ==================================================

    else if (player.stage === 3) {

        if (!["1", "2", "3"].includes(choice)) {
            return api.sendMessage(
                "⎔ اختر رقمًا من 1 إلى 3.",
                event.threadID,
                event.messageID
            );
        }

        if (choice === "1") {
            player.score += 50;
        }

        if (choice === "2") {
            damage(player, 15);
            player.score += 20;
        }

        if (choice === "3") {
            player.keys += 1;
            player.score += 100;
        }

        output = stageThree(player);
    }

    // ==================================================
    // المرحلة 4
    // ==================================================

    else if (player.stage === 4) {

        if (!["1", "2", "3"].includes(choice)) {
            return api.sendMessage(
                "⎔ اختر رقمًا من 1 إلى 3.",
                event.threadID,
                event.messageID
            );
        }

        if (choice === "1") {
            player.keys += 2;
            player.score += 100;
            player.inventory.push("المفتاح الفضي");
        }

        if (choice === "2") {
            player.hp = Math.min(
                MAX_HP,
                player.hp + 20
            );

            player.score += 80;
            player.inventory.push("الحجر المضيء");
        }

        if (choice === "3") {
            player.score += 120;
            player.inventory.push("المرآة السوداء");
        }

        output = stageFour(player);
    }

    // ==================================================
    // المرحلة 5
    // ==================================================

    else if (player.stage === 5) {

        if (!["1", "2", "3"].includes(choice)) {
            return api.sendMessage(
                "⎔ اختر رقمًا من 1 إلى 3.",
                event.threadID,
                event.messageID
            );
        }

        if (choice === "1") {
            damage(player, 20);
            player.score += 30;
        }

        if (choice === "2") {
            damage(player, 10);
            player.score += 60;
        }

        if (choice === "3") {
            player.score += 120;
            player.clues += 1;
        }

        output = monsterIntro(player);
    }

    // ==================================================
    // مواجهة فيركروث
    // ==================================================

    else if (player.stage === 7) {

        if (!["1", "2", "3"].includes(choice)) {
            return api.sendMessage(
                "⎔ اختر رقمًا من 1 إلى 3.",
                event.threadID,
                event.messageID
            );
        }

        if (choice === "1") {

            damage(player, 35);
            player.score += 40;

            output =
                title("مـواجـهـة فـيـركـروث") +
                "\n\n" +

                "تحاول مواجهة فيركروث مباشرة.\n" +
                "لكنه يتراجع ثم يطلق موجة من الظلال.\n\n" +

                `⊸ طاقتك: ${hpBar(player)}\n` +
                `⊸ HP: ${player.hp}/100\n\n` +

                "فيركروث لم يُهزم.\n" +
                "لكن شيئًا تغير في الساحة.\n\n" +

                "⊸ 1 — استمر في المواجهة\n" +
                "⊸ 2 — راقب حركته\n" +
                "⊸ 3 — استخدم الحجر المضيء\n\n" +

                footer();

            player.stage = 8;
        }

        else if (choice === "2") {
            output = monsterWeakness(player);
        }

        else {

            player.score += 10;

            output =
                title("الـهـروب") +
                "\n\n" +

                "تجري بين الأعمدة القديمة.\n" +
                "فيركروث يراقبك لكنه لا يلاحقك.\n\n" +

                "تجد بابًا صغيرًا خلف الساحة.\n\n" +

                "⊸ 1 — ادخل الباب\n" +
                "⊸ 2 — ارجع للوحش\n" +
                "⊸ 3 — افحص الباب\n\n" +

                footer();

            player.stage = 8;
        }
    }

    // ==================================================
    // المرحلة 8
    // ==================================================

    else if (player.stage === 8) {

        if (!["1", "2", "3"].includes(choice)) {
            return api.sendMessage(
                "⎔ اختر رقمًا من 1 إلى 3.",
                event.threadID,
                event.messageID
            );
        }

        if (choice === "1") {
            player.score += 100;
            output = heart(player);
        }

        else if (choice === "2") {
            player.score += 50;
            output = monsterWeakness(player);
        }

        else {
            player.keys += 1;
            player.score += 150;
            output = heart(player);
        }
    }

    // ==================================================
    // سر الوحش
    // ==================================================

    else if (player.stage === 8 && player.monster) {

        output = heart(player);
    }

    // ==================================================
    // قلب المتاهة
    // ==================================================

    else if (player.stage === 9) {

        if (!["1", "2", "3"].includes(choice)) {
            return api.sendMessage(
                "⎔ اختر رقمًا من 1 إلى 3.",
                event.threadID,
                event.messageID
            );
        }

        if (choice === "1") {
            output = ending(player, "return");
        }

        else if (choice === "2") {
            output = ending(player, "dark");
        }

        else {
            output = ending(player, "light");
        }

        const data = loadData();

        data[uid] = {
            hp: player.hp,
            score: player.score,
            victories: player.victories,
            keys: player.keys
        };

        saveData(data);
    }

    // ==================================================
    // إرسال المرحلة التالية
    // ==================================================

    if (output) {

        return api.sendMessage(
            output,
            event.threadID,
            (err, info) => {

                if (err) return;

                if (!global.client.handleReply) {
                    global.client.handleReply = [];
                }

                global.client.handleReply.push({
                    name: "متاهة",
                    messageID: info.messageID,
                    author: uid
                });
            },
            event.messageID
        );
    }
};
