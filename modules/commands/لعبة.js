module.exports.config = {
    name: "لعبة",
    aliases: ["ttt", "تيك_تاك_تو", "اكس_او"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Mirai Team | تعريب وتطوير KIROS",
    description: "لعبة إكس أو ضد الذكاء الاصطناعي",
    usePrefix: true,
    commandCategory: "ألعاب",
    cooldowns: 5,
    usages: "لعبة x أو لعبة o أو لعبة استمرار أو لعبة حذف"
};

var AIMove;

const fs = require("fs");
const { loadImage, createCanvas } = require("canvas");


// ==============================
// بدء اللعبة
// ==============================

function startBoard({ isX, data }) {
    data.board = new Array(3);
    data.isX = isX;
    data.gameOn = true;
    data.gameOver = false;
    data.available = [];

    for (let i = 0; i < 3; i++) {
        data.board[i] = new Array(3).fill(0);
    }

    return data;
}


// ==============================
// عرض لوحة اللعبة
// ==============================

async function displayBoard(data) {
    const imagePath =
        __dirname + "/cache/لعبة.png";

    const canvas =
        createCanvas(1200, 1200);

    const context =
        canvas.getContext("2d");

    const background =
        await loadImage(
            "https://i.postimg.cc/nhDWmj1h/background.png"
        );

    context.drawImage(
        background,
        0,
        0,
        1200,
        1200
    );

    const imageO =
        await loadImage(
            "https://i.postimg.cc/rFP6xLXQ/O.png"
        );

    const imageX =
        await loadImage(
            "https://i.postimg.cc/HLbFqcJh/X.png"
        );

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {

            const value =
                data.board[i][j].toString();

            const x =
                54 + 366 * j;

            const y =
                54 + 366 * i;

            if (value === "1") {
                if (data.isX) {
                    context.drawImage(
                        imageO,
                        x,
                        y,
                        360,
                        360
                    );
                } else {
                    context.drawImage(
                        imageX,
                        x,
                        y,
                        360,
                        360
                    );
                }
            }

            if (value === "2") {
                if (data.isX) {
                    context.drawImage(
                        imageX,
                        x,
                        y,
                        360,
                        360
                    );
                } else {
                    context.drawImage(
                        imageO,
                        x,
                        y,
                        360,
                        360
                    );
                }
            }
        }
    }

    fs.writeFileSync(
        imagePath,
        canvas.toBuffer("image/png")
    );

    return [
        fs.createReadStream(imagePath)
    ];
}


// ==============================
// التحقق من فوز الذكاء الاصطناعي
// ==============================

function checkAIWon(data) {

    if (
        data.board[0][0] === 1 &&
        data.board[1][1] === 1 &&
        data.board[2][2] === 1
    ) return true;

    if (
        data.board[0][2] === 1 &&
        data.board[1][1] === 1 &&
        data.board[2][0] === 1
    ) return true;

    for (let i = 0; i < 3; i++) {

        if (
            data.board[i][0] === 1 &&
            data.board[i][1] === 1 &&
            data.board[i][2] === 1
        ) return true;

        if (
            data.board[0][i] === 1 &&
            data.board[1][i] === 1 &&
            data.board[2][i] === 1
        ) return true;
    }

    return false;
}


// ==============================
// التحقق من فوز اللاعب
// ==============================

function checkPlayerWon(data) {

    if (
        data.board[0][0] === 2 &&
        data.board[1][1] === 2 &&
        data.board[2][2] === 2
    ) return true;

    if (
        data.board[0][2] === 2 &&
        data.board[1][1] === 2 &&
        data.board[2][0] === 2
    ) return true;

    for (let i = 0; i < 3; i++) {

        if (
            data.board[i][0] === 2 &&
            data.board[i][1] === 2 &&
            data.board[i][2] === 2
        ) return true;

        if (
            data.board[0][i] === 2 &&
            data.board[1][i] === 2 &&
            data.board[2][i] === 2
        ) return true;
    }

    return false;
}


