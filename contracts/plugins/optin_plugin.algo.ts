import { Contract } from '@algorandfoundation/tealscript';

export class OptInPlugin extends Contract {
  programVersion = 10;

  optInToAsset(sender: Address, asset: AssetID, mbrPayment: PayTxn): void {
    verifyPayTxn(mbrPayment, {
      receiver: sender,
      amount: {
        greaterThanEqualTo: globals.assetOptInMinBalance,
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
