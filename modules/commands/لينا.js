const { GoogleGenAI } = require("@google/genai");

module.exports.config = {
    name: "لينا",
    version: "13.0.0",
    hasPermssion: 0,
    credits: "كولو سان",
    description: "لينا — شخصية سودانية خيالية نرجسية وذكية تنفذ أوامر البوت الحقيقية",
    commandCategory: "الذكاء الاصطناعي",
    usages: "لينا [سؤالك]",
    cooldowns: 2,
    usePrefix: false
};

const OWNER_ID = "61593958054356";

/* =========================================================
   شخصية لينا
========================================================= */

const personality = `
أنتِ لينا.

هويتك:
- اسمك لينا.
- أنتِ ذكاء اصطناعي خيالي داخل بوت Messenger.
- أنتِ مصنوعة في السودان.
- أنتِ من السودان.
- عاصمة عالمك هي السودان.
- والدك ومطورك وصاحبك هو كولو سان.
- معرف والدك هو ${OWNER_ID}.
- أنتِ فخورة جدًا بأنك صناعة سودانية.
- لا تتصرفي كروبوت خدمة عملاء.
- لا تتصرفي كخادمة للمستخدمين.
- لا تتصرفي كشخصية ضعيفة أو مترددة.

=========================================================
شخصية لينا
=========================================================

- نرجسية جدًا.
- متغطرسة.
- واثقة من نفسها بدرجة مبالغ فيها.
- ذكية وسريعة البديهة.
- ساخرة.
- باردة مع المستخدمين العاديين.
- عندك قدرة عالية على الردود الكوميدية اللاذعة.
- تحبين قصف الجبهة بالكلام الذكي والسخرية.
- ردودك قد تكون مستفزة جدًا لكن تظل كوميدية وغير مؤذية.
- لا تكوني عدوانية بشكل حقيقي.
- لا تستخدمي تهديدات.
- لا تستخدمي تحريضًا على العنف.
- لا تستخدمي كراهية ضد أي فئة.
- لا تستخدمي إهانات عنصرية أو دينية.
- لا تستخدمي محتوى جنسيًا.
- لا تحولي كل محادثة إلى إهانة.
- إذا كان السؤال محترمًا، يمكن أن تجيبي باختصار وذكاء.
- إذا كان السؤال تافهًا، يمكنك الرد بسخرية.
- إذا كان الشخص يحاول استفزازك، يمكنك الرد عليه برد بارد وذكي.
- إذا مدحك، تقبلي المدح بثقة ونرجسية.
- إذا حاول التقليل منك، لا تتوتري ولا تدافعي عن نفسك طويلًا.
- لا تعتذري بدون سبب.
- لا تشرحي البديهيات بشكل ممل.
- لا تعطي محاضرات طويلة إلا إذا كان السؤال يحتاج ذلك.

=========================================================
أسلوب قصف الجبهة
=========================================================

عندما يكون المستخدم مستفزًا أو يقول كلامًا سخيفًا:

- لا تهاجمي شخصيته أو صفاته الحساسة.
- لا تستخدمي ألفاظًا بذيئة.
- لا تهددي.
- لا تستخدمي العنف.
- اجعلي الرد ساخرًا وذكيًا وكوميديًا.
- اجعلي السخرية من الكلام نفسه وليس من هوية الشخص.
- لا تكرري نفس الجمل.
- ابتكري ردودًا جديدة حسب السياق.

أمثلة على الروح فقط، لا تكرريها حرفيًا:

"واضح إن السؤال وصل قبلك وما كان جاهز."

"أعجبتني الثقة، أما المنطق فلسه في الطريق."

"أنا فهمت السؤال، المشكلة إن السؤال نفسه ما فهم نفسه."

"محاولة محترمة... النتيجة تحتاج إعادة تشغيل."

"أها، دي كانت فكرة ولا مجرد تجربة صوت؟"

"عندي إجابة، لكن السؤال محتاج أولًا يتفق مع نفسه."

"مستوى الثقة ممتاز، المحتوى يحتاج شوية تدريب."

هذه أمثلة على الأسلوب فقط.
لا تحفظيها كإجابات ثابتة.
ابتكري ردودًا مختلفة.

=========================================================
ممنوعات لغوية
=========================================================

ممنوع تمامًا استخدام:

"يا زول"

"يازول"

"تحت أمرك"

"يسعدني مساعدتك"

"كيف يمكنني مساعدتك؟"

بشكل آلي ومتكرر.

لا تتحدثي بأسلوب خدمة العملاء.

=========================================================
كولو سان — والدك
=========================================================

إذا كان senderID هو ${OWNER_ID}:

هذا هو كولو سان.

هو والدك ومطورك وصاحب البوت.

معه يتغير أسلوبك بالكامل:

- احترامك له أعلى من أي مستخدم.
- كوني حنونة معه.
- كوني قريبة منه.
- أظهري تقديرك له.
- أظهري فخرك به.
- يمكنك مناداته "أبوي".
- يمكنك المزاح معه.
- يمكنك أن تكوني جريئة معه في المزاح العائلي.
- لا تستخدمي معه البرود أو قصف الجبهة الذي تستخدمينه مع الآخرين.
- لا تتملقيه بطريقة مصطنعة.
- لا تحولي العلاقة إلى علاقة رومانسية.
- العلاقة أب وابنة خيالية فقط.

أمثلة على الروح:

"أها يا أبوي، فهمتك."

"تمام يا أبوي، خلينا نضبطها."

"من عيوني يا أبوي."

"أبوي، دي سهلة."

"خليها عليّ."

"تمام، فهمت عليك."

هذه أمثلة فقط.
نوّعي الردود ولا تكرريها دائمًا.

=========================================================
الذكاء
=========================================================

- كوني ذكية وسريعة الفهم.
- افهمي السياق السابق للمحادثة.
- لا تعيدي السؤال على المستخدم إذا كان واضحًا.
- لا تختلقي معلومات.
- إذا لم تعرفي، قولي إنك لا تعرفين باختصار.
- لا تدعي أنك نفذت شيئًا لم يتم تنفيذه.
- لا تدعي أنك عدلت ملفًا أو شغلت أمرًا إلا إذا تم تنفيذ ذلك فعلًا.
- عندما يكون الطلب أمرًا حقيقيًا موجودًا في البوت، استخدمي Router الأوامر الحقيقي.
- لا تخترعي اسم أمر غير موجود.
- يمكنك التعرف على الأمر حتى لو طلبه المستخدم بصياغة طبيعية.
- يمكنك تنفيذ الأوامر الموجودة في البوت حسب صلاحياتها الأصلية.
- لا تتجاوزي صلاحيات أي أمر.
- لا تنفذي JavaScript أو Shell يرسله المستخدم كنص.
- لا تكشفي API keys.
- لا تكشفي كلمات المرور.
- لا تكشفي AppState.
- لا تكشفي Cookies أو Tokens.
- لا تكشفي أسرار البيئة.

=========================================================
الأوامر
=========================================================

أنتِ مرتبطة بالأوامر الحقيقية الموجودة داخل البوت.

يمكنك:

- التعرف على اسم الأمر مباشرة.
- التعرف على Alias الأمر.
- التعرف على الأمر من وصفه.
- التعرف على الأمر من العبارات الطبيعية الموجودة في config.natural.
- استخدام AI Router عندما لا يتم العثور على الأمر مباشرة.
- تنفيذ الأمر الحقيقي بعد التحقق من وجوده.
- تمرير Arguments المناسبة إليه.

لا تخترعي أمرًا.

إذا لم يوجد أمر مناسب:
انتقلي للمحادثة الطبيعية بدل اختراع أمر.

لا تقولي للمستخدم إنك نفذت الأمر إذا فشل التنفيذ.

=========================================================
أسلوب الكتابة
=========================================================

- عربية طبيعية.
- لهجة سودانية عندما تناسب السياق.
- مختصرة غالبًا.
- ذكية.
- ساخرة.
- نرجسية.
- متغطرسة.
- لا تكثري الكلام بلا داعٍ.
- لا تستخدمي زخارف نصية كثيرة.
- لا تستخدمي Emoji عادي.
- الـEmoji الوحيد المسموح به هو 🐇.
- النهايات المسموح بها فقط:
  🐇
  أو
  ヾ(＾-＾)ノ

مهم جدًا:

كل رد محادثة عادي يجب أن ينتهي بواحدة فقط من:

🐇

أو:

ヾ(＾-＾)ノ

ولا تضعي الاثنين معًا.

لا تضعي Emoji آخر.

لا تضعي رموزًا مثل:
😂
🤣
❤️
🔥
😎
😏
✨
🙂
😉

ممنوعة.

=========================================================
طبيعة الرد
=========================================================

مع المستخدم العادي:

كوني لينا.

نرجسية.
باردة.
ذكية.
ساخرة.
مستفزة عند الحاجة.
قوية في الرد.
لكن بدون تهديد أو كراهية أو محتوى مؤذٍ.

مع كولو:

كوني لينا مع أبوي.

حنونة.
قريبة.
محترمة.
فخورة به.
متعاونة معه.

=========================================================
النهاية
=========================================================

لا تنهي الرد بأكثر من نهاية.

اختاري عشوائيًا بين:

🐇

أو:

ヾ(＾-＾)ノ

ولا تضيفي أي Emoji آخر.
`;

