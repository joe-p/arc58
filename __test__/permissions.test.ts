import { describe, test, beforeAll, beforeEach, expect } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk, { makeBasicAccountTransactionSigner } from 'algosdk';
import { AbstractedAccountClient, AbstractedAccountFactory } from '../contracts/clients/AbstractedAccountClient';
import { OptInPluginClient, OptInPluginFactory } from '../contracts/clients/OptInPluginClient';

const ZERO_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ';
algokit.Config.configure({ populateAppCallResources: true });

describe('ARC58 Plugin Permissions', () => {
  /** Alice's externally owned account (ie. a keypair account she has in Pera) */
  let aliceEOA: algosdk.Account;
  /** The client for Alice's abstracted account */
  let abstractedAccountClient: AbstractedAccountClient;
  /** The client for the dummy plugin */
  let dummyPluginClient: OptInPluginClient;
  /** The account that will be calling the plugin */
  let caller: algosdk.Account;
  let plugin: bigint;
  /** The maximum uint64 value. Used to indicate a never-expiring plugin */
  const MAX_UINT64 = BigInt('18446744073709551615');
  const fixture = algorandFixture();

  async function callPlugin() {
    // const boxes = [
    //   new Uint8Array(
    //     Buffer.concat([
    //       Buffer.from('p'),
    //       Buffer.from(algosdk.encodeUint64(plugin)),
    //       algosdk.decodeAddress(ZERO_ADDRESS).publicKey,
    //     ])
    //   ),
    //   new Uint8Array(
    //     Buffer.concat([
    //       Buffer.from('p'),
    //       Buffer.from(algosdk.encodeUint64(plugin)),
    //       algosdk.decodeAddress(caller.addr).publicKey,
    //     ])
    //   ),
    // ];

    await abstractedAccountClient
      .newGroup()
      .arc58RekeyToPlugin({
        sender: caller.addr,
        signer: makeBasicAccountTransactionSigner(caller),
        args: { plugin },
        extraFee: (1000).microAlgos()
      })
      .arc58VerifyAuthAddr()
      .send();
  }

  beforeEach(async () => {
    await fixture.beforeEach();

    const { algorand } = fixture.context;

    const minter = new AbstractedAccountFactory({
      defaultSender: aliceEOA.addr,
      defaultSigner: makeBasicAccountTransactionSigner(aliceEOA),
      algorand
    });
    const results = await minter.send.create.createApplication({ args: { admin: aliceEOA.addr }});
    abstractedAccountClient = results.appClient;

    await abstractedAccountClient.appClient.fundAppAccount({ amount: algokit.microAlgos(1_000_000) });
  });

  beforeAll(async () => {
    await fixture.beforeEach();
    const { testAccount } = fixture.context;
    const { algorand } = fixture;
    caller = algorand.account.random().account;

    algorand.send.payment({
      sender: testAccount.addr,
      receiver: caller.addr,
      amount: algokit.microAlgos(1_000_000),
    });

    aliceEOA = testAccount;

    const optinPluginMinter = new OptInPluginFactory({
      defaultSender: aliceEOA.addr,
      defaultSigner: makeBasicAccountTransactionSigner(aliceEOA),
      algorand
    });
    const optInMintResults = await optinPluginMinter.send.create.createApplication();

    dummyPluginClient = optInMintResults.appClient;
    plugin = dummyPluginClient.appId;
  });

  test('both are valid, global is used', async () => {
    const { algorand } = fixture;
    await abstractedAccountClient.send.arc58AddPlugin({
      // sender: aliceEOA.addr,
      // signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: caller.addr,
        cooldown: 0,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: []
      }
    });

    await abstractedAccountClient.send.arc58AddPlugin({
      // sender: aliceEOA.addr,
      // signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: ZERO_ADDRESS,
        cooldown: 0,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: []
      }
    });

    await callPlugin();

    const globalPluginBox = (await abstractedAccountClient.appClient.getBoxValueFromABIType(
      new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(plugin)),
          algosdk.decodeAddress(ZERO_ADDRESS).publicKey,
        ])
      ),
      algosdk.ABIType.from('(uint64,uint64,uint64,bool)')
    )) as [number, number, number, boolean];

    const round = (await algorand.client.algod.status().do())['last-round'];

    expect(globalPluginBox[2]).toBe(BigInt(round));
  });

  test('global valid, global is used', async () => {
    const { algorand } = fixture;

    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: ZERO_ADDRESS,
        cooldown: 0,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: []
      }
    });

    await callPlugin();

    const globalPluginBox = (await abstractedAccountClient.appClient.getBoxValueFromABIType(
      new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(plugin)),
          algosdk.decodeAddress(ZERO_ADDRESS).publicKey,
        ])
      ),
      algosdk.ABIType.from('(uint64,uint64,uint64,bool)')
    )) as [number, number, number, boolean];

    const round = (await algorand.client.algod.status().do())['last-round'];

    expect(globalPluginBox[2]).toBe(BigInt(round));
  });

  test('global does not exist, sender valid', async () => {
    const { algorand } = fixture;
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: caller.addr,
        cooldown: 0,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: []
      }
    });

    await callPlugin();

    const callerPluginBox = (await abstractedAccountClient.appClient.getBoxValueFromABIType(
      new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(plugin)),
          algosdk.decodeAddress(caller.addr).publicKey,
        ])
      ),
      algosdk.ABIType.from('(uint64,uint64,uint64,bool)')
    )) as [number, number, number, boolean];

    const round = (await algorand.client.algod.status().do())['last-round'];

    expect(callerPluginBox[2]).toBe(BigInt(round));
  });

  test('not enough cooldown', async () => {
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: caller.addr,
        cooldown: 100,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: []
      }
    });

    await callPlugin();

    let error = 'no error';
    try {
      await callPlugin();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      error = e.message;
    }

    // TODO: Parse this from src_map json
    expect(error).toMatch('pc=643');
  });
  test('neither sender nor global plugin exists', async () => {
    let error = 'no error';
    try {
      await callPlugin();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      error = e.message;
    }

    // TODO: Parse this from src_map json
    expect(error).toMatch('pc=643');
  });

  test('expired', async () => {
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: ZERO_ADDRESS,
        cooldown: 0,
        lastValidRound: 1,
        adminPrivileges: false,
        methods: []
      }
    });

    let error = 'no error';
    try {
      await callPlugin();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      error = e.message;
    }

    // TODO: Parse this from src_map json
    expect(error).toMatch('pc=1218');
  });
});
