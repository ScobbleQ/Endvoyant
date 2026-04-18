# Endvoyant

A Discord bot for **Arknights: Endfield** with utility commands to enhance your experience.

[Features](#features) |
[Screenshots](#screenshots) |
[Using the bot](#using-the-bot) |
[Commands](#commands) |
[Project Structure](#project-structure)

## Features

- Automatic Sign-in: Daily attendance is checked automatically
- Profile view: View your in-game profile with real-time data
- Characters: Browse all Endfield characters with detailed info
- Wiki: Quick access to operators, weapons, facilities, gear, missions, and more

## Screenshots

<div class="display: flex">
  <img src="assets/github/signin.png" alt="Sign-in notification" height="280" />
  <img src="assets/github/profile.png" alt="Profile view" height="280" />
  <img src="assets/github/characters.png" alt="Character list catalog" height="280" />
  <img src="assets/github/exploration.png" alt="Exploration overview" height="280">
</div>

## Using the Bot

### Hosted Version (Recommended)

The bot is hosted with a centralized database and 24/7 uptime. Get instant updates and skip the setup.

**[Invite Endvoyant](https://discord.com/oauth2/authorize?client_id=1463987008157389005)** or join our [Community Server](https://discord.gg/5rUsSZTyf2)

### Self-Hosted

#### Prerequisites

- **Node.js** 18+
- **PostgreSQL** database
- Discord [Application](https://discord.com/developers/applications) (Bot token, Client ID, Client Secret)

#### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/ScobbleQ/Endvoyant.git
   cd Endvoyant
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp example.env .env
   ```

   Edit `.env` and fill in:

   | Variable        | Description                                                               |
   | --------------- | ------------------------------------------------------------------------- |
   | `TOKEN`         | Discord bot token                                                         |
   | `CLIENT_ID`     | Discord application client ID                                             |
   | `CLIENT_SECRET` | Discord application client secret                                         |
   | `DATABASE_URL`  | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db`) |
   | `ENVIRONMENT`   | `development` or `production`                                             |

4. **Initialize the database**

   ```bash
   npm run db:migrate
   ```

5. **Deploy slash commands**

   ```bash
   npm run deploy
   ```

6. **Start the bot**

   ```bash
   npm start
   ```

#### Database Scripts

- `npm run db:migrate` — Apply migrations to the database (for fresh setups)
- `npm run db:studio` — Open Drizzle Studio to inspect or edit data
- `npm run db:pull` — Pull schema from an existing database (updates drizzle folder)

## Commands

| Command        | Description                              |
| -------------- | ---------------------------------------- |
| `/about`       | About the bot                            |
| `/add account` | Add your SKPort account to Discord       |
| `/attendance`  | Claim daily sign-in rewards              |
| `/characters`  | Show your obtained operators             |
| `/data`        | Get your account data (ZIP)              |
| `/development` | Show regional development                |
| `/enka`        | View profile via Enka.Network            |
| `/exploration` | Show region exploration progress         |
| `/profile`     | View your in-game profile                |
| `/redeem`      | Redeem Endfield codes                    |
| `/settings`    | View settings (coming soon)              |
| `/survey`      | Open feedback surveys to improve the bot |

## Project Structure

- `src/` application source, including commands, events, database access, shared utilities, config, and constants
- `assets/` static images and fonts used by the bot output
- `drizzle/` generated artifacts from Drizzle ORM
- `experiments/` non-runtime prototypes and experiments that should not be auto-loaded as bot commands

## Contributing

Feature requests and contributions are welcome.

## License

[GPL-3.0-only](LICENSE)
