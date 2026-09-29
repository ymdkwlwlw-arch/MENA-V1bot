const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "cache");
const DATA_FILE = path.join(DATA_DIR, "checktt.json");

module.exports.config = {
    name: "تفاعل",
    aliases: ["checktt", "مؤشر"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "D-Jukie | KIROS",
    description: "حساب تفاعل أعضاء المجموعة وعدد الرسائل",
    usePrefix: true,
    commandCategory: "message",
    usages: "تفاعل | تفاعل الكل | تفاعل 2 20",
    cooldowns: 5
};

module.exports.onLoad = async function () {
    try {
        await fs.ensureDir(DATA_DIR);

        if (!(await fs.pathExists(DATA_FILE))) {
            await fs.writeJson(DATA_FILE, []);
        }
    } catch (error) {
        console.error("[تفاعل] فشل إنشاء قاعدة البيانات:", error);
    }
};

async function loadData() {
    await fs.ensureDir(DATA_DIR);

    if (!(await fs.pathExists(DATA_FILE))) {
        await fs.writeJson(DATA_FILE, []);
    }

    try {
        return await fs.readJson(DATA_FILE);
    } catch {
        return [];
    }
}

async function saveData(data) {
    await fs.writeJson(DATA_FILE, data, {
        spaces: 2
    });
}

function style(title, content = "") {
    return (
        "╭─  ── ── ── ──  ─╮\n" +
        `     ${title}\n` +
        "╰─  ── ── ── ──  ─╯\n" +
        content +
        "\n── ── ── ── ── ── ──"
    );
}

module.exports.handleEvent = async function ({
    event,
    Users
}) {
    try {
        if (!event.isGroup) return;
        if (event.type === "message_reply") return;

        const {
            threadID,
            senderID,
            participantIDs
        } = event;

        if (!threadID || !senderID) return;

        const data = await loadData();

        let threadData = data.find(
            item => String(item.threadID) === String(threadID)
        );

        /*
         * إنشاء بيانات المجموعة أول مرة
         */
        if (!threadData) {
            threadData = {
                threadID: String(threadID),
                data: []
            };

            const members =
                Array.isArray(participantIDs)
                    ? participantIDs
                    : [];

            for (const userID of members) {
                try {
                    const userData =
                        await Users.getData(String(userID));

                    const name =
                        userData?.name || "مستخدم";

                    threadData.data.push({
                        id: String(userID),
                        name,
                        exp: 0
                    });
                } catch {
                    threadData.data.push({
                        id: String(userID),
                        name: "مستخدم",
                        exp: 0
                    });
                }
            }

            data.push(threadData);
        }

        /*
         * البحث عن العضو
         */
        let userData = threadData.data.find(
            user =>
                String(user.id) === String(senderID)
        );

        /*
         * إضافة عضو جديد
         */
        if (!userData) {
            let name = "مستخدم";

            try {
                const info =
                    await Users.getData(String(senderID));

                name =
                    info?.name || "مستخدم";
            } catch {}

            userData = {
                id: String(senderID),
                name,
                exp: 0
            };

            threadData.data.push(userData);
        }

        /*
         * زيادة عدد الرسائل
         */
        userData.exp += 1;

        await saveData(data);

    } catch (error) {
        console.error(
            "[تفاعل] خطأ في تسجيل الرسالة:",
            error.message
        );
    }
};

module.exports.run = async function ({
    args,
    api,
    event
}) {
    const {
        threadID,
        senderID,
        messageID,
        type,
        mentions
    } = event;

    try {
        const data = await loadData();

        const threadData = data.find(
            item =>
                String(item.threadID) ===
                String(threadID)
        );

        if (!threadData) {
            return api.sendMessage(
                "لا توجد بيانات تفاعل لهذه المجموعة حتى الآن.",
                threadID,
                messageID
            );
        }

        const users =
            Array.isArray(threadData.data)
                ? threadData.data
                : [];

        if (!users.length) {
            return api.sendMessage(
                "لا توجد بيانات أعضاء مسجلة.",
                threadID,
                messageID
            );
        }

        /*
         * ترتيب الأعضاء
         */
        const ranking = users
            .map(user => ({
                id: String(user.id),
                name: user.name || "مستخدم",
                exp: Number(user.exp) || 0
            }))
            .sort((a, b) => b.exp - a.exp);

        /*
         * مجموع الرسائل
         */
        const totalMessages =
            ranking.reduce(
                (sum, user) => sum + user.exp,
                0
            );

        /*
         * تفاعل عضو بالرد أو المنشن
         */
        let targetID = null;

        if (type === "message_reply") {
            targetID =
                event.messageReply?.senderID || null;
        }

        if (!targetID) {
            const mentionIDs =
                Object.keys(mentions || {});

            if (mentionIDs.length) {
                targetID = mentionIDs[0];
            }
        }

        /*
         * عرض عضو محدد
         */
        if (targetID) {
            const index = ranking.findIndex(
                user =>
                    String(user.id) ===
                    String(targetID)
            );

            if (index === -1) {
                return api.sendMessage(
                    "لم يتم العثور على بيانات تفاعل لهذا المستخدم.",
                    threadID,
                    messageID
                );
            }

            const user = ranking[index];

            const percentage =
                totalMessages > 0
                    ? ((user.exp / totalMessages) * 100)
                        .toFixed(1)
                    : "0.0";

            return api.sendMessage(
                style(
                    "مـؤشـر تـفـاعـل الـمـسـتـخـدم",
                    `⎔ الاسـم: ${user.name}\n` +
                    `⎔ الـمـعـرف: ${user.id}\n` +
                    `⊞ الـتـرتـيـب: ${index + 1}\n` +
                    `⊞ عـدد الـرسـائـل: ${user.exp}\n` +
                    `⊞ نـسـبـة الـتـفـاعـل: ${percentage}%`
                ),
                threadID,
                messageID
            );
        }

        /*
         * عرض الكل
         */
        if (
            String(args[0] || "").toLowerCase() ===
            "الكل"
        ) {
            const page =
                Math.max(
                    parseInt(args[1]) || 1,
                    1
                );

            const limit =
                Math.min(
                    Math.max(
                        parseInt(args[2]) || 20,
                        1
                    ),
                    50
                );

            const totalPages =
                Math.max(
                    Math.ceil(ranking.length / limit),
                    1
                );

            const safePage =
                Math.min(page, totalPages);

            const start =
                (safePage - 1) * limit;

            const list =
                ranking.slice(
                    start,
                    start + limit
                );

            let result = "";

            list.forEach((user, index) => {
                result +=
                    `${start + index + 1}. ` +
                    `${user.name} — ` +
                    `${user.exp} رسالة\n`;
            });

            return api.sendMessage(
                style(
                    "قـائـمـة الـتـفـاعـل",
                    `⎔ إجـمـالـي الأعـضـاء: ${ranking.length}\n` +
                    `⎔ إجـمـالـي الـرسـائـل: ${totalMessages}\n` +
                    `⊞ الـصـفـحـة: ${safePage}/${totalPages}\n\n` +
                    result.trim()
                ),
                threadID,
                messageID
            );
        }

        /*
         * معلومات المستخدم الحالي
         */
        const index = ranking.findIndex(
            user =>
                String(user.id) ===
                String(senderID)
        );

        if (index === -1) {
            return api.sendMessage(
                "لم يتم تسجيل تفاعلك في هذه المجموعة بعد.",
                threadID,
                messageID
            );
        }

        const user = ranking[index];

        const percentage =
            totalMessages > 0
                ? ((user.exp / totalMessages) * 100)
                    .toFixed(1)
                : "0.0";

        return api.sendMessage(
            style(
                "مـؤشـر تـفـاعـلـك",
                `⎔ الاسـم: ${user.name}\n` +
                `⎔ الـتـرتـيـب: ${index + 1}\n` +
                `⊞ عـدد الـرسـائـل: ${user.exp}\n` +
                `⊞ نـسـبـة الـتـفـاعـل: ${percentage}%\n` +
                `⊞ إجـمـالـي رسـائـل الـمـجـمـوعـة: ${totalMessages}`
            ),
            threadID,
            messageID
        );

    } catch (error) {
        console.error(
            "[تفاعل] Error:",
            error
        );

        return api.sendMessage(
            `حدث خطأ أثناء تنفيذ الأمر.\nالسبب: ${error.message || "غير معروف"}`,
            threadID,
            messageID
        );
    }
};
