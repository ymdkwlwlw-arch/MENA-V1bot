module.exports.config = {
    name: "prefix",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Developer",
    description: "إدارة بادئة البوت",
    usePrefix: true,
    commandCategory: "النظام",
    usages: "prefix | prefix / | No prefix",
    cooldowns: 0
};

module.exports.run = async function ({ api, event, args }) {
    try {
        const threadID = String(event.threadID);

        /*
        ==========================================
        NO PREFIX
        ==========================================
        */

        if (
            args.length > 0 &&
            args.join(" ").toLowerCase() === "no prefix"
        ) {
            global.config.PREFIX = "";

            return api.sendMessage(
                "تم إلغاء البادئة.\nالبوت يعمل الآن بدون بادئة.",
                threadID,
                event.messageID
            );
        }

        /*
        ==========================================
        SHOW PREFIX
        ==========================================
        */

        if (args.length === 0) {
            const currentPrefix =
                global.config.PREFIX || "No prefix";

            const chatPrefix =
                global.data.threadPrefix &&
                global.data.threadPrefix.get(threadID)
                    ? global.data.threadPrefix.get(threadID)
                    : currentPrefix;

            return api.sendMessage(
                "البادئة العامة: " +
                currentPrefix +
                "\nبادئة الشات: " +
                chatPrefix,
                threadID,
                event.messageID
            );
        }

        /*
        ==========================================
        CHANGE PREFIX
        ==========================================
        */

        const newPrefix = args[0];

        if (!newPrefix || newPrefix.length > 10) {
            return api.sendMessage(
                "البادئة غير صالحة.",
                threadID,
                event.messageID
            );
        }

        global.config.PREFIX = newPrefix;

        /*
        حفظ بادئة الشات
        */

        if (!global.data.threadPrefix) {
            global.data.threadPrefix = new Map();
        }

        global.data.threadPrefix.set(
            threadID,
            newPrefix
        );

        /*
        ==========================================
        تغيير كنية البوت في الشات
        ==========================================
        */

        try {
            const botID =
                api.getCurrentUserID();

            if (
                typeof api.changeNickname === "function"
            ) {
                await new Promise(resolve => {
                    api.changeNickname(
                        newPrefix,
                        threadID,
                        botID,
                        () => resolve()
                    );
                });
            }
        } catch (error) {
            console.error(
                "PREFIX NICKNAME ERROR:",
                error
            );
        }

        return api.sendMessage(
            "تم تغيير البادئة إلى: " +
            newPrefix,
            threadID,
            event.messageID
        );

    } catch (error) {
        console.error("prefix:", error);

        return api.sendMessage(
            "حدث خطأ أثناء تغيير البادئة.",
            event.threadID,
            event.messageID
        );
    }
};
