const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports.config = {
    name: "معلومات",
    aliases: ["معلوماتي", "معلومات_المجموعة", "groupinfo"],
    version: "3.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "عرض معلومات المجموعة بشكل كامل",
    usePrefix: true,
    commandCategory: "group",
    usages: "معلومات",
    cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
    const { threadID } = event;

    try {
        const info = await api.getThreadInfo(threadID);

        const threadName =
            info.threadName || "بدون اسم";

        const participantIDs =
            Array.isArray(info.participantIDs)
                ? info.participantIDs
                : [];

        const adminIDs =
            Array.isArray(info.adminIDs)
                ? info.adminIDs
                : [];

        const emoji =
            info.emoji || "غير محدد";

        const approvalMode =
            info.approvalMode === true
                ? "مفعلة"
                : "غير مفعلة";

        const groupColor =
            info.color || "افتراضي";

        const memberCount =
            participantIDs.length;

        const adminCount =
            adminIDs.length;

        const imageSrc =
            info.imageSrc;

        const header =
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام مـعـلـومـات الـمـجـمـوعـة\n" +
            "╰─  ── ── ── ──  ─╯\n";

        const body =
            header +
            `⎔ اسـم الـمـجـمـوعـة: ${threadName}\n` +
            `⎔ مـعـرف الـمـجـمـوعـة: ${threadID}\n` +
            `⎔ الـتـفـاعـل: ${emoji}\n` +
            `⎔ الـسـمـة: ${groupColor}\n` +
            `⎔ الـحـالـة: ${approvalMode}\n` +
            `⎔ عـدد الأدمن: ${adminCount}\n` +
            `⊞ إجـمـالـي الأعـضـاء: ${memberCount}\n` +
            "── ── ── ── ── ── ──";

        if (!imageSrc) {
            return api.sendMessage(
                body,
                threadID
            );
        }

        const cacheDir =
            path.join(__dirname, "cache");

        await fs.ensureDir(cacheDir);

        const imagePath =
            path.join(
                cacheDir,
                `group_${threadID}.jpg`
            );

        try {
            const response = await axios.get(
                imageSrc,
                {
                    responseType: "arraybuffer",
                    timeout: 15000,
                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    }
                }
            );

            await fs.writeFile(
                imagePath,
                response.data
            );

            return api.sendMessage(
                {
                    body,
                    attachment:
                        fs.createReadStream(imagePath)
                },
                threadID,
                () => {
                    setTimeout(() => {
                        try {
                            if (
                                fs.existsSync(imagePath)
                            ) {
                                fs.unlinkSync(
                                    imagePath
                                );
                            }
                        } catch (e) {}
                    }, 5000);
                }
            );

        } catch (imageError) {
            console.log(
                "[معلومات] تعذر تحميل صورة المجموعة:",
                imageError.message
            );

            return api.sendMessage(
                body,
                threadID
            );
        }

    } catch (error) {
        console.error(
            "[معلومات] Error:",
            error
        );

        return api.sendMessage(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام مـعـلـومـات الـمـجـمـوعـة\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـحـالـة: تـعـذر جـلـب مـعـلـومـات الـمـجـمـوعـة\n" +
            `⊞ الـسـبـب: ${error.message || "غير معروف"}\n` +
            "── ── ── ── ── ── ──",
            threadID
        );
    }
};
