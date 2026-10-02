module.exports.config = {
    name: "صيانة",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Developer",
    description: "تشغيل أو إيقاف وضع الصيانة",
    usePrefix: true,
    commandCategory: "النظام",
    usages: "صيانة",
    cooldowns: 0
};

module.exports.run = function ({ api, event }) {
    try {
        global.botMaintenance =
            global.botMaintenance === true
                ? false
                : true;

        if (global.botMaintenance) {
            return api.sendMessage(
                "تم تشغيل وضع الصيانة.",
                event.threadID,
                event.messageID
            );
        }

        return api.sendMessage(
            "تم إيقاف وضع الصيانة.",
            event.threadID,
            event.messageID
        );

    } catch (error) {
        console.error("صيانة:", error);

        return api.sendMessage(
            "حدث خطأ أثناء تغيير وضع الصيانة.",
            event.threadID,
            event.messageID
        );
    }
};
