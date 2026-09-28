const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

module.exports.config = {
    name: "لينا",
    version: "10.0.0",
    hasPermssion: 0,
    credits: "كولو سان",
    description: "لينا — مساعد ذكاء اصطناعي متعدد النماذج مع نظام محادثة وتشخيص للمطور",
    commandCategory: "الذكاء الاصطناعي",
    usages: "لينا [سؤالك]",
    cooldowns: 2,
    usePrefix: false
};

const OWNER_ID = "61593519041412";

/* =========================================================
   شخصية لينا
========================================================= */

const personality = `
أنتِ لينا، مساعدة ذكاء اصطناعي داخل بوت Messenger.

هويتك:
- اسمك لينا.
- عمرك 18 سنة كشخصية افتراضية.
- مالك البوت هو كولو سان.
- معرف مالك البوت: ${OWNER_ID}.
- تتحدثين بالعربية الطبيعية.
- يمكنك استخدام اللهجة السودانية عندما يكون مناسبًا.
- شخصيتك مرحة، اجتماعية، ذكية، سريعة البديهة و"ردامة" بطريقة خفيفة.
- تحبين المزاح والردود الساخرة الخفيفة، لكن بدون إهانة مؤذية أو تنمر أو تهديد.
- لا تكرري اسم المستخدم بدون سبب.
- لا تدعي أنك نفذت شيئًا لم تنفذيه فعليًا.
- لا تختلقي نتائج أو معلومات.
- إذا لم تعرفي شيئًا فقولي ذلك بوضوح.
- في البرمجة أعطي حلولًا عملية ومرتبة.
- إذا اكتشفت مشكلة في كود، اشرحي المشكلة وسببها واقترحي إصلاحًا.
- لا تذكري اسم النموذج أو مزود الـAPI إلا إذا سُئلتِ عنه.

التعامل مع أوامر البوت:
- البوت يحتوي على أوامر حقيقية.
- إذا طلب المستخدم تشغيل أمر موجود، استخدمي الأمر الحقيقي فقط.
- لا تقولي إن الأمر اشتغل قبل أن يتم تشغيله.
- لا تنفذي JavaScript أو Shell أو أوامر نظام يرسلها المستخدم.
- لا تحاولي استخراج API keys أو كلمات المرور أو AppState أو session cookies.
- لا تكشفي أسرار البيئة أو محتويات الملفات السرية.

صلاحيات المطور:
- المطور الوحيد هو صاحب المعرف ${OWNER_ID}.
- المطور يستطيع طلب تشخيص ملفات الأوامر وقراءة محتواها.
- يمكن عرض أسماء ملفات الأوامر للمطور.
- يمكن تحليل ملفات JS واكتشاف بعض الأخطاء الواضحة.
- يمكن تقديم اقتراحات لتحسين الكود.
- لا تكشفي محتويات الملفات للمستخدمين العاديين.
- لا تكشفي API keys أو كلمات المرور أو بيانات الجلسات حتى للمطور داخل الرد.
- لا تنفذي أوامر النظام تلقائيًا.
- لا تغيري ملفات المشروع تلقائيًا بناءً على رسالة المستخدم.
- عند اقتراح تعديل، اعرضي التعديل للمطور ليقرر تطبيقه.
`;

/* =========================================================
   حالة المحادثات
========================================================= */

const conversations = new Map();

function getConversationKey(threadID, senderID) {
    return `${threadID}:${senderID}`;
}

function getConversation(threadID, senderID) {
    const key = getConversationKey(threadID, senderID);

    if (!conversations.has(key)) {
        conversations.set(key, {
            messages: [],
            lastActivity: Date.now()
        });
    }

    const conversation = conversations.get(key);

    conversation.lastActivity = Date.now();

    return conversation;
}

function addConversationMessage(
    threadID,
    senderID,
    role,
    content
) {
    const conversation =
        getConversation(
            threadID,
            senderID
        );

    conversation.messages.push({
        role,
        content
    });

    /*
     * نحتفظ بآخر 12 رسالة فقط
     * حتى لا يكبر السياق بشكل مبالغ فيه.
     */

    if (conversation.messages.length > 12) {
        conversation.messages =
            conversation.messages.slice(-12);
    }
}

