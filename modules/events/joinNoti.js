module.exports.config = {
    name: "joinNoti",
    eventType: ["log:subscribe"],
    version: "2.0.0",
    credits: "Mirai Team | تعديل: محمد إدريس",
    description: "إشعار دخول البوت أو الأعضاء",
    dependencies: {
        "moment-timezone": ""
    }
};

module.exports.run = async function ({ api, event, Users }) {
    const { threadID } = event;

    if (!threadID) return;

    const addedParticipants =
        event.logMessageData?.addedParticipants;

    if (!Array.isArray(addedParticipants) || !addedParticipants.length) {
        return;
    }

    const botID = String(api.getCurrentUserID());

    const botJoined = addedParticipants.some(
        user => String(user.userFbId) === botID
    );

    if (botJoined) {
        const botName = global.config?.BOTNAME || "BOTPACK";
        const commandCount = global.client?.commands?.size || 0;

        try {
            await api.changeNickname(
                `[ / ] • ${botName}`,
                threadID,
                botID
            );
        } catch (error) {
            console.log("[joinNoti] فشل تغيير كنية البوت:", error.message);
        }

        const message =
`╭──〔 تم الاتصال 🔵 بنجاح 〕──
│
│ ↫ اسم البوت   ⤹ ${botName}
│ ↫ الإصدار     : 〘1.8.0〙
│ ↫ عدد الأوامر : 〘${commandCount}〙
│ ↫ البادئة      : 〘 / 〙
│
│ ↫ 🤍 اللهم صل وسلم على نبينا محمد ﷺ
╰──────────────`;

        return api.sendMessage(message, threadID);
    }

    try {
        let threadInfo = {};

        try {
            threadInfo = await api.getThreadInfo(threadID);
        } catch (error) {
            console.log(
                "[joinNoti] تعذر الحصول على معلومات المجموعة:",
                error.message
            );
        }

        const threadName = threadInfo.threadName || "المجموعة";
        const participantIDs = threadInfo.participantIDs || [];

        const names = [];
        const mentions = [];

        for (const user of addedParticipants) {
            const userID = String(user.userFbId);
            const userName = user.fullName || "عضو جديد";

            names.push(userName);

            mentions.push({
                tag: userName,
                id: userID
            });

            try {
                if (
                    global.data &&
                    Array.isArray(global.data.allUserID) &&
                    !global.data.allUserID.includes(userID)
                ) {
                    await Users.createData(userID, {
                        name: userName,
                        data: {}
                    });

                    if (
                        global.data.userName &&
                        typeof global.data.userName.set === "function"
                    ) {
                        global.data.userName.set(userID, userName);
                    }

                    global.data.allUserID.push(userID);
                }
            } catch (error) {
                console.log(
                    `[joinNoti] فشل حفظ المستخدم ${userID}:`,
                    error.message
                );
            }
        }

        let adderName = "رابط الدعوة";

        if (event.author) {
            try {
                const authorData = await Users.getData(
                    String(event.author)
                );

                if (authorData?.name) {
                    adderName = authorData.name;
                }
            } catch (error) {
                console.log(
                    "[joinNoti] تعذر معرفة صاحب الإضافة:",
                    error.message
                );
            }
        }

        let time = "غير معروف";

        try {
            const moment = require("moment-timezone");

            time = moment
                .tz("Africa/Khartoum")
                .format("HH:mm • DD/MM/YYYY");
        } catch (error) {
            console.log(
                "[joinNoti] تعذر الحصول على الوقت:",
                error.message
            );
        }

        const memberCount = participantIDs.length;

        const message =
`◆━━━━━▷ ✦ ◁━━━━━◆
❏ أهلاً بـك يا | ${names.join(", ")}
❏ انضممت إلى | ${threadName}
❏ تمت إضافتك بواسطة | ${adderName}
❏ عدد الأعضاء | ${memberCount}
❏ وقت الدخول | ${time}
❏ نسأل الله لك التوفيق وحسن المقام 🤍
◆━━━━━▷ ✦ ◁━━━━━◆`;

        return api.sendMessage(
            {
                body: message,
                mentions
            },
            threadID
        );

    } catch (error) {
        console.error("[joinNoti] حدث خطأ:", error);
    }
};
