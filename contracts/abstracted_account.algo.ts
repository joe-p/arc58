import { Contract } from '@algorandfoundation/tealscript';

type PluginsKey = { application: Application; address: Address };

export class AbstractedAccount extends Contract {
  /** Target AVM 10 */
  programVersion = 10;

  /** The admin of the abstracted account */
  admin = GlobalStateKey<Address>();

  /**
   * The apps and addresses that are authorized to send itxns from the abstracted account,
   * The key is the appID + address, the value (referred to as `end`)
   * is the timestamp when the permission expires for the address to call the app for your account.
   */

  plugins = BoxMap<PluginsKey, uint64>({ prefix: 'p' });

  /**
   * Plugins that have been given a name for discoverability
   */
  namedPlugins = BoxMap<bytes, PluginsKey>({ prefix: 'n' });

  /** The address of the abstracted account */
  address = GlobalStateKey<Address>();

  /**
   * Ensure that by the end of the group the abstracted account has control of its address
   */
  private verifyRekeyToAbstractedAccount(): void {
    let rekeyedBack = false;

    for (let i = this.txn.groupIndex; i < this.txnGroup.length; i += 1) {
      const txn = this.txnGroup[i];

      // The transaction is an explicit rekey back
      if (txn.sender === this.address.value && txn.rekeyTo === this.getAuthAddr()) {
        rekeyedBack = true;
        break;
      }

      // The transaction is an application call to this app's arc58_verifyAuthAddr method
      if (
        txn.typeEnum === TransactionType.ApplicationCall &&
        txn.applicationID === this.app &&
        txn.numAppArgs === 1 &&
        txn.applicationArgs[0] === method('arc58_verifyAuthAddr()void')
      ) {
        rekeyedBack = true;
        break;
      }
    }

    assert(rekeyedBack);
  }

  /**
   * What the value of this.address.value.authAddr should be when this.address
   * is able to be controlled by this app. It will either be this.app.address or zeroAddress
   */
  private getAuthAddr(): Address {
    return this.address.value === this.app.address ? Address.zeroAddress : this.app.address;
  }

  /**
   * Create an abstracted account application
   *
   * @param address The address of the abstracted account. If zeroAddress, then the address of the contract account will be used
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
   * Verify the abstracted account is rekeyed to this app
   */
  arc58_verifyAuthAddr(): void {
    assert(this.address.value.authAddr === this.getAuthAddr());
  }

  /**
   * Rekey the abstracted account to another address. Primarily useful for rekeying to an EOA.
   *
   * @param addr The address to rekey to
   * @param flash Whether or not this should be a flash rekey. If true, the rekey back to the app address must done in the same txn group as this call
   */
  arc58_rekeyTo(addr: Address, flash: boolean): void {
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
  arc58_rekeyToPlugin(plugin: Application): void {
    const globalKey: PluginsKey = { application: plugin, address: globals.zeroAddress };

    // If this plugin is not approved globally, then it must be approved for this address
    if (!this.plugins(globalKey).exists || this.plugins(globalKey).value < globals.latestTimestamp) {
      const key: PluginsKey = { application: plugin, address: this.txn.sender };
      assert(this.plugins(key).exists && this.plugins(key).value > globals.latestTimestamp);
    }

    sendPayment({
      sender: this.address.value,
      receiver: this.address.value,
      rekeyTo: plugin.address,
      note: 'rekeying to plugin app',
    });

    this.verifyRekeyToAbstractedAccount();
  }

  /**
   * Temporarily rekey to a named plugin app address
   *
   * @param name The name of the plugin to rekey to
   */
  arc58_rekeyToNamedPlugin(name: string): void {
    this.arc58_rekeyToPlugin(this.namedPlugins(name).value.application);
  }

  /**
   * Change the admin for this app
   *
   * @param newAdmin The new admin
   */
  arc58_changeAdmin(newAdmin: Account): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    this.admin.value = newAdmin;
  }

  /**
   * Add an app to the list of approved plugins
   *
   * @param app The app to add
   * @param address The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param end The timestamp when the permission expires
   */
  arc58_addPlugin(app: Application, address: Address, end: uint64): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    const key: PluginsKey = { application: app, address: address };
    this.plugins(key).value = end;
  }

  /**
   * Remove an app from the list of approved plugins
   *
   * @param app The app to remove
   */
  arc58_removePlugin(app: Application, address: Address): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    const key: PluginsKey = { application: app, address: address };
    this.plugins(key).delete();
  }

  /**
   * Add a named plugin
   *
   * @param app The plugin app
   * @param name The plugin name
   */
  arc58_addNamedPlugin(name: string, app: Application, address: Address, end: uint64): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    assert(!this.namedPlugins(name).exists);

    const key: PluginsKey = { application: app, address: address };
    this.namedPlugins(name).value = key;
    this.plugins(key).value = end;
  }

  /**
   * Remove a named plugin
   *
   * @param name The plugin name
   */
  arc58_removeNamedPlugin(name: string): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    const app = this.namedPlugins(name).value;
    this.namedPlugins(name).delete();
    this.plugins(app).delete();
  }
}
