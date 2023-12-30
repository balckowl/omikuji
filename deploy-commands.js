// discord.js v14では、下記のようにRESTとRoutesはdiscord.jsパッケージから直接インポートできます
const { REST, Routes } = require('discord.js');
require('dotenv').config();

// hey.jsのmodule.exportsを呼び出します。
const heyFile = require('./commands/hey.js');

// 環境変数としてapplicationId, guildId, tokenの3つが必要です
const applicationId = process.env.DISCORD_APPLICATIONID
const guildId = process.env.DISCORD_GUILDID
const token = process.env.DISCORD_TOKEN

// 登録コマンドを呼び出してリスト形式で登録
const commands = [
    heyFile.data.toJSON()
];

// DiscordのAPIには現在最新のversion10を指定
const rest = new REST({ version: '10' }).setToken(token);

// Discordサーバーにコマンドを登録
// 以前のコードの続き...
(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(applicationId, guildId),
            { body: commands },
        );
        console.log('サーバー固有のコマンドが更新されました！');
    } catch (error) {
        console.error('コマンドの更新中にエラーが発生しました:', error);
    }
})();
