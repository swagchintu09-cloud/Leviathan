const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ComponentType } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'help',
    usage: 'Display help menu',
    aliases: ['h'],
    category: 'info',
    cooldown: 5,
    premium: false,
    run: async (client, message, args) => {
        let prefix = message.guild?.prefix || client.config.PREFIX;

        // Components v2 Container - Select Menu
        const selectMenuRow = new ActionRowBuilder({
            components: [
                new StringSelectMenuBuilder({
                    customId: 'helpop',
                    placeholder: 'Choose a category',
                    options: [
                        { label: 'AntiNuke', description: 'Get All AntiNuke Command List', value: 'antinuke', emoji: client.emoji.antinuke },
                        { label: 'Moderation', description: 'Get All Moderation Command List', value: 'moderation', emoji: client.emoji.mod },
                        { label: 'Automod', description: 'Get All Automod Command List', value: 'automod', emoji: client.emoji.automod },
                        { label: 'Logger', description: 'Get All Logger Command List', value: 'logger', emoji: client.emoji.logs },
                        { label: 'Utility', description: 'Get All Utility Command List', value: 'utility', emoji: client.emoji.utillity },
                        { label: 'Server Utility', description: 'Get All Server Utility Command List', value: 'serverutility', emoji: client.emoji.serverutillity },
                        { label: 'Auto Responder', description: 'Get All Auto Responder Command List', value: 'autoresponder', emoji: client.emoji.autoresponder },
                        { label: 'Verification', description: 'Get All Verification Command List', value: 'verification', emoji: client.emoji.verification },
                        { label: 'Join To Create', description: 'Get All Join To Create Command List', value: 'jointocreate', emoji: client.emoji.jtc },
                        { label: 'Voice', description: 'Get All Voice Command List', value: 'voice', emoji: client.emoji.vc },
                        { label: 'Custom Role', description: 'Get All Custom Role Command List', value: 'customrole', emoji: client.emoji.customrole },
                        { label: 'Welcomer', description: 'Get All Welcomer Command List', value: 'welcomer', emoji: client.emoji.welcome },
                        { label: 'Sticky', description: 'Get All Sticky Command List', value: 'sticky', emoji: client.emoji.sticky },
                        { label: 'Ticket', description: 'Get All Ticket Command List', value: 'ticket', emoji: client.emoji.ticket },
                        { label: 'Giveaway', description: 'Get All Giveaway Command List', value: 'giveaway', emoji: client.emoji.giveaway }
                    ]
                })
            ]
        });

        // Components v2 Container - Buttons
        const buttonRow = new ActionRowBuilder({
            components: [
                new ButtonBuilder({
                    label: 'Invite Me',
                    style: ButtonStyle.Link,
                    url: `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot`
                }),
                new ButtonBuilder({
                    label: 'Support Server',
                    style: ButtonStyle.Link,
                    url: client.config.support
                })
            ]
        });

        let developerUser = client.users.cache.get('839014541157203979') ? client.users.cache.get('839014541157203979') : await client.users.fetch('839014541157203979').catch(() => null);

        const imagePath = path.join(__dirname, '../../images/leviathan_embed.png');
        const attachment = fs.existsSync(imagePath) ? new AttachmentBuilder(imagePath, { name: 'leviathan_embed.png' }) : null;

        const embed = new EmbedBuilder()
            .setColor(client.color)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            
            .setDescription(
                `${client.emoji.dot} **Prefix for this server:** \`${prefix}\`\n` +
                `${client.emoji.dot} **Total Commands:** \`${client.util.countCommandsAndSubcommands(client)}\`\n` +
                `${client.emoji.dot} **Type \`${prefix}antinuke enable\` to get started!**\n\n` +
                `${client.emoji.antinuke} \`:\` **AntiNuke**\n` +
                `${client.emoji.mod} \`:\` **Moderation**\n` +
                `${client.emoji.automod} \`:\` **Automod**\n` +
                `${client.emoji.logs} \`:\` **Logging**\n` +
                `${client.emoji.utillity} \`:\` **Utility**\n` +
                `${client.emoji.serverutillity} \`:\` **Server Utility**\n` +
                `${client.emoji.autoresponder} \`:\` **Auto Responder**\n` +
                `${client.emoji.verification} \`:\` **Verification**\n` +
                `${client.emoji.jtc} \`:\` **Join To Create**\n` +
                `${client.emoji.vc} \`:\` **Voice**\n` +
                `${client.emoji.customrole} \`:\` **Custom Roles**\n` +
                `${client.emoji.welcome} \`:\` **Welcomer**\n` +
                `${client.emoji.sticky} \`:\` **Sticky Messages**\n` +
                `${client.emoji.ticket} \`:\` **Tickets**\n` +
                `${client.emoji.giveaway} \`:\` **Giveaway**`
            )
            .setFooter({
                text: `Developed By Knowx and CodeZ`,
                iconURL: developerUser?.displayAvatarURL({ dynamic: true })
            });

        if (attachment) {
            embed.setImage('attachment://leviathan_embed.png');
        }

        const msgOptions = { embeds: [embed], components: [selectMenuRow, buttonRow] };
        if (attachment) {
            msgOptions.files = [attachment];
        }

        const msg = await message.channel.send(msgOptions);

        const categoryMap = {
            antinuke: client.emoji.antinuke,
            moderation: client.emoji.mod,
            mod: client.emoji.mod,
            automod: client.emoji.automod,
            logging: client.emoji.logs,
            logger: client.emoji.logs,
            utility: client.emoji.utillity,
            info: client.emoji.utillity,
            autoresponder: client.emoji.autoresponder,
            verification: client.emoji.verification,
            jointocreate: client.emoji.jtc,
            voice: client.emoji.vc,
            customrole: client.emoji.customrole,
            welcomer: client.emoji.welcome,
            sticky: client.emoji.sticky,
            ticket: client.emoji.ticket,
            giveaway: client.emoji.giveaway,
            owner: '👑',
            security: client.emoji.protect
        };

        // Build categoryCommands from actual commands
        const categoryCommands = {};
        client.commands.forEach((cmd) => {
            const category = cmd.category?.toLowerCase() || 'info';
            if (!categoryCommands[category]) {
                categoryCommands[category] = {
                    emoji: categoryMap[category] || '📋',
                    title: `${category.charAt(0).toUpperCase() + category.slice(1)} Commands`,
                    commands: []
                };
            }
            categoryCommands[category].commands.push({
                name: cmd.name,
                desc: cmd.usage || 'No description available'
            });
        });

        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect,
            time: 60000 
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: '> This menu is not for you.', ephemeral: true });
            }

            const selected = i.values[0];
            const category = categoryCommands[selected];
            
            if (!category) return i.deferUpdate();

            const replyEmojis = [client.emoji.reply1, client.emoji.reply2, client.emoji.reply3];
            const commandList = category.commands.map((cmd, idx) => {
                let emoji;
                if (idx === 0) {
                    emoji = client.emoji.reply1; // First command
                } else if (idx === category.commands.length - 1) {
                    emoji = client.emoji.reply3; // Last command
                } else {
                    emoji = client.emoji.reply2; // Commands in between
                }
                return `${emoji} ${cmd.name} - ${cmd.desc}`;
            }).join('\n');

            const categoryEmbed = new EmbedBuilder()
                .setColor(client.color)
                .setDescription(`**${selected.charAt(0).toUpperCase() + selected.slice(1)}:**\n\n${commandList}`)
                .setFooter({ text: `${category.commands.length} commands available`, iconURL: client.user.displayAvatarURL() });

            await i.update({ embeds: [categoryEmbed], components: [selectMenuRow] });
        });

        collector.on('end', async () => {
            // Disable the menu and update placeholder
            selectMenuRow.components[0].setDisabled(true);
            selectMenuRow.components[0].setPlaceholder('Menu Expired!');
            
            // Create expiration embed
            const expirationEmbed = new EmbedBuilder()
                .setColor(client.color)
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                .setDescription(
                    `${client.emoji.reply1} **__Greetings ${message.author.username}, Use \`${prefix}help\` To View The Contents Again!__**\n` +
                    `${client.emoji.reply2} [Support Server](${client.config.support}) | [Invite Me!](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot)\n` +
                    `${client.emoji.reply3} **Leviathan** - __An Versatile Bot Of **Indians**__`
                );
            
            if (attachment) {
                expirationEmbed.setImage('attachment://leviathan_embed.png');
            }
            
            // Edit the original message
            const editOptions = { embeds: [expirationEmbed], components: [selectMenuRow] };
            if (attachment) {
                editOptions.files = [attachment];
            }
            await msg.edit(editOptions).catch(() => {});
        });
    }
};
