import { describe, test, beforeAll, beforeEach, expect } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { sha256 } from 'js-sha256';
import { AbstractedAccountClient } from '../contracts/clients/AbstractedAccountClient';
import appspec from '../contracts/artifacts/SubscriptionProgram.arc32.json';

const fixture = algorandFixture();

let appClient: AbstractedAccountClient;

describe('Abstracted Subscription Program', () => {
  let aliceEOA: algosdk.Account;
  let aliceAbstractedAccount: string;
  let programHash: Uint8Array;

  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    const { algod, testAccount } = fixture.context;
    aliceEOA = testAccount;

    appClient = new AbstractedAccountClient(
      {
        sender: aliceEOA,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    await appClient.create.createApplication({});

    aliceAbstractedAccount = (await appClient.appClient.getAppReference()).appAddress;

    await appClient.appClient.fundAppAccount({ amount: algokit.microAlgos(300_000) });
  });

  test('Alice adds the program to the abstracted account', async () => {
    const { algod } = fixture.context;

    const source = appspec.source.approval;

    const response = await algod.compile(Buffer.from(source, 'base64')).do();

    const program = new Uint8Array(Buffer.from(response.result, 'base64'));

    programHash = new Uint8Array(Buffer.from(sha256(program), 'hex'));

    await appClient.appClient.fundAppAccount({ amount: algokit.microAlgos(47_000) });
    await appClient.addProgram(
      {
        program,
        localNumByteSlice: 0,
        localNumUint: 0,
        globalNumByteSlice: 0,
        globalNumUint: 1,
      },
      { sendParams: { fee: algokit.microAlgos(2000) }, boxes: [{ name: programHash, appId: 0 }] }
    );
  });

  test('Someone calls the program to trigger payment', async () => {
    const { algod } = fixture.context;
    const appBoxValue = await appClient.appClient.getBoxValue(programHash);
    const appID = algosdk.decodeUint64(appBoxValue, 'safe');
    const method = algosdk.ABIMethod.fromSignature('makePayment()void').getSelector();

    const joe = '46XYR7OTRZXISI2TRSBDWPUVQT4ECBWNI7TFWPPS6EKAPJ7W5OBXSNG66M';
    const alicePreBalance = await algod.accountInformation(aliceAbstractedAccount).do();
    const joePreBalance = await algod.accountInformation(joe).do();

    await appClient.callProgram(
      { _appID: appID, programHash, method },
      {
        boxes: [{ name: programHash, appId: 0 }],
        sendParams: { fee: algokit.microAlgos(3000) },
        accounts: [joe],
      }
    );

    const alicePostBalance = await algod.accountInformation(aliceAbstractedAccount).do();
    const joePostBalance = await algod.accountInformation(joe).do();
    expect(alicePostBalance.amount).toBe(alicePreBalance.amount - 100_000);
    expect(joePostBalance.amount).toBe(joePreBalance.amount + 100_000);
  });
});
