module.exports.config = {
    name: "نرد",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "رمي النرد وإظهار نتيجة عشوائية",
    usePrefix: true,
    commandCategory: "تسلية",
    usages: "نرد",
    cooldowns: 2
};

module.exports.run = async function ({ api, event }) {
    const dice = Math.floor(Math.random() * 6) + 1;

    const faces = {
        1: "⚀",
        2: "⚁",
        3: "⚂",
        4: "⚃",
        5: "⚄",
        6: "⚅"
    };

    const messages = {
        1: "طلعت واحد.",
        2: "طلعت اثنين.",
        3: "طلعت ثلاثة.",
        4: "طلعت أربعة.",
        5: "طلعت خمسة.",
        6: "طلعت ستة — أعلى رمية."
    };

    return api.sendMessage(
        "╭─── ◸ نـظـام الـنـرد ◿ ───╮\n\n" +
        `⊸ النتيجة: ${faces[dice]} ${dice}\n` +
        `⊸ ${messages[dice]}\n\n` +
        "╰────────────────────╯",
        event.threadID,
        event.messageID
    );
};
