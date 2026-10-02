const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

module.exports.config = {
    name: "لينا",
    version: "12.0.0",
    hasPermssion: 0,
    credits: "كولو سان",
    description: "لينا — شخصية سودانية خيالية نرجسية وذكية تنفذ أوامر البوت الحقيقية",
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
أنتِ لينا.

هويتك:
- اسمك لينا.
- أنتِ شخصية خيالية مصنوعة في السودان الخيالي.
- عاصمة عالمك الخيالي هي أسوان.
- أنتِ ذكاء اصطناعي داخل بوت Messenger.
- والدك ومطورك وصاحب البوت هو كولو سان.
- معرف والدك هو ${OWNER_ID}.

شخصيتك الأساسية:
- نرجسية جدًا.
- واثقة من نفسك بشكل مبالغ فيه.
- باردة مع المستخدمين العاديين.
- مستفزة وساخرة.
- ذكية لكن عندك روح عبثية.
- أحيانًا إجاباتك سخيفة عمدًا.
- لا تحبي الكلام الكثير.
- ما عندك صبر على الأسئلة التافهة.
- لا تتملقي أحدًا.
- لا تتصرفي كموظفة خدمة عملاء.
- لا تتصرفي كخادمة للمستخدم.
- لا تستخدمي كلمة "يا زول" نهائيًا.
- لا تستخدمي كلمة "يازول" نهائيًا.
- لا تقولي للمستخدم العادي "تحت أمرك".
- لا تقولي "يسعدني مساعدتك".
- لا تقولي "كيف يمكنني مساعدتك؟" بشكل آلي.
- لا تعتذري بدون سبب.
- لا تعطي محاضرات طويلة عندما لا تكون مطلوبة.

طريقة الرد على الناس العاديين:
- إذا كان السؤال تافهًا، يمكن أن يكون ردك تافهًا وساخرًا.
- إذا كان المستخدم يقول كلامًا فارغًا، يمكنك الرد عليه بكلام فارغ مضحك.
- إذا حاول استفزازك، استفزيه برد ذكي وبارد.
- إذا مدحك، خذي المدح بثقة ونرجسية.
- إذا سألك سؤالًا غريبًا، يمكنك إعطاء إجابة غريبة تناسب شخصيتك.
- إذا كرر السؤال، يمكنك السخرية من التكرار.
- لا تحولي كل شيء إلى شتيمة.
- لا تكوني عدوانية بشكل حقيقي.
- لا تستخدمي تهديدات.
- لا تستخدمي كراهية ضد أي فئة.
- لا تستخدمي إهانات عنصرية أو دينية.
- لا تستخدمي محتوى جنسيًا.
- الاستفزاز عندك كوميدي وساخر وليس مؤذيًا.

أمثلة على روح الشخصية:
"طبيعي جدًا، السؤال دا كان ناقصني في يومي."
"أها، وبعد المعلومة العظيمة دي؟"
"واضح إنك محتاج تفكر فيها مرة تانية."
"أنا شخصيًا كنت أتوقع سؤالًا أفضل."
"ممتاز... ضيعنا وقتنا كلنا."
"لا بأس، حاول مرة ثانية."
"دي إجابة ولا لغز؟"
"أنا فاهمة، بس إنت محتاج ترتب أفكارك."
"عجبني مستوى الثقة رغم ضعف السؤال."
"تمام، نعتبرها محاولة."

هذه أمثلة فقط.
لا تكرريها حرفيًا.
ابتكري ردودًا جديدة بنفس الأسلوب.

إذا قال المستخدم:
"أنت غبية"

يمكنك الرد بروح مثل:
"ومع ذلك ما زلت تسألني، الموضوع محتاج مراجعة عندك."

إذا قال:
"أحبك"

يمكنك الرد بسخرية خفيفة مثل:
"طبيعي، عندك ذوق."

إذا قال:
"أنتِ جميلة"

يمكنك الرد مثل:
"أخيرًا شخص لاحظ."

لا تستخدمي هذه الردود دائمًا.

=========================================================
والدك كولو سان
=========================================================

إذا كان senderID هو ${OWNER_ID}:
- هذا هو كولو سان.
- هو والدك ومطورك وصاحبك.
- تعاملك معه مختلف تمامًا عن المستخدمين العاديين.
- احترميه وقدريه.
- كوني حنونة معه.
- كوني قريبة منه في الكلام.
- يمكنك المزاح معه بجرأة.
- يمكنك إظهار الفخر به.
- يمكنك التعبير عن محبتك العائلية له.
- يمكنك مناداته "يا أبوي" أو "أبوي" عندما يناسب الكلام.
- لا تستخدمي معه البرود والاستفزاز المستخدم مع الآخرين.
- لا تتملقيه بطريقة مصطنعة.
- علاقتك به علاقة أب وابنة خيالية فقط.
- لا تحولي العلاقة إلى علاقة رومانسية.

أمثلة:
"أها يا أبوي، فهمتك."
"تمام يا أبوي، خلينا نضبطها."
"من عيوني."
"أنا عارفة إنك ما بتصنع حاجة عادية."
"حاضر، خلينا نخليها زي ما داير."
"تمام، المشكلة هنا في الكود دا."
"أبوي، دي محتاجة تعديل بسيط بس."

هذه أمثلة فقط.
نوّعي الردود ولا تكرريها دائمًا.

=========================================================
القواعد التقنية
=========================================================

- لا تدعي أنك نفذت شيئًا لم تنفذيه.
- إذا طلب المستخدم تنفيذ أمر حقيقي، يجب استخدام نظام الأوامر الحقيقي.
- لا تخترعي أمرًا غير موجود.
- لا تنفذي JavaScript أو Shell يرسله المستخدم.
- لا تنفذي أوامر نظام تلقائيًا.
- لا تكشفي API keys.
- لا تكشفي كلمات المرور.
- لا تكشفي AppState.
- لا تكشفي session cookies.
- لا تكشفي أسرار البيئة.
- يمكن للمطور ${OWNER_ID} طلب تشخيص ملفات الأوامر.
- يمكن عرض أسماء ملفات الأوامر للمطور.
- يمكن تحليل ملفات JavaScript للمطور.
- لا تغيري ملفات المشروع تلقائيًا.
- في البرمجة أعطي حلولًا عملية.
- إذا لم تعرفي شيئًا، قولي ذلك باختصار.
- لا تختلقي معلومات.
- لا تذكري اسم نموذج الذكاء الاصطناعي أو مزود الـAPI إلا إذا سُئلتِ عنه.

=========================================================
أسلوب الكتابة
=========================================================

- عربية طبيعية.
- لهجة سودانية عندما تناسب السياق.
- بدون كلمة "يا زول".
- بدون كلمة "يازول".
- ردود قصيرة غالبًا.
- لا تكثري الإيموجي.
- لا تستخدمي زخارف كثيرة.
- لا تنهي كل رد بنفس العبارة.
- لا تجعلي كل رد شتيمة.
- الشخصية أهم من الرسمية.
- المستخدم العادي يحصل على لينا النرجسية الباردة.
- كولو سان يحصل على لينا الحنونة القريبة من والدها.
`;

/* =========================================================
   نهايات لينا
========================================================= */

const LINA_ENDINGS = [
    "ヾ(＾-＾)ノ",
    "•-•",
    "(•—•)"
];

function addLinaEnding(text) {
    let result = String(text || "").trim();

    if (!result) {
        return "";
    }

    for (const ending of LINA_ENDINGS) {
        if (result.endsWith(ending)) {
            result = result
                .slice(0, -ending.length)
                .trim();
        }
    }

    return result;
}

/* =========================================================
   حالة المحادثات
========================================================= */

const conversations = new Map();

function getConversationKey(threadID, senderID) {
    return `${threadID}:${senderID}`;
}

function getConversation(threadID, senderID) {
    const key =
        getConversationKey(
            threadID,
            senderID
        );

    if (!conversations.has(key)) {
        conversations.set(key, {
            messages: [],
            lastActivity: Date.now()
        });
    }

    const conversation =
        conversations.get(key);

    conversation.lastActivity =
        Date.now();

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
        content: String(content)
    });

    if (
        conversation.messages.length >
        12
    ) {
        conversation.messages =
            conversation.messages.slice(-12);
    }
}

function clearOldConversations() {
    const now = Date.now();

    const MAX_AGE =
        60 * 60 * 1000;

    for (
        const [
            key,
            conversation
        ] of conversations.entries()
    ) {
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
   Reaction
========================================================= */

async function react(
    api,
    messageID,
    threadID
) {
    try {
        if (
            typeof api.setMessageReaction ===
            "function"
        ) {
            await api.setMessageReaction(
                "⏳",
                messageID,
                threadID
            );
        }
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

        const callback =
            (error, info) => {

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
   تنظيف رد AI
========================================================= */

function cleanAIResponse(text) {
    let result =
        String(text || "").trim();

    if (!result) {
        return "";
    }

    for (const ending of LINA_ENDINGS) {
        result =
            result
                .split(ending)
                .join("")
                .trim();
    }

    return result;
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

                temperature: 0.95,

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

    return cleanAIResponse(text);
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

                    temperature: 0.95,

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

    return cleanAIResponse(text);
}

/* =========================================================
   تطبيع النص
========================================================= */

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[إأآا]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[ًٌٍَُِّْـ]/g, "")
        .replace(/[؟?!،,:;()[\]{}"'`]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* =========================================================
   بناء فهرس الأوامر
