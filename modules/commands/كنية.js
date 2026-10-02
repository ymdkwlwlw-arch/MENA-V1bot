module.exports.config = {
    name: "كنية",
    aliases: ["nickname", "لقب"],
    version: "3.0.0",
    hasPermssion: 0,
    credits: "محمد إدريس",
    description: "تعيين أو حذف كنية لعضو في المجموعة",
    usePrefix: true,
    commandCategory: "الإدارة",
    usages: "كنية [الكنية] بالرد أو التاغ",
    cooldowns: 2
};

const DEVELOPER_ID = "61593958054356";

module.exports.run = async function ({ api, event, args }) {

    const {
        threadID,
        senderID,
        mentions,
        messageReply
    } = event;

    try {

        /*
         * ==========================================
         * تحديد صلاحية المنفذ
         * المطور يستطيع التنفيذ في أي مجموعة
         * ==========================================
         */

        const isDeveloper =
            String(senderID) === DEVELOPER_ID;


        /*
         * ==========================================
         * جلب معلومات المجموعة
         * ==========================================
         */

        const threadInfo =
            await api.getThreadInfo(
                threadID
            );

        if (!threadInfo) return;


        /*
         * ==========================================
         * استخراج أدمن المجموعة
         * ==========================================
         */

        const adminIDs =
            Array.isArray(threadInfo.adminIDs)
                ? threadInfo.adminIDs.map(
                    admin =>
                        String(
                            admin.id ||
                            admin
                        )
                )
                : [];


        /*
         * ==========================================
         * التحقق من الصلاحية
         *
         * المطور
         * أو
         * أدمن المجموعة
         * ==========================================
         */

        const isAdmin =
            adminIDs.includes(
                String(senderID)
            );

        if (
            !isDeveloper &&
            !isAdmin
        ) {
            return;
        }


        /*
         * ==========================================
         * تحديد العضو المستهدف
         * ==========================================
         */

        let targetID = null;


        /*
         * 1 — بالرد على رسالة
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
         * 2 — بالتاغ
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
         * 3 — إذا لم يوجد رد أو تاغ
         * يتم استهداف المنفذ نفسه
         */

        else {

            targetID =
                String(
                    senderID
                );
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
         * ==========================================
         * إزالة نص التاغ من الكنية
         * ==========================================
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
         * الحد الأقصى للكنية
         * ==========================================
         */

        if (
            nickname.length > 50
        ) {
            return;
        }


        /*
         * ==========================================
         * التأكد من توفر API
         * ==========================================
         */

        if (
            typeof api.changeNickname !==
            "function"
        ) {
            return;
        }


        /*
         * ==========================================
         * تنفيذ تغيير الكنية
         * ==========================================
         */

        await new Promise(
            (resolve, reject) => {

                api.changeNickname(
                    nickname,
                    threadID,
                    targetID,
                    error => {

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
         * صامت تمامًا
         *
         * لا توجد أي رسالة بعد التنفيذ
         * ==========================================
         */

        return;

    } catch (error) {

        /*
         * تسجيل الخطأ في Console فقط
         * بدون إرسال أي رسالة للمجموعة
         */

        console.error(
            "[كنية] Error:",
            error
        );

        return;
    }
};
