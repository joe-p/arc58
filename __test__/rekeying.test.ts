import { describe, test, beforeAll, beforeEach, expect } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk, { Algodv2, makeBasicAccountTransactionSigner } from 'algosdk';
import { microAlgos } from '@algorandfoundation/algokit-utils';
import { AbstractedAccountClient } from '../contracts/clients/AbstractedAccountClient';

const fixture = algorandFixture();

describe('Rekeying Test', () => {
  let algod: Algodv2;
  /** Alice's externally owned account (ie. a keypair account she has in Defly) */
  let aliceEOA: algosdk.Account;
  /** The address of Alice's new abstracted account. Sends app calls from aliceEOA unless otherwise specified */
  let aliceAbstractedAccount: string;
  /** The client for Alice's abstracted account */
  let abstractedAccountClient: AbstractedAccountClient;
  /** The suggested params for transactions */
  let suggestedParams: algosdk.SuggestedParams;

  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    algod = fixture.context.algod;
    suggestedParams = await algod.getTransactionParams().do();
    aliceEOA = await fixture.context.generateAccount({ initialFunds: microAlgos(100_000_000) });

    await algod.setBlockOffsetTimestamp(60).do();

    abstractedAccountClient = new AbstractedAccountClient(
      {
        sender: aliceEOA,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    // Create an abstracted account app
    await abstractedAccountClient.create.createApplication({
      // Set address to ZERO_ADDRESS so the app address is used
      controlledAddress: ZERO_ADDRESS,
      // aliceEOA will be the admin
      admin: aliceEOA.addr,
    });

    aliceAbstractedAccount = (await abstractedAccountClient.appClient.getAppReference()).appAddress;

    // Fund the abstracted account with some ALGO to later spend
    await abstractedAccountClient.appClient.fundAppAccount({ amount: algokit.microAlgos(50_000_000) });
  });

  test('Alice does not rekey back to the app', async () => {
    await expect(
      abstractedAccountClient
        .compose()
        // Step one: rekey abstracted account to Alice
        .arc58RekeyTo(
          { addr: aliceEOA.addr, flash: true },
          {
            sender: aliceEOA,
            sendParams: { fee: microAlgos(2000) },
          }
        )
        // Step two: make payment from abstracted account
        .addTransaction({
          txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: aliceAbstractedAccount,
            to: aliceAbstractedAccount,
            amount: 0,
            suggestedParams: { ...suggestedParams, fee: 1000, flatFee: true },
          }),
          signer: makeBasicAccountTransactionSigner(aliceEOA),
        })
        .execute()
    ).rejects.toThrowError();
  });
});