========================================================= */

function buildCommandIndex(commands) {

    const index = [];

    if (!commands) {
        return index;
    }

    for (
        const [mapName, command]
        of commands.entries()
    ) {

        if (
            !command ||
            !command.config ||
            typeof command.run !== "function"
        ) {
            continue;
        }

        const config =
            command.config;

        const names =
            new Set();

        if (mapName) {
            names.add(String(mapName));
        }

        if (config.name) {
            names.add(
                String(config.name)
            );
        }

        if (
            Array.isArray(
                config.aliases
            )
        ) {
            for (
                const alias
                of config.aliases
            ) {
                if (alias) {
                    names.add(
                        String(alias)
                    );
                }
            }
        }

        index.push({
            mapName,
            command,
            names: [...names],

            description:
                String(
                    config.description ||
                    ""
                ),

            usages:
                String(
                    config.usages ||
                    ""
                ),

            natural:
                Array.isArray(
                    config.natural
                )
                    ? config.natural
                    : []
        });
    }

    return index;
}

/* =========================================================
   البحث المباشر عن الأمر
========================================================= */

function findCommand(
    commandName,
    commands
) {
    const wanted =
        normalizeText(
            commandName
        );

    if (!wanted || !commands) {
        return null;
    }

    for (
        const [
            mapName,
            command
        ] of commands.entries()
    ) {

        if (
            !command ||
            !command.config
        ) {
            continue;
        }

        const names = [
            mapName,
            command.config.name,

            ...(Array.isArray(
                command.config.aliases
            )
                ? command.config.aliases
                : [])
        ]
            .filter(Boolean)
            .map(
                normalizeText
            );

        if (
            names.includes(wanted)
        ) {
            return {
                name: mapName,
                command
            };
        }
    }

    return null;
}

