import { Contract } from '@algorandfoundation/tealscript';

export class AbstractedAccount extends Contract {
  /** Target AVM 10 */
  programVersion = 10;

  /** The admin of the abstracted account */
  admin = GlobalStateKey<Address>();

  /**
   * The apps that are authorized to send itxns from the abstracted account
   * The box map values aren't actually used and are always empty
   */
  plugins = BoxMap<Application, StaticArray<byte, 0>>();

  /** The address of the abstracted account */
  address = GlobalStateKey<Address>();

  /**
   * Ensure that by the end of the group the abstracted account has control of its address
   */
  private verifyRekeyToAbstractedAccount(): void {
    const lastTxn = this.txnGroup[this.txnGroup.length - 1];

    // If the last txn isn't a rekey, then assert that the last txn is a call to verifyAppAuthAddr
    if (lastTxn.sender !== this.address.value || lastTxn.rekeyTo !== this.getAuthAddr()) {
      verifyAppCallTxn(lastTxn, {
        applicationID: this.app,
      });
      assert(lastTxn.applicationArgs[0] === method('verifyAppAuthAddr()void'));
    }
  }

  /**
   * What the value of this.address.value.authAddr should be when this.address
   * is able to be controlled by this app. It will either be this.app.address or zeroAddress
   */
  private getAuthAddr(): Address {
    return this.address.value === this.app.address ? Address.zeroAddress : this.app.address;
  }

  /**
   * Create an abstracted account
   *
   * @param address The address to use for the abstracted account. If zeroAddress, then the address of the contract account will be used
   * @param admin The admin for this app
   */
  createApplication(address: Address, admin: Address): void {
    verifyAppCallTxn(this.txn, {
      sender: { includedIn: [address, admin] },
    });

    assert(admin !== address);

    this.admin.value = admin;
    this.address.value = address === Address.zeroAddress ? this.app.address : address;
  }

  /**
   * Verify the abstracted account address is rekeyed to this app
   */
  verifyAppAuthAddr(): void {
    assert(this.address.value.authAddr === this.getAuthAddr());
  }

  /**
   * Rekey the address to another account. Primarily useful for rekeying to an EOA
   *
   * @param addr The address to rekey to
   * @param flash Whether or not this should be a flash rekey. If true, the rekey back to the address must done in the same txn group as this call
   */
  rekeyTo(addr: Address, flash: boolean): void {
    verifyAppCallTxn(this.txn, { sender: this.admin.value });

    sendPayment({
      sender: this.address.value,
      receiver: addr,
      rekeyTo: addr,
      note: 'rekeying abstracted account',
    });

    if (flash) this.verifyRekeyToAbstractedAccount();
  }

  /**
   * Temporarily rekey to an approved plugin app address
   *
   * @param plugin The app to rekey to
   */
  rekeyToPlugin(plugin: Application): void {
    assert(this.plugins(plugin).exists);

    sendPayment({
      sender: this.address.value,
      receiver: this.address.value,
      rekeyTo: plugin.address,
      note: 'rekeying to plugin app',
    });

    this.verifyRekeyToAbstractedAccount();
  }

  /**
   * Change the admin for this app
   *
   * @param newAdmin The new admin
   */
  changeAdmin(newAdmin: Account): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    this.admin.value = newAdmin;
  }

  /**
   * Add an app to the list of approved plugins
   *
   * @param app The app to add
   */
  addPlugin(app: Application): void {
    assert(this.txn.sender === this.admin.value);

    this.plugins(app).create(0);
  }

  /**
   * Remove an app from the list of approved plugins
   *
   * @param app The app to remove
   */
  removePlugin(app: Application): void {
    assert(this.txn.sender === this.admin.value);

    this.plugins(app).delete();
  }
}
