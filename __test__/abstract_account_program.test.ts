import { describe, test, beforeAll, beforeEach, expect } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { sha256 } from 'js-sha256';
import { AbstractedAccountClient } from '../contracts/clients/AbstractedAccountClient';
import { SubscriptionProgramClient } from '../contracts/clients/SubscriptionProgramClient';

const fixture = algorandFixture();

let appClient: AbstractedAccountClient;

describe('Abstracted Subscription Program', () => {
  let aliceEOA: algosdk.Account;
  let aliceAbstractedAccount: string;
  let subAppClient: SubscriptionProgramClient;
  let subAppID: number;

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

    await appClient.appClient.fundAppAccount({ amount: algokit.microAlgos(200_000) });

    subAppClient = new SubscriptionProgramClient(
      {
        sender: aliceEOA,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    await subAppClient.create.createApplication({});

    subAppID = Number((await subAppClient.appClient.getAppReference()).appId);
  });

  test('Alice adds the app to the abstracted account', async () => {
    await appClient.appClient.fundAppAccount({ amount: algokit.microAlgos(5_700) });
    await appClient.addApp({ app: subAppID }, { boxes: [algosdk.encodeUint64(subAppID)] });
  });

  test('Someone calls the program to trigger payment', async () => {
    const { algod, testAccount } = fixture.context;

    const joe = '46XYR7OTRZXISI2TRSBDWPUVQT4ECBWNI7TFWPPS6EKAPJ7W5OBXSNG66M';
    const alicePreBalance = await algod.accountInformation(aliceAbstractedAccount).do();
    const joePreBalance = await algod.accountInformation(joe).do();

    const makePaymentTxn = (
      await subAppClient
        .compose()
        .makePayment(
          { sender: aliceAbstractedAccount, _acctRef: joe },
          { sender: testAccount, sendParams: { fee: algokit.microAlgos(2_000) } }
        )
        .atc()
    ).buildGroup()[0].txn;

    await appClient
      .compose()
      .rekeyToApp(
        { app: subAppID },
        { sender: testAccount, boxes: [algosdk.encodeUint64(subAppID)], sendParams: { fee: algokit.microAlgos(2_000) } }
      )
      .addTransaction({ transaction: makePaymentTxn, signer: testAccount })
      .verifyAppAuthAddr({})
      .execute();

    const alicePostBalance = await algod.accountInformation(aliceAbstractedAccount).do();
    const joePostBalance = await algod.accountInformation(joe).do();
    expect(alicePostBalance.amount).toBe(alicePreBalance.amount - 100_000);
    expect(joePostBalance.amount).toBe(joePreBalance.amount + 100_000);
  });
});