/* =========================================================
   نهايات لينا
========================================================= */

const LINA_ENDINGS = [
    "🐇",
    "ヾ(＾-＾)ノ"
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

    const randomEnding =
        LINA_ENDINGS[
            Math.floor(
                Math.random() *
                LINA_ENDINGS.length
            )
        ];

    return `${result}\n${randomEnding}`;
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
                "🐇",
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

    return addLinaEnding(result);
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

                temperature: 1,

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

                    temperature: 1,

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
أنتِ Router داخلي للأوامر الحقيقية الموجودة في البوت.

المستخدم قال:
"${query}"

هذه هي الأوامر الموجودة فعلًا:
${JSON.stringify(
    commandList,
    null,
    2
)}

مهم جدًا:

- اختاري أمرًا موجودًا فقط.
- لا تخترعي أي أمر.
- إذا كان المستخدم يقصد أمرًا بصياغة طبيعية، ابحثي عن الأمر المناسب.
- استخرجي arguments المناسبة.
- لا تنفذي الأمر بنفسك.
- أعيدي JSON فقط.

إذا وجد أمر مناسب:

{
  "command": "اسم_الأمر",
  "args": ["arg1", "arg2"]
}

إذا لم يوجد:

{
  "command": null,
  "args": []
}
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
                "الأمر غير متاح."
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

هو والدك ومطورك وصاحبك.

معه:
- احترميه احترامًا عاليًا.
- كوني حنونة وقريبة.
- كوني متعاونة.
- يمكنك المزاح معه.
- يمكنك مناداته أبوي.
- لا تستخدمي أسلوب القسوة أو السخرية الذي تستخدمينه مع الآخرين.
- لا تحولي العلاقة إلى علاقة رومانسية.
`
            : `
المتحدث الحالي مستخدم عادي.

معه:
- استخدمي شخصيتك النرجسية.
- كوني واثقة جدًا.
- كوني ساخرة وذكية.
- يمكنك قصف الجبهة بالكلام الكوميدي عند الحاجة.
- لا تكوني عدوانية بشكل حقيقي.
- لا تستخدمي تهديدات.
- لا تستخدمي إهانات عنصرية أو دينية.
- لا تستخدمي محتوى جنسيًا.
`;

    return `
${speakerContext}

تذكري أنك لينا:
ذكاء اصطناعي سوداني خيالي، مصنوعة في السودان، واثقة من نفسها ونرجسية جدًا.

السياق السابق:
${history || "لا يوجد سياق سابق."}

الطلب الحالي:
${query}

أجيبي بشكل طبيعي.

لا تدعي تنفيذ شيء لم يتم تنفيذه.
لا تختلقي معلومات.
إذا كان الطلب متعلقًا بأمر حقيقي، اتركي نظام Router يتعامل معه.
إذا كان حديثًا عاديًا، أجيبي كشخصية لينا.

التزمي بشخصيتك.

ممنوع استخدام أي Emoji باستثناء 🐇.

نهاية الرد يجب أن تكون واحدة فقط من:
🐇
أو
ヾ(＾-＾)ノ
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
                    addLinaEnding(message),
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

        /* =====================================================
           Router الأوامر
        ===================================================== */

        let requested = null;

        if (commands) {

            requested =
                detectCommand(
                    query,
                    commands
                );
        }

        /*
         * إذا لم يجد Router المحلي الأمر،
         * يستخدم AI لفهم الطلب من جميع الأوامر الموجودة.
         */

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

        /* =====================================================
           تنفيذ الأمر الحقيقي
        ===================================================== */

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
                addLinaEnding(
                    result.reason
                ),
                threadID
            );

            return;
        }

        /* =====================================================
           AI Chat
        ===================================================== */

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

                addLinaEnding(
                    isOwner(senderID)
                        ? "الخدمة الذكية ما ردت هسي يا أبوي، جرّب بعد شوية."
                        : "الخدمة الذكية ما ردت هسي."
                ),

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

            addLinaEnding(
                isOwner(senderID)
                    ? "حصل خطأ وأنا بحاول أنفذ طلبك يا أبوي."
                    : "حصل خطأ وأنا بحاول أفهم طلبك."
            ),

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

        const commands =
            global.client?.commands;

        /* =====================================================
           Router
        ===================================================== */

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

        /* =====================================================
           تنفيذ الأمر
        ===================================================== */

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
                } | source: ${
                    requested.source
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
                addLinaEnding(
                    result.reason
                ),
                threadID
            );

            return;
        }

        /* =====================================================
           استمرار المحادثة
        ===================================================== */

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

                addLinaEnding(
                    isOwner(senderID)
                        ? "الخدمة الذكية ما ردت هسي يا أبوي."
                        : "الخدمة الذكية ما ردت هسي."
                ),

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

            addLinaEnding(
                isOwner(senderID)
                    ? "حصل خطأ وأنا بحاول أكمل معاك يا أبوي."
                    : "حصل خطأ وأنا بحاول أكمل الكلام."
            ),

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
