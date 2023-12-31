const { SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const omikuji = ['大吉', '吉', '中吉', '小吉', '半吉', '末吉', '末小吉', '凶', '大凶'];
const userLastDrawDate = new Map(); // ユーザーごとの最後のおみくじ引き日を記録
require('dotenv').config();
const geminiApikey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApikey);

var admin = require("firebase-admin");

var serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


module.exports = {
  data: new SlashCommandBuilder()
    .setName('おみくじ')
    .setDescription('1日1回限りのおみくじを引くことができます'),

  execute: async function (interaction) {

    await interaction.deferReply(); 

    const db = admin.firestore()
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const userId = interaction.user.id;
    const userName = interaction.user.username;
    let omikujiHistory = [];
    let omikujiHistoryMessage = "";
    let lastOmikujiDate = null;

    //ユーザーの最後のおみくじ引き日を取得
    const lastDrawDate = userLastDrawDate.get(userId);

    if (lastDrawDate) {
      // 現在の日付を取得
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // 時刻を0時0分0秒に設定

      // 最後のおみくじ引き日と現在の日付を比較
      if (lastDrawDate.getTime() >= currentDate.getTime()) {
        await interaction.reply("おみくじは1日に1回しか引けません。");
        return;
      }
    }

    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {

      const latestResult = userDoc.data().omikujiResults[userDoc.data().omikujiResults.length - 1];
      lastOmikujiDate = latestResult.date.toDate();

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      // 最後のおみくじ引き日が今日であれば、おみくじを引けない
      if (lastOmikujiDate.getTime() >= currentDate.getTime()) {
        await interaction.reply("おみくじは1日に1回しか引けません。");
        return;
      } else {
      omikujiHistory = await userDoc.data().omikujiResults;
      const recentResults = omikujiHistory.slice(-5);
      // 各エントリのresultプロパティを抽出
      const results = recentResults.map(entry => entry.result);
      // 結果をカンマで結合
      omikujiHistoryMessage = results.join(', ');
      }
    }

    // おみくじの実行
    const randomResult = omikuji[Math.floor(Math.random() * omikuji.length)];

    const prompt =
      `
    あなたは{ #役割 }です。次の{ #ルール }に従って、おみくじの結果である${randomResult}に合うような回答を{ #形式 }でお願いします。

    #役割
    おみくじの結果に対するコメントを出力する

    #形式
    *おみくじ結果をまず最初に太字で表示して
    *絵文字を交えて
    *金運、恋愛運、仕事運、勉強運、健康運を含めて、絵文字の星で5段階評価して
    *それぞれの項目の分析も絵文字を入れて出力して

    #ルール
    *100文字以内で
    `

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    await db.collection('users').doc(userId).set({
      username: userName,
      omikujiResults: admin.firestore.FieldValue.arrayUnion({ result: randomResult, date: admin.firestore.Timestamp.now() })
    }, { merge: true })


    const omikujiPaper =
      `${userName}様の今日の運勢

${text}

過去５回のおみくじ結果: ${omikujiHistoryMessage}`

    console.log(omikujiPaper)
    await interaction.editReply(omikujiPaper)
  },
};
