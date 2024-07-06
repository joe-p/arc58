/* eslint-disable prefer-destructuring */
import { describe, test, expect } from '@jest/globals';

const BRANCHING_OPCODES = ['b', 'bz', 'bnz', 'callsub', 'retsub', 'match', 'switch'];
const MAX_AVM_VERSION = 10;
const STATIC_OPS = [
  'pushint',
  'pushbytes',
  'bytecblock',
  'intcblock',
  'bytec_0',
  'bytec_1',
  'bytec_2',
  'bytec_3',
  'intc_0',
  'intc_1',
  'intc_2',
  'intc_3',
];

function getPluginTxns(teal: string): Record<string, string>[] {
  const txns: Record<string, string>[] = [];
  let inTxn = false;
  const ops: string[] = [];

  const programVersion = parseInt(teal.match(/(?<=#pragma version) \d+/)![0], 10);

  // Must check program version because newer AVM versions might have new branching or itxn opcodes
  if (programVersion > MAX_AVM_VERSION) {
    throw new Error(`Unsupported program version: ${programVersion}`);
  }

  // Get all of the lines of non comment code
  // This should be the decompiled TEAL
  const lines = teal
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !line.startsWith('//') && line.length > 0);

  let currentTxn: Record<string, string> = {};

  lines.forEach((line) => {
    const opcode = line.split(' ')[0];
    if (opcode === 'itxn_begin' || opcode === 'itxn_next' || opcode === 'itxn_submit') {
      // Only push the txn if it has a sender
      // In the future we could explicitly check if it's the abstracted account address or dynamic
      if (Object.keys(currentTxn).length > 0 && currentTxn.Sender) {
        txns.push(currentTxn);
      }
      if (opcode !== 'itxn_submit') inTxn = true;
      ops.length = 0;
      currentTxn = {};
      return;
    }

    if (inTxn) {
      // Do not allow branching because it will make it much harder to perform static analysis
      if (BRANCHING_OPCODES.includes(opcode)) {
        throw new Error(`Branching opcode ${opcode} found when composing inner transaction`);
      }

      if (opcode === 'itxn_field') {
        const field = line.split(' ')[1];

        const firstOp = ops[0].split(' ')[0];

        if (ops.length !== 1 || !STATIC_OPS.includes(firstOp)) {
          currentTxn[field] = 'dynamic';
        } else if (firstOp.startsWith('intc') || firstOp.startsWith('bytec')) {
          currentTxn[field] = ops[0].split(' // ')[1];
        } else {
          currentTxn[field] = ops[0].split(' ')[1];
        }

        ops.length = 0;
      } else {
        ops.push(line);
      }
    }
  });

  return txns;
}

describe('getPluginTxns', () => {
  test('pay', () => {
    const teal = `
    #pragma version 10

    itxn_begin

    pushbytes 0xdeadbeef
    itxn_field Sender

    pushint 0
    itxn_field TypeEnum

    pushint 1
    itxn_field Amount

    itxn_submit
    `;

    const txns = getPluginTxns(teal);
    expect(txns.length).toBe(1);
    expect(txns[0]).toEqual({ TypeEnum: '0', Sender: '0xdeadbeef', Amount: '1' });
  });

  test('dynamic pay', () => {
    const teal = `
    #pragma version 10

    itxn_begin

    bytecblock 4 // 0xdeadbeef
    itxn_field Sender

    intc_1 // 0
    itxn_field TypeEnum

    pushint 1
    pushint 1
    +
    itxn_field Amount

    itxn_submit
    `;

    const txns = getPluginTxns(teal);
    expect(txns.length).toBe(1);
    expect(txns[0]).toEqual({ TypeEnum: '0', Sender: '0xdeadbeef', Amount: 'dynamic' });
  });

  test('branch', () => {
    const teal = `
    #pragma version 10

    itxn_begin

    pushbytes 0xdeadbeef
    itxn_field Sender

    callsub malicious_subroutine

    pushint 0
    itxn_field TypeEnum

    pushint 1
    itxn_field Amount

    itxn_submit
    `;

    expect(() => getPluginTxns(teal)).toThrowError('Branching opcode callsub found when composing inner transaction');
  });

  test('future TEAL', () => {
    const teal = `
    #pragma version 999

    itxn_begin

    pushbytes 0xdeadbeef
    itxn_field Sender

    pushint 0
    itxn_field TypeEnum

    pushint 1
    itxn_field Amount

    itxn_submit
    `;

    expect(() => getPluginTxns(teal)).toThrowError('Unsupported program version: 999');
  });
});
