// Offline grammY test harness: build the real bot with a fake botInfo (no getMe
// network call), intercept every outgoing API call with a transformer that records
// it and returns a plausible result, and fabricate incoming updates. No token, no
// network, no Telegram — pure handler behaviour under assertion.
import type { Bot } from 'grammy';
import type { Update, User, UserFromGetMe } from 'grammy/types';
import type { BotContext } from '../src/bot/context.js';

export const BOT_INFO: UserFromGetMe = {
  id: 999,
  is_bot: true,
  first_name: 'TestBot',
  username: 'test_bot',
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  can_manage_bots: false,
  supports_join_request_queries: false,
};

export interface OutgoingCall {
  method: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

let msgSeq = 1000;

function fakeResult(method: string, payload: { chat_id?: number | string }): unknown {
  switch (method) {
    case 'sendMessage':
    case 'sendPhoto':
    case 'sendDocument':
    case 'editMessageText':
    case 'copyMessage':
      return { message_id: ++msgSeq, date: 0, chat: { id: payload?.chat_id ?? 0, type: 'private' } };
    case 'createChatInviteLink':
      return {
        invite_link: 'https://t.me/+FAKEINVITE',
        creator: BOT_INFO,
        creates_join_request: false,
        is_primary: false,
        is_revoked: false,
      };
    case 'getChatMember':
      return { status: 'member', user: BOT_INFO };
    default:
      return true;
  }
}

/** Install the recording transformer; returns the array calls accumulate into. */
export function recordOutgoing(bot: Bot<BotContext>): OutgoingCall[] {
  const calls: OutgoingCall[] = [];
  bot.api.config.use((_prev, method, payload) => {
    calls.push({ method, payload });
    return Promise.resolve({ ok: true, result: fakeResult(method, payload as never) } as never);
  });
  return calls;
}

let updateSeq = 1;

export function user(id: number, extra: Partial<User> = {}): User {
  return { id, is_bot: false, first_name: `User${id}`, ...extra };
}

function privateChat(u: User) {
  return { id: u.id, type: 'private' as const, first_name: u.first_name };
}

export function textUpdate(text: string, from: User = user(1)): Update {
  const message: Update['message'] = {
    message_id: ++msgSeq,
    date: Math.floor(Date.now() / 1000),
    chat: privateChat(from),
    from,
    text,
  };
  // grammY matches commands via a leading bot_command entity — add one for "/…".
  if (text.startsWith('/')) {
    const length = text.split(/\s/)[0]!.length;
    message.entities = [{ type: 'bot_command', offset: 0, length }];
  }
  return { update_id: updateSeq++, message };
}

export function contactUpdate(phone: string, from: User = user(1)): Update {
  return {
    update_id: updateSeq++,
    message: {
      message_id: ++msgSeq,
      date: Math.floor(Date.now() / 1000),
      chat: privateChat(from),
      from,
      contact: { phone_number: phone, first_name: from.first_name, user_id: from.id },
    },
  };
}

export function photoUpdate(fileId: string, from: User = user(1)): Update {
  return {
    update_id: updateSeq++,
    message: {
      message_id: ++msgSeq,
      date: Math.floor(Date.now() / 1000),
      chat: privateChat(from),
      from,
      photo: [{ file_id: fileId, file_unique_id: `${fileId}_u`, width: 800, height: 600 }],
    },
  };
}

export function callbackUpdate(data: string, from: User = user(1)): Update {
  return {
    update_id: updateSeq++,
    callback_query: {
      id: String(updateSeq),
      from,
      chat_instance: 'ci',
      data,
      message: {
        message_id: ++msgSeq,
        date: Math.floor(Date.now() / 1000),
        chat: privateChat(from),
        from: BOT_INFO as unknown as User,
      },
    },
  };
}