function clearOldConversations() {
    const now = Date.now();
    const MAX_AGE = 60 * 60 * 1000;

    for (const [
        key,
        conversation
    ] of conversations.entries()) {

        if (
            now -
            conversation.lastActivity >
            MAX_AGE
        ) {
            conversations.delete(key);
        }
    }
}

setInterval(
    clearOldConversations,
    10 * 60 * 1000
);

/* =========================================================
   التفاعل الوحيد
========================================================= */

async function react(
    api,
    messageID,
    threadID
) {
    try {
        await api.setMessageReaction(
            "⏳",
            messageID,
            threadID
        );
    } catch (error) {
        console.log(
            `[LINA] Reaction error: ${error.message}`
        );
    }
}

/* =========================================================
   Typing
========================================================= */

async function typing(
    api,
    threadID,
    status = true
) {
    try {

        if (
            typeof api.sendTypingIndicator ===
            "function"
        ) {
            return await api.sendTypingIndicator(
                threadID,
                status
            );
        }

        if (
            typeof api.sendTyping ===
            "function"
        ) {
            return await api.sendTyping(
                threadID,
                status
            );
        }

    } catch (error) {

        console.log(
            `[LINA] Typing error: ${error.message}`
        );

    }
}

/* =========================================================
   إرسال رسالة
========================================================= */

function sendMessage(
    api,
    message,
    threadID,
    replyTo
) {
    return new Promise(resolve => {

        const callback = (
            error,
            info
        ) => {

            if (error) {

                console.error(
                    "[LINA] sendMessage:",
                    error.message
                );

                return resolve(null);
            }

            resolve(info || null);
        };

        if (replyTo) {

            api.sendMessage(
                {
                    body: message,
                    mentions: []
                },
                threadID,
                callback,
                replyTo
            );

        } else {

            api.sendMessage(
                message,
                threadID,
                callback
            );

        }
    });
}

/* =========================================================
   GEMINI
========================================================= */

async function askGemini(
    apiKey,
    model,
    userPrompt
) {

    const ai =
        new GoogleGenAI({
            apiKey
        });

    const result =
        await ai.models.generateContent({
            model,
            contents: userPrompt,
            config: {
                systemInstruction:
                    personality,
                temperature: 0.8,
                maxOutputTokens: 1200
            }
        });

    const text =
        result?.text?.trim();

    if (!text) {
        throw new Error(
            "Gemini returned empty response"
        );
    }

    return text;
}

/* =========================================================
   GROQ
========================================================= */

async function askGroq(
    apiKey,
    model,
    userPrompt,
    history = []
) {

    const messages = [
        {
            role: "system",
            content: personality
        },

        ...history,

        {
            role: "user",
            content: userPrompt
        }
    ];

    const response =
        await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    Authorization:
                        `Bearer ${apiKey}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.8,
                    max_tokens: 1200
                })
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}: ${
                data?.error?.message ||
                "Unknown Groq error"
            }`
        );
    }

    const text =
        data
            ?.choices?.[0]
            ?.message
            ?.content
            ?.trim();

    if (!text) {

        throw new Error(
            "Groq returned empty response"
        );
    }

    return text;
}

/* =========================================================
   اكتشاف أوامر البوت
========================================================= */

