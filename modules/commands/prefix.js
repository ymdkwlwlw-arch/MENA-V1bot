module.exports.config = {
    name: "prefix",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Developer",
    description: "عرض وتغيير بادئة البوت",
    usePrefix: false,
    commandCategory: "النظام",
    usages: "prefix | prefix /",
    cooldowns: 0
};

module.exports.run = async function ({ api, event, args }) {
    try {
        const threadID = String(event.threadID);

        if (args.length === 0) {
            const prefix =
                global.config.PREFIX || "No prefix";

            let chatPrefix = prefix;

            if (
                global.data.threadPrefix &&
                global.data.threadPrefix.has(threadID)
            ) {
                chatPrefix =
                    global.data.threadPrefix.get(threadID);
            }

            return api.sendMessage(
                "البادئة العامة: " +
                prefix +
                "\nبادئة الشات: " +
                chatPrefix,
                threadID,
                event.messageID
            );
        }

        const newPrefix = args[0];

        if (!newPrefix || newPrefix.length > 10) {
            return api.sendMessage(
                "البادئة غير صالحة.",
                threadID,
                event.messageID
            );
        }

        global.config.PREFIX = newPrefix;

        if (!global.data.threadPrefix) {
            global.data.threadPrefix = new Map();
        }

        global.data.threadPrefix.set(
            threadID,
            newPrefix
        );

        try {
            const botID = api.getCurrentUserID();

            if (typeof api.changeNickname === "function") {
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
                "PREFIX NICKNAME:",
                error
            );
        }

        return api.sendMessage(
            "تم تغيير البادئة إلى: " + newPrefix,
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
