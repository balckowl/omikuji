const { SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const omikuji = ['大吉', '吉', '中吉', '小吉', '半吉', '末吉', '末小吉', '凶', '大凶'];
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

    console.log('hello')

    try {
      console.log("コマンド実行開始");
      await interaction.deferReply(); 
      console.log("deferReply 完了");

      const db = admin.firestore();
      console.log("Firestore 接続");
      const userId = interaction.user.id;
      const userName = interaction.user.username;

      const userDoc = await db.collection('users').doc(userId).get();
      console.log("Firestore ドキュメント取得");

      let lastOmikujiDate = null;
      let omikujiHistoryMessage = "";

      if (userDoc.exists) {
        const latestResult = userDoc.data().omikujiResults[userDoc.data().omikujiResults.length - 1];
        lastOmikujiDate = latestResult.date.toDate();

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        if (lastOmikujiDate.getTime() >= currentDate.getTime()) {
          await interaction.followUp("おみくじは1日に1回しか引けません。");
          return;
        }

        const recentResults = userDoc.data().omikujiResults.slice(-5);
        const results = recentResults.map(entry => entry.result);
        omikujiHistoryMessage = results.join(', ');
      }

      const randomResult = omikuji[Math.floor(Math.random() * omikuji.length)];
      console.log("おみくじ結果生成: " + randomResult);

      const prompt = `あなたの今日の運勢は${randomResult}です。運勢についてのコメントをください。`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      await db.collection('users').doc(userId).set({
        username: userName,
        omikujiResults: admin.firestore.FieldValue.arrayUnion({ result: randomResult, date: admin.firestore.Timestamp.now() })
      }, { merge: true });
      console.log("Firestore に結果保存");

      const omikujiPaper = `${userName}様の今日の運勢\n\n${text}\n\n過去５回のおみくじ結果: ${omikujiHistoryMessage}`;
      console.log("応答生成: " + omikujiPaper);
      await interaction.editReply(omikujiPaper);
      console.log("応答送信完了");
    } catch (error) {
      console.error("エラー発生: ", error);
      await interaction.followUp("エラーが発生しました。");
    }
  },
};
