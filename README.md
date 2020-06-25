<img src="icon.jpg" align="left" height="74" />

# KAG Gather
Gather is an CTF event involving the use of this Discord bot to organise matches. Gather provides more structured, team-based gameplay as compared to regular CTF due to its inclusion of tickets (limited number of respawns per team). Gather is best enjoyed with teams of five and everyone in a single voice channel.

## Features
- Adjustable queue size
- Automatic team allocation
- Random map generation based on various presets
- Tickets
- Match history log

## Usage
### Discord
1. `!link` your KAG account to your Discord account
2. `!add` to the queue
3. Join the Gather server when the queue is filled and teams have been assigned

### Gather Server
1. `!ready` to add yourself to the ready list
2. Wait for everyone to ready
3. ???
4. Profit!

## Prerequisites
- A KAG server (and knowledge of how to setup and host it)
- A Discord server in which you have administrator permissions
- [GatherLite mod](https://github.com/eps0003/Gatherlite)
- [NodeJS](https://nodejs.org/)

## Setup
### Gather Server
0. Setup the server
1. Put [GatherLite](https://github.com/eps0003/Gatherlite) into the `Mods` folder
2. Add `GatherLite` to a new line of `mods.cfg`
3. Ensure the following settings are applied to `autoconfig.cfg`:
   - `sv_gamemode = CTF`
   - `sv_enable_joinfull = 1`
   - `sv_tcpr = 1`
   - `sv_tcpr_everything = 0`
   - `sv_tcpr_timestamp = 0`
   - Set `sv_rconpassword` to anything you like and keep note of it for later
   - Optional: Include a Discord invite link in `sv_info` (the mod points new players to an invite link in the server description)
4. Start the server

### Discord Bot
1. Create an [application](https://discord.com/developers/applications) and set it as a bot user
2. Add the bot to the Discord server. I recommend using [this](https://discordapi.com/permissions.html#8) site to do so.
3. Rename `example.env` to `.env` and fill in all fields  
   **Note:** There should be no space between `=` and the value of each field (e.g. `PREFIX=!`)
4. Run the bot by typing `node ./index.js` in the base directory  
   The console output should be similar to the following:
   ```
   Logged into Discord as Gather
   Connected to XXX.XXX.XXX.XXX:XXXXX
   ```
   You should also see a message similar to the following in #gather-general:
   ```
   The bot has successfully established a connection with the Gather server and is ready for use
   ```
Gather is now ready to go!

## Acknowledgements
Thanks to the following people for helping Gather reach the stage it's currently in:
- **[Cameron](https://forum.thd.vg/members/6469/)** - created and hosted the [original version of Gather](https://github.com/CameronTenTen/discordBot)
- **[buildfast115](https://forum.thd.vg/members/13758/)** - providing a server to host this version of Gather
- **[OCE community](https://discord.com/invite/5ukqMU7)** - coming together to play Gather every evening

## License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details
