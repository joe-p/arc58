import { describe, test, beforeAll, beforeEach, expect } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { AbstractedAccountClient } from '../contracts/clients/AbstractedAccountClient';
import { SubscriptionProgramClient } from '../contracts/clients/SubscriptionProgramClient';
import { OptInProgramClient } from '../contracts/clients/OptInProgramClient';

const fixture = algorandFixture();

describe('Abstracted Subscription Program', () => {
  let aliceEOA: algosdk.Account;
  let aliceAbstractedAccount: string;
  let subAppClient: SubscriptionProgramClient;
  let subAppID: number;
  let abstractedAccountClient: AbstractedAccountClient;
  let optInAppClient: OptInProgramClient;
  let optInAppID: number;
  let suggestedParams: algosdk.SuggestedParams;

  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    const { algod, testAccount } = fixture.context;
    suggestedParams = await algod.getTransactionParams().do();
    aliceEOA = testAccount;

    abstractedAccountClient = new AbstractedAccountClient(
      {
        sender: aliceEOA,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    await abstractedAccountClient.create.createApplication({});

    aliceAbstractedAccount = (await abstractedAccountClient.appClient.getAppReference()).appAddress;

    await abstractedAccountClient.appClient.fundAppAccount({ amount: algokit.microAlgos(200_000) });

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

    optInAppClient = new OptInProgramClient(
      {
        sender: aliceEOA,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    await optInAppClient.create.createApplication({});

    optInAppID = Number((await optInAppClient.appClient.getAppReference()).appId);
  });

  describe('Subscription Program', () => {
    test('Alice adds the app to the abstracted account', async () => {
      await abstractedAccountClient.appClient.fundAppAccount({ amount: algokit.microAlgos(5_700) });
      await abstractedAccountClient.addApp({ app: subAppID }, { boxes: [algosdk.encodeUint64(subAppID)] });
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

      await abstractedAccountClient
        .compose()
        .rekeyToApp(
          { app: subAppID },
          {
            sender: testAccount,
            boxes: [algosdk.encodeUint64(subAppID)],
            sendParams: { fee: algokit.microAlgos(2_000) },
          }
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

  describe('OptIn Program', () => {
    let bob: algosdk.Account;
    let asset: number;

    beforeAll(async () => {
      bob = fixture.context.testAccount;
      const { algod } = fixture.context;

      const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        from: bob.addr,
        total: 1,
        decimals: 0,
        defaultFrozen: false,
        suggestedParams,
      });

      const txn = await algokit.sendTransaction({ transaction: assetCreateTxn, from: bob }, algod);

      asset = Number(txn.confirmation!.assetIndex!);
    });

    test('Alice adds the app to the abstracted account', async () => {
      await abstractedAccountClient.appClient.fundAppAccount({ amount: algokit.microAlgos(5_700) });
      await abstractedAccountClient.addApp({ app: optInAppID }, { boxes: [algosdk.encodeUint64(optInAppID)] });
    });

    test("Bob opts Alice's abstracted account into the asset", async () => {
      const mbrPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: bob.addr,
        to: aliceAbstractedAccount,
        amount: 200_000,
        suggestedParams,
      });

      const optInGroup = (
        await optInAppClient
          .compose()
          .optInToAsset(
            { sender: aliceAbstractedAccount, asset, mbrPayment },
            { sendParams: { fee: algokit.microAlgos(2000) } }
          )
          .atc()
      ).buildGroup();

      optInGroup.forEach((txn) => {
        // eslint-disable-next-line no-param-reassign
        txn.txn.group = undefined;
      });

      await abstractedAccountClient
        .compose()
        .rekeyToApp(
          { app: optInAppID },
          { boxes: [algosdk.encodeUint64(optInAppID)], sendParams: { fee: algokit.microAlgos(2000) } }
        )
        .addTransaction({ transaction: optInGroup[0].txn, signer: bob })
        .addTransaction({ transaction: optInGroup[1].txn, signer: bob })
        .verifyAppAuthAddr({})
        .execute();
    });
  });
});
