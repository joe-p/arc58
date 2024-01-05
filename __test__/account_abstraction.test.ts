import { describe, test, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk from 'algosdk';
import { AbstractedOptInClient } from '../contracts/clients/AbstractedOptInClient';

const fixture = algorandFixture();

let appClient: AbstractedOptInClient;

describe('AbstractedAccount', () => {
  let aliceEOA: algosdk.Account;
  let aliceAbstractedAccount: string;
  let bob: algosdk.Account;
  let asset: number;
  let suggestedParams: algosdk.SuggestedParams;

  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    const { algod, testAccount } = fixture.context;
    aliceEOA = testAccount;

    appClient = new AbstractedOptInClient(
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

    suggestedParams = await algod.getTransactionParams().do();
  });

  test("Bob uses Alice's abstracted account to opt in to an asset", async () => {
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

    const mbrPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: bob.addr,
      to: aliceAbstractedAccount,
      amount: 200_000,
      suggestedParams,
    });

    await appClient.optInToAsset(
      { asset, mbrPayment },
      { sender: bob, sendParams: { fee: algokit.microAlgos(2_000) } }
    );
  });

  test("Bob transfers the asset to Alice's abstracted account", async () => {
    const axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: bob.addr,
      to: aliceAbstractedAccount,
      amount: 1,
      assetIndex: asset,
      suggestedParams,
    });

    await algokit.sendTransaction({ transaction: axfer, from: bob }, fixture.context.algod);
  });

  test('Alice rekeys the abstracted account to her EOA key to send the asset back to Bob', async () => {
    const saveAuthAddrCall = (await appClient.compose().saveAuthAddr({}).atc()).buildGroup()[0];

    await appClient.rekey(
      { saveAuthAddrCall: { transaction: saveAuthAddrCall.txn, signer: aliceEOA }, flash: false },
      { sender: aliceEOA, sendParams: { fee: algokit.microAlgos(2000) } }
    );

    const axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: aliceAbstractedAccount,
      to: bob.addr,
      amount: 1,
      assetIndex: asset,
      suggestedParams,
    });

    await algokit.sendTransaction({ transaction: axfer, from: aliceEOA }, fixture.context.algod);
  });
});
