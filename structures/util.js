const {
    EmbedBuilder,
    Collection,
    WebhookClient,
    ButtonStyle,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    AttachmentBuilder,
    PermissionsBitField,
    ChannelType,
    Partials
} = require('discord.js')
const { getSettingsar } = require('../models/welcome.js')
const lodash = require('lodash');

    
this.config = require(`${process.cwd()}/config.json`)
let globalCooldown
module.exports = class Util {
    constructor(client) {
        this.client = client
    }

    async sendPreview(settings, member) {
        if (!settings.welcome?.enabled)
            return 'Welcome message not enabled in this server'

        const targetChannel = member.guild.channels.cache.get(
            settings.welcome.channel
        )
        if (!targetChannel)
            return 'No channel is configured to send welcome message'

        const response = await this.client.util.buildGreeting(
            member,
            'WELCOME',
            settings.welcome
        )

        let time = settings.welcome.autodel
        await this.client.util.sendMessage(targetChannel, response, time)

        return `Sent welcome preview to ${targetChannel.toString()}`
    }

    async setStatus(settings, status) {
        const enabled = status.toUpperCase() === 'ON' ? true : false
        settings.welcome.enabled = enabled
        await settings.save()
        return `Configuration saved! Welcome message ${enabled ? '**enabled**' : '**disabled**'}`
    }

    async setChannel(settings, channel) {
        if (!this.client.util.canSendEmbeds(channel)) {
            return (
                'Ugh! I cannot send greeting to that channel? I need the `Write Messages` and `Embed Links` permissions in ' +
                channel.toString()
            )
        }
        settings.welcome.channel = channel.id
        await settings.save()
        return `Configuration saved! Welcome message will be sent to ${channel ? channel.toString() : 'Not found'}`
    }

    async setDescription(settings, desc) {
        settings.welcome.embed.description = desc
        await settings.save()
        return 'Configuration saved! Welcome message updated'
    }

    async setTitle(settings, title) {
        settings.welcome.embed.title = title
        await settings.save()
        return 'Configuration saved! Welcome message updated'
    }

    async setImage(settings, image) {
        settings.welcome.embed.image = image
        await settings.save()
        return 'Configuration saved! Welcome image updated'
    }
    async setThumbnail(settings, status) {
        settings.welcome.embed.thumbnail =
            status.toUpperCase() === 'ON' ? true : false
        await settings.save()
        return 'Configuration saved! Welcome message updated'
    }

    canSendEmbeds(channel) {
        return channel.permissionsFor(channel.guild.members.me).has(['SendMessages', 'EmbedLinks'])
    }

    async buildGreeting(member, type, config) {
        if (!config) return
        let content = config.content
            ? await this.client.util.parse(config.content, member)
            : `<@${member.user.id}>`
        const embed = this.client.util.embed()
        if (config.embed.description) {
            embed.setDescription(
                await this.client.util.parse(config.embed.description, member)
            )
        }
        embed.setColor(
            config.embed.color ? config.embed.color : member.client.color
        )
        if (config.embed.thumbnail) {
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        }
        if(config.embed.image) {
            embed.setImage(
                await this.client.util.parse(config.embed.image, member)
            )
        }
        if (config.embed.title) {
            embed.setTitle(
                await this.client.util.parse(config.embed.title, member)
            )
        }
        if (config.embed.footer) {
            embed.setFooter({
                text: await this.client.util.parse(config.embed.footer, member)
            })
        }

        if (
            !config.content &&
            !config.embed.description &&
            !config.embed.footer 
        ) {
            return {
                content: `<@${member.user.id}>`,
                embeds: [
                    this.client.util.embed()
                        .setColor(this.client.color)
                        .setDescription(
                            `Hey ${member.displayName}, Welcome to the server <a:welcome:1188456678392348702>.`
                        )
                ]
            }
        }
        return { content, embeds: [embed] }
    }

    async sendMessage(channel, content, seconds) {
        if (!channel || !content) return
        const perms = new PermissionsBitField(['ViewChannel', 'SendMessages']);
        if (content.embeds && content.embeds.length > 0) {
            perms.add('EmbedLinks');
        }
        if (
            channel.type !== 'DM' &&
            !channel.permissionsFor(channel.guild.members.me).has(perms)
        )
            return
        try {
            if (!seconds || seconds == 0) return await channel.send(content)
            const reply = await channel.send(content)
            setTimeout(
                () => reply.deletable && reply.delete().catch((ex) => {}),
                seconds * 1000
            )
        } catch (ex) {
            return
        }
    }

    async sendWelcome(member, settings) {
        const config = (await getSettingsar(member.guild))?.welcome
        if (!config || !config.enabled) return

        const channel = member.guild.channels.cache.get(config.channel)
        if (!channel) return

        const response = await this.client.util.buildGreeting(
            member,
            'WELCOME',
            config
        )

        this.client.util.sendMessage(
            channel,
            response,
            settings.welcome.autodel
        )
    }

    isHex(text) {
        return /^#[0-9A-F]{6}$/i.test(text)
    }

    async parse(content, member) {
        let mention = `<@${member.user.id}>`
        return content
            .replaceAll(/\\n/g, '\n')
            .replaceAll(/{server}/g, member.guild.name)
            .replaceAll(/{count}/g, member.guild.memberCount)
            .replaceAll(/{member:name}/g, member.displayName)
            .replaceAll(/{member:mention}/g, mention)
            .replaceAll(/{member:id}/g, member.user.id)
            .replaceAll(/{member:created_at}/g, `<t:${Math.round(member.user.createdTimestamp / 1000)}:R>`)
    }


    async purgeMessages(issuer, channel, type, amount, argument) {
        if (
            !channel
                .permissionsFor(issuer)
                .has(['MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY'])
        ) {
            return 'MEMBER_PERM'
        }

        if (
            !channel
                .permissionsFor(issuer.guild.me)
                .has(['MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY'])
        ) {
            return 'BOT_PERM'
        }

        const toDelete = new Collection()

        try {
            const messages = await channel.messages.fetch(
                { limit: amount },
                { cache: false, force: true }
            )

            for (const message of messages.values()) {
                if (toDelete.size >= amount) break
                if (!message.deletable) continue

                if (type === 'ALL') {
                    toDelete.set(message.id, message)
                } else if (type === 'ATTACHMENT') {
                    if (message.attachments.size > 0) {
                        toDelete.set(message.id, message)
                    }
                } else if (type === 'BOT') {
                    if (message.author.bot) {
                        toDelete.set(message.id, message)
                    }
                } else if (type === 'LINK') {
                    if (containsLink(message.content)) {
                        toDelete.set(message.id, message)
                    }
                } else if (type === 'TOKEN') {
                    if (message.content.includes(argument)) {
                        toDelete.set(message.id, message)
                    }
                } else if (type === 'USER') {
                    if (message.author.id === argument) {
                        toDelete.set(message.id, message)
                    }
                }
            }

            if (toDelete.size === 0) return 'NO_MESSAGES'

            const deletedMessages = await channel.bulkDelete(toDelete, true)
            return deletedMessages.size
        } catch (ex) {
            return 'ERROR'
        }
    }

    async sendMessage(channel, content, seconds) {
        if (!channel || !content) return
        const perms = new PermissionsBitField(['ViewChannel', 'SendMessages']);
        if (content.embeds && content.embeds.length > 0) {
            perms.add('EmbedLinks');
        }
        if (
            channel.type !== ChannelType.DM &&
            !channel.permissionsFor(channel.guild.members.me).has(perms)
        )
            return
        try {
            if (!seconds || seconds == 0) return await channel.send(content)
            const reply = await channel.send(content)
            setTimeout(
                () => reply.deletable && reply.delete().catch((ex) => {}),
                seconds * 1000
            )
        } catch (ex) {
            return
        }
    }
    /**
     * @param
     */
    async isExtraOwner(member, guild) {
        const data = await this.client.db.get(`extraowner_${guild.id}`)
        if (!data) return false
        if (data?.owner?.includes(member.id)) return true
        else return false
    }

    isHex(text) {
        return /^#[0-9A-F]{6}$/i.test(text)
    }

    hasHigher(member) {
        if (
            member.roles.highest.position <=
                member.guild.members.me.roles.highest.position &&
            member.user.id != member.guild.ownerId
        )
            return false
        else return true
    }

    async selectMenuHandle(interaction) {
        try {
            if (interaction.customId === 'helpop') return;
            await interaction.deferReply({ flags: 64 });

            const selected = interaction.values[0];
            const prefix = interaction.guild?.prefix || this.client.config.PREFIX;
            const replyEmojis = [this.client.emoji.reply1, this.client.emoji.reply2, this.client.emoji.reply3];

            const categoryMap = {
                antinuke: { emoji: this.client.emoji.antinuke, title: 'AntiNuke Commands', cat: 'security' },
                moderation: { emoji: this.client.emoji.mod, title: 'Moderation Commands', cat: 'mod' },
                automod: { emoji: this.client.emoji.automod, title: 'Automod Commands', cat: 'automod' },
                logger: { emoji: this.client.emoji.logs, title: 'Logging Commands', cat: 'logging' },
                utility: { emoji: this.client.emoji.utillity, title: 'Utility Commands', cat: 'info' },
                serverutility: { emoji: this.client.emoji.serverutillity, title: 'Server Utility Commands', cat: 'leaderboard' },
                verification: { emoji: this.client.emoji.verification, title: 'Verification Commands', cat: 'verification' },
                jointocreate: { emoji: this.client.emoji.jtc, title: 'Join To Create Commands', cat: 'jointocreate' },
                voice: { emoji: this.client.emoji.vc, title: 'Voice Commands', cat: 'voice' },
                customrole: { emoji: this.client.emoji.customrole, title: 'Custom Role Commands', cat: 'customrole' },
                welcomer: { emoji: this.client.emoji.welcome, title: 'Welcomer Commands', cat: 'welcomer' },
                autoresponder: { emoji: this.client.emoji.autoresponder, title: 'Auto Responder Commands', cat: 'autoresponder' },
                sticky: { emoji: this.client.emoji.sticky, title: 'Sticky Commands', cat: 'sticky' },
                ticket: { emoji: this.client.emoji.ticket, title: 'Ticket Commands', cat: 'ticket' },
                giveaway: { emoji: this.client.emoji.giveaway, title: 'Giveaway Commands', cat: 'giveaway' }
            };

            const category = categoryMap[selected];
            if (!category) return;

            let commands = [];
            interaction.client.commands
                .filter((cmd) => cmd.category === category.cat)
                .forEach((cmd) => {
                    commands.push({
                        name: cmd.name,
                        desc: cmd.usage || 'No description available'
                    });
                    if (cmd.subcommand && cmd.subcommand.length) {
                        cmd.subcommand.forEach((subCmd) => {
                            commands.push({
                                name: `${cmd.name} ${subCmd}`,
                                desc: cmd.usage || 'No description available'
                            });
                        });
                    }
                });

            const categoryTitle = selected.charAt(0).toUpperCase() + selected.slice(1);
            const embeds = [];
            let currentDescription = `**${categoryTitle}:**\n\n`;
            let embedCount = 0;

            commands.forEach((cmd, idx) => {
                let emoji;
                if (idx === 0) {
                    emoji = this.client.emoji.reply1;
                } else if (idx === commands.length - 1) {
                    emoji = this.client.emoji.reply3;
                } else {
                    emoji = this.client.emoji.reply2;
                }
                const line = `${emoji} ${prefix}${cmd.name} - ${cmd.desc}\n`;
                
                if ((currentDescription + line).length > 4096) {
                    embeds.push(new EmbedBuilder()
                        .setColor(this.client.color)
                        .setDescription(currentDescription.trim())
                    );
                    currentDescription = line;
                    embedCount++;
                } else {
                    currentDescription += line;
                }
            });

            if (currentDescription.trim() !== `**${categoryTitle}:**`) {
                embeds.push(new EmbedBuilder()
                    .setColor(this.client.color)
                    .setDescription(currentDescription.trim())
                );
            }

            if (embeds.length > 0) {
                embeds[embeds.length - 1].setFooter({ text: `${commands.length} commands available`, iconURL: this.client.user.displayAvatarURL() });
            }

            await interaction.editReply({ embeds: embeds });

        } catch (err) {
            console.error('Error in selectMenuHandle:', err);
            try {
                await interaction.editReply({
                    content: '❌ An error occurred while processing your request.',
                    embeds: []
                });
            } catch (replyErr) {
                console.error('Error editing reply:', replyErr);
            }
        }
    }
     countCommandsAndSubcommands = (client) => {
        let totalCount = 0;
    
        this.client.commands.forEach(command => {
            totalCount++; // Count the main command
    
            // If the command has subcommands, add them to the count
            if (command.subcommand && Array.isArray(command.subcommand)) {
                totalCount += command.subcommand.length;
            }
        });
    
        return totalCount;
    };
    
    async manageAfk(message, client) {
    const db = require('../models/afk.js');
    let data = await db.findOne({
        Member: message.author.id,
        $or: [
            { Guild: message.guildId },   // Server-specific AFK
            { Guild: null }                // Global AFK
        ]
    });

    if (data) {
        if (message.author.id === data.Member) {
            if (data.Guild === message.guildId || data.Guild === null) {
                await data.deleteOne();
                return message.reply({
                    embeds: [
                        client.util.embed()
                            .setColor(client.color)
                            .setDescription(`I Removed Your AFK.`)
                    ]
                });
            }
        }
    }

    const memberMentioned = message.mentions.users.first();
    if (memberMentioned) {
        data = await db.findOne({
            Member: memberMentioned.id,
            $or: [
                { Guild: message.guildId },   // Server-specific AFK
                { Guild: null }                // Global AFK
            ]
        });

        if (data) {
            message.reply({
                embeds: [
                    client.util.embed()
                        .setColor(client.color)
                        .setDescription(
                            `<@${memberMentioned.id}> went AFK <t:${Math.round(data.Time / 1000)}:R>\n\nFor Reason: **${data.Reason}**`
                        )
                ]
            });
        } else {
            return;
        }
    }
}

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes'
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
    }

    async setPrefix(message, client) {
        let prefix = await this.client.db.get(`prefix_${message?.guild?.id}`) || client.config.PREFIX
        if (prefix === null) prefix = client.config.PREFIX
            message.guild.prefix = prefix
    }
    async noprefix() {
        let data = (await this.client.db.get(`noprefix_${this.client.user.id}`))
            ? await this.client.db.get(`noprefix_${this.client.user.id}`)
            : []
        this.client.noprefix = data
    }
    async blacklist() {
        let data = (await this.client.db.get(
            `blacklist_${this.client.user.id}`
        ))
            ? await this.client.db.get(`blacklist_${this.client.user.id}`)
            : []
        this.client.blacklist = data
    }

    async blacklistserver() {
        let data = (await this.client.db.get(
            `blacklistserver_${this.client.user.id}`
        ))
            ? await this.client.db.get(`blacklistserver_${this.client.user.id}`)
            : []
        this.client.blacklistserver = data
    }
    async sleep(ms) {
        return await new Promise((resolve) => setTimeout(resolve, ms))
    }

    async handleRateLimit() {
        globalCooldown = true
        await this.client.util.sleep(5000)
        globalCooldown = false
    }

    async FuckYou(
        member,
        reason = 'Not Whitelisted | Performed Suspicious Activity'
    ) {
        try {
            member.guild = member.guild
            await member.guild.members
                .ban(member.id, {
                    reason: reason
                })
                .catch((_) => {})
        } catch (err) {
            return
        }
    }
    
    embed() {
                return new EmbedBuilder()
        }

       async BitzxierPagination(membersList, title, client, message) {
    const lodash = require('lodash');
    
    // Split members list into chunks of 10 items per page
    const pages = lodash.chunk(membersList, 10);
    let currentPage = 0;

    // Generate the embed for the current page
    const generateEmbed = () => {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(pages[currentPage].join('\n')) // Displaying the members in chunks
            .setColor(client.color)
            .setAuthor({
                name: message.guild.name,
                iconURL: message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
            })
            .setFooter({
                text: `Page: ${currentPage + 1}/${pages.length}`,
                iconURL: client.user.displayAvatarURL()
            });
    };

    if (pages.length === 0) {
        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setDescription('No Data found')
                    .setAuthor({
                        name: message.guild.name,
                        iconURL: message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
                    })
                    .setFooter({
                        text: 'Page: 0',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setColor(client.color)
                    .setThumbnail(client.user.displayAvatarURL())
            ]
        });
    }

    if (pages.length === 1) {
        return message.channel.send({ embeds: [generateEmbed()] });
    }

    let buttonBack = new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('1')
        .setEmoji('◀')
        .setDisabled(true);

    let buttonHome = new ButtonBuilder()
        .setEmoji('⏹')
        .setCustomId('2')
        .setStyle(ButtonStyle.Secondary);

    let buttonForward = new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('3')
        .setEmoji('▶️');

    let buttonFirst = new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('4')
        .setEmoji('⏮')
        .setDisabled(true);

    let buttonLast = new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('5')
        .setEmoji('⏭');

    const allButtons = [
        new ActionRowBuilder().addComponents([
            buttonFirst,
            buttonBack,
            buttonHome,
            buttonForward,
            buttonLast
        ])
    ];

    let swapmsg = await message.channel.send({
        embeds: [generateEmbed()],
        components: allButtons
    });

    const collector = swapmsg.createMessageComponentCollector({
        filter: (i) => i.isButton() && i.user.id === message.member.id,
        time: 60000
    });

    collector.on('collect', async (b) => {
        if (b.customId == '1') {
            // Previous Page
            if (currentPage !== 0) {
                currentPage--;
                if (currentPage === 0) {
                    buttonBack.setDisabled(true);
                    buttonFirst.setDisabled(true);
                }
                buttonForward.setDisabled(false);
                buttonLast.setDisabled(false);
            }
        } else if (b.customId == '2') {
            // Stop Pagination
            buttonBack.setDisabled(true);
            buttonForward.setDisabled(true);
            buttonHome.setDisabled(true);
            buttonFirst.setDisabled(true);
            buttonLast.setDisabled(true);
        } else if (b.customId == '3') {
            // Next Page
            if (currentPage < pages.length - 1) {
                currentPage++;
                if (currentPage === pages.length - 1) {
                    buttonForward.setDisabled(true);
                    buttonLast.setDisabled(true);
                }
                buttonBack.setDisabled(false);
                buttonFirst.setDisabled(false);
            }
        } else if (b.customId == '4') {
            // Go to the first page
            currentPage = 0;
            buttonBack.setDisabled(true);
            buttonFirst.setDisabled(true);
            buttonForward.setDisabled(false);
            buttonLast.setDisabled(false);
        } else if (b.customId == '5') {
            // Go to the last page
            currentPage = pages.length - 1;
            buttonForward.setDisabled(true);
            buttonLast.setDisabled(true);
            buttonBack.setDisabled(false);
            buttonFirst.setDisabled(false);
        }

        await swapmsg.edit({
            embeds: [generateEmbed()],
            components: [
                new ActionRowBuilder().addComponents([
                    buttonFirst,
                    buttonBack,
                    buttonHome,
                    buttonForward,
                    buttonLast
                ])
            ]
        });

        await b.deferUpdate();
    });

    collector.on('end', () => {
        if (swapmsg) {
            buttonBack.setDisabled(true);
            buttonForward.setDisabled(true);
            buttonHome.setDisabled(true);
            buttonLast.setDisabled(true);
            buttonFirst.setDisabled(true);
            swapmsg.edit({
                components: [
                    new ActionRowBuilder().addComponents([
                        buttonFirst,
                        buttonBack,
                        buttonHome,
                        buttonForward,
                        buttonLast
                    ])
                ]
            });
        }
    });
}

    async checkAndLeaveNonPremiumGuilds(client) {
        try {
            const guilds = await client.guilds.fetch(); 
            for (const guild of guilds.values()) {
                const isPremium = await client.db.get(`sprem_${guild.id}`);
                if (!isPremium) {
                    // Schedule repeated checks every 1 second
                    const interval = setInterval(async () => {
                        try {
                            let nonguild = client.guilds.cache.get(guild.id);
                            if (nonguild) {
                                                                await client.util.sleep(2000)
                                await nonguild.leave();
                                console.log(`Left guild: ${guild.name}`);
                            }
                        } catch (error) {
                            console.error(`Failed to leave guild ${guild.name}:`, error);
                        } finally {
                            clearInterval(interval);
                        }
                    }, 60000); // Check every 1 min
                }
            }
        } catch (error) {
            console.error('Failed to check and leave non-premium guilds:', error);
        }
    }
    
    


    async BlacklistCheck(guild) {
        try {
            let data = await this.client.db.get(`blacklistserver_${this.client.user.id}`) || [];
            if (data.includes(guild.id)) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }
  
    convertTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      
        const hoursStr = hours < 10 ? `0${hours}` : hours;
        const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
        const secondsStr = seconds < 10 ? `0${seconds}` : seconds;
      
        return `${hoursStr}:${minutesStr}:${secondsStr}`;
      }

    async sendBooster(guild, member) {
        const db = require(`${process.cwd()}/models/boost.js`)
        const data = await db.findOne({ Guild: guild.id })
        if (!data || !data.Boost) return
        try {
            let channel = guild.channels.cache.get(data.Boost)
            if (!channel) return
            let count = guild.premiumSubscriptionCount
            const embed = this.client.util.embed()
                .setColor(guild.roles.premiumSubscriberRole.color)
                .setAuthor({
                    name: `🎉🎉 NEW BOOSTER 🎉🎉`,
                    iconURL: `https://cdn.discordapp.com/emojis/1035418876470640660.gif`
                })
                .setThumbnail(member.displayAvatarURL({ dynamic: true }))
                .setDescription(
                    `**<@${member.id}> Just Boosted ${guild.name}. Thank You So Much For Boosting Our Server. We Now Have Total ${count} Boosts On Our Server!!**`
                )
                .setFooter({
                    text: `Server Boosted 🎉 `,
                    iconURL: guild.iconURL({ dynamic: true })
                })
                .setTimestamp()
            await channel.send({ embeds: [embed] })
        } catch (err) {
            return
        }
    }

    async pagination(message, description, desc = '') {
        const lodash = require('lodash')
        let previousbut = new ButtonBuilder()
            .setCustomId('queueprev')
            .setEmoji('<:ARROW1:1182736084766036059>')
            .setStyle(ButtonStyle.Success)
        let nextbut = new ButtonBuilder()
            .setCustomId('queuenext')
            .setEmoji('<:ARROW:1182735884978765957>')
            .setStyle(ButtonStyle.Success)
        let row = new ActionRowBuilder().addComponents(previousbut, nextbut)
        const pages = lodash.chunk(description, 10).map((x) => x.join(`\n`))
        let page = 0
        let msg
        if (pages.length <= 1) {
            return await message.channel.send({
                content: desc + this.client.util.codeText(pages[page])
            })
        } else {
            msg = await message.channel.send({
                content: desc + this.client.util.codeText(pages[page]),
                components: [row]
            })
        }
        const collector = message.channel.createMessageComponentCollector({
            filter: (b) => {
                if (b.user.id === message.author.id) return true
                else {
                    b.reply({
                        ephemeral: true,
                        content: `Only **${message.author.tag}** can use this button, run the command again to use the queue menu.`
                    })
                    return false
                }
            },
            time: 60000 * 5,
            idle: 30e3
        })
        collector.on('collect', async (b) => {
            if (!b.deferred) await b.deferUpdate().catch(() => {})
            if (b.message.id !== msg.id) return
            if (b.customId === 'queueprev') {
                page = page - 1 < 0 ? pages.length - 1 : --page
                return await msg
                    .edit({
                        content: desc + this.client.util.codeText(pages[page])
                    })
                    .catch((e) => {
                        return
                    })
            } else if (b.customId === 'queuenext')
                page = page + 1 >= pages.length ? 0 : ++page
            if (!msg) return
            return await msg
                .edit({
                    content: desc + this.client.util.codeText(pages[page])
                })
                .catch((e) => {
                    return
                })
        })
        collector.on('end', async () => {
            await msg.edit({ components: [] }).catch((e) => {
                return
            })
        })
    }

    codeText(text, type = 'js') {
        return `\`\`\`${type}\n${text}\`\`\``
    }

    async haste(text) {
        const req = await this.client.snek.post(
            'https://haste.ntmnathan.com/documents',
            { text }
        )
        return `https://haste.ntmnathan.com/${req.data.key}`
    }

    removeDuplicates(arr) {
        return [...new Set(arr)]
    }

    removeDuplicates2(arr) {
        return [...new Set(arr)]
    }

    async handleRateLimit(delayMs = 1000) {
        return new Promise(resolve => setTimeout(resolve, delayMs))
    }

    countCommandsAndSubcommands(client) {
        let count = 0
        for (const [key, value] of client.commands) {
            count++
            if (value.subcommands) {
                count += value.subcommands.size
            }
        }
        return count
    }

    generateLatencyChart(wsPing, dbPing) {
        const maxPing = Math.max(wsPing, dbPing, 100);
        const padding = 60;
        const width = 600;
        const height = 300;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);
        
        const wsY = padding + chartHeight - (wsPing / maxPing) * chartHeight;
        const dbY = padding + chartHeight - (dbPing / maxPing) * chartHeight;
        
        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#41729f;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#001f3f;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#E1F1FF;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#41729f;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.5"/>
                </filter>
            </defs>
            
            <!-- Background -->
            <rect width="${width}" height="${height}" fill="#0F0E11"/>
            
            <!-- Title -->
            <text x="${width/2}" y="35" font-size="24" font-weight="bold" fill="#E1F1FF" text-anchor="middle">Bot Latency Overview</text>
            
            <!-- Y-axis labels -->
            <text x="${padding - 10}" y="${padding + 10}" font-size="12" fill="#888888" text-anchor="end">${maxPing}ms</text>
            <text x="${padding - 10}" y="${padding + chartHeight/2 + 5}" font-size="12" fill="#888888" text-anchor="end">${(maxPing/2).toFixed(0)}ms</text>
            <text x="${padding - 10}" y="${padding + chartHeight + 5}" font-size="12" fill="#888888" text-anchor="end">0ms</text>
            
            <!-- Grid lines -->
            <line x1="${padding}" y1="${padding + chartHeight/2}" x2="${width - padding}" y2="${padding + chartHeight/2}" stroke="#333333" stroke-width="1" stroke-dasharray="5,5"/>
            <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="#333333" stroke-width="1" stroke-dasharray="5,5"/>
            
            <!-- Axes -->
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#41729f" stroke-width="2"/>
            <line x1="${padding}" y1="${padding + chartHeight}" x2="${width - padding}" y2="${padding + chartHeight}" stroke="#41729f" stroke-width="2"/>
            
            <!-- WS Bar -->
            <rect x="${padding + 80}" y="${wsY}" width="100" height="${padding + chartHeight - wsY}" fill="url(#grad1)" filter="url(#shadow)" rx="8"/>
            <text x="${padding + 130}" y="${padding + chartHeight + 25}" font-size="14" font-weight="bold" fill="#41729f" text-anchor="middle">WebSocket</text>
            <text x="${padding + 130}" y="${wsY - 10}" font-size="18" font-weight="bold" fill="#E1F1FF" text-anchor="middle">${wsPing}ms</text>
            
            <!-- DB Bar -->
            <rect x="${width - padding - 180}" y="${dbY}" width="100" height="${padding + chartHeight - dbY}" fill="url(#grad2)" filter="url(#shadow)" rx="8"/>
            <text x="${width - padding - 130}" y="${padding + chartHeight + 25}" font-size="14" font-weight="bold" fill="#E1F1FF" text-anchor="middle">Database</text>
            <text x="${width - padding - 130}" y="${dbY - 10}" font-size="18" font-weight="bold" fill="#001f3f" text-anchor="middle">${dbPing}ms</text>
            
            <!-- Status indicator -->
            <circle cx="${width - 40}" cy="30" r="8" fill="${wsPing + dbPing < 100 ? '#00FF00' : wsPing + dbPing < 200 ? '#FFFF00' : '#FF0000'}"/>
            <text x="${width - 25}" y="35" font-size="12" fill="#CCCCCC">${wsPing + dbPing < 100 ? 'Excellent' : wsPing + dbPing < 200 ? 'Good' : 'Needs Improvement'}</text>
        </svg>`;
        
        const base64 = Buffer.from(svg).toString('base64');
        return `data:image/svg+xml;base64,${base64}`;
    }
}
