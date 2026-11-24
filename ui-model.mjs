import { RANKS } from './core.mjs';

export function canAddOperator(tokens, operator) {
  const lastIsCard = RANKS.includes(tokens.at(-1) ?? ' ');
  if (!lastIsCard) return false;
  const equals = tokens.indexOf('=');
  if (operator === '=') return equals < 0;
  if (equals < 0 || tokens.length === equals + 1) return false;
  if (operator === '×') return true;
  if (operator === '^') return !tokens.slice(Math.max(equals, tokens.lastIndexOf('×')) + 1).includes('^');
  return false;
}

export function addToken(tokens, token, remaining) {
  if (typeof token !== 'string' || token.length !== 1) throw Error('札または演算子を選んでください。');
  if (RANKS.includes(token) && token.length === 1) {
    const rank = RANKS.indexOf(token);
    if (tokens.filter(t => t === token).length >= remaining[rank]) throw Error(`${token}のカードが足りません。`);
  } else if (!canAddOperator(tokens, token)) {
    throw Error('札を並べ、合成数の後に＝、素因数の間に×を入れてください。');
  }
  return [...tokens, token];
}

export function draftRole(tokens) {
  const equals = tokens.indexOf('=');
  if (equals <= 0 || equals === tokens.length - 1) throw Error('手札と＝・×ボタンで、左右の式を作ってください。');
  return { left: tokens.slice(0, equals).join(''), right: tokens.slice(equals + 1).join('') };
}

export function roleTokens(role) { return [...role.left, '=', ...role.right]; }

export function shareText({ mode, day, score, used, roles, complete, url }) {
  return `soinsle ${mode === 'daily' ? day : '練習'}\n${score}点 / ${used}枚 / ${roles.length}手\n${roles.map(r => '🟩'.repeat(r.count)).join('\n') || '⬜'}\n${complete ? '17枚使い切り！\n' : ''}${url}`;
}

export function xPostUrl(text) {
  const url = new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text', text);
  return url.href;
}
