import { AbstractedAccount } from './abstracted_account.algo';

export class AbstractedOptIn extends AbstractedAccount {
  optInToAsset(asset: Asset, mbrPayment: PayTxn): void {
    verifyPayTxn(mbrPayment, {
      receiver: this.app.address,
      amount: {
        // @ts-expect-error TODO: add assetOptInMinBalance to the TEALScript types
        greaterThan: globals.assetOptInMinBalance,
      },
    });

    sendAssetTransfer({
      assetReceiver: this.app.address,
      assetAmount: 0,
      xferAsset: asset,
    });
  }
}