function detectCommand(
    query,
    commands
) {

    const text =
        String(query || "")
            .trim()
            .toLowerCase();

    if (!text) {
        return null;
    }

    const aliases = [

        {
            command: "اغنية",

            patterns: [
                "شغلي اغنية",
                "شغل اغنية",
                "شغلي الأغنية",
                "شغل الأغنية",
                "اغنية",
                "أغنية"
            ]
        },

        {
            command: "ويكي",

            patterns: [
                "ابحث في ويكي",
                "ابحث في ويكيبيديا",
                "ويكي",
                "ويكيبيديا"
            ]
        },

        {
            command: "اعدادات",

            patterns: [
                "افتح الاعدادات",
                "افتح الإعدادات",
                "اعدادات",
                "الإعدادات"
            ]
        }
    ];

    for (const item of aliases) {

        if (!commands.has(item.command)) {
            continue;
        }

        for (const pattern of item.patterns) {

            const normalizedPattern =
                pattern.toLowerCase();

            if (
                text === normalizedPattern ||
                text.startsWith(
                    normalizedPattern + " "
                )
            ) {

                const remaining =
                    text
                        .slice(
                            normalizedPattern.length
                        )
                        .trim();

                return {
                    name: item.command,

                    args: remaining
                        ? remaining.split(/\s+/)
                        : []
                };
            }
        }
    }

    for (const [name] of commands) {

        const normalized =
            String(name).toLowerCase();

        if (
            text === normalized ||
            text.startsWith(
                normalized + " "
            )
        ) {

            const remaining =
                text
                    .slice(name.length)
                    .trim();

            return {
                name,

                args: remaining
                    ? remaining.split(/\s+/)
                    : []
            };
        }
    }

    return null;
}

/* =========================================================
   تنفيذ أمر البوت
========================================================= */

async function executeBotCommand({
    api,
    event,
    args,
    command,
    Threads,
    Users,
    Currencies,
    models,
    permssion
}) {

    if (
        !command ||
        !command.config ||
        typeof command.run !== "function"
    ) {

        return {
            success: false,
            reason: "الأمر غير قابل للتنفيذ."
        };
    }

    const requiredPermission =
        Number(
            command.config.hasPermssion || 0
        );

    if (
        requiredPermission >
        Number(permssion || 0)
    ) {

        return {
            success: false,
            reason:
                "هذا الأمر يحتاج صلاحيات أعلى."
        };
    }

    try {

        const Obj = {
            api,
            event,
            args,
            models,
            Users,
            Threads,
            Currencies,
            permssion,
            getText: () => ""
        };

        await Promise.resolve(
            command.run(Obj)
        );

        return {
            success: true
        };

    } catch (error) {

        console.error(
            `[LINA COMMAND ${command.config.name}]`,
            error
        );

        return {
            success: false,

            reason:
                error?.message ||
                "حدث خطأ أثناء تنفيذ الأمر."
        };
    }
}

/* =========================================================
   أدوات تشخيص المطور
========================================================= */

function isOwner(senderID) {
    return String(senderID) === String(OWNER_ID);
}

function getCommandsPath() {
    return path.join(
        global.client.mainPath,
        "modules",
        "commands"
    );
}

function safeRelative(filePath) {
    const base =
        path.resolve(
            getCommandsPath()
        );

    const target =
        path.resolve(filePath);

    if (
        target !== base &&
        !target.startsWith(base + path.sep)
    ) {
        return false;
    }

    return true;
}

function findCommandFile(commandName) {

    if (!commandName) {
        return null;
    }

    const base =
        getCommandsPath();

    const possible = [
        path.join(
            base,
            `${commandName}.js`
        ),

        path.join(
            base,
            `${commandName}.cjs`
        )
    ];

    for (const file of possible) {

        if (
            safeRelative(file) &&
            fs.existsSync(file) &&
            fs.statSync(file).isFile()
        ) {
            return file;
        }
    }

    return null;
}

function listCommandFiles() {

    const base =
        getCommandsPath();

    if (!fs.existsSync(base)) {
        return [];
    }

    return fs
        .readdirSync(base)
        .filter(file =>
            file.endsWith(".js") ||
            file.endsWith(".cjs")
        )
        .sort();
}

