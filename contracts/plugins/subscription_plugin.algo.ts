import { GlobalState, uint64, Global, assert, Account, Bytes, Application, itxn, abimethod } from '@algorandfoundation/algorand-typescript';
import { Plugin } from './plugin';
import { Address } from '@algorandfoundation/algorand-typescript/arc4';

// These constants should be template variables, but I made them constants because I'm lazy

/** How frequent this payment can be made */
const FREQUENCY: uint64 = 1;
/** Amount of the payment */
const AMOUNT: uint64 = 100_000;

export class SubscriptionPlugin extends Plugin {

  lastPayment = GlobalState<uint64>({ initialValue: 0 });

  // @ts-ignore
  @abimethod({ onCreate: 'require' })
  createApplication(): void {}

  makePayment(
    walletID: uint64,
    rekeyBack: boolean,
    // eslint-disable-next-line no-unused-vars
    _acctRef: Address
  ): void {
    const wallet = Application(walletID);
    const sender = this.getSpendingAccount(wallet);

    assert(Global.round - this.lastPayment.value > FREQUENCY);
    this.lastPayment.value = Global.round;
    
    itxn
      .payment({
        sender,
        amount: AMOUNT,
        receiver: Account(Bytes.fromBase32("46XYR7OTRZXISI2TRSBDWPUVQT4ECBWNI7TFWPPS6EKAPJ7W5OBXSNG66M").slice(0, 32)),
        rekeyTo: this.rekeyAddress(rekeyBack, wallet),
        fee: 0,
      })
      .submit();
  }
}
