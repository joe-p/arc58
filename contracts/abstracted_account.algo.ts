import { Contract, GlobalState, BoxMap, assert, arc4, uint64, Account, TransactionType, Application, bytes, abimethod, gtxn } from '@algorandfoundation/algorand-typescript'
import { methodSelector } from '@algorandfoundation/algorand-typescript/arc4';
import { payment } from '@algorandfoundation/algorand-typescript/itxn';
import { btoi, Global, len, Txn } from '@algorandfoundation/algorand-typescript/op'

type PluginsKey = {
  /** The application containing plugin logic */
  application: Application;
  /** The address that is allowed to initiate a rekey to the plugin */
  allowedCaller: Account;
};

type PluginInfo = {
  /** The last round at which this plugin can be called */
  lastValidRound: uint64;
  /** The number of rounds that must pass before the plugin can be called again */
  cooldown: uint64;
  /** The last round the plugin was called */
  lastCalled: uint64;
  /** Whether the plugin has permissions to change the admin account */
  adminPrivileges: boolean;
};

export class AbstractedAccount extends Contract {

  /** The admin of the abstracted account. This address can add plugins and initiate rekeys */
  admin = GlobalState<Account>({ key: 'a' });

  /** The address this app controls */
  controlledAddress = GlobalState<Account>({ key: 'c' });

  /**
   * Plugins that add functionality to the controlledAddress and the account that has permission to use it.
   */
  plugins = BoxMap<PluginsKey, PluginInfo>({ keyPrefix: 'p' });

  /**
   * Plugins that have been given a name for discoverability
   */
  namedPlugins = BoxMap<string, PluginsKey>({ keyPrefix: 'n' });

  /**
   * Ensure that by the end of the group the abstracted account has control of its address
   */
  private verifyRekeyToAbstractedAccount(): void {
    let rekeyedBack = false;

    for (let i = (Txn.groupIndex + 1); i < Global.groupSize; i += 1) {
      const txn = gtxn.Transaction(i)

      // The transaction is an explicit rekey back used outside of plugins
      if (txn.sender === this.controlledAddress.value && txn.rekeyTo === Global.currentApplicationAddress) {
        rekeyedBack = true;
        break;
      }

      // The transaction is an application call to this app's arc58_verifyAuthAddr method
      if (
        txn.type === TransactionType.ApplicationCall &&
        txn.appId === Global.currentApplicationId &&
        txn.onCompletion === 'NoOp' &&
        txn.numAppArgs === 1 &&
        txn.appArgs(0) === methodSelector('arc58_verifyAuthAddr()void')
      ) {
        rekeyedBack = true;
        break;
      }
    }

    assert(rekeyedBack);
  }

  /**
   * Ensure that by the end of the group the abstracted account has control of its address
   */
  private verifyGroup(app: arc4.UintN64): void {
    let rekeyedBack = false;

    for (let i = (Txn.groupIndex + 1); i < (Global.groupSize - Txn.groupIndex); i += 1) {
      const txn = gtxn.Transaction(i)

      // The transaction is an explicit rekey back used outside of plugins
      if (txn.sender === this.controlledAddress.value && txn.rekeyTo === Global.currentApplicationAddress) {
        rekeyedBack = true;
        break;
      }

      // The transaction is an application call to this app's arc58_verifyAuthAddr method
      if (
        txn.type === TransactionType.ApplicationCall &&
        txn.appId === Global.currentApplicationId &&
        txn.onCompletion === 'NoOp' && // OnCompletion.NoOp
        txn.numAppArgs === 1 &&
        txn.appArgs(0) === methodSelector('arc58_verifyAuthAddr()void')
      ) {
        rekeyedBack = true;
        break;
      }

      if (txn.type !== TransactionType.ApplicationCall) {
        continue;
      }

      assert(txn.appId === Application(app.native), 'Invalid app call');
      assert(txn.onCompletion === 'NoOp', 'Invalid onCompletion');
      assert(txn.numAppArgs > 1, 'Invalid number of app args');
      assert(len(txn.appArgs(1)) === 8, 'Invalid app arg length');
      assert(Application(btoi(txn.appArgs(1))) === Global.currentApplicationId, 'Invalid app arg');
    }

    assert(rekeyedBack);
  }

