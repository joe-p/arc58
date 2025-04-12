import { describe, test, beforeAll, beforeEach, expect } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk, { makeBasicAccountTransactionSigner } from 'algosdk';
import { AbstractedAccountClient, AbstractedAccountFactory } from '../contracts/clients/AbstractedAccountClient';
import { OptInPluginClient, OptInPluginFactory } from '../contracts/clients/OptInPluginClient';
import fs from "node:fs";
import { ERR_CANNOT_CALL_OTHER_APPS_DURING_REKEY, ERR_MALFORMED_OFFSETS, ERR_METHOD_ON_COOLDOWN, ERR_PLUGIN_DOES_NOT_EXIST, ERR_PLUGIN_EXPIRED, ERR_PLUGIN_ON_COOLDOWN } from '../contracts/errors';

const ZERO_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ';
const PluginInfoAbiType = algosdk.ABIType.from('(uint8,uint64,uint64,uint64,bool,(byte[4],uint64,uint64)[])')
type PluginInfoTuple = [number, number, number, number, boolean, [string, number, number][]]
algokit.Config.configure({ populateAppCallResources: true });

function getPCFromThrow(error: string): number {
  const index = error.indexOf('pc=')
  if (index < 0) {
    throw new Error('cant find pc')
  }

  const period = error.indexOf('.', (index + 3))

  return Number(error.slice((index + 3), period))
}

function getErrorStringFromPC(pc: number): string {
  const puyaMapJSON = fs.readFileSync("contracts/artifacts/AbstractedAccount.approval.puya.map", "utf-8");
  const puyaMap = JSON.parse(puyaMapJSON)
  if (!('pc_events' in puyaMap)) {
    throw new Error('pc_events not found')
  }

  if (!('op_pc_offset' in puyaMap)) {
    throw new Error('op_pc_offset not found')
  }

  pc += puyaMap['op_pc_offset']

  if (!(pc in puyaMap['pc_events'])) {
    throw new Error('pc not found in events')
  }
  
  if (!('error' in puyaMap['pc_events'][String(pc)])) {
    throw new Error('error not found in pc map')
  }
  
  return puyaMap['pc_events'][String(pc)]['error']
}

function pcError(error: string): string {
  const pc = getPCFromThrow(error)
  return getErrorStringFromPC(pc)
}