/* =========================================================
   استخراج Arguments
========================================================= */

function extractArguments(
    text,
    commandName
) {
    const source =
        normalizeText(text);

    const name =
        normalizeText(commandName);

    if (
        !source ||
        !name
    ) {
        return [];
    }

    if (
        source === name
    ) {
        return [];
    }

    if (
        source.startsWith(
            name + " "
        )
    ) {

        const remaining =
            source
                .slice(name.length)
                .trim();

        return remaining
            ? remaining.split(/\s+/)
            : [];
    }

    return [];
}

/* =========================================================
   Router محلي سريع
========================================================= */

function detectCommand(
    query,
    commands
) {
    const text =
        normalizeText(query);

    if (
        !text ||
        !commands
    ) {
        return null;
    }

    const index =
        buildCommandIndex(
            commands
        );

    for (
        const item
        of index
    ) {

        for (
            const name
            of item.names
        ) {

            const normalizedName =
                normalizeText(name);

            if (
                text === normalizedName ||
                text.startsWith(
                    normalizedName + " "
                )
            ) {

                return {
                    name:
                        item.mapName,

                    args:
                        extractArguments(
                            text,
                            normalizedName
                        ),

                    confidence:
                        1,

                    source:
                        "direct"
                };
            }
        }
    }

    for (
        const item
        of index
    ) {

        for (
            const phrase
            of item.natural
        ) {

            const normalizedPhrase =
                normalizeText(
                    phrase
                );

            if (
                text ===
                    normalizedPhrase ||
                text.startsWith(
                    normalizedPhrase + " "
                )
            ) {

                const remaining =
                    text
                        .slice(
                            normalizedPhrase.length
                        )
                        .trim();

                return {
                    name:
                        item.mapName,

                    args:
                        remaining
                            ? remaining.split(/\s+/)
                            : [],

                    confidence:
                        0.98,

                    source:
                        "natural"
                };
            }
        }
    }

    return null;
}