  /**
   * What the value of this.address.value.authAddr should be when this.controlledAddress
   * is able to be controlled by this app. It will either be this.app.address or zeroAddress
   */
  private getAuthAddr(): Account {
    return this.controlledAddress.value === Global.currentApplicationAddress
      ? Global.zeroAddress // contract controls itself
      : Global.currentApplicationAddress; // contract controls a different account
  }

  /**
   * Create an abstracted account application.
   * This is not part of ARC58 and implementation specific.
   *
   * @param controlledAddress The address of the abstracted account. If zeroAddress, then the address of the contract account will be used
   * @param admin The admin for this app
   */
  constructor(controlledAddress: arc4.Address, admin: arc4.Address) {
    super();
    // verifyAppCallTxn(this.txn, {
    //   sender: { includedIn: [controlledAddress, admin] },
    // });
    assert(
      Txn.sender === controlledAddress.native
      || Txn.sender === admin.native,
      'Sender must be either controlledAddress or admin'
    );
    assert(admin !== controlledAddress);

    this.admin.value = admin.native;
    this.controlledAddress.value = controlledAddress.native === Global.zeroAddress ? Global.currentApplicationAddress : controlledAddress.native;
  }

  /**
   * Attempt to change the admin for this app. Some implementations MAY not support this.
   *
   * @param newAdmin The new admin
   */
  arc58_changeAdmin(newAdmin: arc4.Address): void {
    // verifyTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');
    this.admin.value = newAdmin.native;
  }

  /**
   * Attempt to change the admin via plugin.
   *
   * @param plugin The app calling the plugin
   * @param allowedCaller The address that triggered the plugin
   * @param newAdmin The new admin
   *
   */
  arc58_pluginChangeAdmin(plugin: arc4.UintN64, allowedCaller: arc4.Address, newAdmin: arc4.Address): void {
    // verifyTxn(this.txn, { sender: Application(plugin.native).address });
    assert(Txn.sender === Application(plugin.native).address, 'Sender must be the plugin');
    assert(
      this.controlledAddress.value.authAddress === Application(plugin.native).address,
      'This plugin is not in control of the account'
    );

    const key: PluginsKey = { application: Application(plugin.native), allowedCaller: allowedCaller.native };

    const [p, exists] = this.plugins.maybe(key);
    assert(
      exists && p.adminPrivileges,
      'This plugin does not have admin privileges'
    );

    this.admin.value = newAdmin.native;
  }

  /**
   * Get the admin of this app. This method SHOULD always be used rather than reading directly from state
   * because different implementations may have different ways of determining the admin.
   */
  @abimethod({ readonly: true })
  arc58_getAdmin(): arc4.Address {
    return new arc4.Address(this.admin.value);
  }

  /**
   * Verify the abstracted account is rekeyed to this app
   */
  arc58_verifyAuthAddr(): void {
    assert(this.controlledAddress.value.authAddress === this.getAuthAddr());
  }

  /**
   * Rekey the abstracted account to another address. Primarily useful for rekeying to an EOA.
   *
   * @param addr The address to rekey to
   * @param flash Whether or not this should be a flash rekey. If true, the rekey back to the app address must done in the same txn group as this call
   */
  arc58_rekeyTo(addr: arc4.Address, flash: arc4.Bool): void {
    // verifyAppCallTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');

    payment({
      sender: this.controlledAddress.value,
      receiver: addr.native,
      rekeyTo: addr.native,
      note: 'rekeying abstracted account',
    })

    if (flash) this.verifyRekeyToAbstractedAccount();
  }

  private pluginCallAllowed(app: Application, caller: Account): boolean {
    const key: PluginsKey = { application: app, allowedCaller: caller };
    const [plugin, exists] = this.plugins.maybe(key);

    return (
      exists
      && plugin.lastValidRound >= Global.round
      && Global.round - plugin.lastCalled >= plugin.cooldown
    );
  }

  /**
   * check whether the plugin can be used
   *
   * @param plugin the plugin to be rekeyed to
   * @returns whether the plugin can be called via txn sender or globally
   */
  @abimethod({ readonly: true })
  arc58_canCall(plugin: arc4.UintN64, address: arc4.Address): boolean {
    const globalAllowed = this.pluginCallAllowed(Application(plugin.native), Global.zeroAddress);
    if (globalAllowed) return true;

    return this.pluginCallAllowed(Application(plugin.native), address.native);
  }

