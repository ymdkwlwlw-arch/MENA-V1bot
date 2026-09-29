const fs = require("fs-extra");
const path = require("path");

const pathFile = path.join(
    __dirname,
    "cache",
    "autoseen.txt"
);

module.exports.config = {
    name: "مؤشر",
    aliases: ["autoseen", "قراءة"],
    version: "2.0.0",
    hasPermssion: 2,
    credits: "KIROS",
    description: "تشغيل أو إيقاف القراءة التلقائية للرسائل",
    usePrefix: true,
    commandCategory: "Admin",
    usages: "مؤشر تشغيل | مؤشر إيقاف",
    cooldowns: 5
};

module.exports.handleEvent = async function ({ api }) {
    try {
        await fs.ensureDir(
            path.dirname(pathFile)
        );

        if (!(await fs.pathExists(pathFile))) {
            await fs.writeFile(
                pathFile,
                "false",
                "utf8"
            );
        }

        const status = (
            await fs.readFile(
                pathFile,
                "utf8"
            )
        ).trim();

        if (status === "true") {
            api.markAsReadAll(() => {});
        }

    } catch (error) {
        console.error(
            "[مؤشر] خطأ في القراءة التلقائية:",
            error
        );
    }
};

module.exports.run = async function ({
    api,
    event,
    args
}) {
    try {
        await fs.ensureDir(
            path.dirname(pathFile)
        );

        const action =
            String(args[0] || "")
                .toLowerCase();

        if (
            action === "تشغيل" ||
            action === "on"
        ) {
            await fs.writeFile(
                pathFile,
                "true",
                "utf8"
            );

            return api.sendMessage(
                "تم تشغيل القراءة التلقائية للرسائل.",
                event.threadID,
                event.messageID
            );
        }

        if (
            action === "إيقاف" ||
            action === "off"
        ) {
            await fs.writeFile(
                pathFile,
                "false",
                "utf8"
            );

            return api.sendMessage(
                "تم إيقاف القراءة التلقائية للرسائل.",
                event.threadID,
                event.messageID
            );
        }

        return api.sendMessage(
            "الاستخدام الصحيح:\n\n" +
            "مؤشر تشغيل\n" +
            "مؤشر إيقاف",
            event.threadID,
            event.messageID
        );

    } catch (error) {
        console.error(
            "[مؤشر] Error:",
            error
        );

        return api.sendMessage(
            `حدث خطأ أثناء تنفيذ الأمر.\nالسبب: ${error.message || "غير معروف"}`,
            event.threadID,
            event.messageID
        );
    }
};
