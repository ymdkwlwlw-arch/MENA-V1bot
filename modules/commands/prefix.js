module.exports.config = {
    name: "prefix",
    version: "1.1.0",
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
        const botID = String(api.getCurrentUserID());

        /*
        ==========================================
        عرض البادئة
        ==========================================
        */

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

        /*
        ==========================================
        البادئة الجديدة
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

        const oldPrefix =
            global.config.PREFIX || "";

        /*
        تغيير البادئة العامة
        */

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
        تغيير كنية البوت
        ==========================================
        */

        try {
            const info =
                await api.getThreadInfo(threadID);

            let currentNickname = "";

            /*
            الحصول على الكنية الحالية
            */

            if (
                info &&
                info.nicknames &&
                info.nicknames[botID]
            ) {
                currentNickname =
                    info.nicknames[botID];
            }

            /*
            إذا لم توجد كنية،
            نأخذ اسم الحساب
            */

            if (!currentNickname) {
                try {
                    const userInfo =
                        await api.getUserInfo([botID]);

                    if (
                        userInfo &&
                        userInfo[botID] &&
                        userInfo[botID].name
                    ) {
                        currentNickname =
                            userInfo[botID].name;
                    }
                } catch (e) {}
            }

            /*
            ======================================
            استبدال البادئة فقط
            ======================================
            */

            let newNickname;

            if (
                oldPrefix &&
                currentNickname.startsWith(oldPrefix)
            ) {
                newNickname =
                    newPrefix +
                    currentNickname.substring(
                        oldPrefix.length
                    );
            } else {
                newNickname =
                    newPrefix +
                    " " +
                    currentNickname;
            }

            /*
            تغيير الكنية
            */

            if (
                typeof api.changeNickname ===
                "function"
            ) {
                await new Promise(resolve => {
                    api.changeNickname(
                        newNickname.trim(),
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
            "حدث خطأ أثناء تنفيذ prefix.",
            event.threadID,
            event.messageID
        );
    }
};
