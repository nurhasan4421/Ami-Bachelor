import { parseMealMessage, parseDepositMessage, type ParsedMealEntry, type ParsedDepositEntry } from './lib/telegramMealParser';

interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

const BOT_TOKEN = '9015872115:AAGEvGkOXljmZipHED4slkoYzORxbXrC9lI';
const SUPABASE_URL = 'https://krxvrfiflyryvjjlyore.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeHZyZmlmbHlyeXZqamx5b3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODI4NDUsImV4cCI6MjEwNzY1ODg0NX0.Z0OcRPcp9Gzw6_iSHBJpcHtNq6Z3kZbrHS1AHhvfC5s';

// Helpers to communicate with Telegram Bot API
async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || 'Processing...'
    })
  });
}

async function editTelegramMessage(chatId: string | number, messageId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
  const body: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Supabase REST helper
async function supabaseFetch(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers || {})
  };
  return fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Telegram Webhook Endpoint
    if (url.pathname === '/api/telegram-webhook' && request.method === 'POST') {
      try {
        const update: any = await request.json();
        await handleTelegramUpdate(update);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        console.error('Webhook error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 200, // Return 200 to Telegram so it doesn't spam retries
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. Health check endpoint
    if (url.pathname === '/api/telegram-status') {
      return new Response(JSON.stringify({ status: 'active', bot: '@Amibachelorbot' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Static Assets fallback (for Cloudflare Workers Sites/Assets)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Ami Bachelor API running', { status: 200 });
  }
};

async function handleTelegramUpdate(update: any) {
  // 1. Handle Callback Query (Inline buttons like "✅ Correct, Send" or "❌ Cancel")
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  // 2. Handle standard chat messages
  if (update.message && update.message.text) {
    await handleMessage(update.message);
    return;
  }
}

async function handleCallbackQuery(cb: any) {
  const callbackId = cb.id;
  const data = cb.data as string;
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;

  if (!chatId || !messageId) {
    await answerCallbackQuery(callbackId, 'Invalid request');
    return;
  }

  // Cancel action
  if (data === 'cancel') {
    await answerCallbackQuery(callbackId, 'Cancelled');
    await editTelegramMessage(chatId, messageId, '❌ <b>Update cancelled.</b> No changes were made.');
    return;
  }

  // Confirm Save Action by looking up pending_bot_actions: "act:<actionId>"
  if (data.startsWith('act:')) {
    const actionId = data.substring(4);
    await answerCallbackQuery(callbackId, 'Applying update...');

    try {
      const actRes = await supabaseFetch(`pending_bot_actions?id=eq.${actionId}`);
      const actions: any[] = await actRes.json();

      if (!actions || actions.length === 0) {
        await editTelegramMessage(chatId, messageId, '⚠️ <b>Expired:</b> This confirmation has expired. Please send the message again.');
        return;
      }

      const action = actions[0];

      if (action.type === 'meal') {
        const monthId = action.month_id;
        const dateStr = action.date;
        const meals = action.payload;

        // Check if meal record for this month and date already exists
        const checkRes = await supabaseFetch(`daily_meals?month_id=eq.${monthId}&date=eq.${dateStr}`);
        const existingMeals: any[] = await checkRes.json();

        let finalMeals = { ...meals };
        if (existingMeals && existingMeals.length > 0) {
          // Merge with existing meal object
          finalMeals = { ...(existingMeals[0].meals || {}), ...meals };
          await supabaseFetch(`daily_meals?id=eq.${existingMeals[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({ meals: finalMeals })
          });
        } else {
          await supabaseFetch('daily_meals', {
            method: 'POST',
            body: JSON.stringify({
              month_id: monthId,
              date: dateStr,
              meals: finalMeals
            })
          });
        }

        // Delete pending action
        await supabaseFetch(`pending_bot_actions?id=eq.${actionId}`, { method: 'DELETE' });

        const mealLines = Object.entries(finalMeals)
          .map(([name, count]) => `• <b>${name}</b>: ${count} meal(s)`)
          .join('\n');

        const confirmedText = `✅ <b>Meals Saved Successfully!</b>\n\n📅 <b>${dateStr}</b>\n${mealLines}\n\n<i>Updated on Ami Bachelor.</i>`;
        await editTelegramMessage(chatId, messageId, confirmedText);
        return;
      }

      if (action.type === 'deposit') {
        const monthId = action.month_id;
        const dateStr = action.date;
        const deposits = action.payload;

        for (const [person, amount] of Object.entries(deposits)) {
          await supabaseFetch('food_deposits', {
            method: 'POST',
            body: JSON.stringify({
              month_id: monthId,
              person,
              amount,
              date: dateStr
            })
          });
        }

        // Delete pending action
        await supabaseFetch(`pending_bot_actions?id=eq.${actionId}`, { method: 'DELETE' });

        const depLines = Object.entries(deposits)
          .map(([name, amt]) => `• <b>${name}</b>: ৳${amt}`)
          .join('\n');

        const confirmedText = `✅ <b>Deposits Saved Successfully!</b>\n\n📅 <b>${dateStr}</b>\n${depLines}\n\n<i>Updated on Ami Bachelor.</i>`;
        await editTelegramMessage(chatId, messageId, confirmedText);
        return;
      }
    } catch (e: any) {
      console.error('Error applying action:', e);
      await editTelegramMessage(chatId, messageId, `⚠️ <b>Error:</b> ${e.message}`);
    }
    return;
  }
}

async function handleMessage(msg: any) {
  const chatId = msg.chat?.id;
  const text = (msg.text || '').trim();
  const chatTitle = msg.chat?.title || msg.from?.first_name || 'Personal Chat';

  if (!chatId || !text) return;

  // 1. Command /start
  if (text.startsWith('/start')) {
    const welcome = `👋 <b>Welcome to Ami Bachelor Bot!</b>\n\nI can help you record daily meals and member deposits directly into your hostel sheet without opening the website.\n\n<b>How to connect:</b>\n1. Open your <b>Ami Bachelor Web App</b>.\n2. Go to <b>Manage Flatmates / Manage Hostel</b>.\n3. Look for <b>Telegram Bot Code</b> (e.g. <code>TG-XXXXXX</code>).\n4. Type here:\n<code>/link TG-XXXXXX</code>\n\nOnce linked, just send your meal updates naturally!`;
    await sendTelegramMessage(chatId, welcome);
    return;
  }

  // 2. Command /link <CODE>
  if (text.startsWith('/link')) {
    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      await sendTelegramMessage(chatId, '⚠️ Please provide your Telegram Link Code.\nExample: <code>/link TG-123456</code>');
      return;
    }
    const code = parts[1].trim().toUpperCase();

    // Query hostel with this telegram_link_code
    const hostelRes = await supabaseFetch(`hostels?telegram_link_code=eq.${code}`);
    const hostels: any[] = await hostelRes.json();

    if (!hostels || hostels.length === 0) {
      await sendTelegramMessage(chatId, `❌ <b>Invalid or expired code:</b> <code>${code}</code>\nPlease check your <b>Manage Hostel</b> section in the Ami Bachelor app.`);
      return;
    }

    const hostel = hostels[0];

    // Store in telegram_connections table
    await supabaseFetch('telegram_connections', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        hostel_id: hostel.id,
        chat_id: String(chatId),
        chat_title: chatTitle,
        linked_by: msg.from?.username || msg.from?.first_name || 'Manager'
      })
    });

    await sendTelegramMessage(
      chatId,
      `🎉 <b>Successfully Connected!</b>\n\n🏢 <b>Hostel:</b> ${hostel.name}\n\nYou can now send meal updates anytime, like:\n• <code>meal 5- nur 1, ajmain 1, tanvir 2</code>\n• <code>5 traikh nur 1 meal,ajmain 2 ,tanvir 1 meal,baki sobai 0</code>\n• <code>deposit nur 1500, ajmain 2000</code>`
    );
    return;
  }

  // 3. Find connected hostel for this chat
  const connRes = await supabaseFetch(`telegram_connections?chat_id=eq.${chatId}`);
  const conns: any[] = await connRes.json();

  if (!conns || conns.length === 0) {
    await sendTelegramMessage(
      chatId,
      `⚠️ <b>This chat is not connected to any hostel yet.</b>\n\nPlease find your <b>Telegram Link Code</b> in the Ami Bachelor app (under <i>Manage Flatmates</i>) and send:\n<code>/link YOUR-CODE</code>`
    );
    return;
  }

  const hostelId = conns[0].hostel_id;

  // Fetch the latest active month for this hostel
  const monthRes = await supabaseFetch(`months?hostel_id=eq.${hostelId}&order=created_at.desc&limit=1`);
  const months: any[] = await monthRes.json();

  if (!months || months.length === 0) {
    await sendTelegramMessage(chatId, '⚠️ No active month found for your hostel. Please create a month in the web app first.');
    return;
  }

  const activeMonth = months[0];

  // Fetch roommates for this month
  const roomRes = await supabaseFetch(`roommates?month_id=eq.${activeMonth.id}`);
  const roommates: any[] = await roomRes.json();
  const roommateNames = (roommates || []).map((r: any) => r.name);

  if (roommateNames.length === 0) {
    await sendTelegramMessage(chatId, '⚠️ No flatmates found in your hostel month. Please add flatmates first.');
    return;
  }

  // Check if message is a Deposit message
  const depositParsed = parseDepositMessage(text, roommateNames);
  if (depositParsed) {
    await promptDepositConfirmation(chatId, activeMonth.id, depositParsed);
    return;
  }

  // Check if message is a Meal message
  const mealParsed = parseMealMessage(text, roommateNames);
  if (mealParsed) {
    await promptMealConfirmation(chatId, activeMonth.id, mealParsed);
    return;
  }

  // If message doesn't match, give a friendly hint
  await sendTelegramMessage(
    chatId,
    `🤔 <i>I couldn't quite understand that update.</i>\n\n<b>Try sending like this:</b>\n• <code>meal 5- nur 1, ajmain 1, tanvir 2</code>\n• <code>5 traikh nur 1 meal,ajmain 2,tanvir 1 meal,baki sobai 0</code>\n• <code>ajker meal: nur 2, tanvir 1</code>\n• <code>deposit nur 1500, ajmain 2000</code>\n\n<b>Flatmates recognized:</b> ${roommateNames.join(', ')}`
  );
}

async function promptMealConfirmation(chatId: string | number, monthId: string, parsed: ParsedMealEntry) {
  const mealLines = Object.entries(parsed.meals)
    .map(([name, count]) => `• <b>${name}</b>: ${count} meal(s)`)
    .join('\n');

  const messageText = `🍽️ <b>Daily Meal Update Check</b>\n\n📅 <b>${parsed.displayDate}</b>\n\n${mealLines}\n\n<b>Total Meals:</b> ${parsed.totalMeals}\n\n<i>Is this correct? Click below to confirm and update the sheet:</i>`;

  // Store action in pending_bot_actions table
  const insertRes = await supabaseFetch('pending_bot_actions', {
    method: 'POST',
    body: JSON.stringify({
      type: 'meal',
      month_id: monthId,
      date: parsed.dateStr,
      payload: parsed.meals
    })
  });
  const inserted: any[] = await insertRes.json();
  const actionId = inserted?.[0]?.id;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '✅ Correct, Send', callback_data: `act:${actionId}` },
        { text: '❌ Cancel', callback_data: 'cancel' }
      ]
    ]
  };

  await sendTelegramMessage(chatId, messageText, replyMarkup);
}

async function promptDepositConfirmation(chatId: string | number, monthId: string, parsed: ParsedDepositEntry) {
  const depLines = Object.entries(parsed.deposits)
    .map(([name, amount]) => `• <b>${name}</b>: ৳${amount}`)
    .join('\n');

  const messageText = `💰 <b>Member Deposit Check</b>\n\n📅 <b>${parsed.displayDate}</b>\n\n${depLines}\n\n<b>Total Deposit:</b> ৳${parsed.totalAmount}\n\n<i>Is this correct? Click below to record deposit:</i>`;

  const insertRes = await supabaseFetch('pending_bot_actions', {
    method: 'POST',
    body: JSON.stringify({
      type: 'deposit',
      month_id: monthId,
      date: parsed.dateStr,
      payload: parsed.deposits
    })
  });
  const inserted: any[] = await insertRes.json();
  const actionId = inserted?.[0]?.id;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '✅ Correct, Deposit', callback_data: `act:${actionId}` },
        { text: '❌ Cancel', callback_data: 'cancel' }
      ]
    ]
  };

  await sendTelegramMessage(chatId, messageText, replyMarkup);
}
