import { parseMealMessage, parseBazarExpenseMessage, type ParsedMealEntry, type ParsedExpenseEntry } from './lib/telegramMealParser';

interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

const BOT_TOKEN = '9015872115:AAGEvGkOXljmZipHED4slkoYzORxbXrC9lI';
const SUPABASE_URL = 'https://krxvrfiflyryvjjlyore.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyeHZyZmlmbHlyeXZqamx5b3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODI4NDUsImV4cCI6MjEwNzY1ODg0NX0.Z0OcRPcp9Gzw6_iSHBJpcHtNq6Z3kZbrHS1AHhvfC5s';

// Always-visible Reply Keyboard at the bottom of the chat
const MAIN_REPLY_KEYBOARD = {
  keyboard: [
    [
      { text: '🍽️ Record Meals' },
      { text: '💰 Deposit / Expense' }
    ],
    [
      { text: '🔄 Restart' }
    ]
  ],
  resize_keyboard: true,
  is_persistent: true
};

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup || MAIN_REPLY_KEYBOARD
  };

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

    // Telegram Webhook Endpoint
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
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Health check endpoint
    if (url.pathname === '/api/telegram-status') {
      return new Response(JSON.stringify({ status: 'active', bot: '@Amibachelorbot' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Static Assets fallback
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Ami Bachelor API running', { status: 200 });
  }
};

async function handleTelegramUpdate(update: any) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

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
    // Clear user session if any
    await supabaseFetch(`telegram_user_sessions?chat_id=eq.${chatId}`, { method: 'DELETE' });
    await answerCallbackQuery(callbackId, 'Cancelled');
    await editTelegramMessage(chatId, messageId, '❌ <b>Action cancelled.</b> No changes were made.');
    return;
  }

  // Ready Button: Mode Selection (Meal or Deposit)
  if (data === 'mode:meal') {
    await answerCallbackQuery(callbackId, 'Meal update mode selected');
    // Set session state explicitly to awaiting_meal_text
    await supabaseFetch('telegram_user_sessions', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        chat_id: String(chatId),
        state: 'awaiting_meal_text',
        category: null,
        updated_at: new Date().toISOString()
      })
    });
    const text = `🍽️ <b>Meal Update Mode Active</b>\n\nPlease send your meal update text, for example:\n• <code>meal 5- nur 1, ajmain 1, tanvir 2</code>\n• <code>5 traikh nur 1 meal,ajmain 2 ,tanvir 1 meal,baki sobai 0</code>\n• <code>ajker meal nur 2, tanvir 1</code>`;
    await editTelegramMessage(chatId, messageId, text);
    return;
  }

  if (data === 'mode:deposit') {
    await answerCallbackQuery(callbackId, 'Please choose deposit category');
    const categoryMarkup = {
      inline_keyboard: [
        [
          { text: '🏦 Account (Fixed Cost)', callback_data: 'cat:Account' },
          { text: '🍚 Meal (Personal)', callback_data: 'cat:Meal' },
        ],
        [
          { text: '🛒 Grocery / Bazar', callback_data: 'cat:Grocery' },
          { text: '❌ Cancel', callback_data: 'cancel' }
        ]
      ]
    };
    const text = `💰 <b>Deposit / Expense Entry</b>\n\nPlease select the transaction category:`;
    await editTelegramMessage(chatId, messageId, text, categoryMarkup);
    return;
  }

  // Category Selected: "cat:Account" | "cat:Meal" | "cat:Grocery"
  if (data.startsWith('cat:')) {
    const category = data.substring(4) as 'Account' | 'Meal' | 'Grocery';
    await answerCallbackQuery(callbackId, `Category: ${category}`);

    // Save session in telegram_user_sessions
    await supabaseFetch('telegram_user_sessions', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        chat_id: String(chatId),
        state: 'awaiting_deposit_text',
        category: category,
        updated_at: new Date().toISOString()
      })
    });

    const categoryLabel = category === 'Account' ? 'Account (Fixed Cost)' : (category === 'Meal' ? 'Meal (Personal)' : 'Grocery');
    const ruleNote = category !== 'Grocery'
      ? `\n⚠️ <i>Note: For <b>${categoryLabel}</b>, Paid By must be a roommate name (cannot be Group Meal fund).</i>`
      : `\n💡 <i>Note: For Grocery, Paid By can be a roommate or Group Meal fund.</i>`;

    const promptText = `📝 <b>Category Selected: ${categoryLabel}</b>\n\nPlease send your deposit / bazar breakdown message. Example:\n\n<code>ajmain - Sim 70\nBegun 45\nAlu 50\nSosa:25\nTotal 190</code>${ruleNote}`;

    await editTelegramMessage(chatId, messageId, promptText, {
      inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]]
    });
    return;
  }

  // Confirm Action via pending_bot_actions table
  if (data.startsWith('act:')) {
    const actionId = data.substring(4);
    await answerCallbackQuery(callbackId, 'Saving to database...');

    try {
      const actRes = await supabaseFetch(`pending_bot_actions?id=eq.${actionId}`);
      const actions: any[] = await actRes.json();

      if (!actions || actions.length === 0) {
        await editTelegramMessage(chatId, messageId, '⚠️ <b>Expired:</b> Confirmation expired. Please send the message again.');
        return;
      }

      const action = actions[0];

      // Check if hostel bot is still enabled
      const monthRes = await supabaseFetch(`months?id=eq.${action.month_id}`);
      const months: any[] = await monthRes.json();
      if (months && months[0]?.hostel_id) {
        const hostelRes = await supabaseFetch(`hostels?id=eq.${months[0].hostel_id}`);
        const hostels: any[] = await hostelRes.json();
        if (hostels && hostels[0]?.bot_enabled === false) {
          await editTelegramMessage(chatId, messageId, '⚠️ <b>Bot Disabled:</b> Telegram bot is disabled for this hostel by Super Admin.\nContact <b>@nurhasan4421</b> to unlock.');
          return;
        }
      }

      // Meal Action
      if (action.type === 'meal') {
        const monthId = action.month_id;
        const dateStr = action.date;
        const meals = action.payload;

        const checkRes = await supabaseFetch(`daily_meals?month_id=eq.${monthId}&date=eq.${dateStr}`);
        const existingMeals: any[] = await checkRes.json();

        let finalMeals = { ...meals };
        if (existingMeals && existingMeals.length > 0) {
          // Replace with the newly confirmed input (or update keys)
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

        await supabaseFetch(`pending_bot_actions?id=eq.${actionId}`, { method: 'DELETE' });
        await supabaseFetch(`telegram_user_sessions?chat_id=eq.${chatId}`, { method: 'DELETE' });

        const mealLines = Object.entries(finalMeals)
          .map(([name, count]) => `• <b>${name}</b>: ${count} meal(s)`)
          .join('\n');

        const isUpdatedNotice = existingMeals && existingMeals.length > 0
          ? `\n<i>(Updated previous entry for this date)</i>\n`
          : '';

        const confirmedText = `✅ <b>Meals Saved Successfully!</b>\n\n📅 <b>${dateStr}</b>${isUpdatedNotice}\n${mealLines}\n\n<i>Updated on Ami Bachelor.</i>`;
        await editTelegramMessage(chatId, messageId, confirmedText);
        return;
      }

      // Expense / Deposit 4-field Action
      if (action.type === 'expense') {
        const monthId = action.month_id;
        const dateStr = action.date;
        const { category, paidBy, amount, description } = action.payload;

        await supabaseFetch('expenses', {
          method: 'POST',
          body: JSON.stringify({
            month_id: monthId,
            category,
            paidBy,
            amount,
            description,
            date: dateStr
          })
        });

        // Also if category is 'Meal' or 'Account' and paidBy is a person, log into food_deposits for accounting continuity
        if (category === 'Meal' || category === 'Account') {
          await supabaseFetch('food_deposits', {
            method: 'POST',
            body: JSON.stringify({
              month_id: monthId,
              person: paidBy,
              amount,
              date: dateStr
            })
          });
        }

        await supabaseFetch(`pending_bot_actions?id=eq.${actionId}`, { method: 'DELETE' });
        await supabaseFetch(`telegram_user_sessions?chat_id=eq.${chatId}`, { method: 'DELETE' });

        const confirmedText = `✅ <b>Transaction Saved Successfully!</b>\n\n📁 <b>Category:</b> ${category}\n👤 <b>Paid By:</b> ${paidBy}\n💰 <b>Amount:</b> ৳${amount}\n📅 <b>Date:</b> ${dateStr}\n\n<i>Recorded in expenses & account sheets.</i>`;
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

  // 0. Restart / Refresh Command or Bottom Button
  if (
    text.startsWith('/restart') ||
    text.startsWith('/refresh') ||
    text.startsWith('/reset') ||
    text === '🔄 Restart' ||
    text === 'Restart'
  ) {
    await supabaseFetch(`telegram_user_sessions?chat_id=eq.${chatId}`, { method: 'DELETE' });
    const restartMsg = `🔄 <b>Bot Refreshed & Ready!</b>\n\nAll pending modes and sessions have been cleared.\nChoose an option below or send your update directly:`;
    await sendTelegramMessage(chatId, restartMsg, MAIN_REPLY_KEYBOARD);
    return;
  }

  // 0.1 Bot Reset Command: Disconnect current connected hostel
  if (text.startsWith('/botreset') || text.startsWith('/disconnect') || text.startsWith('/unlink')) {
    await supabaseFetch(`telegram_connections?chat_id=eq.${chatId}`, { method: 'DELETE' });
    await supabaseFetch(`telegram_user_sessions?chat_id=eq.${chatId}`, { method: 'DELETE' });
    await sendTelegramMessage(
      chatId,
      `🔌 <b>Hostel Disconnected Successfully!</b>\n\nThis Telegram chat has been unlinked from your hostel.\n\nTo connect to a hostel again, get your Telegram Link Code from the app and send:\n<code>/link TG-XXXXXX</code>`,
      MAIN_REPLY_KEYBOARD
    );
    return;
  }

  // 1. Command /start or /menu
  if (text.startsWith('/start') || text.startsWith('/menu')) {
    const welcome = `👋 <b>Welcome to Ami Bachelor Bot!</b>\n\nUse the buttons below to record meals or expenses:`;
    await sendTelegramMessage(chatId, welcome, MAIN_REPLY_KEYBOARD);
    return;
  }

  // 2. Command /link <CODE>, /link@bot <CODE>, or direct code entry like TG-XXXXXX / XXXXXX
  const cleanText = text.trim();
  const directMatch = cleanText.match(/\b(TG-[A-Z0-9]{6})\b/i) || cleanText.match(/^([A-Z0-9]{6})$/i);
  const isLinkCommand = /^\/link(@[a-zA-Z0-9_]+)?\b/i.test(cleanText);

  if (isLinkCommand || directMatch) {
    let rawCode = '';
    if (isLinkCommand) {
      const parts = cleanText.split(/\s+/);
      if (parts.length < 2) {
        await sendTelegramMessage(chatId, '⚠️ Please provide your Telegram Link Code.\nExample: <code>/link TG-XXXXXX</code>');
        return;
      }
      rawCode = parts[1].trim();
    } else if (directMatch) {
      rawCode = directMatch[1];
    }

    let code = rawCode.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    // Auto prepend 'TG-' if user omitted it
    if (!code.startsWith('TG-') && code.length === 6) {
      code = `TG-${code}`;
    }

    const hostelRes = await supabaseFetch(`hostels?telegram_link_code=eq.${code}`);
    const hostels: any[] = await hostelRes.json();

    if (!hostels || hostels.length === 0) {
      await sendTelegramMessage(chatId, `❌ <b>Invalid or expired code:</b> <code>${code}</code>\nPlease check your <b>Settings & History</b> section in the Ami Bachelor app.`);
      return;
    }

    const hostel = hostels[0];

    // Check if bot is disabled by Super Admin for this hostel
    if (hostel.bot_enabled === false) {
      await sendTelegramMessage(
        chatId,
        `⚠️ <b>Bot Locked for this Hostel:</b>\n\nTelegram Bot is not unlocked for <b>${hostel.name}</b>.\n\nPlease contact <b>@nurhasan4421</b> to unlock bot access.`
      );
      return;
    }

    // Save or update connection
    await supabaseFetch(`telegram_connections?chat_id=eq.${chatId}`, { method: 'DELETE' });
    await supabaseFetch('telegram_connections', {
      method: 'POST',
      body: JSON.stringify({
        hostel_id: hostel.id,
        chat_id: String(chatId),
        chat_title: chatTitle,
        linked_by: msg.from?.username || msg.from?.first_name || 'Manager'
      })
    });

    await sendTelegramMessage(
      chatId,
      `🎉 <b>Successfully Connected!</b>\n\n🏢 <b>Hostel:</b> ${hostel.name}\n\nUse the buttons below to record daily meals or expenses anytime:`,
      MAIN_REPLY_KEYBOARD
    );
    return;
  }

  // 3. Find connected hostel for this chat
  const connRes = await supabaseFetch(`telegram_connections?chat_id=eq.${chatId}`);
  const conns: any[] = await connRes.json();

  if (!conns || conns.length === 0) {
    await sendTelegramMessage(
      chatId,
      `⚠️ <b>This chat is not connected to any hostel yet.</b>\n\nPlease get your <b>Telegram Link Code</b> from the Ami Bachelor app (under <i>Settings & History</i>) and send:\n<code>/link YOUR-CODE</code>`
    );
    return;
  }

  const hostelId = conns[0].hostel_id;

  // Check if hostel exists and bot is enabled
  const hostelRes = await supabaseFetch(`hostels?id=eq.${hostelId}`);
  const hostels: any[] = await hostelRes.json();
  if (!hostels || hostels.length === 0) {
    // Stale connection (hostel deleted or not found)
    await supabaseFetch(`telegram_connections?chat_id=eq.${chatId}`, { method: 'DELETE' });
    await sendTelegramMessage(
      chatId,
      `⚠️ <b>Connection Expired:</b> This hostel connection is no longer valid. Please reconnect using <code>/link YOUR-CODE</code>.`
    );
    return;
  }

  if (hostels[0]?.bot_enabled === false) {
    await sendTelegramMessage(
      chatId,
      `⚠️ <b>Telegram Bot is Disabled:</b>\nThis hostel's bot feature has been turned off by Super Admin.\n\nPlease contact <b>@nurhasan4421</b> to unlock.`
    );
    return;
  }

  // Fetch active month for this hostel
  const monthRes = await supabaseFetch(`months?hostel_id=eq.${hostelId}&order=created_at.desc&limit=1`);
  const months: any[] = await monthRes.json();

  if (!months || months.length === 0) {
    await sendTelegramMessage(chatId, '⚠️ No active month found for your hostel. Please create a month in the web app first.');
    return;
  }

  const activeMonth = months[0];

  // Fetch roommates
  const roomRes = await supabaseFetch(`roommates?month_id=eq.${activeMonth.id}`);
  const roommates: any[] = await roomRes.json();
  const roommateNames = (roommates || []).map((r: any) => r.name);

  if (roommateNames.length === 0) {
    await sendTelegramMessage(chatId, '⚠️ No flatmates found in your hostel month. Please add flatmates first.');
    return;
  }

  // 4. Handle bottom keyboard button taps: "🍽️ Record Meals" or "💰 Deposit / Expense"
  if (text === '🍽️ Record Meals' || text.startsWith('/meal')) {
    // Set active session for meal text
    await supabaseFetch('telegram_user_sessions', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        chat_id: String(chatId),
        state: 'awaiting_meal_text',
        category: null,
        updated_at: new Date().toISOString()
      })
    });
    const promptMeal = `🍽️ <b>Meal Update Mode Active</b>\n\nPlease send your meal update text, for example:\n• <code>meal 5- nur 1, ajmain 1, tanvir 2</code>\n• <code>5 traikh nur 1 meal,ajmain 2 ,tanvir 1 meal,baki sobai 0</code>\n• <code>ajker meal nur 2, tanvir 1</code>`;
    await sendTelegramMessage(chatId, promptMeal);
    return;
  }

  if (text === '💰 Deposit / Expense' || text.startsWith('/deposit')) {
    const categoryMarkup = {
      inline_keyboard: [
        [
          { text: '🏦 Account (Fixed Cost)', callback_data: 'cat:Account' },
          { text: '🍚 Meal (Personal)', callback_data: 'cat:Meal' },
        ],
        [
          { text: '🛒 Grocery / Bazar', callback_data: 'cat:Grocery' },
          { text: '❌ Cancel', callback_data: 'cancel' }
        ]
      ]
    };
    const promptDeposit = `💰 <b>Deposit / Expense Entry</b>\n\nPlease select the transaction category:`;
    await sendTelegramMessage(chatId, promptDeposit, categoryMarkup);
    return;
  }

  // 5. Check active user session
  const sessionRes = await supabaseFetch(`telegram_user_sessions?chat_id=eq.${chatId}`);
  const sessions: any[] = await sessionRes.json();
  const currentSession = sessions?.[0];

  // If session is awaiting deposit text
  if (currentSession && currentSession.state === 'awaiting_deposit_text') {
    const selectedCategory: 'Account' | 'Meal' | 'Grocery' = currentSession.category || 'Grocery';
    const parsedExpense = parseBazarExpenseMessage(text, roommateNames, selectedCategory);

    if (parsedExpense) {
      if (selectedCategory !== 'Grocery' && parsedExpense.paidBy.toLowerCase() === 'meal') {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Rule Violation:</b> For category <b>${selectedCategory}</b>, "Paid By" cannot be Meal (group fund). It must be a specific flatmate name (e.g. ${roommateNames.slice(0, 3).join(', ')}).\n\nPlease send the message again with a flatmate's name.`
        );
        return;
      }

      await promptExpenseConfirmation(chatId, activeMonth.id, parsedExpense);
      return;
    }
  }

  // If session is explicitly awaiting meal text
  if (currentSession && currentSession.state === 'awaiting_meal_text') {
    const mealParsed = parseMealMessage(text, roommateNames);
    if (mealParsed) {
      await promptMealConfirmation(chatId, activeMonth.id, mealParsed);
      return;
    }
  }

  // 6. Intelligent automatic parsing: prioritize Meal first if meal keywords or roommate pattern detected
  const isExplicitMealText = /\b(meal|mil|meals|khabar|kheyeche|traikh|tarikh)\b/i.test(text);
  const mealParsed = parseMealMessage(text, roommateNames);

  if (isExplicitMealText && mealParsed) {
    await promptMealConfirmation(chatId, activeMonth.id, mealParsed);
    return;
  }

  // 7. Try parsing as Bazar / Deposit if text looks like a deposit or has multi-line / total / expense keywords
  const isDepositIntent = /\b(deposit|joma|payment|taka|tk|total|mot|bazar|sim|begun|alu|mach|mangsho|dim)\b/i.test(text) || text.includes('\n');
  if (isDepositIntent) {
    let detectedCategory: 'Account' | 'Meal' | 'Grocery' = 'Grocery';
    if (/\b(account|fixed|rent|wifi|gas|current|bua)\b/i.test(text)) {
      detectedCategory = 'Account';
    } else if (/\b(meal\s*deposit|meal\s*personal|personal\s*meal)\b/i.test(text)) {
      detectedCategory = 'Meal';
    }

    const parsedExpense = parseBazarExpenseMessage(text, roommateNames, detectedCategory);
    if (parsedExpense) {
      if (detectedCategory !== 'Grocery' && parsedExpense.paidBy.toLowerCase() === 'meal') {
        parsedExpense.paidBy = roommateNames[0] || 'Manager';
      }
      await promptExpenseConfirmation(chatId, activeMonth.id, parsedExpense);
      return;
    }
  }

  // 8. Fallback to Meal parsed if detected
  if (mealParsed) {
    await promptMealConfirmation(chatId, activeMonth.id, mealParsed);
    return;
  }

  // 9. If unclear, prompt user
  await sendTelegramMessage(
    chatId,
    `🤔 <i>I didn't recognize that format.</i>\n\nPlease tap <b>🍽️ Record Meals</b> or <b>💰 Deposit / Expense</b> below, or tap <b>🔄 Restart</b> to refresh.`
  );
}

