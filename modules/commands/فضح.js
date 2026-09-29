const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "cache");
const DATA_FILE = path.join(DATA_DIR, "فضح.json");

module.exports.config = {
    name: "فضح",
    aliases: ["resend", "كشف"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "تنبيه مسؤولي المجموعة عند حذف رسالة",
    usePrefix: true,
    commandCategory: "group",
    usages: "فضح on | فضح off",
    cooldowns: 3
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
    await fs.writeJson(DATA_FILE, data, { spaces: 2 });
}

async function isGroupAdmin(api, threadID, userID) {
    try {
        const info = await api.getThreadInfo(threadID);

        const admins = Array.isArray(info.adminIDs)
            ? info.adminIDs
            : [];

        return admins.some(
            admin =>
                String(admin.id || admin) === String(userID)
        );
    } catch {
        return false;
    }
}

module.exports.handleEvent = async function ({ api, event }) {
    try {
        if (event.type !== "message_unsend") return;

        const data = await loadData();
        const threadID = String(event.threadID);

        if (data[threadID] !== true) return;

        const senderID = String(event.senderID || "");

        const admin = await isGroupAdmin(
            api,
            threadID,
            senderID
        );

        // لا يتم كشف محتوى الرسالة
        if (!admin) return;

        return api.sendMessage(
            "تم حذف رسالة من أحد أعضاء المجموعة.",
            event.threadID
        );

    } catch (error) {
        console.error("[فضح] Event Error:", error.message);
    }
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    try {
        await api.setMessageReaction(
            "⏳",
            messageID,
            () => {},
            true
        );
    } catch (e) {}

    try {
        const admin = await isGroupAdmin(
            api,
            threadID,
            senderID
        );

        if (!admin) {
            return api.sendMessage(
                "هذا الأمر مخصص لمسؤولي المجموعة فقط.",
                threadID,
                messageID
            );
        }

        const action = String(args[0] || "").toLowerCase();
        const data = await loadData();
        const id = String(threadID);

        if (
            action === "on" ||
            action === "تشغيل"
        ) {
            data[id] = true;
            await saveData(data);

            return api.sendMessage(
                "تم تشغيل نظام فضح حذف الرسائل.",
                threadID,
                messageID
            );
        }

        if (
            action === "off" ||
            action === "إيقاف"
        ) {
            data[id] = false;
            await saveData(data);

            return api.sendMessage(
                "تم إيقاف نظام فضح حذف الرسائل.",
                threadID,
                messageID
            );
        }

        return api.sendMessage(
            "الاستخدام:\nفضح on\nفضح off",
            threadID,
            messageID
        );

    } catch (error) {
        console.error("[فضح] Error:", error.message);

        return api.sendMessage(
            "حدث خطأ أثناء تنفيذ الأمر.",
            threadID,
            messageID
        );
    }
};
