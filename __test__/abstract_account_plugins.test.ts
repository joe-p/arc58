import { describe, test, beforeAll, beforeEach, expect } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { AbstractedAccountClient } from '../contracts/clients/AbstractedAccountClient';
import { SubscriptionPluginClient } from '../contracts/clients/SubscriptionPluginClient';
import { OptInPluginClient } from '../contracts/clients/OptInPluginClient';

const ZERO_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ';
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
  const maxUint64 = BigInt('18446744073709551615');

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
      address: ZERO_ADDRESS,
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

  describe('Unnamed Subscription Plugin', () => {
    const joe = '46XYR7OTRZXISI2TRSBDWPUVQT4ECBWNI7TFWPPS6EKAPJ7W5OBXSNG66M';
    let pluginBox: Uint8Array;
    let boxes: Uint8Array[];

    beforeAll(() => {
      pluginBox = new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(subPluginID)),
          algosdk.decodeAddress(ZERO_ADDRESS).publicKey,
        ])
      );
      boxes = [pluginBox];
    });

    test('Alice adds the app to the abstracted account', async () => {
      await abstractedAccountClient.appClient.fundAppAccount({ amount: algokit.microAlgos(22100) });
      await abstractedAccountClient.addPlugin({ app: subPluginID, address: ZERO_ADDRESS, end: maxUint64 }, { boxes });
    });

    test('Someone calls the program to trigger payment', async () => {
      const { algod, testAccount } = fixture.context;

      boxes = [new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(subPluginID)),
          algosdk.decodeAddress(ZERO_ADDRESS).publicKey,
        ])
      )];

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
            boxes,
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

  describe('Named OptIn Plugin', () => {
    let bob: algosdk.Account;
    let asset: number;

    const nameBox = new Uint8Array(Buffer.concat([Buffer.from('n'), Buffer.from('optIn')]));

    let pluginBox: Uint8Array;

    const boxes: Uint8Array[] = [nameBox];

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

      pluginBox = new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(optInPluginID)),
          algosdk.decodeAddress(ZERO_ADDRESS).publicKey,
        ])
      );

      boxes.push(pluginBox);
    });

    test('Alice adds the app to the abstracted account', async () => {
      await abstractedAccountClient.appClient.fundAppAccount({ amount: algokit.microAlgos(43000) });
      await abstractedAccountClient.addNamedPlugin(
        { name: 'optIn', app: optInPluginID, address: ZERO_ADDRESS, end: maxUint64 },
        { boxes }
      );
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
            { sender: bob, sendParams: { fee: algokit.microAlgos(2000) } }
          )
          .atc()
      ).buildGroup();

      optInGroup.forEach((txn) => {
        // eslint-disable-next-line no-param-reassign
        txn.txn.group = undefined;
      });

      await abstractedAccountClient
        .compose()
        .rekeyToNamedPlugin(
          { name: 'optIn' },
          {
            boxes,
            sendParams: { fee: algokit.microAlgos(2000) },
          }
        )
        .addTransaction({ transaction: optInGroup[0].txn, signer: bob }) // mbrPayment
        .addTransaction({ transaction: optInGroup[1].txn, signer: bob }) // optInToAsset
        .verifyAuthAddr({})
        .execute();
    });
  });
});
