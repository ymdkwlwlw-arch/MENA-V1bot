module.exports.config = {
    name: "حذف",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Test",
    description: "اختبار أمر الحذف",
    usePrefix: true,
    commandCategory: "رسائل",
    usages: "حذف",
    cooldowns: 0
};

module.exports.run = function ({ api, event }) {
    return api.sendMessage(
        "✓ أمر حذف وصل إلى run بنجاح.",
        event.threadID,
        event.messageID
    );
};
