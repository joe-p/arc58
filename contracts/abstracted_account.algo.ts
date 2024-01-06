import { Contract } from '@algorandfoundation/tealscript';

export class AbstractedAccount extends Contract {
  /** Target AVM 10 */
  programVersion = 10;

  /** The EOA (Externally Owned Account) */
  eoa = GlobalStateKey<Address>();

  /**
   * Whether or not this abstracted account must always use a "flash" rekey
   * A "flash" rekey ensures that the rekey back is done atomically in the same group
   */
  forceFlash = GlobalStateKey<boolean>();

  /**
   * The apps that are authorized to send itxns from this account
   * The box map values aren't actually used and are always empty
   */
  plugins = BoxMap<Application, StaticArray<byte, 0>>();

  /**
   * Make sure that verifyAppAuthAddr is called by the end of the txn group
   */
  private assertVerifyAppAuthAddrIsCalled(): void {
    // Verify that by the end of the txn group, the rekey back to this app account is done
    const appl = this.txnGroup[this.txnGroup.length - 1];
    verifyAppCallTxn(appl, {
      applicationID: this.app,
    });
    assert(appl.applicationArgs[0] === method('verifyAppAuthAddr()void'));
  }

  /**
   * Create an abstracted account for an EOA
   */
  createApplication(): void {
    this.eoa.value = this.txn.sender;
  }

  /**
   * Verify the contract account is not rekeyed
   */
  verifyAppAuthAddr(): void {
    assert(this.app.address.authAddr === globals.zeroAddress);
  }

  /**
   * Rekey this contract account to the EOA
   *
   * @param flash Whether or not this should be a flash rekey. If true, the rekey back to this contract must done in the same txn group as this call
   */
  rekeyToEOA(flash: boolean): void {
    const authAddr = this.eoa.value.authAddr === Address.zeroAddress ? this.eoa.value : this.eoa.value.authAddr;

    sendPayment({
      receiver: this.eoa.value,
      rekeyTo: authAddr,
      note: 'rekeying to EOA',
    });

    if (flash || this.forceFlash.value) {
      this.assertVerifyAppAuthAddrIsCalled();
    }
  }

  /**
   * Temporarily rekey to an approved plugin app address
   *
   * @param plugin The app to rekey to
   */
  rekeyToPlugin(plugin: Application): void {
    assert(this.plugins(plugin).exists);

    sendPayment({
      receiver: this.eoa.value,
      rekeyTo: plugin.address,
      note: 'rekeying to plugin app',
    });

    this.assertVerifyAppAuthAddrIsCalled();
  }

  /**
   * Transfer the abstracted account to a new EOA.
   *
   * @param newEOA The new EOA
   */
  transferEOA(newEOA: Account): void {
    assert(this.txn.sender === this.eoa.value);
    this.eoa.value = newEOA;
  }

  /**
   * Add an app to the list of approved plugins
   *
   * @param app The app to add
   */
  addPlugin(app: Application): void {
    assert(this.txn.sender === this.eoa.value);

    this.plugins(app).create(0);
  }

  /**
   * Remove an app from the list of approved plugins
   *
   * @param app The app to remove
   */
  removePlugin(app: Application): void {
    assert(this.txn.sender === this.eoa.value);

    this.plugins(app).delete();
  }
}