async function promptMealConfirmation(chatId: string | number, monthId: string, parsed: ParsedMealEntry) {
  // Check if meal history already exists for this date
  const checkRes = await supabaseFetch(`daily_meals?month_id=eq.${monthId}&date=eq.${parsed.dateStr}`);
  const existingRows: any[] = await checkRes.json();
  const hasExisting = existingRows && existingRows.length > 0 && existingRows[0]?.meals;

  let existingSummary = '';
  let buttonLabel = '✅ Correct, Send';

  if (hasExisting) {
    buttonLabel = '⚠️ Yes, Overwrite Entry';
    const oldEntries = Object.entries(existingRows[0].meals)
      .map(([name, count]) => `${name}: ${count}`)
      .join(', ');

    existingSummary = `\n⚠️ <b>Meal already updated on this date!</b>\n<i>Previous entry:</i> <code>${oldEntries || 'Recorded'}</code>\n<i>Your new input will overwrite the previous entry.</i>\n`;
  }

  const mealLines = Object.entries(parsed.meals)
    .map(([name, count]) => `• <b>${name}</b>: ${count} meal(s)`)
    .join('\n');

  const dateNotice = !parsed.hasExplicitDate
    ? `📅 <b>${parsed.displayDate}</b> <i>(Today - default)</i>`
    : `📅 <b>${parsed.displayDate}</b>`;

  const messageText = `🍽️ <b>Daily Meal Update Check</b>\n\n${dateNotice}${existingSummary}\n\n<b>New Input:</b>\n${mealLines}\n\n<b>Total Meals:</b> ${parsed.totalMeals}\n\n<i>${hasExisting ? 'Meal already exists on this date. Click below to confirm overwrite:' : 'Is this correct? Click below to confirm and update the sheet:'}</i>`;

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
        { text: buttonLabel, callback_data: `act:${actionId}` },
        { text: '❌ Cancel (Keep Previous)', callback_data: 'cancel' }
      ]
    ]
  };

  await sendTelegramMessage(chatId, messageText, replyMarkup);
}

