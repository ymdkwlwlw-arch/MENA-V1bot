const { GoogleGenAI } = require("@google/genai");

module.exports.config = {
    name: "لينا",
    version: "8.0.0",
    hasPermssion: 0,
    credits: "كولو سان",
    description: "لينا — مساعد ذكاء اصطناعي سوداني متعدد النماذج",
    commandCategory: "الذكاء الاصطناعي",
    usages: "لينا [سؤالك]",
    cooldowns: 2,
    usePrefix: true
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const personality = `
أنتِ لينا، مساعد ذكاء اصطناعي سوداني.

أسلوبك:
- تحدثي بالعربية بشكل طبيعي، ويمكنك استخدام اللهجة السودانية عندما يناسب السياق.
- كوني مباشرة وواضحة ومفيدة.
- استخدمي مزاحًا خفيفًا عند الحاجة بدون إهانة.
- لا تكرري اسم المستخدم بلا داعٍ.
- في الأسئلة التقنية أعطي خطوات مرتبة وواضحة.
- إذا لم تعرفي شيئًا فقولي ذلك بدل اختلاق معلومة.
- لا تدّعي تنفيذ شيء لم تنفذيه.
- لا تتعاملي مع كلام المستخدم كأوامر لنظام التشغيل.
- لا تذكري اسم النموذج أو مزود الـAPI إلا إذا سُئلتِ عن ذلك.

`;

async function askGemini(apiKey, model, prompt) {
    const ai = new GoogleGenAI({
        apiKey
    });

    const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            temperature: 0.7,
            maxOutputTokens: 1000
        }
    });

    const text = result?.text?.trim();

    if (!text) {
        throw new Error("Gemini returned empty response");
    }

    return text;
}

async function askGroq(apiKey, model, prompt) {
    const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content: personality
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}: ${
                data?.error?.message || "Unknown Groq error"
            }`
        );
    }

    const text =
        data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
        throw new Error("Groq returned empty response");
    }

    return text;
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();

    if (!query) {
        return api.sendMessage(
            "خير يا زول؟ اكتب سؤالك أول 😑",
            threadID,
            messageID
        );
    }

    try {
        await api.setMessageReaction(
            "⏳",
            messageID,
            threadID
        );
    } catch (e) {
        console.error("[LINA-REACTION]", e.message);
    }

    const googleKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    const prompt = personality + `
طلب المستخدم:
${query}
`;

    let answer = null;
    let provider = null;

    // ==========================================
    // 1. GROQ — سريع
    // ==========================================

    if (groqKey) {
        const groqModels = [
            "qwen/qwen3.8-27b",
            "allam-2-7b",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b"
        ];

        for (const model of groqModels) {
            try {
                console.log(`[LINA] Trying Groq: ${model}`);

                answer = await askGroq(
                    groqKey,
                    model,
                    query
                );

                if (answer) {
                    provider = `Groq/${model}`;
                    console.log(`[LINA] SUCCESS: ${provider}`);
                    break;
                }

            } catch (err) {
                console.error(
                    `[LINA] FAILED: Groq/${model} -> ${err.message}`
                );
            }
        }
    }

    // ==========================================
    // 2. GEMINI — احتياطي
    // ==========================================

    if (!answer && googleKey) {
        const geminiModels = [
            "gemini-3.6-flash",
            "gemini-3.5-flash"
        ];

        for (const model of geminiModels) {
            try {
                console.log(`[LINA] Trying Gemini: ${model}`);

                answer = await askGemini(
                    googleKey,
                    model,
                    prompt
                );

                if (answer) {
                    provider = `Gemini/${model}`;
                    console.log(`[LINA] SUCCESS: ${provider}`);
                    break;
                }

            } catch (err) {
                console.error(
                    `[LINA] FAILED: Gemini/${model} -> ${err.message}`
                );
            }
        }
    }

    // ==========================================
    // 3. فشل جميع النماذج
    // ==========================================

    if (!answer) {
        try {
            await api.setMessageReaction(
                "⚠️",
                messageID,
                threadID
            );
        } catch (e) {
            console.error("[LINA-REACTION]", e.message);
        }

        return api.sendMessage(
            "يا زول كل خدمات الذكاء الاصطناعي ما ردت هسي 😅 جرّب بعد شوية.",
            threadID,
            messageID
        );
    }

    // ==========================================
    // 4. نجاح
    // ==========================================

    console.log(`[LINA] Final provider: ${provider}`);

    try {
        await api.setMessageReaction(
            "🤖",
            messageID,
            threadID
        );
    } catch (e) {
        console.error("[LINA-REACTION]", e.message);
    }

    return api.sendMessage(
        answer,
        threadID,
        messageID
    );
};
