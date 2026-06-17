const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('Set ANTHROPIC_API_KEY in .env (see .env.example)');
  process.exit(1);
}

async function main() {
  try {
    const payload = {
      model: 'claude-opus-4-8',
      messages: [
        { role: 'user', content: 'Please list 3 practical tips to save energy when charging an electric car.' }
      ],
      max_tokens: 300
    };

    const res = await axios.post('https://api.anthropic.com/v1/messages', payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY
      },
      timeout: 600000
    });

    console.log('Raw response:');
    console.log(JSON.stringify(res.data, null, 2));

    const assistantText = res.data?.content?.[0]?.text || res.data?.content?.[0]?.text;
    if (assistantText) {
      console.log('\nAssistant:\n' + assistantText);
    }
  } catch (err) {
    console.error('Request failed:', err.response?.data || err.message || err);
    process.exit(1);
  }
}

main();
