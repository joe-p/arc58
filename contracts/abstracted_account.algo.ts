import { Contract } from '@algorandfoundation/tealscript';

type PluginInfo = { lastValidRound: uint64; cooldown: uint64; lastCalled: uint64; allowedCaller: Address };

export class AbstractedAccount extends Contract {
  /** Target AVM 10 */
  programVersion = 10;

  /** The admin of the abstracted account */
  admin = GlobalStateKey<Address>({ key: 'a' });

  /** The address this app controls */
  controlledAddress = GlobalStateKey<Address>({ key: 'c' });

  /**
   * The apps and addresses that are authorized to send itxns from the abstracted account,
   * The key is the appID + address, the value (referred to as `end`)
   * is the timestamp when the permission expires for the address to call the app for your account.
   */
  plugins = BoxMap<AppID, PluginInfo>({ prefix: 'p' });

  /**
   * Plugins that have been given a name for discoverability
   */
  namedPlugins = BoxMap<bytes, AppID>({ prefix: 'n' });

  /**
   * Ensure that by the end of the group the abstracted account has control of its address
   */
  private verifyRekeyToAbstractedAccount(): void {
    let rekeyedBack = false;

    for (let i = this.txn.groupIndex; i < this.txnGroup.length; i += 1) {
      const txn = this.txnGroup[i];

      // The transaction is an explicit rekey back
      if (txn.sender === this.controlledAddress.value && txn.rekeyTo === this.controlledAddress.value) {
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
   * What the value of this.address.value.authAddr should be when this.controlledAddress
   * is able to be controlled by this app. It will either be this.app.address or zeroAddress
   */
  private getAuthAddr(): Address {
    return this.controlledAddress.value === this.app.address ? Address.zeroAddress : this.app.address;
  }

  /**
   * Create an abstracted account application.
   * This is not part of ARC58 and implementation specific.
   *
   * @param controlledAddress The address of the abstracted account. If zeroAddress, then the address of the contract account will be used
   * @param admin The admin for this app
   */
  createApplication(controlledAddress: Address, admin: Address): void {
    verifyAppCallTxn(this.txn, {
      sender: { includedIn: [controlledAddress, admin] },
    });

    assert(admin !== controlledAddress);

    this.admin.value = admin;
    this.controlledAddress.value = controlledAddress === Address.zeroAddress ? this.app.address : controlledAddress;
  }

  /**
   * Attempt to change the admin for this app. Some implementations MAY not support this.
   *
   * @param newAdmin The new admin
   */
  arc58_changeAdmin(newAdmin: Address): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    this.admin.value = newAdmin;
  }

  /**
   * Get the admin of this app. This method SHOULD always be used rather than reading directly from state
   * because different implementations may have different ways of determining the admin.
   */
  arc58_getAdmin(): Address {
    return this.admin.value;
  }

  /**
   * Verify the abstracted account is rekeyed to this app
   */
  arc58_verifyAuthAddr(): void {
    assert(this.controlledAddress.value.authAddr === this.getAuthAddr());
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
      sender: this.controlledAddress.value,
      receiver: addr,
      rekeyTo: addr,
      note: 'rekeying abstracted account',
    });

    if (flash) this.verifyRekeyToAbstractedAccount();
  }

  private assertPluginAllowed(app: AppID) {
    assert(this.plugins(app).exists, 'This plugin does not exist');

    const plugin = this.plugins(app).value;
    const allowed = plugin.allowedCaller === this.txn.sender || plugin.allowedCaller === Address.zeroAddress;

    assert(plugin.lastValidRound >= globals.round, 'This plugin has expired');
    assert(globals.round - plugin.lastCalled >= plugin.cooldown);
    assert(allowed, 'The sender is not allowed to use this plugin');
  }

  /**
   * Temporarily rekey to an approved plugin app address
   *
   * @param plugin The app to rekey to
   */
  arc58_rekeyToPlugin(plugin: AppID): void {
    this.assertPluginAllowed(plugin);

    sendPayment({
      sender: this.controlledAddress.value,
      receiver: this.controlledAddress.value,
      rekeyTo: plugin.address,
      note: 'rekeying to plugin app',
    });

    this.plugins(plugin).value.lastCalled = globals.round;
    this.verifyRekeyToAbstractedAccount();
  }

  /**
   * Temporarily rekey to a named plugin app address
   *
   * @param name The name of the plugin to rekey to
   */
  arc58_rekeyToNamedPlugin(name: string): void {
    this.arc58_rekeyToPlugin(this.namedPlugins(name).value);
  }

  /**
   * Add an app to the list of approved plugins
   *
   * @param app The app to add
   * @param allowedCaller The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param lastValidRound The round when the permission expires
   */
  arc58_addPlugin(app: AppID, allowedCaller: Address, lastValidRound: uint64, cooldown: uint64): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    this.plugins(app).value = {
      lastValidRound: lastValidRound,
      cooldown: cooldown,
      lastCalled: 0,
      allowedCaller: allowedCaller,
    };
  }

  /**
   * Remove an app from the list of approved plugins
   *
   * @param app The app to remove
   */
  arc58_removePlugin(app: AppID): void {
    verifyTxn(this.txn, { sender: this.admin.value });

    this.plugins(app).delete();
  }

  /**
   * Add a named plugin
   *
   * @param app The plugin app
   * @param name The plugin name
   */
  arc58_addNamedPlugin(
    name: string,
    app: AppID,
    allowedCaller: Address,
    lastValidRound: uint64,
    cooldown: uint64
  ): void {
    verifyTxn(this.txn, { sender: this.admin.value });
    assert(!this.namedPlugins(name).exists);

    this.namedPlugins(name).value = app;
    this.plugins(app).value = {
      allowedCaller: allowedCaller,
      lastValidRound: lastValidRound,
      cooldown: cooldown,
      lastCalled: 0,
    };
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
