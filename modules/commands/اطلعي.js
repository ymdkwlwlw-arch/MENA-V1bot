module.exports.config = {
    name: "اطلعي",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "KIROS",
    description: "خروج البوت من المجموعة",
    usePrefix: true,
    commandCategory: "الادمن",
    usages: "اطلعي",
    cooldowns: 10
};

module.exports.run = async function ({ api, event }) {
    const { threadID, messageID } = event;

    try {
        api.sendMessage(
            "احشكم 🦧",
            threadID,
            async () => {
                try {
                    await api.removeUserFromGroup(
                        api.getCurrentUserID(),
                        threadID
                    );
                } catch (error) {
                    console.error(
                        "[اطلعي] فشل خروج البوت:",
                        error
                    );
                }
            },
            messageID
        );
    } catch (error) {
        console.error(
            "[اطلعي] Error:",
            error
        );
    }
};
