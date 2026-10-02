module.exports.config = {
    name: "كنيات",
    aliases: ["تكنيات", "massnick"],
    version: "3.0.0",
    hasPermssion: 2,
    credits: "محمد إدريس",
    description: "تغيير كنيات أعضاء المجموعة بتنسيق موحد",
    usePrefix: true,
    commandCategory: "المطور",
    usages: "كنيات [التنسيق وفيه كلمة اسم]",
    cooldowns: 20
};

module.exports.run = async function ({
    api,
    event,
    args
}) {

    const {
        threadID,
        messageID,
        senderID
    } = event;

    /*
     * ==========================================
     * إعدادات الأمر
     * ==========================================
     */

    const OWNER_ID = "61593958054356";

    const MAX_USERS = 250;

    const BATCH_SIZE = 5;

    const DELAY_BETWEEN_BATCHES = 2000;

    const PROGRESS_EVERY = 50;

    /*
     * ==========================================
     * إرسال رسالة
     * ==========================================
     */

    const send = (
        message,
        replyTo = null
    ) => {

        return new Promise(
            resolve => {

                if (replyTo) {

                    api.sendMessage(
                        message,
                        threadID,
                        () => resolve(),
                        replyTo
                    );

                } else {

                    api.sendMessage(
                        message,
                        threadID,
                        () => resolve()
                    );
                }
            }
        );
    };

    /*
     * ==========================================
     * فحص المطور
     * ==========================================
     */

    if (
        String(senderID) !==
        String(OWNER_ID)
    ) {

        return send(
            "╭──〔 الوصول مرفوض 〕──╮\n" +
            "│\n" +
            "│ هذا الأمر مخصص لمطور البوت فقط.\n" +
            "│\n" +
            "╰──────────────────"
        );
    }

    /*
     * ==========================================
     * التحقق من API
     * ==========================================
     */

    if (
        typeof api.getThreadInfo !==
        "function"
    ) {

        return send(
            "واجهة getThreadInfo غير متوفرة في API البوت."
        );
    }

    if (
        typeof api.changeNickname !==
        "function"
    ) {

        return send(
            "واجهة changeNickname غير متوفرة في API البوت."
        );
    }

    /*
     * ==========================================
     * قراءة التنسيق
     * ==========================================
     */

    const format =
        Array.isArray(args)
            ? args.join(" ").trim()
            : "";

    if (!format) {

        return send(
            "╭──〔 نظام الكنيات 〕──╮\n" +
            "│\n" +
            "│ اكتب التنسيق المطلوب.\n" +
            "│\n" +
            "│ مثال:\n" +
            "│ كنيات الفخم اسم\n" +
            "│\n" +
            "│ كلمة «اسم» تستبدل باسم العضو.\n" +
            "│\n" +
            "╰──────────────────"
        );
    }

    /*
     * لازم يكون فيه كلمة اسم
     */

    if (
        !format.includes("اسم")
    ) {

        return send(
            "التنسيق لازم يحتوي على كلمة:\n\n" +
            "اسم\n\n" +
            "مثال:\n" +
            "كنيات الفخم اسم"
        );
    }

    /*
     * ==========================================
     * تنظيف التنسيق
     * ==========================================
     */

    const cleanFormat =
        format
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    /*
     * ==========================================
     * بداية العملية
     * ==========================================
     */

    try {

        /*
         * الحصول على معلومات المجموعة
         */

        const threadInfo =
            await api.getThreadInfo(
                threadID
            );

        if (
            !threadInfo ||
            !Array.isArray(
                threadInfo.participantIDs
            )
        ) {

            return send(
                "تعذر الحصول على أعضاء المجموعة."
            );
        }

        /*
         * إزالة التكرار
         */

        const uniqueIDs =
            [
                ...new Set(
                    threadInfo
                        .participantIDs
                        .map(
                            id => String(id)
                        )
                )
            ];

        /*
         * تحديد الحد الأقصى
         */

        const userIDs =
            uniqueIDs.slice(
                0,
                MAX_USERS
            );

        if (!userIDs.length) {

            return send(
                "لم يتم العثور على أعضاء في المجموعة."
            );
        }

        /*
         * ==========================================
         * رسالة البداية
         * ==========================================
         */

        await send(
`╭──〔 نظام الكنيات 〕──╮
│
│ تم بدء العملية.
│
│ الأعضاء: ${userIDs.length}
│ الدفعة: ${BATCH_SIZE}
│ الحد الأقصى: ${MAX_USERS}
│
│ التنسيق:
│ ${cleanFormat}
│
╰──────────────────`
        );

        /*
         * ==========================================
         * إحصائيات
         * ==========================================
         */

        let successCount = 0;

        let failedCount = 0;

        let processedCount = 0;

        /*
         * ==========================================
         * دالة تأخير
         * ==========================================
         */

        const sleep = ms =>
            new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        ms
                    )
            );

        /*
         * ==========================================
         * الحصول على اسم العضو
         * ==========================================
         */

        async function getFirstName(
            userID
        ) {

            try {

                /*
                 * إذا كان API يدعم getUserInfo
                 */

                if (
                    typeof api.getUserInfo ===
                    "function"
                ) {

                    const info =
                        await api.getUserInfo(
                            userID
                        );

                    const user =
                        info?.[userID];

                    if (
                        user?.name
                    ) {

                        return String(
                            user.name
                        )
                            .trim()
                            .split(/\s+/)[0];
                    }
                }

            } catch (error) {

                console.log(
                    `[كنيات] فشل جلب اسم ${userID}:`,
                    error.message
                );
            }

            return "User";
        }

        /*
         * ==========================================
         * استبدال كلمة اسم
         * ==========================================
         */

        function buildNickname(
            template,
            firstName
        ) {

            return template
                .replace(
                    /[\(\[\{\<«]*اسم[\)\}\]\>»]*/gi,
                    firstName
                )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();
        }

        /*
         * ==========================================
         * تغيير كنية عضو واحد
         * ==========================================
         */

        async function changeMemberNickname(
            userID
        ) {

            try {

                const firstName =
                    await getFirstName(
                        userID
                    );

                const newNickname =
                    buildNickname(
                        cleanFormat,
                        firstName
                    );

                if (
                    !newNickname
                ) {

                    failedCount++;

                    return;
                }

                await new Promise(
                    resolve => {

                        api.changeNickname(
                            newNickname,
                            threadID,
                            userID,
                            error => {

                                if (error) {

                                    failedCount++;

                                    console.log(
                                        `[كنيات] فشل ${userID}:`,
                                        error.message ||
                                        error
                                    );

                                } else {

                                    successCount++;
                                }

                                resolve();
                            }
                        );
                    }
                );

            } catch (error) {

                failedCount++;

                console.log(
                    `[كنيات] خطأ ${userID}:`,
                    error.message ||
                    error
                );
            }
        }

        /*
         * ==========================================
         * المعالجة على دفعات
         * ==========================================
         */

        for (
            let i = 0;
            i < userIDs.length;
            i += BATCH_SIZE
        ) {

            const batch =
                userIDs.slice(
                    i,
                    i + BATCH_SIZE
                );

            await Promise.all(
                batch.map(
                    userID =>
                        changeMemberNickname(
                            userID
                        )
                )
            );

            processedCount +=
                batch.length;

            /*
             * إرسال تقرير مرحلي
             */

            if (
                processedCount %
                    PROGRESS_EVERY ===
                    0 ||
                processedCount >=
                    userIDs.length
            ) {

                await send(
`╭──〔 تقدم العملية 〕──╮
│
│ تمت المعالجة: ${processedCount}/${userIDs.length}
│ نجح: ${successCount}
│ فشل: ${failedCount}
│
╰──────────────────`
                );
            }

            /*
             * تأخير بين الدفعات
             */

            if (
                processedCount <
                userIDs.length
            ) {

                await sleep(
                    DELAY_BETWEEN_BATCHES
                );
            }
        }

        /*
         * ==========================================
         * النهاية
         * ==========================================
         */

        try {

            if (
                typeof api.setMessageReaction ===
                "function"
            ) {

                api.setMessageReaction(
                    "✅",
                    messageID,
                    () => {},
                    true
                );
            }

        } catch (_) {}

        return send(
`╭──〔 اكتملت عملية الكنيات 〕──╮
│
│ تمت المعالجة: ${processedCount}
│ تم التغيير: ${successCount}
│ فشل: ${failedCount}
│
│ التنسيق:
│ ${cleanFormat}
│
╰────────────────────`
        );

    } catch (error) {

        console.error(
            "[كنيات ERROR]",
            error
        );

        try {

            if (
                typeof api.setMessageReaction ===
                "function"
            ) {

                api.setMessageReaction(
                    "❌",
                    messageID,
                    () => {},
                    true
                );
            }

        } catch (_) {}

        return send(
`╭──〔 فشل العملية 〕──╮
│
│ حدث خطأ أثناء تغيير الكنيات.
│
│ الخطأ:
│ ${error.message || "غير معروف"}
│
╰──────────────────`
        );
    }
};
