Anthropic Opus example

This folder contains a minimal Node script that calls the Anthropic Messages API using the `claude-opus-4-8` model.

Setup

```bash
cd anthropic-example
npm install
# Unix/macOS
cp .env.example .env
# Windows PowerShell
copy .env.example .env

# Edit .env and set ANTHROPIC_API_KEY
npm start
```

Notes

- The script reads `ANTHROPIC_API_KEY` from environment (via `dotenv`).
- Do not commit your `.env` to source control. `.gitignore` includes `.env`.
- If the model name `claude-opus-4-8` is not available for your account, contact Anthropic support or change to a model you have access to.