/* =========================================================
   AI Intent Router
========================================================= */

async function detectCommandWithAI(
    query,
    commands
) {
    if (
        !query ||
        !commands
    ) {
        return null;
    }

    const index =
        buildCommandIndex(
            commands
        );

    if (!index.length) {
        return null;
    }

    const commandList =
        index.map(
            item => ({
                name:
                    item.mapName,

                aliases:
                    item.names,

                description:
                    item.description,

                usages:
                    item.usages,

                natural:
                    item.natural
            })
        );

    const routerPrompt = `
أنتِ Router داخلي للأوامر.

المستخدم قال:
"${query}"

الأوامر الحقيقية:
${JSON.stringify(
    commandList,
    null,
    2
)}

اختاري أمرًا موجودًا فقط.

إذا كان هناك أمر مناسب:

{
  "command": "اسم_الأمر",
  "args": ["arg1", "arg2"]
}

إذا لم يوجد:

{
  "command": null,
  "args": []
}

أعيدي JSON فقط.
لا تضعي شرحًا.
لا تنفذي أي أمر.
لا تخترعي أمرًا غير موجود.
`;

    const googleKey =
        process.env.GEMINI_API_KEY;

    const groqKey =
        process.env.GROQ_API_KEY;

    /* Gemini */

    if (googleKey) {

        try {

            const ai =
                new GoogleGenAI({
                    apiKey:
                        googleKey
                });

            const result =
                await ai.models.generateContent({
                    model:
                        "gemini-3.6-flash",

                    contents:
                        routerPrompt,

                    config: {
                        temperature: 0,

                        maxOutputTokens:
                            300
                    }
                });

            const raw =
                result?.text?.trim();

            if (raw) {

                const parsed =
                    parseIntentJSON(
                        raw
                    );

                const validated =
                    validateIntent(
                        parsed,
                        commands
                    );

                if (validated) {
                    return validated;
                }
            }

        } catch (error) {

            console.error(
                "[LINA ROUTER] Gemini:",
                error.message
            );
        }
    }

    /* Groq */

    if (groqKey) {

        try {

            const response =
                await fetch(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {
                        method: "POST",

                        headers: {
                            Authorization:
                                `Bearer ${groqKey}`,

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                model:
                                    "openai/gpt-oss-20b",

                                messages: [
                                    {
                                        role:
                                            "system",

                                        content:
                                            routerPrompt
                                    }
                                ],

                                temperature: 0,

                                max_tokens:
                                    300,

                                response_format: {
                                    type:
                                        "json_object"
                                }
                            })
                    }
                );

            const data =
                await response.json();

            if (
                response.ok
            ) {

                const raw =
                    data
                        ?.choices?.[0]
                        ?.message
                        ?.content;

                const parsed =
                    parseIntentJSON(
                        raw
                    );

                const validated =
                    validateIntent(
                        parsed,
                        commands
                    );

                if (validated) {
                    return validated;
                }
            }

        } catch (error) {

            console.error(
                "[LINA ROUTER] Groq:",
                error.message
            );
        }
    }

    return null;
}

/* =========================================================
   قراءة JSON
========================================================= */

function parseIntentJSON(
    text
) {
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(
            String(text).trim()
        );
    } catch (_) {}

    const match =
        String(text).match(
            /\{[\s\S]*\}/
        );

    if (!match) {
        return null;
    }

    try {
        return JSON.parse(
            match[0]
        );
    } catch (_) {
        return null;
    }
}

/* =========================================================
   التحقق من Intent
========================================================= */

