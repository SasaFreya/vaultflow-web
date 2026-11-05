export type BalanceExpressionResult = { success: true; value: number } | { success: false; error: string };

/** Addition/subtraction in integer cents. No eval, executable input or binary floating-point arithmetic. */
export function calculateBalanceExpression(raw: string): BalanceExpressionResult {
  const text = raw.replace(/＋/g, '+').replace(/[−－]/g, '-').replace(/\s/g, '');
  if (!text) return { success: false, error: '请填写余额' };
  if (text.length > 300 || /[^\d.+\-()]/.test(text)) return { success: false, error: '支持数字、加减号和括号，例如 1000+200-35.5' };
  let index = 0;
  let depth = 0;
  const limit = BigInt(Number.MAX_SAFE_INTEGER);
  const checked = (value: bigint) => { if (value > limit || value < -limit) throw new Error('金额过大'); return value; };
  const term = (): bigint => {
    let sign = 1n;
    if (text[index] === '+' || text[index] === '-') { if (text[index++] === '-') sign = -1n; }
    if (text[index] === '(') {
      if (++depth > 20) throw new Error('括号过多');
      index++;
      const value = expression();
      if (text[index++] !== ')') throw new Error('请补全括号');
      depth--;
      return checked(sign * value);
    }
    const match = /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})/.exec(text.slice(index));
    if (!match) throw new Error('算式未完成，请在加减号后填写金额');
    index += match[0].length;
    const [whole, fraction = ''] = match[0].split('.');
    return checked(sign * (BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0'))));
  };
  const expression = (): bigint => {
    let value = term();
    while (text[index] === '+' || text[index] === '-') {
      const operator = text[index++];
      const operand = term();
      value = checked(operator === '+' ? value + operand : value - operand);
    }
    return value;
  };
  try {
    const cents = expression();
    if (index !== text.length) throw new Error('请检查算式，每个金额最多保留两位小数');
    return { success: true, value: Number(cents) / 100 };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : '算式无效' }; }
}
