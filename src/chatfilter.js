// Roblox-style chat filtering: blocked words (and personal info such as phone numbers,
// e-mail addresses and links) are replaced with one # per character.
const WORDS = [
  'fuck', 'fucking', 'fucker', 'fck', 'fuk', 'shit', 'shitty', 'bitch', 'bitches', 'asshole', 'dick', 'dicks', 'cock', 'pussy', 'cunt',
  'bastard', 'slut', 'whore', 'fag', 'faggot', 'retard', 'retarded', 'porn', 'sex', 'sexy', 'nude', 'nudes', 'naked', 'penis', 'vagina',
  'boobs', 'tits', 'horny', 'rape', 'kys', 'nazi', 'wtf', 'stfu', 'discord', 'snapchat', 'instagram', 'tiktok',
];
const STEMS = ['nigg', 'n1gg', 'kill yourself', 'killyourself'];
const LEET = { a: '[a@4]', e: '[e3]', i: '[i1!]', o: '[o0]', s: '[s5$]', t: '[t7]' };
const pat = (w) => w.split('').map(ch => LEET[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\W_]*');
const WORD_RE = new RegExp(`\\b(${WORDS.map(pat).join('|')})\\b`, 'gi');
const STEM_RE = new RegExp(`(${STEMS.map(pat).join('|')})\\w*`, 'gi');
const INFO_RE = [
  /\b\S+@\S+\.\w+\b/g,                                  // e-mail
  /\b(?:https?:\/\/|www\.)\S+/gi,                       // links
  /\b\w+\.(?:com|net|org|gg|io|me|tv|xyz)\b\S*/gi,
  /\d(?:[\s.-]*\d){4,}/g,                               // phone numbers and other long numbers
];
const tag = (m) => m.replace(/\S/g, '#');

export function filterChat(text) {
  let t = String(text);
  for (const re of INFO_RE) t = t.replace(re, tag);
  return t.replace(WORD_RE, tag).replace(STEM_RE, tag);
}