  /**
   * Temporarily rekey to an approved plugin app address
   *
   * @param plugin The app to rekey to
   */
  arc58_rekeyToPlugin(plugin: arc4.UintN64): void {
    const globalAllowed = this.pluginCallAllowed(Application(plugin.native), Global.zeroAddress);

    if (!globalAllowed) {
      assert(this.pluginCallAllowed(Application(plugin.native), Txn.sender), 'This sender is not allowed to trigger this plugin');
    }
    
    payment({
      sender: this.controlledAddress.value,
      receiver: this.controlledAddress.value,
      rekeyTo: Application(plugin.native).address,
      note: 'rekeying to plugin app',
    });

    const key: PluginsKey = {
      application: Application(plugin.native),
      allowedCaller: globalAllowed ? Global.zeroAddress : Txn.sender,
    };

    const previousValue = this.plugins.get(key)
    this.plugins.set(key, {
      ...previousValue,
      lastCalled: Global.round,
    })

    this.verifyGroup(plugin);
  }

  /**
   * Temporarily rekey to a named plugin app address
   *
   * @param name The name of the plugin to rekey to
   */
  arc58_rekeyToNamedPlugin(name: arc4.Str): void {
    this.arc58_rekeyToPlugin(new arc4.UintN64(this.namedPlugins.get(name.native).application.id));
  }

  /**
   * Add an app to the list of approved plugins
   *
   * @param app The app to add
   * @param allowedCaller The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param lastValidRound The round when the permission expires
   * @param cooldown  The number of rounds that must pass before the plugin can be called again
   * @param adminPrivileges Whether the plugin has permissions to change the admin account
   */
  arc58_addPlugin(
    app: arc4.UintN64,
    allowedCaller: arc4.Address,
    lastValidRound: arc4.UintN64,
    cooldown: arc4.UintN64,
    adminPrivileges: arc4.Bool
  ): void {
    // verifyTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');

    const key: PluginsKey = { application: Application(app.native), allowedCaller: allowedCaller.native };
    this.plugins.set(key, {
      lastValidRound: lastValidRound.native,
      cooldown: cooldown.native,
      lastCalled: 0,
      adminPrivileges: adminPrivileges.native,
    });
  }

  /**
   * Remove an app from the list of approved plugins
   *
   * @param app The app to remove
   */
  arc58_removePlugin(app: arc4.UintN64, allowedCaller: arc4.Address): void {
    // verifyTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');

    const key: PluginsKey = { application: Application(app.native), allowedCaller: allowedCaller.native };
    this.plugins.delete(key);
  }

  /**
   * Add a named plugin
   *
   * @param app The plugin app
   * @param name The plugin name
   * @param allowedCaller The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param lastValidRound The round when the permission expires
   * @param cooldown  The number of rounds that must pass before the plugin can be called again
   * @param adminPrivileges Whether the plugin has permissions to change the admin account
   */
  arc58_addNamedPlugin(
    name: arc4.Str,
    app: arc4.UintN64,
    allowedCaller: arc4.Address,
    lastValidRound: arc4.UintN64,
    cooldown: arc4.UintN64,
    adminPrivileges: arc4.Bool
  ): void {
    // verifyTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');
    assert(!this.namedPlugins.has(name.native));

    const key: PluginsKey = { application: Application(app.native), allowedCaller: allowedCaller.native };
    this.namedPlugins.set(name.native, key);

    const pluginInfo: PluginInfo = {
      lastValidRound: lastValidRound.native,
      cooldown: cooldown.native,
      lastCalled: 0,
      adminPrivileges: adminPrivileges.native,
    };

    this.plugins.set(key, pluginInfo);
  }

  /**
   * Remove a named plugin
   *
   * @param name The plugin name
   */
  arc58_removeNamedPlugin(name: arc4.Str): void {
    // verifyTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');

    const app = this.namedPlugins.get(name.native);
    this.namedPlugins.delete(name.native);
    this.plugins.delete(app);
  }
}