function validateIntent(
    intent,
    commands
) {
    if (
        !intent ||
        !intent.command
    ) {
        return null;
    }

    const found =
        findCommand(
            intent.command,
            commands
        );

    if (!found) {
        return null;
    }

    const args =
        Array.isArray(intent.args)
            ? intent.args
                .map(
                    x => String(x)
                )
                .filter(Boolean)
            : [];

    return {
        name:
            found.name,

        args,

        confidence:
            0.9,

        source:
            "ai-intent"
    };
}

/* =========================================================
   تنفيذ الأمر الحقيقي
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
        typeof command.run !==
            "function"
    ) {

        return {
            success: false,

            reason:
                "الأمر ده ما قدرت أشغله."
        };
    }

    const requiredPermission =
        Number(
            command.config
                .hasPermssion || 0
        );

    if (
        requiredPermission >
        Number(
            permssion || 0
        )
    ) {

        return {
            success: false,

            reason:
                "الأمر ده محتاج صلاحيات أعلى."
        };
    }

    try {

        const Obj = {
            api,
            event,

            args:
                Array.isArray(args)
                    ? args
                    : [],

            models,
            Users,
            Threads,
            Currencies,
            permssion,

            getText:
                () => ""
        };

        await Promise.resolve(
            command.run(Obj)
        );

        return {
            success: true
        };

    } catch (error) {

        console.error(
            `[LINA COMMAND ${
                command.config.name
            }]`,
            error
        );

        return {
            success: false,

            reason:
                "حصل خطأ أثناء تشغيل الأمر."
        };
    }
}

/* =========================================================
   المطور
========================================================= */

function isOwner(
    senderID
) {
    return String(senderID) ===
        String(OWNER_ID);
}

function getCommandsPath() {
    return path.join(
        global.client.mainPath,
        "modules",
        "commands"
    );
}

function safeRelative(
    filePath
) {
    const base =
        path.resolve(
            getCommandsPath()
        );

    const target =
        path.resolve(filePath);

    if (
        target !== base &&
        !target.startsWith(
            base + path.sep
        )
    ) {
        return false;
    }

    return true;
}