// ==============================
// حساب حركة الذكاء الاصطناعي
// ==============================

function solveAIMove({
    depth,
    turn,
    data
}) {

    if (checkAIWon(data)) return 1;

    if (checkPlayerWon(data)) return -1;

    const availablePoint =
        getAvailable(data);

    if (!availablePoint.length) {
        return 0;
    }

    let min =
        Number.MAX_SAFE_INTEGER;

    let max =
        Number.MIN_SAFE_INTEGER;

    for (
        let i = 0;
        i < availablePoint.length;
        i++
    ) {

        const point =
            availablePoint[i];

        if (turn === 1) {

            placeMove({
                point,
                player: 1,
                data
            });

            const currentScore =
                solveAIMove({
                    depth: depth + 1,
                    turn: 2,
                    data
                });

            max =
                Math.max(
                    currentScore,
                    max
                );

            if (currentScore >= 0) {
                if (depth === 0) {
                    AIMove = point;
                }
            }

            if (currentScore === 1) {
                data.board[
                    point[0]
                ][point[1]] = 0;

                break;
            }

            if (
                i === availablePoint.length - 1 &&
                max < 0
            ) {
                if (depth === 0) {
                    AIMove = point;
                }
            }

        } else {

            placeMove({
                point,
                player: 2,
                data
            });

            const currentScore =
                solveAIMove({
                    depth: depth + 1,
                    turn: 1,
                    data
                });

            min =
                Math.min(
                    currentScore,
                    min
                );

            if (min === -1) {
                data.board[
                    point[0]
                ][point[1]] = 0;

                break;
            }
        }

        data.board[
            point[0]
        ][point[1]] = 0;
    }

    return turn === 1
        ? max
        : min;
}


// ==============================
// وضع الحركة
// ==============================

function placeMove({
    point,
    player,
    data
}) {
    data.board[
        point[0]
    ][point[1]] = player;
}


// ==============================
// الخانات المتاحة
// ==============================

function getAvailable(data) {

    const availableMove = [];

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {

            if (
                data.board[i][j] === 0
            ) {
                availableMove.push([
                    i,
                    j
                ]);
            }
        }
    }

    return availableMove;
}


// ==============================
// التحقق من الخانة
// ==============================

function checkAvailableSpot(
    point,
    pointArray
) {
    return pointArray.some(
        element =>
            element.toString() ===
            point.toString()
    );
}


// ==============================
// حركة اللاعب
// ==============================

function move(x, y, data) {

    const availablePoint =
        getAvailable(data);

    const playerMove = [
        x,
        y
    ];

    if (
        checkAvailableSpot(
            playerMove,
            availablePoint
        )
    ) {

        placeMove({
            point: playerMove,
            player: 2,
            data
        });

    } else {

        return "هذه الخانة مستخدمة بالفعل.";
    }

    solveAIMove({
        depth: 0,
        turn: 1,
        data
    });

    if (AIMove) {
        placeMove({
            point: AIMove,
            player: 1,
            data
        });
    }
}


// ==============================
// انتهاء اللعبة
// ==============================

function checkGameOver(data) {

    if (
        getAvailable(data).length === 0 ||
        checkAIWon(data) ||
        checkPlayerWon(data)
    ) {
        return true;
    }

    return false;
}


// ==============================
// بداية حركة الذكاء الاصطناعي
// ==============================

function AIStart(data) {

    const point = [
        Math.round(Math.random()) * 2,
        Math.round(Math.random()) * 2
    ];

    placeMove({
        point,
        player: 1,
        data
    });
}


// ==============================
// الرد على لوحة اللعبة
// ==============================