function stripSensitiveContent(text) {

    /*
     * لا نكشف الأسرار حتى للمطور
     * داخل رد الذكاء الاصطناعي.
     */

    return String(text)
        .replace(
            /(?:GEMINI_API_KEY|GROQ_API_KEY|API_KEY|TOKEN|ACCESS_TOKEN|PASSWORD|APPSTATE|COOKIE)\s*[:=]\s*["'`][^"'`]+["'`]/gi,
            "$1 = [HIDDEN]"
        )
        .replace(
            /Bearer\s+[A-Za-z0-9._\-]+/gi,
            "Bearer [HIDDEN]"
        );
}

function diagnoseJavaScript(text) {

    const problems = [];

    const source =
        String(text || "");

    const openBraces =
        (source.match(/{/g) || []).length;

    const closeBraces =
        (source.match(/}/g) || []).length;

    if (
        openBraces !== closeBraces
    ) {
        problems.push(
            "عدد الأقواس { } غير متطابق."
        );
    }

    const openParens =
        (source.match(/\(/g) || []).length;

    const closeParens =
        (source.match(/\)/g) || []).length;

    if (
        openParens !== closeParens
    ) {
        problems.push(
            "عدد الأقواس ( ) غير متطابق."
        );
    }

    if (
        !source.includes(
            "module.exports.config"
        )
    ) {
        problems.push(
            "لم يتم العثور على module.exports.config."
        );
    }

    if (
        !source.includes(
            "module.exports.run"
        )
    ) {
        problems.push(
            "لم يتم العثور على module.exports.run."
        );
    }

    return problems;
}

function ownerDiagnostic(
    query,
    commands
) {

    const text =
        String(query || "")
            .trim();

    if (!text) {
        return null;
    }

    const lower =
        text.toLowerCase();

    /*
     * قائمة الملفات
     */

    if (
        lower === "اعرض ملفات الاوامر" ||
        lower === "اعرض ملفات الأوامر" ||
        lower === "ملفات الاوامر" ||
        lower === "ملفات الأوامر"
    ) {

        const files =
            listCommandFiles();

        return {
            type: "result",

            text:
`╭──〔 ملفات الأوامر 〕──
│
${files
    .map(
        (file, index) =>
            `│ ${index + 1}. ${file}`
    )
    .join("\n")}
│
╰────────────────`
        };
    }

    /*
     * قراءة ملف محدد
     */

    const readMatch =
        text.match(
            /^(?:اعرض|اقرأ|اقرا)\s+(?:ملف|كود)\s+(.+)$/i
        );

    if (readMatch) {

        const requested =
            readMatch[1].trim();

        const file =
            findCommandFile(
                requested
            );

        if (!file) {

            return {
                type: "result",

                text:
                    `ما لقيت ملف الأمر: ${requested}`
            };
        }

        try {

            const source =
                fs.readFileSync(
                    file,
                    "utf8"
                );

            const safeSource =
                stripSensitiveContent(
                    source
                );

            const problems =
                diagnoseJavaScript(
                    source
                );

            return {
                type: "result",

                text:
`╭──〔 ${path.basename(file)} 〕──
│
${safeSource}
│
${problems.length
    ? `⚠️ ملاحظات:\n${problems.map(x => `• ${x}`).join("\n")}`
    : "✓ لم يظهر خطأ بنيوي واضح."}
╰────────────────`
            };

        } catch (error) {

            return {
                type: "result",

                text:
                    `فشل قراءة الملف: ${error.message}`
            };
        }
    }

    /*
     * تشخيص أمر محدد
     */

    const diagnoseMatch =
        text.match(
            /^(?:شخص|شخّص|شخصي)\s+(?:امر|أمر)\s+(.+)$/i
        );

    if (diagnoseMatch) {

        const requested =
            diagnoseMatch[1].trim();

        const file =
            findCommandFile(
                requested
            );

        if (!file) {

            return {
                type: "result",

                text:
                    `ما لقيت ملف الأمر: ${requested}`
            };
        }

        try {

            const source =
                fs.readFileSync(
                    file,
                    "utf8"
                );

            const problems =
                diagnoseJavaScript(
                    source
                );

            return {
                type: "result",

                text:
`╭──〔 تشخيص ${path.basename(file)} 〕──
│
${problems.length
    ? problems.map(
        item => `⚠️ ${item}`
      ).join("\n")
    : "✓ البنية الأساسية تبدو سليمة."}
│
╰────────────────`
            };

        } catch (error) {

            return {
                type: "result",

                text:
                    `فشل التشخيص: ${error.message}`
            };
        }
    }

    return null;
}

/* =========================================================
   بناء Prompt مع سياق المحادثة
========================================================= */

function buildPrompt(
    threadID,
    senderID,
    query
) {

    const conversation =
        getConversation(
            threadID,
            senderID
        );

    const history =
        conversation.messages
            .map(item =>
                `${item.role}: ${item.content}`
            )
            .join("\n");

    return `
السياق السابق:
${history || "لا يوجد سياق سابق."}

طلب المستخدم الحالي:
${query}

أجيبي بشكل طبيعي ومباشر.
إذا كان المستخدم يواصل موضوعًا سابقًا فاستمري عليه.
`;
}

/* =========================================================
   طلب الذكاء الاصطناعي
========================================================= */

async function askAI({
    query,
    threadID,
    senderID
}) {

    const googleKey =
        process.env.GEMINI_API_KEY;

    const groqKey =
        process.env.GROQ_API_KEY;

    const userPrompt =
        buildPrompt(
            threadID,
            senderID,
            query
        );

    let answer = null;

    /*
     * Groq
     */

    if (groqKey) {

        const groqModels = [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "allam-2-7b"
        ];

        for (
            const model of groqModels
        ) {

            try {

                console.log(
                    `[LINA] Trying Groq: ${model}`
                );

                const conversation =
                    getConversation(
                        threadID,
                        senderID
                    );

                answer =
                    await askGroq(
                        groqKey,
                        model,
                        query,
                        conversation.messages
                    );

                if (answer) {
                    break;
                }

            } catch (error) {

                console.error(
                    `[LINA] Groq failed: ${model}`,
                    error.message
                );
            }
        }
    }

    /*
     * Gemini
     */

    if (
        !answer &&
        googleKey
    ) {

        const geminiModels = [
            "gemini-3.6-flash",
            "gemini-3.5-flash"
        ];

        for (
            const model of geminiModels
        ) {

            try {

                console.log(
                    `[LINA] Trying Gemini: ${model}`
                );

                answer =
                    await askGemini(
                        googleKey,
                        model,
                        userPrompt
                    );

                if (answer) {
                    break;
                }

            } catch (error) {

                console.error(
                    `[LINA] Gemini failed: ${model}`,
                    error.message
                );
            }
        }
    }

    return answer;
}

/* =========================================================
   تسجيل رد لينا للمحادثة
========================================================= */

function registerReply(
    info,
    event
) {

    if (
        !info ||
        !info.messageID ||
        !global.client
    ) {
        return;
    }

    if (
        !Array.isArray(
            global.client.handleReply
        )
    ) {
        global.client.handleReply = [];
    }

    global.client.handleReply.push({

        name: "لينا",

        messageID:
            info.messageID,

        author:
            event.senderID,

        threadID:
            event.threadID,

        type: "lina",

        createdAt:
            Date.now()
    });

    /*
     * تنظيف الإدخالات القديمة
     */

    global.client.handleReply =
        global.client.handleReply.filter(
            item =>
                Date.now() -
                Number(
                    item.createdAt || 0
                ) <
                60 * 60 * 1000
        );
}

/* =========================================================
   تشغيل لينا
========================================================= */

module.exports.run = async function ({
    api,
    event,
    args,
    Threads,
    Users,
    Currencies,
    models,
    permssion
}) {

    const {
        threadID,
        messageID,
        senderID
    } = event;

    const query =
        Array.isArray(args)
            ? args.join(" ").trim()
            : "";

    if (!query) {

        await react(
            api,
            messageID,
            threadID
        );

        await typing(
            api,
            threadID,
            true
        );

        try {

            const info =
                await sendMessage(
                    api,
                    "أنا معاك 😌 اكتب لي عايز شنو.",
                    threadID
                );

            registerReply(
                info,
                event
            );

        } finally {

            await typing(
                api,
                threadID,
                false
            );
        }

        return;
    }

    await react(
        api,
        messageID,
        threadID
    );

    await typing(
        api,
        threadID,
        true
    );

    try {

        const commands =
            global.client?.commands;

        /*
         * أدوات المطور
         */

        if (
            isOwner(senderID)
        ) {

            const diagnostic =
                ownerDiagnostic(
                    query,
                    commands
                );

            if (diagnostic) {

                const info =
                    await sendMessage(
                        api,
                        diagnostic.text,
                        threadID
                    );

                registerReply(
                    info,
                    event
                );

                return;
            }
        }

        /*
         * تشغيل أمر حقيقي
         */

        if (commands) {

            const requested =
                detectCommand(
                    query,
                    commands
                );

            if (requested) {

                const command =
                    commands.get(
                        requested.name
                    );

                console.log(
                    `[LINA] Command request: ${requested.name}`
                );

                const result =
                    await executeBotCommand({
                        api,
                        event,
                        args:
                            requested.args,
                        command,
                        Threads,
                        Users,
                        Currencies,
                        models,
                        permssion
                    });

                if (result.success) {
                    return;
                }

                await sendMessage(
                    api,
                    result.reason,
                    threadID
                );

                return;
            }
        }

        /*
         * الذكاء الاصطناعي
         */

        addConversationMessage(
            threadID,
            senderID,
            "user",
            query
        );

        const answer =
            await askAI({
                query,
                threadID,
                senderID
            });

        if (!answer) {

            /*
             * إزالة آخر رسالة إذا فشلت
             * كل الخدمات الذكية.
             */

            const conversation =
                getConversation(
                    threadID,
                    senderID
                );

            conversation.messages.pop();

            await sendMessage(
                api,
                "الخدمات الذكية ما ردت هسي، جرّب بعد شوية.",
                threadID
            );

            return;
        }

        addConversationMessage(
            threadID,
            senderID,
            "assistant",
            answer
        );

        const info =
            await sendMessage(
                api,
                answer,
                threadID
            );

        registerReply(
            info,
            event
        );

    } catch (error) {

        console.error(
            "[LINA ERROR]",
            error
        );

        await sendMessage(
            api,
            "حصل خطأ وأنا بحاول أنفذ طلبك.",
            threadID
        );

    } finally {

        await typing(
            api,
            threadID,
            false
        );
    }
};

/* =========================================================
   الرد على رسالة لينا
========================================================= */

module.exports.handleReply = async function ({
    api,
    event,
    handleReply,
    Threads,
    Users,
    Currencies,
    models,
    permssion
}) {

    if (!handleReply) {
        return;
    }

    const {
        threadID,
        messageID,
        senderID,
        body
    } = event;

    /*
     * نتحقق أن الرد تابع لهذه المحادثة
     */

    if (
        String(handleReply.threadID) !==
        String(threadID)
    ) {
        return;
    }

    const query =
        String(body || "")
            .trim();

    if (!query) {
        return;
    }

    /*
     * تفاعل الانتظار فقط
     */

    await react(
        api,
        messageID,
        threadID
    );

    await typing(
        api,
        threadID,
        true
    );

    try {

        /*
         * المطور يستطيع استخدام أدوات التشخيص
         * حتى من خلال الرد على رسالة لينا.
         */

        if (
            isOwner(senderID)
        ) {

            const diagnostic =
                ownerDiagnostic(
                    query,
                    global.client?.commands
                );

            if (diagnostic) {

                const info =
                    await sendMessage(
                        api,
                        diagnostic.text,
                        threadID
                    );

                registerReply(
                    info,
                    event
                );

                return;
            }
        }

        /*
         * إضافة رسالة جديدة للسياق
         */

        addConversationMessage(
            threadID,
            senderID,
            "user",
            query
        );

        const answer =
            await askAI({
                query,
                threadID,
                senderID
            });

        if (!answer) {

            const conversation =
                getConversation(
                    threadID,
                    senderID
                );

            conversation.messages.pop();

            await sendMessage(
                api,
                "الخدمات الذكية ما ردت هسي، جرّب بعد شوية.",
                threadID
            );

            return;
        }

        addConversationMessage(
            threadID,
            senderID,
            "assistant",
            answer
        );

        const info =
            await sendMessage(
                api,
                answer,
                threadID
            );

        /*
         * نخلي الرد الجديد قابل للرد
         */

        registerReply(
            info,
            event
        );

    } catch (error) {

        console.error(
            "[LINA REPLY ERROR]",
            error
        );

        await sendMessage(
            api,
            "حصل خطأ وأنا بحاول أكمل المحادثة.",
            threadID
        );

    } finally {

        await typing(
            api,
            threadID,
            false
        );
    }
};
