const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "مزرعة",
    aliases: ["مزرعه", "farm"],
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "نظام مزرعة افتراضية متعدد الأوامر",
    usePrefix: true,
    commandCategory: "games",
    usages: "مزرعة [الأمر]",
    cooldowns: 3
};

const DATA_DIR = path.join(__dirname, "cache");
const DATA_FILE = path.join(DATA_DIR, "farm.json");

const CROPS = {
    قمح: {
        seedPrice: 20,
        sellPrice: 45,
        growTime: 60 * 1000
    },
    ذرة: {
        seedPrice: 35,
        sellPrice: 75,
        growTime: 2 * 60 * 1000
    },
    طماطم: {
        seedPrice: 50,
        sellPrice: 110,
        growTime: 3 * 60 * 1000
    },
    بطاطا: {
        seedPrice: 70,
        sellPrice: 150,
        growTime: 4 * 60 * 1000
    }
};

async function loadData() {
    await fs.ensureDir(DATA_DIR);

    if (!(await fs.pathExists(DATA_FILE))) {
        await fs.writeJson(DATA_FILE, {});
    }

    try {
        return await fs.readJson(DATA_FILE);
    } catch {
        return {};
    }
}

async function saveData(data) {
    await fs.writeJson(DATA_FILE, data, {
        spaces: 2
    });
}

function createUser(data, userID, name) {
    if (!data[userID]) {
        data[userID] = {
            name: name || "مزارع",
            coins: 500,
            level: 1,
            xp: 0,
            water: 10,
            land: 3,
            crops: {},
            inventory: {},
            planted: []
        };
    }

    return data[userID];
}

function addItem(user, item, amount) {
    user.inventory[item] =
        (user.inventory[item] || 0) + amount;
}

function removeItem(user, item, amount) {
    if (!user.inventory[item]) return false;

    if (user.inventory[item] < amount) {
        return false;
    }

    user.inventory[item] -= amount;

    if (user.inventory[item] <= 0) {
        delete user.inventory[item];
    }

    return true;
}

function addXP(user, amount) {
    user.xp += amount;

    const needed = user.level * 100;

    if (user.xp >= needed) {
        user.xp -= needed;
        user.level++;

        return true;
    }

    return false;
}

function getReadyCrops(user) {
    const now = Date.now();

    return user.planted.filter(
        crop => now >= crop.readyAt
    );
}