async function promptExpenseConfirmation(chatId: string | number, monthId: string, parsed: ParsedExpenseEntry) {
  let calculationNote = '';
  if (parsed.isAmountMismatch) {
    calculationNote = `\n⚠️ <b>Calculation Notice:</b>\nStated Total: ৳${parsed.statedAmount} | Item Sum: ৳${parsed.calculatedAmount}\nUsing stated total: <b>৳${parsed.amount}</b>\n`;
  } else {
    calculationNote = `\n✅ <i>Sum verified: Items total exactly ৳${parsed.amount}</i>\n`;
  }

  const descPreview = parsed.description.length > 250
    ? parsed.description.substring(0, 245) + '...'
    : parsed.description;

  const messageText = `💰 <b>Deposit / Expense Check</b>\n\n📁 <b>Category:</b> ${parsed.category}\n👤 <b>Paid By:</b> ${parsed.paidBy}\n💵 <b>Amount:</b> ৳${parsed.amount}${calculationNote}\n📅 <b>Date:</b> ${parsed.displayDate}\n\n📝 <b>Description:</b>\n<pre>${descPreview}</pre>\n\n<i>Is this correct? Click below to record in expenses sheet:</i>`;

  const insertRes = await supabaseFetch('pending_bot_actions', {
    method: 'POST',
    body: JSON.stringify({
      type: 'expense',
      month_id: monthId,
      date: parsed.dateStr,
      payload: {
        category: parsed.category,
        paidBy: parsed.paidBy,
        amount: parsed.amount,
        description: parsed.description
      }
    })
  });
  const inserted: any[] = await insertRes.json();
  const actionId = inserted?.[0]?.id;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '✅ Correct, Submit', callback_data: `act:${actionId}` },
        { text: '❌ Cancel', callback_data: 'cancel' }
      ]
    ]
  };

  await sendTelegramMessage(chatId, messageText, replyMarkup);
}
