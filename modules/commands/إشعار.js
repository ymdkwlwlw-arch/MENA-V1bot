module.exports.config = {
    name: "إشعار",
    aliases: ["اشعار", "تنبيه", "sendnoti"],
    version: "2.1.0",
    hasPermssion: 2,
    credits: "KIROS",
    description: "إرسال إشعار من المطور إلى مجموعات البوت",
    usePrefix: true,
    commandCategory: "message",
    usages: "إشعار النص",
    cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    const message = args.join(" ").trim();

    if (!message) {
        return api.sendMessage(
            "استخدم الأمر بهذا الشكل:\n" +
            "إشعار النص\n\n" +
            "مثال:\n" +
            "إشعار سيتم تحديث البوت قريبًا.",
            threadID,
            messageID
        );
    }

    try {
        const threadList = await api.getThreadList(
            100,
            null,
            ["INBOX"]
        );

        let sentCount = 0;
        let failedCount = 0;

        const MAX_GROUPS = 50;

        const groups = threadList.filter(
            thread =>
                thread &&
                thread.isGroup === true &&
                thread.threadID &&
                thread.threadID !== threadID
        );

        if (!groups.length) {
            return api.sendMessage(
                "لم يتم العثور على مجموعات لإرسال الإشعار إليها.",
                threadID,
                messageID
            );
        }

        await api.sendMessage(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام الإشـعـارات\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            `⎔ عـدد الـمـجـمـوعـات: ${Math.min(groups.length, MAX_GROUPS)}\n` +
            "⊞ الـحـالـة: جـاري الإرسـال\n" +
            "── ── ── ── ── ── ──",
            threadID
        );

        for (const thread of groups.slice(0, MAX_GROUPS)) {
            try {
                await api.sendMessage(
                    `إشعار من المطور:\n\n${message}`,
                    thread.threadID
                );

                sentCount++;

            } catch (error) {
                failedCount++;

                console.log(
                    `[إشعار] فشل الإرسال إلى ${thread.threadID}:`,
                    error.message
                );
            }

            await new Promise(resolve =>
                setTimeout(resolve, 500)
            );
        }

        return api.sendMessage(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام الإشـعـارات\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            `⎔ تـم الإرسـال: ${sentCount}\n` +
            `⊞ فـشـل الإرسـال: ${failedCount}\n` +
            `⊞ إجـمـالـي الـمـجـمـوعـات: ${groups.length}\n` +
            "── ── ── ── ── ── ──",
            threadID,
            messageID
        );

    } catch (error) {
        console.error(
            "[إشعار] Error:",
            error
        );

        return api.sendMessage(
            `حدث خطأ أثناء إرسال الإشعار.\nالسبب: ${error.message || "غير معروف"}`,
            threadID,
            messageID
        );
    }
};