module.exports.handleReply =
async function ({
    event,
    api,
    handleReply
}) {

    const {
        body,
        threadID,
        messageID,
        senderID
    } = event;

    if (
        !global.moduleData.tictactoe
    ) {
        global.moduleData.tictactoe =
            new Map();
    }

    const data =
        global.moduleData.tictactoe.get(
            threadID
        );

    if (
        !data ||
        data.gameOn === false
    ) {
        return;
    }

    if (
        String(senderID) !==
        String(data.player)
    ) {
        return api.sendMessage(
            "هذه اللعبة تخص لاعبًا آخر.",
            threadID,
            messageID
        );
    }

    const number =
        parseInt(
            String(body).trim(),
            10
        );

    if (
        !isNaN(number) &&
        number > 0 &&
        number < 10
    ) {

        const row =
            number < 4
                ? 0
                : number < 7
                    ? 1
                    : 2;

        let col;

        if (
            number === 1 ||
            number === 4 ||
            number === 7
        ) {
            col = 0;
        }

        if (
            number === 2 ||
            number === 5 ||
            number === 8
        ) {
            col = 1;
        }

        if (
            number === 3 ||
            number === 6 ||
            number === 9
        ) {
            col = 2;
        }

        const result =
            move(
                row,
                col,
                data
            );

        let message = "";

        if (
            checkGameOver(data)
        ) {

            if (
                checkAIWon(data)
            ) {

                message =
                    "انتهت اللعبة.\n\nالذكاء الاصطناعي فاز عليك.";

            } else if (
                checkPlayerWon(data)
            ) {

                message =
                    "مبروك! فزت على الذكاء الاصطناعي.";

            } else {

                message =
                    "انتهت اللعبة بالتعادل.";
            }

            data.gameOn = false;

            global.moduleData.tictactoe.delete(
                threadID
            );
        }

        if (!message) {

            message =
                result === undefined
                    ? "اختر رقم الخانة التي تريد اللعب فيها."
                    : result;
        }

        return api.sendMessage(
            {
                body: message,
                attachment:
                    await displayBoard(data)
            },

            threadID,

            (error, info) => {

                if (
                    error ||
                    !info
                ) return;

                global.client.handleReply.push({
                    name:
                        module.exports.config.name,

                    author:
                        senderID,

                    messageID:
                        info.messageID
                });

            },

            messageID
        );
    }

    return api.sendMessage(
        "أرسل رقم الخانة من 1 إلى 9.",
        threadID,
        messageID
    );
};


// ==============================
// تشغيل الأمر
// ==============================

