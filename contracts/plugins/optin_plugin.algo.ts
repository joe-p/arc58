import { Contract } from '@algorandfoundation/tealscript';

export class OptInPlugin extends Contract {
  programVersion = 10;

  optInToAsset(sender: AppID, asset: AssetID, mbrPayment: PayTxn): void {
    const controlledAccount = sender.globalState('controlled_address') as Address;

    verifyPayTxn(mbrPayment, {
      receiver: controlledAccount,
      amount: {
        greaterThanEqualTo: globals.assetOptInMinBalance,
      },
    });

    sendAssetTransfer({
      sender: controlledAccount,
      assetReceiver: controlledAccount,
      assetAmount: 0,
      xferAsset: asset,
      rekeyTo: sender.address,
    });
  }
}
