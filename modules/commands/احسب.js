module.exports.config = {
    name: "احسب",
    aliases: ["count", "عد"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Blue & Yan Maglinte | KIROS",
    description: "حساب الكلمات والفقرات والأحرف والأرقام في النص",
    usePrefix: true,
    commandCategory: "utilities",
    usages: "احسب النص",
    cooldowns: 5,
    dependencies: {}
};

module.exports.run = function ({
    api,
    event,
    args
}) {
    const input = args.join(" ").trim();

    if (!input) {
        return api.sendMessage(
            "اكتب النص الذي تريد حساب إحصائياته.\n\nمثال:\nاحسب هذا نص تجريبي",
            event.threadID,
            event.messageID
        );
    }

    // الكلمات: العربية والإنجليزية والأرقام
    const words =
        input.match(/[\p{L}\p{N}]+/gu) || [];

    const wordCount = words.length;

    // الفقرات
    const paragraphs = input
        .split(/\n\s*\n/)
        .map(text => text.trim())
        .filter(Boolean);

    const paragraphCount =
        paragraphs.length || 1;

    // جميع الأحرف
    const characterCount =
        Array.from(input).length;

    // الأحرف والأرقام فقط
    const alphanumericCount =
        (input.match(/[\p{L}\p{N}]/gu) || [])
            .length;

    // الأرقام فقط
    const numberCount =
        (input.match(/\p{N}/gu) || [])
            .length;

    // الأحرف فقط
    const letterCount =
        (input.match(/\p{L}/gu) || [])
            .length;

    // المسافات
    const spaceCount =
        (input.match(/\s/g) || [])
            .length;

    return api.sendMessage(
        "╭─  ── ── ── ──  ─╮\n" +
        "     نـظـام إحصائيات الـنـص\n" +
        "╰─  ── ── ── ──  ─╯\n" +
        `⎔ الـكـلـمـات: ${wordCount}\n` +
        `⎔ الـفـقـرات: ${paragraphCount}\n` +
        `⎔ الأحـرف: ${characterCount}\n` +
        `⊞ الأحـرف والأرقـام: ${alphanumericCount}\n` +
        `⊞ الأحـرف فقط: ${letterCount}\n` +
        `⊞ الأرقـام فقط: ${numberCount}\n` +
        `⊞ الـمـسـافـات: ${spaceCount}\n` +
        "── ── ── ── ── ── ──",
        event.threadID,
        event.messageID
    );
};