module.exports.run =
async function ({
    event,
    api,
    args
}) {

    if (
        !global.moduleData.tictactoe
    ) {
        global.moduleData.tictactoe =
            new Map();
    }

    const {
        threadID,
        messageID,
        senderID
    } = event;

    const threadSetting =
        global.data.threadData.get(
            threadID
        ) || {};

    const prefix =
        threadSetting.PREFIX ||
        global.config.PREFIX ||
        "";

    const data =
        global.moduleData.tictactoe.get(
            threadID
        ) || {
            gameOn: false,
            player: ""
        };

    const commandName =
        prefix +
        this.config.name;

    // بدون اختيار
    if (!args.length) {

        return api.sendMessage(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام لُـعـبـة إكـس أو\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ اختر X أو O لبدء اللعبة.\n" +
            "⊞ X: الذكاء الاصطناعي يبدأ أولاً.\n" +
            "⊞ O: أنت تبدأ أولاً.\n" +
            "── ── ── ── ── ── ──",
            threadID,
            messageID
        );
    }

    const action =
        String(args[0])
            .toLowerCase();

    // حذف اللعبة
    if (
        action === "حذف" ||
        action === "delete"
    ) {

        global.moduleData.tictactoe.delete(
            threadID
        );

        return api.sendMessage(
            "تم حذف لوحة اللعبة.",
            threadID,
            messageID
        );
    }

    // استمرار اللعبة
    if (
        action === "استمرار" ||
        action === "continue"
    ) {

        if (!data.gameOn) {

            return api.sendMessage(
                `لا توجد لعبة محفوظة.\nاستخدم ${commandName} x أو ${commandName} o لبدء لعبة جديدة.`,
                threadID,
                messageID
            );
        }

        return api.sendMessage(
            {
                body:
                    "╭─  ── ── ── ──  ─╮\n" +
                    "     نـظـام لـعـبـة إكـس أو\n" +
                    "╰─  ── ── ── ──  ─╯\n" +
                    "⎔ اختر رقم الخانة من 1 إلى 9.\n" +
                    "⊞ أرسل الرقم في الرد على لوحة اللعبة.\n" +
                    "── ── ── ── ── ── ──",

                attachment:
                    await displayBoard(data)
            },

            threadID,

            (error, info) => {

                if (
                    error ||
                    !info
                ) return;

                global.client.handleReply.push({
                    name:
                        module.exports.config.name,

                    author:
                        senderID,

                    messageID:
                        info.messageID
                });
            },

            messageID
        );
    }

    // بدء لعبة جديدة
    if (!data.gameOn) {

        const choice =
            action;

        if (
            choice !== "x" &&
            choice !== "o"
        ) {

            return api.sendMessage(
                "اختر X أو O فقط لبدء اللعبة.",
                threadID,
                messageID
            );
        }

        let newData;

        if (choice === "o") {

            newData =
                startBoard({
                    isX: false,
                    data
                });

            newData.player =
                senderID;

            global.moduleData.tictactoe.set(
                threadID,
                newData
            );

            return api.sendMessage(
                {
                    body:
                        "╭─  ── ── ── ──  ─╮\n" +
                        "     نـظـام لـعـبـة إكـس أو\n" +
                        "╰─  ── ── ── ──  ─╯\n" +
                        "⎔ اخترت O.\n" +
                        "⊞ أنت تبدأ أولاً.\n" +
                        "⎔ أرسل رقم الخانة من 1 إلى 9.\n" +
                        "── ── ── ── ── ── ──",

                    attachment:
                        await displayBoard(newData)
                },

                threadID,

                (error, info) => {

                    if (
                        error ||
                        !info
                    ) return;

                    global.client.handleReply.push({
                        name:
                            module.exports.config.name,

                        author:
                            senderID,

                        messageID:
                            info.messageID
                    });
                },

                messageID
            );
        }

        if (choice === "x") {

            newData =
                startBoard({
                    isX: true,
                    data
                });

            newData.player =
                senderID;

            AIStart(newData);

            global.moduleData.tictactoe.set(
                threadID,
                newData
            );

            return api.sendMessage(
                {
                    body:
                        "╭─  ── ── ── ──  ─╮\n" +
                        "     نـظـام لـعـبـة إكـس أو\n" +
                        "╰─  ── ── ── ──  ─╯\n" +
                        "⎔ اخترت X.\n" +
                        "⊞ الذكاء الاصطناعي يبدأ أولاً.\n" +
                        "⎔ أرسل رقم الخانة من 1 إلى 9.\n" +
                        "── ── ── ── ── ── ──",

                    attachment:
                        await displayBoard(newData)
                },

                threadID,

                (error, info) => {

                    if (
                        error ||
                        !info
                    ) return;

                    global.client.handleReply.push({
                        name:
                            module.exports.config.name,

                        author:
                            senderID,

                        messageID:
                            info.messageID
                    });
                },

                messageID
            );
        }

    } else {

        return api.sendMessage(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام لـعـبـة إكـس أو\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ توجد لعبة قيد التشغيل في هذه المجموعة.\n" +
            "⊞ استخدم لعبة استمرار لمتابعة اللعبة.\n" +
            "⊞ استخدم لعبة حذف لحذف اللوحة.\n" +
            "── ── ── ── ── ── ──",
            threadID,
            messageID
        );
    }
};
