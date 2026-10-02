module.exports.config = {
    name: "لاست",
    version: "2.5.0",
    hasPermssion: 2,
    credits: "Gemini",
    description: "عرض المجموعات والخروج منها",
    commandCategory: "المطور",
    usages: "[الرقم]",
    cooldowns: 3
};

const DEVELOPER_ID = "61593958054356";

module.exports.run = async function ({ api, event, Threads }) {
    if (String(event.senderID) !== DEVELOPER_ID) return;

    try {
        const list = await api.getThreadList(100, null, ["INBOX"]);

        const groupList = list.filter(
            thread => thread.isGroup && thread.isSubscribed
        );

        if (!groupList.length) {
            return api.sendMessage(
                "╮ ✕ لا توجد مجموعات متاحة.",
                event.threadID
            );
        }

        let msg = `╭─── ◸ 𝙻𝙰𝚂𝚃 𝙻𝙸𝚂𝚃 ◿ ───╮\n│\n`;

        groupList.forEach((group, index) => {
            const num = String(index + 1).padStart(2, "0");

            msg += `  ${num} ⊸ ${group.name || "بدون اسم"}\n`;
            msg += `  ╰ 𝙸𝙳: [ ${group.threadID} ]\n\n`;
        });

        msg += `── ◸ 𝚂𝚄𝙼𝙼𝙰𝚁𝚈 ◿ ──\n`;
        msg += `│ ✦ المجموعات: ${groupList.length}\n`;
        msg += `│ ✦ للخروج: رد برقم المجموعة\n`;
        msg += `╰─────────────────╯`;

        return api.sendMessage(
            msg,
            event.threadID,
            (err, info) => {
                if (err || !info?.messageID) return;

                global.client.handleReply.push({
                    name: module.exports.config.name,
                    messageID: info.messageID,
                    author: String(event.senderID),
                    groupList
                });
            },
            event.messageID
        );

    } catch (error) {
        console.error("[لاست]", error);
        return api.sendMessage(
            "╮ ✕ تعذر جلب قائمة المجموعات.",
            event.threadID
        );
    }
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
    if (String(event.senderID) !== DEVELOPER_ID) return;

    const index = parseInt(String(event.body).trim(), 10);

    if (
        Number.isNaN(index) ||
        index <= 0 ||
        index > handleReply.groupList.length
    ) {
        return api.sendMessage(
            "╮ ✕ يرجى إرسال رقم صحيح من القائمة.",
            event.threadID,
            event.messageID
        );
    }

    const groupExit = handleReply.groupList[index - 1];

    if (!groupExit?.threadID) return;

    return api.removeUserFromGroup(
        api.getCurrentUserID(),
        groupExit.threadID,
        error => {
            if (error) {
                return api.sendMessage(
                    `╮ ✕ تعذر الخروج من: ${groupExit.name || "المجموعة"}`,
                    event.threadID,
                    event.messageID
                );
            }

            return api.sendMessage(
                `╮ ◸ تـمَّ الإجـراء ◿\n│\n╰ ⊸ غادرتُ المجموعة: ${groupExit.name || "المجموعة"}`,
                event.threadID,
                event.messageID
            );
        }
    );
};