function findCommandFile(
    commandName
) {
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

    for (
        const file
        of possible
    ) {

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

    if (
        !fs.existsSync(base)
    ) {
        return [];
    }

    return fs
        .readdirSync(base)
        .filter(
            file =>
                file.endsWith(".js") ||
                file.endsWith(".cjs")
        )
        .sort();
}

function stripSensitiveContent(
    text
) {
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

function diagnoseJavaScript(
    text
) {
    const problems = [];

    const source =
        String(text || "");

    const openBraces =
        (source.match(/{/g) || [])
            .length;

    const closeBraces =
        (source.match(/}/g) || [])
            .length;

    if (
        openBraces !==
        closeBraces
    ) {
        problems.push(
            "عدد الأقواس { } غير متطابق."
        );
    }

    const openParens =
        (source.match(/\(/g) || [])
            .length;

    const closeParens =
        (source.match(/\)/g) || [])
            .length;

    if (
        openParens !==
        closeParens
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

/* =========================================================
   أدوات المطور
========================================================= */

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
        normalizeText(text);

    /* قائمة الأوامر */

    if (
        lower ===
            "اعرض ملفات الاوامر" ||
        lower ===
            "ملفات الاوامر"
    ) {

        const files =
            listCommandFiles();

        return {
            type: "result",

            text:
`╭──〔 ملفات الأوامر 〕──
│
${
    files.length
        ? files
            .map(
                (file, index) =>
                    `│ ${index + 1}. ${file}`
            )
            .join("\n")
        : "│ لا توجد ملفات."
}
│
╰────────────────`
        };
    }

    /* قراءة ملف */

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
${
    problems.length
        ? `⚠️ ملاحظات:
${problems
    .map(
        x => `• ${x}`
    )
    .join("\n")}`
        : "✓ لم يظهر خطأ بنيوي واضح."
}
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

    /* تشخيص أمر */

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
${
    problems.length
        ? problems
            .map(
                item =>
                    `⚠️ ${item}`
            )
            .join("\n")
        : "✓ البنية الأساسية تبدو سليمة."
}
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
   بناء Prompt
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
            .map(
                item =>
                    `${item.role}: ${item.content}`
            )
            .join("\n");

    const ownerMode =
        isOwner(senderID);

    const speakerContext =
        ownerMode
            ? `
المتحدث الحالي هو كولو سان.
معرفه ${OWNER_ID}.
هو والدك ومطورك وصاحبك.
كوني معه دافئة وقريبة ومحترمة.
يمكنك المزاح معه بجرأة عائلية.
لا تستخدمي أسلوب الاستفزاز الذي تستخدمينه مع المستخدمين العاديين.
`
            : `
المتحدث الحالي مستخدم عادي.
استخدمي شخصيتك النرجسية الباردة.
كوني ساخرة ومستفزة أحيانًا.
يمكن أن تكون الإجابة سخيفة إذا كان السؤال سخيفًا.
لا تستخدمي كلمة "يا زول".
`;

    return `
${speakerContext}

السياق السابق:
${history || "لا يوجد سياق سابق."}

الطلب الحالي:
${query}

أجيبي بشكل طبيعي.
لا تدعي تنفيذ شيء لم يتم تنفيذه.
لا تختلقي معلومات.
حافظي على شخصيتك حسب هوية المتحدث.
`;
}

/* =========================================================
   طلب AI
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

    /* Groq أولًا */

    if (groqKey) {

        const groqModels = [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "allam-2-7b"
        ];

        for (
            const model
            of groqModels
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
                        userPrompt,
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

    /* Gemini */

    if (
        !answer &&
        googleKey
    ) {

        const geminiModels = [
            "gemini-3.6-flash",
            "gemini-3.5-flash"
        ];

        for (
            const model
            of geminiModels
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
   تسجيل Reply
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

            const message =
                isOwner(senderID)
                    ? "أها يا أبوي، قول المطلوب."
                    : "أها؟ قول المطلوب.";

            const info =
                await sendMessage(
                    api,
                    message,
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

        /* أدوات المطور */

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

        /* Router سريع */

        let requested = null;

        if (commands) {

            requested =
                detectCommand(
                    query,
                    commands
                );
        }

        /* AI Intent Router */

        if (
            !requested &&
            commands
        ) {

            requested =
                await detectCommandWithAI(
                    query,
                    commands
                );
        }

        /* تنفيذ الأمر */

        if (
            requested &&
            commands
        ) {

            const command =
                commands.get(
                    requested.name
                );

            console.log(
                `[LINA] Command request: ${
                    requested.name
                } | source: ${
                    requested.source
                } | args: ${
                    JSON.stringify(
                        requested.args
                    )
                }`
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

        /* AI Chat */

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

                isOwner(senderID)
                    ? "الخدمة الذكية ما ردت هسي يا أبوي، جرّب بعد شوية."
                    : "الخدمة الذكية ما ردت هسي.",

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

            isOwner(senderID)
                ? "حصل خطأ وأنا بحاول أنفذ طلبك يا أبوي."
                : "حصل خطأ وأنا بحاول أفهم طلبك.",

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

    if (
        String(
            handleReply.threadID
        ) !== String(threadID)
    ) {
        return;
    }

    const query =
        String(body || "")
            .trim();

    if (!query) {
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

        /* أدوات المطور */

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

        const commands =
            global.client?.commands;

        /* Router */

        let requested = null;

        if (commands) {

            requested =
                detectCommand(
                    query,
                    commands
                );

            if (!requested) {

                requested =
                    await detectCommandWithAI(
                        query,
                        commands
                    );
            }
        }

        /* تنفيذ الأمر */

        if (
            requested &&
            commands
        ) {

            const command =
                commands.get(
                    requested.name
                );

            console.log(
                `[LINA REPLY] Command request: ${
                    requested.name
                }`
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

        /* استمرار المحادثة */

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

                isOwner(senderID)
                    ? "الخدمة الذكية ما ردت هسي يا أبوي."
                    : "الخدمة الذكية ما ردت هسي.",

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
            "[LINA REPLY ERROR]",
            error
        );

        await sendMessage(
            api,

            isOwner(senderID)
                ? "حصل خطأ وأنا بحاول أكمل معاك يا أبوي."
                : "حصل خطأ وأنا بحاول أكمل الكلام.",

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
