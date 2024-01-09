import { describe, test, beforeAll, beforeEach, expect } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { AbstractedAccountClient } from '../contracts/clients/AbstractedAccountClient';
import { SubscriptionPluginClient } from '../contracts/clients/SubscriptionPluginClient';
import { OptInPluginClient } from '../contracts/clients/OptInPluginClient';

const fixture = algorandFixture();

describe('Abstracted Subscription Program', () => {
  let aliceEOA: algosdk.Account;
  let aliceAbstractedAccount: string;
  let abstractedAccountClient: AbstractedAccountClient;
  let subPluginClient: SubscriptionPluginClient;
  let subPluginID: number;
  let optInPluginClient: OptInPluginClient;
  let optInPluginID: number;
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

    await abstractedAccountClient.create.createApplication({
      address: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
      admin: aliceEOA.addr,
    });

    aliceAbstractedAccount = (await abstractedAccountClient.appClient.getAppReference()).appAddress;

    await abstractedAccountClient.appClient.fundAppAccount({ amount: algokit.microAlgos(200_000) });

    subPluginClient = new SubscriptionPluginClient(
      {
        sender: aliceEOA,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    await subPluginClient.create.createApplication({});

    subPluginID = Number((await subPluginClient.appClient.getAppReference()).appId);

    optInPluginClient = new OptInPluginClient(
      {
        sender: aliceEOA,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    await optInPluginClient.create.createApplication({});

    optInPluginID = Number((await optInPluginClient.appClient.getAppReference()).appId);
  });

  describe('Subscription Plugin', () => {
    test('Alice adds the app to the abstracted account', async () => {
      await abstractedAccountClient.appClient.fundAppAccount({ amount: algokit.microAlgos(5_700) });
      await abstractedAccountClient.addPlugin({ app: subPluginID }, { boxes: [algosdk.encodeUint64(subPluginID)] });
    });

    test('Someone calls the program to trigger payment', async () => {
      const { algod, testAccount } = fixture.context;

      const joe = '46XYR7OTRZXISI2TRSBDWPUVQT4ECBWNI7TFWPPS6EKAPJ7W5OBXSNG66M';
      const alicePreBalance = await algod.accountInformation(aliceAbstractedAccount).do();
      const joePreBalance = await algod.accountInformation(joe).do();

      const makePaymentTxn = (
        await subPluginClient
          .compose()
          .makePayment(
            { sender: aliceAbstractedAccount, _acctRef: joe },
            { sender: testAccount, sendParams: { fee: algokit.microAlgos(2_000) } }
          )
          .atc()
      ).buildGroup()[0].txn;

      await abstractedAccountClient
        .compose()
        .rekeyToPlugin(
          { plugin: subPluginID },
          {
            sender: testAccount,
            boxes: [algosdk.encodeUint64(subPluginID)],
            sendParams: { fee: algokit.microAlgos(2_000) },
          }
        )
        .addTransaction({ transaction: makePaymentTxn, signer: testAccount })
        .verifyAuthAddr({})
        .execute();

      const alicePostBalance = await algod.accountInformation(aliceAbstractedAccount).do();
      const joePostBalance = await algod.accountInformation(joe).do();
      expect(alicePostBalance.amount).toBe(alicePreBalance.amount - 100_000);
      expect(joePostBalance.amount).toBe(joePreBalance.amount + 100_000);
    });
  });

  describe('OptIn Plugin', () => {
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
      await abstractedAccountClient.addPlugin({ app: optInPluginID }, { boxes: [algosdk.encodeUint64(optInPluginID)] });
    });

    test("Bob opts Alice's abstracted account into the asset", async () => {
      const mbrPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: bob.addr,
        to: aliceAbstractedAccount,
        amount: 200_000,
        suggestedParams,
      });

      const optInGroup = (
        await optInPluginClient
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
        .rekeyToPlugin(
          { plugin: optInPluginID },
          { boxes: [algosdk.encodeUint64(optInPluginID)], sendParams: { fee: algokit.microAlgos(2000) } }
        )
        .addTransaction({ transaction: optInGroup[0].txn, signer: bob })
        .addTransaction({ transaction: optInGroup[1].txn, signer: bob })
        .verifyAuthAddr({})
        .execute();
    });
  });
});
