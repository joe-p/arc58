import { Contract } from '@algorandfoundation/tealscript';

export class OptInProgram extends Contract {
  programVersion = 10;

  optInToAsset(sender: Account, asset: Asset, mbrPayment: PayTxn): void {
    verifyPayTxn(mbrPayment, {
      receiver: sender,
      amount: {
        // @ts-expect-error TODO: add assetOptInMinBalance to the TEALScript types
        greaterThan: globals.assetOptInMinBalance,
      },
    });

    sendAssetTransfer({
      sender: sender,
      assetReceiver: sender,
      assetAmount: 0,
      xferAsset: asset,
      rekeyTo: sender,
    });
  }
}
