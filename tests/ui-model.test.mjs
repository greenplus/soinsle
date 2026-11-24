import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE, counts, evaluate } from '../core.mjs';
import { addToken, canAddOperator, draftRole, shareText, xPostUrl } from '../ui-model.mjs';

function tap(expression, remaining) {
  return [...expression].reduce((draft, token) => addToken(draft, token, remaining), []);
}
test('card and operator taps complete successive rows without text fields', () => {
  const first = tap('38=2×A9', counts([...SAMPLE]));
  const partial = evaluate(SAMPLE, [draftRole(first)]);
  assert.equal(partial.score, 45);
  const second = tap('58A=7×83', partial.remaining);
  const next = evaluate(SAMPLE, [draftRole(first), draftRole(second)]);
  const third = tap('AK3=J×T3', next.remaining);
  const complete = evaluate(SAMPLE, [draftRole(first), draftRole(second), draftRole(third)]);
  assert.equal(complete.complete, true);
  assert.equal(complete.score, 159);
});
test('operator controls prevent a second equals, empty factors and nested powers', () => {
  assert.equal(canAddOperator([], '='), false);
  assert.equal(canAddOperator(['3', '8'], '×'), false);
  assert.equal(canAddOperator(['3', '8', '='], '×'), false);
  assert.equal(canAddOperator([... '256=2^8'], '^'), false);
  assert.equal(canAddOperator([... '256=2^8×3'], '^'), true);
  assert.equal(canAddOperator([... '38=2'], '='), false);
});
test('draft selection cannot spend a consumed or already selected card', () => {
  const partial = evaluate(SAMPLE, [{ left:'38', right:'2×A9' }]);
  assert.throws(() => tap('2', partial.remaining));
  assert.throws(() => tap('8888', counts([...SAMPLE])));
  const tokens = tap('38=2×A9', counts([...SAMPLE]));
  const backed = tokens.slice(0, -1);
  assert.deepEqual(addToken(backed, '9', counts([...SAMPLE])), tokens);
});
test('power button and exponent card consume five cards', () => {
  const hand = '22568';
  const draft = tap('256=2^8', counts([...hand]));
  const result = evaluate(hand, [draftRole(draft)]);
  assert.equal(result.complete, true);
  assert.equal(result.score, 45);
});
test('X composer carries exactly the copy text, without revealing solution formulas', () => {
  const result = evaluate(SAMPLE, [{left:'38',right:'2×A9'}]);
  const text = shareText({mode:'daily',day:'2026-11-24',...result,url:'https://greenplus.github.io/soinsle/'});
  const intent = new URL(xPostUrl(text));
  assert.equal(intent.origin, 'https://twitter.com');
  assert.equal(intent.pathname, '/intent/tweet');
  assert.equal(intent.searchParams.get('text'), text);
  assert.match(text, /45点 \/ 5枚 \/ 1手/);
  assert.doesNotMatch(text, /2×A9|17枚使い切り/);
});
