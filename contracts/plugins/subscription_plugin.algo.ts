import { Contract } from '@algorandfoundation/tealscript';

// These constants should be template variables, but I made them constants because I'm lazy

/** How frequent this payment can be made */
const FREQUENCY = 1;
/** Amount of the payment */
const AMOUNT = 100_000;
/** Payment receiver */
const RECEIVER = '46XYR7OTRZXISI2TRSBDWPUVQT4ECBWNI7TFWPPS6EKAPJ7W5OBXSNG66M';

export class SubscriptionPlugin extends Contract {
  programVersion = 10;

  lastPayment = GlobalStateKey<uint64>();

  @allow.bareCreate()
  createApplication(): void {
    this.lastPayment.value = 0;
  }

  makePayment(
    sender: Address,
    // eslint-disable-next-line no-unused-vars
    _acctRef: Address
  ): void {
    assert(globals.round - this.lastPayment.value > FREQUENCY);
    this.lastPayment.value = globals.round;

    sendPayment({
      sender: sender,
      amount: AMOUNT,
      receiver: addr('46XYR7OTRZXISI2TRSBDWPUVQT4ECBWNI7TFWPPS6EKAPJ7W5OBXSNG66M'),
      rekeyTo: sender,
    });
  }
}