module.exports.run = async function ({
    api,
    event,
    args,
    Users
}) {
    const { threadID, messageID, senderID } = event;

    const send = message =>
        api.sendMessage(
            message,
            threadID,
            messageID
        );

    const data = await loadData();

    let name = "مزارع";

    try {
        name =
            await Users.getNameUser(senderID);
    } catch {}

    const user =
        createUser(data, senderID, name);

    const command =
        (args[0] || "مساعدة")
            .toLowerCase();

    /*
    =========================
    1 — زراعة
    =========================
    */

    if (command === "زراعة") {
        const cropName = args[1];

        if (!cropName) {
            return send(
                "المحاصيل المتاحة:\n\n" +
                "قمح — 20\n" +
                "ذرة — 35\n" +
                "طماطم — 50\n" +
                "بطاطا — 70\n\n" +
                "الاستخدام:\n" +
                "مزرعة زراعة اسم_المحصول"
            );
        }

        const crop = CROPS[cropName];

        if (!crop) {
            return send(
                "هذا المحصول غير موجود في المتجر."
            );
        }

        if (user.planted.length >= user.land) {
            return send(
                "لا توجد أرض فارغة للزراعة.\n" +
                "قم بتطوير مزرعتك لزيادة مساحة الأرض."
            );
        }

        if (user.coins < crop.seedPrice) {
            return send(
                `لا تملك ما يكفي من العملات.\n\n` +
                `سعر البذور: ${crop.seedPrice}\n` +
                `رصيدك: ${user.coins}`
            );
        }

        user.coins -= crop.seedPrice;

        const plantedAt = Date.now();

        user.planted.push({
            crop: cropName,
            plantedAt,
            readyAt: plantedAt + crop.growTime,
            watered: false
        });

        addXP(user, 10);

        await saveData(data);

        return send(
            `تمت زراعة ${cropName} بنجاح.\n\n` +
            `وقت الزراعة: ${new Date(plantedAt).toLocaleTimeString()}\n` +
            `وقت الحصاد: ${new Date(plantedAt + crop.growTime).toLocaleTimeString()}\n` +
            `المساحة: ${user.planted.length}/${user.land}\n` +
            `رصيدك: ${user.coins}`
        );
    }

    /*
    =========================
    2 — حصاد
    =========================
    */

    if (command === "حصاد") {
        const ready = getReadyCrops(user);

        if (!ready.length) {
            return send(
                "لا يوجد محصول جاهز للحصاد الآن."
            );
        }

        let earned = 0;
        let harvested = 0;

        user.planted =
            user.planted.filter(crop => {
                if (Date.now() < crop.readyAt) {
                    return true;
                }

                const info = CROPS[crop.crop];

                addItem(
                    user,
                    crop.crop,
                    1
                );

                earned += info.sellPrice;
                harvested++;

                return false;
            });

        user.coins += earned;

        const levelUp =
            addXP(user, harvested * 20);

        await saveData(data);

        return send(
            `تم حصاد ${harvested} محصول.\n\n` +
            `الأرباح: ${earned} عملة\n` +
            `رصيدك: ${user.coins}\n` +
            (levelUp
                ? `\nارتفع مستواك إلى ${user.level}.`
                : "")
        );
    }

    /*
    =========================
    3 — مزرعتي
    =========================
    */

    if (
        command === "مزرعتي" ||
        command === "مزرعتي"
    ) {
        const ready =
            getReadyCrops(user).length;

        return send(
            `مزرعة ${user.name}\n\n` +
            `المستوى: ${user.level}\n` +
            `الخبرة: ${user.xp}/${user.level * 100}\n` +
            `العملات: ${user.coins}\n` +
            `الماء: ${user.water}\n` +
            `الأرض: ${user.planted.length}/${user.land}\n` +
            `جاهز للحصاد: ${ready}`
        );
    }

    /*
    =========================
    4 — متجر
    =========================
    */

    if (command === "متجر") {
        return send(
            "متجر المزرعة\n\n" +
            "قمح — بذور 20 — بيع 45\n" +
            "ذرة — بذور 35 — بيع 75\n" +
            "طماطم — بذور 50 — بيع 110\n" +
            "بطاطا — بذور 70 — بيع 150\n\n" +
            "لشراء البذور:\n" +
            "مزرعة شراء اسم_المحصول"
        );
    }

    /*
    =========================
    5 — شراء
    =========================
    */

    if (command === "شراء") {
        const cropName = args[1];

        if (!cropName || !CROPS[cropName]) {
            return send(
                "حدد محصولاً صحيحاً.\n\n" +
                "المتاح:\n" +
                "قمح\nذرة\nطماطم\nبطاطا"
            );
        }

        const crop = CROPS[cropName];

        if (user.coins < crop.seedPrice) {
            return send(
                `لا تملك ما يكفي.\nرصيدك: ${user.coins}`
            );
        }

        user.coins -= crop.seedPrice;

        addItem(
            user,
            `بذور ${cropName}`,
            1
        );

        await saveData(data);

        return send(
            `تم شراء بذور ${cropName}.\n` +
            `السعر: ${crop.seedPrice}\n` +
            `رصيدك: ${user.coins}`
        );
    }

    /*
    =========================
    6 — بيع
    =========================
    */

    if (command === "بيع") {
        const cropName = args[1];

        if (!cropName || !CROPS[cropName]) {
            return send(
                "حدد محصولاً تريد بيعه."
            );
        }

        if (!removeItem(user, cropName, 1)) {
            return send(
                `لا تملك ${cropName} في مخزنك.`
            );
        }

        const price =
            CROPS[cropName].sellPrice;

        user.coins += price;

        await saveData(data);

        return send(
            `تم بيع ${cropName}.\n` +
            `السعر: ${price}\n` +
            `رصيدك: ${user.coins}`
        );
    }

    /*
    =========================
    7 — ري
    =========================
    */

    if (command === "ري") {
        if (!user.planted.length) {
            return send(
                "لا توجد محاصيل تحتاج إلى الري."
            );
        }

        if (user.water <= 0) {
            return send(
                "خزان الماء فارغ.\n" +
                "انتظر حتى يتجدد الماء."
            );
        }

        user.water--;

        for (const crop of user.planted) {
            if (!crop.watered) {
                crop.watered = true;

                if (crop.readyAt > Date.now()) {
                    crop.readyAt -= 15000;
                }
            }
        }

        await saveData(data);

        return send(
            "تم ري مزرعتك.\n" +
            "تم تقليل وقت نمو المحاصيل قليلاً.\n" +
            `الماء المتبقي: ${user.water}`
        );
    }

    /*
    =========================
    8 — تطوير
    =========================
    */

    if (command === "تطوير") {
        const price =
            user.land * 250;

        if (user.coins < price) {
            return send(
                `تطوير الأرض يكلف ${price} عملة.\n` +
                `رصيدك: ${user.coins}`
            );
        }

        user.coins -= price;
        user.land += 2;

        await saveData(data);

        return send(
            "تم تطوير المزرعة بنجاح.\n\n" +
            `الأرض الجديدة: ${user.land}\n` +
            `تكلفة التطوير: ${price}\n` +
            `رصيدك: ${user.coins}`
        );
    }

    /*
    =========================
    9 — مخزني
    =========================
    */

    if (
        command === "مخزني" ||
        command === "مخزن"
    ) {
        const items =
            Object.entries(user.inventory);

        if (!items.length) {
            return send(
                "مخزنك فارغ حالياً."
            );
        }

        let text =
            "مخزن المزرعة\n\n";

        for (const [item, amount] of items) {
            text +=
                `${item}: ${amount}\n`;
        }

        return send(text);
    }

    /*
    =========================
    10 — مساعدة
    =========================
    */

    if (
        command === "مساعدة" ||
        command === "اوامر" ||
        command === "مساعدة"
    ) {
        return send(
            "نظام المزرعة\n\n" +
            "زراعة — زراعة محصول\n" +
            "حصاد — حصاد المحاصيل الجاهزة\n" +
            "مزرعتي — عرض مزرعتك\n" +
            "متجر — عرض المحاصيل\n" +
            "شراء — شراء البذور\n" +
            "بيع — بيع المحاصيل\n" +
            "ري — ري المزرعة\n" +
            "تطوير — زيادة مساحة الأرض\n" +
            "مخزني — عرض المخزن\n" +
            "مساعدة — عرض الأوامر\n\n" +
            "مثال:\n" +
            "مزرعة زراعة قمح"
        );
    }

    return send(
        "الأمر غير معروف.\n" +
        "استخدم مزرعة مساعدة لعرض الأوامر."
    );
};
