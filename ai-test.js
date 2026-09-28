const { GoogleGenAI } = require("@google/genai");

const prompt = "رد بجملة قصيرة باللهجة السودانية: السلام عليكم، من أنت؟";

async function testGemini() {
    console.log("\n================ GEMINI ================\n");

    if (!process.env.GEMINI_API_KEY) {
        console.log("❌ GEMINI_API_KEY غير موجود");
        return;
    }

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });

    const models = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-flash-latest"
    ];

    for (const model of models) {
        const start = Date.now();

        try {
            console.log(`\n🔵 اختبار Gemini: ${model}`);

            const response = await ai.models.generateContent({
                model,
                contents: prompt
            });

            const text = response.text || "";

            if (text.trim()) {
                console.log(`✅ نجح`);
                console.log(`⏱️ ${Date.now() - start}ms`);
                console.log(`💬 ${text.trim()}`);
            } else {
                console.log(`⚠️ API رد بدون نص`);
            }

        } catch (error) {
            console.log(`❌ فشل`);
            console.log(`⏱️ ${Date.now() - start}ms`);
            console.log(`📛 ${error.message}`);
        }
    }
}

async function testGroq() {
    console.log("\n================ GROQ ================\n");

    if (!process.env.GROQ_API_KEY) {
        console.log("❌ GROQ_API_KEY غير موجود");
        return;
    }

    const models = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "allam-2-7b"
    ];

    for (const model of models) {
        const start = Date.now();

        try {
            console.log(`\n🟢 اختبار Groq: ${model}`);

            const response = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 150
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    `${response.status} ${data.error?.message || JSON.stringify(data)}`
                );
            }

            const text =
                data.choices?.[0]?.message?.content || "";

            if (text.trim()) {
                console.log(`✅ نجح`);
                console.log(`⏱️ ${Date.now() - start}ms`);
                console.log(`💬 ${text.trim()}`);
            } else {
                console.log(`⚠️ API رد بدون نص`);
            }

        } catch (error) {
            console.log(`❌ فشل`);
            console.log(`⏱️ ${Date.now() - start}ms`);
            console.log(`📛 ${error.message}`);
        }
    }
}

(async () => {
    console.log("╔══════════════════════════════════════╗");
    console.log("║       LINA AI API DIAGNOSTIC        ║");
    console.log("╚══════════════════════════════════════╝");

    await testGemini();
    await testGroq();

    console.log("\n========================================");
    console.log("انتهى الاختبار.");
    console.log("========================================\n");
})();
