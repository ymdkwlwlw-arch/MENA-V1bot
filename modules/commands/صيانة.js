module.exports.config = {
    name: "صيانة",
    version: "1.1.0",
    hasPermssion: 2,
    credits: "Developer",
    description: "تشغيل وإيقاف وضع الصيانة",
    usePrefix: false,
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

        return api.sendMessage(
            global.botMaintenance
                ? "تم تشغيل وضع الصيانة."
                : "تم إيقاف وضع الصيانة.",
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
