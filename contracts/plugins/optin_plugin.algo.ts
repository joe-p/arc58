import { Contract } from '@algorandfoundation/tealscript';

export class OptInPlugin extends Contract {
  programVersion = 10;

  optInToAsset(sender: Account, asset: Asset, mbrPayment: PayTxn): void {
    verifyPayTxn(mbrPayment, {
      receiver: sender,
      amount: {
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
