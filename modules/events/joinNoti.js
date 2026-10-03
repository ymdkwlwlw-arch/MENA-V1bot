const moment = require("moment-timezone");

module.exports.config = {
    name: "joinNoti",
    eventType: ["log:subscribe", "log:unsubscribe"],
    version: "3.0.0",
    credits: "Mirai Team | تعديل: محمد إدريس",
    description: "إشعارات دخول الأعضاء وخروجهم وإعادة إضافتهم",
    dependencies: {
        "moment-timezone": ""
    }
};

module.exports.run = async function ({ api, event, Users }) {
    const { threadID } = event;

    if (!threadID) return;

    const data = event.logMessageData || {};

    /* ==============================
       دخول البوت أو الأعضاء
    ============================== */

    if (event.logMessageType === "log:subscribe") {

        const addedParticipants = data.addedParticipants;

        if (!Array.isArray(addedParticipants) || !addedParticipants.length) {
            return;
        }

        const botID = String(api.getCurrentUserID());

        const botJoined = addedParticipants.some(
            user => String(user.userFbId) === botID
        );

        /* ==============================
           دخول البوت
        ============================== */

        if (botJoined) {

            const botName = global.config?.BOTNAME || "LENA";
            const commandCount = global.client?.commands?.size || 0;

            try {
                await api.changeNickname(
                    `[ / ] • ${botName}`,
                    threadID,
                    botID
                );
            } catch (error) {
                console.log(
                    "[joinNoti] فشل تغيير كنية البوت:",
                    error.message
                );
            }

            const message =
`╭─── ◸ اتـصـال جـديـد ◿ ───╮
│
│ ◉ تـم الاتـصـال بـنـجـاح
│
│ ⊸ اسـم الـبـوت   ─ ${botName}
│ ⊸ الإصـدار       ─ 1.8.0
│ ⊸ عـدد الأوامـر  ─ ${commandCount}
│ ⊸ الـبـادئـة      ─ /
│
│ ◸ الـنـظـام جـاهـز لـلـعـمـل
│ ◸ تـم تـفـعـيـل أنـظـمـة الـبـوت
│
╰──────────────────────────╯

اللهم صل وسلم على نبينا محمد ﷺ`;

            return api.sendMessage(message, threadID);
        }

        /* ==============================
           دخول الأعضاء
           الاستايل القديم محفوظ
        ============================== */

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

            const threadName =
                threadInfo.threadName || "المجموعة";

            const participantIDs =
                threadInfo.participantIDs || [];

            const names = [];
            const mentions = [];

            for (const user of addedParticipants) {

                const userID =
                    String(user.userFbId);

                const userName =
                    user.fullName || "عضو جديد";

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
                            global.data.userName.set(
                                userID,
                                userName
                            );
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

                    const authorData =
                        await Users.getData(
                            String(event.author)
                        );

                    if (authorData?.name) {
                        adderName =
                            authorData.name;
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

                time = moment
                    .tz("Africa/Khartoum")
                    .format("HH:mm • DD/MM/YYYY");

            } catch (error) {

                console.log(
                    "[joinNoti] تعذر الحصول على الوقت:",
                    error.message
                );
            }

            const memberCount =
                participantIDs.length;

            /* الاستايل الأصلي بدون تغيير */

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

            console.error(
                "[joinNoti] حدث خطأ:",
                error
            );
        }

        return;
    }

    /* ==============================
       خروج / طرد عضو
    ============================== */

    if (event.logMessageType === "log:unsubscribe") {

        const leftID =
            data.leftParticipantFbId ||
            data.leftParticipantFbIds?.[0];

        if (!leftID) {

            console.log(
                "[joinNoti] لم يتم العثور على العضو المغادر"
            );

            return;
        }

        const memberID =
            String(leftID);

        const authorID =
            String(event.author || "");

        /* ==============================
           خرج بنفسه
        ============================== */

        if (authorID === memberID) {

            try {

                if (
                    typeof api.addUserToGroup !== "function"
                ) {

                    return api.sendMessage(
                        "العب اوسخ من انو ينضاف تاني",
                        threadID
                    );
                }

                await api.addUserToGroup(
                    memberID,
                    threadID
                );

                /*
                 * اختيار جملة واحدة فقط
                 */

                const messages = [
                    "على وين يا حلو 🐇",
                    "وكاني ح اخليك تمرق بكرامتك"
                ];

                const randomMessage =
                    messages[
                        Math.floor(
                            Math.random() *
                            messages.length
                        )
                    ];

                return api.sendMessage(
                    randomMessage,
                    threadID
                );

            } catch (error) {

                console.log(
                    `[joinNoti] فشل إرجاع ${memberID}:`,
                    error.message
                );

                return api.sendMessage(
                    "العب اوسخ من انو ينضاف تاني",
                    threadID
                );
            }
        }

        /* ==============================
           طرد / إخراج بواسطة شخص آخر
        ============================== */

        return api.sendMessage(
            "كان عب",
            threadID
        );
    }
};
