// Shared keyboard builders.
import { Keyboard } from 'grammy';
import { copy } from './copy.js';

/** A one-time reply keyboard whose single button shares the user's Telegram
 *  contact (their verified phone number) — no SMS/OTP needed. */
export function contactKeyboard(): Keyboard {
  return new Keyboard().requestContact(copy.shareContactButton).resized().oneTime();
}
