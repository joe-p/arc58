import { Contract } from '@algorandfoundation/tealscript';

// eslint-disable-next-line no-unused-vars
class AbstractedAccount extends Contract {
  eoa = GlobalStateKey<Address>();

  createApplication(eoa: Address): void {
    this.eoa.value = eoa;
  }

  rekey(): void {
    sendPayment({
      receiver: this.eoa.value,
      rekeyTo: this.eoa.value,
      note: 'rekeying to EOA',
    });
  }

  atomicRekey(): void {}

  updateApplication(): void {
    verifyAppCallTxn(this.txn, { sender: this.eoa.value });
  }
}
