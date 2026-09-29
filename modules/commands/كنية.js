module.exports.config = {
    name: "كنية",
    aliases: ["nickname", "لقب"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "محمد إدريس",
    description: "تعيين أو حذف كنية لعضو في المجموعة",
    usePrefix: true,
    commandCategory: "الإدارة",
    usages: "كنية [الكنية] بالرد أو التاغ",
    cooldowns: 2
};

module.exports.run = async function ({ api, event, args }) {

    const {
        threadID,
        messageID,
        senderID,
        mentions,
        messageReply
    } = event;

    const send = (msg) =>
        api.sendMessage(
            msg,
            threadID,
            messageID
        );

    try {

        /*
         * ==========================================
         * التحقق من أن الأمر داخل مجموعة
         * ==========================================
         */

        const threadInfo =
            await api.getThreadInfo(
                threadID
            );

        if (
            !threadInfo ||
            !Array.isArray(
                threadInfo.adminIDs
            )
        ) {
            return send(
                "ما قدرت أجيب صلاحيات المجموعة."
            );
        }

        /*
         * ==========================================
         * التحقق من أدمن المجموعة
         * ==========================================
         */

        const adminIDs =
            threadInfo.adminIDs
                .map(admin =>
                    String(
                        admin.id ||
                        admin
                    )
                );

        const isAdmin =
            adminIDs.includes(
                String(senderID)
            );

        if (!isAdmin) {
            return send(
                "الأمر ده للأدمن فقط."
            );
        }

        /*
         * ==========================================
         * تحديد العضو المستهدف
         * ==========================================
         */

        let targetID = null;

        /*
         * 1 — الرد على رسالة
         */

        if (
            messageReply &&
            messageReply.senderID
        ) {

            targetID =
                String(
                    messageReply.senderID
                );
        }

        /*
         * 2 — التاغ
         */

        else if (
            mentions &&
            typeof mentions === "object" &&
            Object.keys(mentions).length > 0
        ) {

            targetID =
                String(
                    Object.keys(
                        mentions
                    )[0]
                );
        }

        /*
         * 3 — الشخص نفسه
         */

        else {

            targetID =
                String(senderID);
        }

        /*
         * ==========================================
         * استخراج الكنية
         * ==========================================
         */

        let nickname =
            Array.isArray(args)
                ? args.join(" ").trim()
                : "";

        /*
         * إذا كان هناك تاغ:
         * نحذف نص التاغ من الكنية
         */

        if (
            mentions &&
            typeof mentions === "object" &&
            Object.keys(mentions).length > 0
        ) {

            const mentionID =
                Object.keys(
                    mentions
                )[0];

            const mentionText =
                String(
                    mentions[mentionID] ||
                    ""
                );

            if (mentionText) {
                nickname =
                    nickname
                        .replace(
                            mentionText,
                            ""
                        )
                        .trim();
            }
        }

        /*
         * ==========================================
         * منع كنية طويلة جدًا
         * ==========================================
         */

        if (
            nickname.length > 50
        ) {
            return send(
                "الكنية طويلة جدًا.\n" +
                "خليها أقل من 50 حرف."
            );
        }

        /*
         * ==========================================
         * تنفيذ تغيير الكنية
         * ==========================================
         */

        if (
            typeof api.changeNickname !==
            "function"
        ) {
            return send(
                "واجهة تغيير الكنية غير متوفرة في API البوت."
            );
        }

        await new Promise(
            (resolve, reject) => {

                api.changeNickname(
                    nickname,
                    threadID,
                    targetID,
                    (error) => {

                        if (error) {
                            return reject(
                                error
                            );
                        }

                        resolve();
                    }
                );
            }
        );

        /*
         * ==========================================
         * النتيجة
         * ==========================================
         */

        if (nickname) {

            return send(
                `تم تغيير الكنية بنجاح.\n\n` +
                `الكنية: ${nickname}`
            );

        }

        return send(
            "تم حذف الكنية وإرجاع الاسم الأصلي."
        );

    } catch (error) {

        console.error(
            "[كنية] Error:",
            error
        );

        return send(
            "حصل خطأ أثناء تغيير الكنية.\n\n" +
            `الخطأ: ${
                error?.message ||
                "غير معروف"
            }`
        );
    }
};