describe('ARC58 Plugin Permissions', () => {
  /** Alice's externally owned account (ie. a keypair account she has in Pera) */
  let aliceEOA: algosdk.Account;
  /** The client for Alice's abstracted account */
  let abstractedAccountClient: AbstractedAccountClient;
  /** The client for the dummy plugin */
  let optInPluginClient: OptInPluginClient;
  /** The account that will be calling the plugin */
  let caller: algosdk.Account;
  let plugin: bigint;
  /** The suggested params for transactions */
  let suggestedParams: algosdk.SuggestedParams;
  /** The maximum uint64 value. Used to indicate a never-expiring plugin */
  const MAX_UINT64 = BigInt('18446744073709551615');
  /** a created asset id to use */
  let asset: bigint;

  const fixture = algorandFixture();

  async function callPlugin(
    caller: algosdk.Account,
    suggestedParams: algosdk.SuggestedParams,
    pluginClient: OptInPluginClient,
    asset: bigint,
    offsets: number[] = []
  ) {
    const mbrPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: caller.addr,
      to: abstractedAccountClient.appAddress,
      amount: 200_000,
      suggestedParams,
    });

    const optInGroup = (
      await (pluginClient
        .createTransaction
        .optInToAsset({
          sender: caller.addr,
          signer: makeBasicAccountTransactionSigner(caller),
          args: {
            sender: abstractedAccountClient.appId,
            rekeyBack: true,
            asset,
            mbrPayment
          },
          extraFee: (1_000).microAlgos()
        }))
    ).transactions;

    await abstractedAccountClient
      .newGroup()
      .arc58RekeyToPlugin({
        sender: caller.addr,
        signer: makeBasicAccountTransactionSigner(caller),
        args: { plugin, methodOffsets: offsets },
        extraFee: (1000).microAlgos()
      })
      // Add the mbr payment
      .addTransaction(optInGroup[0], makeBasicAccountTransactionSigner(caller)) // mbrPayment
      // Add the opt-in plugin call
      .addTransaction(optInGroup[1], makeBasicAccountTransactionSigner(caller)) // optInToAsset
      .arc58VerifyAuthAddr({
        sender: caller.addr,
        signer: makeBasicAccountTransactionSigner(caller),
        args: {}
      })
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
    const results = await minter.send.create.createApplication({ args: { admin: aliceEOA.addr, controlledAddress: ZERO_ADDRESS } });
    abstractedAccountClient = results.appClient;

    await abstractedAccountClient.appClient.fundAppAccount({ amount: (4).algos() });
  });

  beforeAll(async () => {
    await fixture.beforeEach();
    const { testAccount } = fixture.context;
    const { algorand } = fixture;
    aliceEOA = testAccount;
    caller = algorand.account.random().account;
    const dispenser = await algorand.account.dispenserFromEnvironment();

    suggestedParams = await algorand.getSuggestedParams();

    await algorand.account.ensureFunded(
      aliceEOA.addr,
      dispenser,
      (100).algos(),
    );

    await algorand.account.ensureFunded(
      caller.addr,
      dispenser,
      (100).algos(),
    );

    const optinPluginMinter = new OptInPluginFactory({
      defaultSender: aliceEOA.addr,
      defaultSigner: makeBasicAccountTransactionSigner(aliceEOA),
      algorand
    });
    const optInMintResults = await optinPluginMinter.send.create.createApplication();

    optInPluginClient = optInMintResults.appClient;
    plugin = optInPluginClient.appId;

    // Create an asset
    const txn = await algorand.send.assetCreate({
      sender: aliceEOA.addr,
      total: BigInt(1),
      decimals: 0,
      defaultFrozen: false,
    });

    asset = BigInt(txn.confirmation!.assetIndex!);
  });

  test('both are valid, global is used', async () => {
    const { algorand } = fixture;
    await abstractedAccountClient.send.arc58AddPlugin({
      args: {
        app: plugin,
        allowedCaller: caller.addr,
        delegationType: 3,
        cooldown: 0,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: []
      }
    });

    await abstractedAccountClient.send.arc58AddPlugin({
      args: {
        app: plugin,
        allowedCaller: ZERO_ADDRESS,
        delegationType: 3,
        cooldown: 1,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: []
      }
    });

    await callPlugin(caller, suggestedParams, optInPluginClient, asset);

    const globalPluginBox = (await abstractedAccountClient.appClient.getBoxValueFromABIType(
      new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(plugin)),
          algosdk.decodeAddress(ZERO_ADDRESS).publicKey,
        ])
      ),
      PluginInfoAbiType
    )) as PluginInfoTuple;

    const round = (await algorand.client.algod.status().do())['last-round'];

    expect(globalPluginBox[3]).toBe(BigInt(round));
  });

  test('global valid, global is used', async () => {
    const { algorand } = fixture;

    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: ZERO_ADDRESS,
        delegationType: 3,
        cooldown: 1,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: []
      }
    });

    await callPlugin(caller, suggestedParams, optInPluginClient, asset);

    const globalPluginBox = (await abstractedAccountClient.appClient.getBoxValueFromABIType(
      new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(plugin)),
          algosdk.decodeAddress(ZERO_ADDRESS).publicKey,
        ])
      ),
      PluginInfoAbiType
    )) as PluginInfoTuple;

    const round = (await algorand.client.algod.status().do())['last-round'];

    expect(globalPluginBox[3]).toBe(BigInt(round));
  });

  test('global does not exist, sender valid', async () => {
    const { algorand } = fixture;
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: caller.addr,
        delegationType: 3,
        cooldown: 1,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: [],
      }
    });

    await callPlugin(caller, suggestedParams, optInPluginClient, asset);

    const callerPluginBox = (await abstractedAccountClient.appClient.getBoxValueFromABIType(
      new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(plugin)),
          algosdk.decodeAddress(caller.addr).publicKey,
        ])
      ),
      PluginInfoAbiType
    )) as PluginInfoTuple;

    const round = (await algorand.client.algod.status().do())['last-round'];

    expect(callerPluginBox[3]).toBe(BigInt(round));
  });

  test('global does not exist, sender valid, method allowed', async () => {
    const { algorand } = fixture;
    const optInToAssetSelector = optInPluginClient.appClient.getABIMethod('optInToAsset').getSelector();
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: caller.addr,
        delegationType: 3,
        cooldown: 1,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: [
          [optInToAssetSelector, 0],
          [Buffer.from('dddd'), 0],
          [Buffer.from('aaaa'), 0]
        ]
      }
    });

    console.log('optInToAssetSelector', new Uint8Array([...optInToAssetSelector]))

    await callPlugin(caller, suggestedParams, optInPluginClient, asset, [0]);

    // const capturedLogs = logs.testLogger.capturedLogs
    // console.log('capturedLogs', capturedLogs)

    const callerPluginBox = (await abstractedAccountClient.appClient.getBoxValueFromABIType(
      new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(plugin)),
          algosdk.decodeAddress(caller.addr).publicKey,
        ])
      ),
      PluginInfoAbiType
    )) as PluginInfoTuple;

    const round = (await algorand.client.algod.status().do())['last-round'];

    expect(callerPluginBox[3]).toBe(BigInt(round));
  });

  test('methods on cooldown', async () => {
    const { algorand } = fixture;
    const optInToAssetSelector = optInPluginClient.appClient.getABIMethod('optInToAsset').getSelector();
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: ZERO_ADDRESS,
        delegationType: 3,
        cooldown: 0,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: [
          [optInToAssetSelector, 10] // cooldown of 1 so we can call it at most once per round
        ]
      }
    });

    await callPlugin(caller, suggestedParams, optInPluginClient, asset, [0]);

    const callerPluginBox = (await abstractedAccountClient.appClient.getBoxValueFromABIType(
      new Uint8Array(
        Buffer.concat([
          Buffer.from('p'),
          Buffer.from(algosdk.encodeUint64(plugin)),
          algosdk.decodeAddress(ZERO_ADDRESS).publicKey,
        ])
      ),
      PluginInfoAbiType
    )) as PluginInfoTuple;

    const round = (await algorand.client.algod.status().do())['last-round'];

    expect(callerPluginBox[5][0][2]).toBe(BigInt(round));

    let error = 'no error';
    try {
      await callPlugin(caller, suggestedParams, optInPluginClient, asset, [0]);
    } catch (e: any) {
      error = e.message;
    }

    expect(pcError(error)).toMatch(ERR_METHOD_ON_COOLDOWN);
  });

  test('methods on cooldown, single group', async () => {
    const { algorand } = fixture;
    const optInToAssetSelector = optInPluginClient.appClient.getABIMethod('optInToAsset').getSelector();
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: ZERO_ADDRESS,
        delegationType: 3,
        cooldown: 0,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: [
          [optInToAssetSelector, 1] // cooldown of 1 so we can call it at most once per round
        ]
      }
    });

    const mbrPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: caller.addr,
      to: abstractedAccountClient.appAddress,
      amount: 200_000,
      suggestedParams,
    });

    const optInGroup = (
      await (optInPluginClient
        .createTransaction
        .optInToAsset({
          sender: caller.addr,
          signer: makeBasicAccountTransactionSigner(caller),
          args: {
            sender: abstractedAccountClient.appId,
            rekeyBack: false,
            asset,
            mbrPayment
          },
          extraFee: (1_000).microAlgos()
        }))
    ).transactions;

    const mbrPaymentTwo = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: caller.addr,
      to: abstractedAccountClient.appAddress,
      amount: 200_000,
      suggestedParams,
      note: new Uint8Array(Buffer.from('two'))
    });

    const optInGroupTwo = (
      await (optInPluginClient
        .createTransaction
        .optInToAsset({
          sender: caller.addr,
          signer: makeBasicAccountTransactionSigner(caller),
          args: {
            sender: abstractedAccountClient.appId,
            rekeyBack: true,
            asset,
            mbrPayment: mbrPaymentTwo
          },
          extraFee: (1_000).microAlgos(),
          note: 'two'
        }))
    ).transactions;

    let error = 'no error';
    try {
      await abstractedAccountClient
        .newGroup()
        .arc58RekeyToPlugin({
          sender: caller.addr,
          signer: makeBasicAccountTransactionSigner(caller),
          args: { plugin, methodOffsets: [0, 0] },
          extraFee: (1000).microAlgos()
        })
        // Add the mbr payment
        .addTransaction(optInGroup[0], makeBasicAccountTransactionSigner(caller)) // mbrPayment
        // Add the opt-in plugin call
        .addTransaction(optInGroup[1], makeBasicAccountTransactionSigner(caller)) // optInToAsset
        .addTransaction(optInGroupTwo[0], makeBasicAccountTransactionSigner(caller)) // mbrPayment
        .addTransaction(optInGroupTwo[1], makeBasicAccountTransactionSigner(caller)) // optInToAsset
        .arc58VerifyAuthAddr({
          sender: caller.addr,
          signer: makeBasicAccountTransactionSigner(caller),
          args: {}
        })
        .send();
    } catch (e: any) {
      error = e.message;
    }

    
    expect(pcError(error)).toMatch(ERR_METHOD_ON_COOLDOWN);
  });

  test('plugins on cooldown', async () => {
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: caller.addr,
        delegationType: 3,
        cooldown: 100,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: []
      }
    });

    await callPlugin(caller, suggestedParams, optInPluginClient, asset);

    let error = 'no error';
    try {
      await callPlugin(caller, suggestedParams, optInPluginClient, asset);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      error = e.message;
    }

    
    expect(pcError(error)).toMatch(ERR_PLUGIN_ON_COOLDOWN);
  });

  test('neither sender nor global plugin exists', async () => {
    let error = 'no error';
    try {
      await callPlugin(caller, suggestedParams, optInPluginClient, asset);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      error = e.message;
    }

    expect(pcError(error)).toMatch(ERR_PLUGIN_DOES_NOT_EXIST);
  });

  test('expired', async () => {
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: ZERO_ADDRESS,
        delegationType: 3,
        cooldown: 0,
        lastValidRound: 1,
        adminPrivileges: false,
        methods: []
      }
    });

    let error = 'no error';
    try {
      await callPlugin(caller, suggestedParams, optInPluginClient, asset);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      error = e.message;
    }

    
    expect(pcError(error)).toMatch(ERR_PLUGIN_EXPIRED);
  });

  test('erroneous app call in sandwich', async () => {
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: ZERO_ADDRESS,
        delegationType: 3,
        cooldown: 0,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: []
      }
    });

    const mbrPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: caller.addr,
      to: abstractedAccountClient.appAddress,
      amount: 200_000,
      suggestedParams,
    });

    // create an extra app call that on its own would succeed
    const erroneousAppCall = (
      await abstractedAccountClient.createTransaction.arc58AddPlugin({
        sender: aliceEOA.addr,
        signer: makeBasicAccountTransactionSigner(aliceEOA),
        args: {
          app: plugin,
          allowedCaller: caller.addr,
          delegationType: 3,
          cooldown: 0,
          lastValidRound: MAX_UINT64,
          adminPrivileges: false,
          methods: [],
        }
      })
    ).transactions[0];

    const optInGroup = (
      await (optInPluginClient
        .createTransaction
        .optInToAsset({
          sender: caller.addr,
          signer: makeBasicAccountTransactionSigner(caller),
          args: {
            sender: abstractedAccountClient.appId,
            rekeyBack: true,
            asset,
            mbrPayment
          },
          extraFee: (1_000).microAlgos()
        }))
    ).transactions;

    let error = 'no error';
    try {
      await abstractedAccountClient
        .newGroup()
        .arc58RekeyToPlugin({
          sender: caller.addr,
          signer: makeBasicAccountTransactionSigner(caller),
          args: { plugin, methodOffsets: [] },
          extraFee: (1000).microAlgos()
        })
        // Add the mbr payment
        .addTransaction(optInGroup[0], makeBasicAccountTransactionSigner(caller)) // mbrPayment
        // Add the opt-in plugin call
        .addTransaction(optInGroup[1], makeBasicAccountTransactionSigner(caller)) // optInToAsset
        .addTransaction(erroneousAppCall, makeBasicAccountTransactionSigner(aliceEOA)) // erroneous app call
        .arc58VerifyAuthAddr({
          sender: caller.addr,
          signer: makeBasicAccountTransactionSigner(caller),
          args: {}
        })
        .send();
    } catch (e: any) {
      error = e.message;
    }

    
    expect(pcError(error)).toMatch(ERR_CANNOT_CALL_OTHER_APPS_DURING_REKEY);
  });

  test('malformed methodOffsets', async () => {
    await abstractedAccountClient.send.arc58AddPlugin({
      sender: aliceEOA.addr,
      signer: makeBasicAccountTransactionSigner(aliceEOA),
      args: {
        app: plugin,
        allowedCaller: ZERO_ADDRESS,
        delegationType: 0,
        cooldown: 0,
        lastValidRound: MAX_UINT64,
        adminPrivileges: false,
        methods: [
          [new Uint8Array(Buffer.from('dddd')), 0]
        ]
      }
    });

    let error = 'no error';
    try {
      await callPlugin(caller, suggestedParams, optInPluginClient, asset, []);
    } catch (e: any) {
      error = e.message;
    }

    
    expect(pcError(error)).toMatch(ERR_MALFORMED_OFFSETS);
  });
});
