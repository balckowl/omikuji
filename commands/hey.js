const { SlashCommandBuilder } = require('discord.js');
const omikuji = ['大吉', '中吉', '小吉', '凶', '大凶'];
const userLastDrawDate = new Map(); // ユーザーごとの最後のおみくじ引き日を記録

module.exports = {
  data: new SlashCommandBuilder()
    .setName('おみくじ')
    .setDescription('1日1回限りのおみくじを引くことができます'),

  execute: async function (interaction) {
    const userId = interaction.user.id;

    // ユーザーの最後のおみくじ引き日を取得
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

    // おみくじの実行
    const randomResult = omikuji[Math.floor(Math.random() * omikuji.length)];
    await interaction.reply(`今日の運勢は${randomResult}`);

    // ユーザーの最後のおみくじ引き日を更新
    userLastDrawDate.set(userId, new Date());
  },
};

