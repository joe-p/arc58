import { Contract, GlobalState, BoxMap, assert, arc4, uint64, Account, TransactionType, Application, abimethod, gtxn, itxn } from '@algorandfoundation/algorand-typescript'
import { methodSelector } from '@algorandfoundation/algorand-typescript/arc4';
import { btoi, Global, len, Txn } from '@algorandfoundation/algorand-typescript/op'

// type PluginsKey = arc4.StaticBytes<40>;

export class PluginsKey extends arc4.Struct<{
  /** The application containing plugin logic */
  application: arc4.UintN64;
  /** The address that is allowed to initiate a rekey to the plugin */
  allowedCaller: arc4.Address;
}> { }

export class PluginInfo extends arc4.Struct<{
  /** The last round at which this plugin can be called */
  lastValidRound: arc4.UintN64;
  /** The number of rounds that must pass before the plugin can be called again */
  cooldown: arc4.UintN64;
  /** The last round the plugin was called */
  lastCalled: arc4.UintN64;
  /** Whether the plugin has permissions to change the admin account */
  adminPrivileges: arc4.Bool;
  /** The methods that are allowed to be called for the plugin by the address */
  methods: arc4.DynamicArray<MethodInfo>;
}> { };

export class MethodInfo extends arc4.Struct<{
  /** The method signature */
  selector: arc4.StaticBytes<4>;
  /** The number of rounds that must pass before the method can be called again */
  cooldown: arc4.UintN64;
  /** The last round the method was called */
  lastCalled: arc4.UintN64;
}> { };

export class AbstractedAccount extends Contract {
  /** Target AVM 11 */
  programVersion = 11;

  /** The admin of the abstracted account. This address can add plugins and initiate rekeys */
  admin = GlobalState<Account>({ key: 'admin' });

  /** The address this app controls */
  controlledAddress = GlobalState<Account>({ key: 'controlled_address' });

  /**
   * Plugins that add functionality to the controlledAddress and the account that has permission to use it.
   */
  plugins = BoxMap<PluginsKey, PluginInfo>({ keyPrefix: 'p' });

  /**
   * Plugins that have been given a name for discoverability
   */
  namedPlugins = BoxMap<string, PluginsKey>({ keyPrefix: 'n' });

  private assertPluginCallAllowed(app: arc4.UintN64, caller: arc4.Address): void {
    const key = new PluginsKey({ application: app, allowedCaller: caller });

    const [p, exists] = this.plugins.maybe(key);

    assert(exists, 'plugin does not exist');
    assert(p.lastValidRound.native >= Global.round, 'plugin is expired');
    assert((Global.round - p.lastCalled.native) >= p.cooldown.native, 'plugin is on cooldown');
  }

  private pluginCallAllowed(app: arc4.UintN64, caller: arc4.Address, method: arc4.StaticBytes<4>): boolean {
    const key = new PluginsKey({ application: app, allowedCaller: caller });
    const [p, exists] = this.plugins.maybe(key);

    if (!exists) {
      return false;
    }

    let methodAllowed = p.methods.length ? false : true;
    for (let i = 0; i < p.methods.length; i += 1) {
      if (p.methods[i].selector === method) {
        methodAllowed = true;
        break;
      }
    }

    return (
      p.lastValidRound.native >= Global.round
      && (Global.round - p.lastCalled.native) >= p.cooldown.native
      && methodAllowed
    );
  }

  private txnRekeysBack(txn: gtxn.Transaction): boolean {
    if (txn.sender === Global.currentApplicationAddress && txn.rekeyTo === Global.currentApplicationAddress) {
      return true;
    }

    return (
      txn.type === TransactionType.ApplicationCall
      && txn.appId === Global.currentApplicationId
      && txn.numAppArgs === 1
      // @ts-expect-error
      && txn.onCompletion === arc4.OnCompleteAction.NoOp
      && txn.appArgs(0) === methodSelector('arc58_verifyAuthAddr()void')
    )
  }

  private assertRekeysBack(): void {
    let rekeysBack = false;
    for (let i: uint64 = (Txn.groupIndex + 1); i < Global.groupSize; i += 1) {
      const txn = gtxn.Transaction(i)

      if (this.txnRekeysBack(txn)) {
        rekeysBack = true;
      }
    }

    assert(rekeysBack, 'rekey back not found');
  }

  /**
   * Guarantee that our txn group is valid in a single loop over all txns in the group
   * 
   * @param app the plugin app id being validated
   * @param methodOffsets the indices of the methods being used in the group
   * @param globallyAllowed whether to check the global caller for method restrictions
   * @param locallyAllowed whether to check the local caller for method restrictions
   */
  private assertValidGroup(app: Application, methodOffsets: arc4.DynamicArray<arc4.UintN64>) {

    const gkey = new PluginsKey({ application: new arc4.UintN64(app.id), allowedCaller: new arc4.Address(Global.zeroAddress) });
    const [globalPlugin, globalPluginExists] = this.plugins.maybe(gkey)
    const hasGlobalMethodRestrictions = globalPluginExists && globalPlugin.methods.length > 0;
    const hasGlobalPluginCooldown = globalPluginExists && globalPlugin.cooldown.native > 0;

    const key = new PluginsKey({ application: new arc4.UintN64(app.id), allowedCaller: new arc4.Address(Txn.sender) });
    const [localPlugin, localPluginExists] = this.plugins.maybe(key)
    const hasLocalMethodRestrictions = localPluginExists && localPlugin.methods.length > 0;
    const hasLocalPluginCooldown = localPluginExists && localPlugin.cooldown.native > 0;

    assert(globalPluginExists || localPluginExists, 'plugin not found');
    
    const globalAlreadyOnCooldown = hasGlobalPluginCooldown
    && (Global.round - globalPlugin.lastCalled.native) < globalPlugin.cooldown.native;
    const localAlreadyOnCooldown = hasLocalPluginCooldown
    && (Global.round - localPlugin.lastCalled.native) < localPlugin.cooldown.native;

    assert(!globalAlreadyOnCooldown && !localAlreadyOnCooldown, 'plugins on cooldown');

    let rekeysBack = false;
    let methodIndex = 0;

    for (let i: uint64 = (Txn.groupIndex + 1); i < Global.groupSize; i += 1) {
      const txn = gtxn.Transaction(i)

      if (this.txnRekeysBack(txn)) {
        rekeysBack = true;
        break;
      }

      if (txn.type !== TransactionType.ApplicationCall) {
        continue;
      }

      // ensure the first arg to a method call is the app id itself
      // index 1 is used because arg[0] is the method selector
      assert(txn.appId === app, 'wrong app id');
      // @ts-expect-error
      assert(txn.onCompletion === arc4.OnCompleteAction.NoOp, 'invalid onComplete');
      assert(txn.numAppArgs > 1, 'no app id provided');
      assert(Application(btoi(txn.appArgs(1))) === Global.currentApplicationId, 'wrong app id');

      const globalOnCooldown = hasGlobalPluginCooldown
        && (Global.round - globalPlugin.lastCalled.native) < globalPlugin.cooldown.native;

      const validGlobalMethod = globalPluginExists
        && methodIndex < methodOffsets.length
        && this.methodCallAllowed(txn, app, Global.zeroAddress, methodOffsets.at(methodIndex).native)

      const globalValid = (
        globalPluginExists
        && !globalOnCooldown
        && (!hasGlobalMethodRestrictions || validGlobalMethod)
      );

      const localOnCooldown = hasLocalPluginCooldown
        && (Global.round - localPlugin.lastCalled.native) < localPlugin.cooldown.native;

      const validLocalMethod = localPluginExists
        && methodIndex < methodOffsets.length
        && this.methodCallAllowed(txn, app, Txn.sender, methodOffsets.at(methodIndex).native)

      const localValid = (
        localPluginExists
        && !localOnCooldown
        && (!hasLocalMethodRestrictions || validLocalMethod)
      );

      assert(globalValid || localValid, 'not allowed');

      // default to using global if both are valid
      // due to plugins having cooldowns we want to
      // properly attribute which is being used
      // in the case of both being allowed we default to global
      if (globalValid && hasGlobalPluginCooldown) {
        this.plugins.set(gkey, new PluginInfo({
          ...globalPlugin,
          lastCalled: new arc4.UintN64(Global.round)
        }));
      } else if (localValid && hasLocalPluginCooldown) {
        this.plugins.set(key, new PluginInfo({
          ...localPlugin,
          lastCalled: new arc4.UintN64(Global.round)
        }));
      }

      methodIndex += 1;
    }

    assert(rekeysBack, 'no rekey back found');
  }

  /**
   * Checks if the method call is allowed
   * 
   * @param txn the transaction being validated
   * @param app the plugin app id being validated
   * @param caller the address that triggered the plugin or global address
   * @param offset the index of the method being used
   * @returns whether the method call is allowed
   */
  private methodCallAllowed(txn: gtxn.ApplicationTxn, app: Application, caller: Account, offset: uint64): boolean {

    assert(len(txn.appArgs(0)) === 4, 'invalid method signature length');
    const selectorArg = new arc4.StaticBytes<4>(txn.appArgs(0));

    const key = new PluginsKey({ application: new arc4.UintN64(app.id), allowedCaller: new arc4.Address(caller) });

    const pluginInfo = this.plugins.get(key);
    const methods = pluginInfo.methods;
    const allowedMethod = methods[offset];

    const hasCooldown = allowedMethod.cooldown.native > 0;
    const onCooldown = (Global.round - allowedMethod.lastCalled.native) < allowedMethod.cooldown.native;

    // log(allowedMethod.selector)
    // log(selectorArg)

    if (allowedMethod.selector === selectorArg && (!hasCooldown || !onCooldown)) {
      // update the last called round for the method
      if (hasCooldown) {
        methods[offset] = new MethodInfo({
          ...allowedMethod,
          lastCalled: new arc4.UintN64(Global.round)
        });

        this.plugins.set(key, new PluginInfo({
          ...pluginInfo,
          methods
        }));
      }
      return true;
    }

    return false;
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
  @abimethod({ onCreate: 'require' })
  createApplication(controlledAddress: arc4.Address, admin: arc4.Address) {
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

    const key = new PluginsKey({ application: plugin, allowedCaller: allowedCaller });

    const [p, exists] = this.plugins.maybe(key);
    assert(
      exists && p.adminPrivileges.native,
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
  arc58_rekeyTo(address: arc4.Address, flash: arc4.Bool): void {
    // verifyAppCallTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');

    itxn
      .payment({
        sender: this.controlledAddress.value,
        receiver: address.native,
        rekeyTo: address.native,
        note: 'rekeying abstracted account',
        fee: 0,
      })
      .submit();

    if (flash) this.assertRekeysBack();
  }

  /**
   * check whether the plugin can be used
   *
   * @param plugin the plugin to be rekeyed to
   * @param address the address that triggered the plugin
   * @returns whether the plugin can be called via txn sender or globally
   */
  @abimethod({ readonly: true })
  arc58_canCall(plugin: arc4.UintN64, address: arc4.Address, method: arc4.StaticBytes<4>): boolean {
    const globalAllowed = this.pluginCallAllowed(plugin, new arc4.Address(Global.zeroAddress), method);
    if (globalAllowed) return true;

    return this.pluginCallAllowed(plugin, address, method);
  }

  /**
   * Temporarily rekey to an approved plugin app address
   *
   * @param plugin The app to rekey to
   * @param methodOffsets The indices of the methods being used in the group
   * if the plugin has method restrictions these indices are required to match
   * the methods used on each subsequent call to the plugin within the group
   * 
   */
  arc58_rekeyToPlugin(plugin: arc4.UintN64, methodOffsets: arc4.DynamicArray<arc4.UintN64>): void {

    this.assertValidGroup(Application(plugin.native), methodOffsets);

    itxn
      .payment({
        sender: this.controlledAddress.value,
        receiver: this.controlledAddress.value,
        rekeyTo: Application(plugin.native).address,
        note: 'rekeying to plugin app',
        fee: 0,
      })
      .submit();
  }

  /**
   * Temporarily rekey to a named plugin app address
   *
   * @param name The name of the plugin to rekey to
   * @param methodOffsets The indices of the methods being used in the group
   * if the plugin has method restrictions these indices are required to match
   * the methods used on each subsequent call to the plugin within the group
   * 
   */
  arc58_rekeyToNamedPlugin(name: string, methodOffsets: arc4.DynamicArray<arc4.UintN64>): void {
    this.arc58_rekeyToPlugin(this.namedPlugins.get(name).application, methodOffsets);
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
   * @param methods The methods that are allowed to be called for the plugin by the address
   * 
   */
  arc58_addPlugin(
    app: arc4.UintN64,
    allowedCaller: arc4.Address,
    lastValidRound: arc4.UintN64,
    cooldown: arc4.UintN64,
    adminPrivileges: arc4.Bool,
    methods: arc4.DynamicArray<MethodInfo>,
  ): void {
    // verifyTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');
    const key = new PluginsKey({ application: app, allowedCaller: allowedCaller });

    this.plugins.set(key, new PluginInfo({
      lastValidRound: lastValidRound,
      cooldown: cooldown,
      lastCalled: new arc4.UintN64(0),
      adminPrivileges: adminPrivileges,
      methods: methods,
    }));
  }

  /**
   * Remove an app from the list of approved plugins
   *
   * @param app The app to remove
   * @param allowedCaller The address of that's allowed to call the app
   * @param methods The methods that to remove before attempting to uninstall the plugin
   * or the global zero address for all addresses
   */
  arc58_removePlugin(app: arc4.UintN64, allowedCaller: arc4.Address): void {
    // verifyTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');

    const key = new PluginsKey({ application: app, allowedCaller: allowedCaller });
    assert(this.plugins.has(key), 'plugin does not exist');
    this.plugins.delete(key);
  }

  /**
   * Add a named plugin
   *
   * @param name The plugin name
   * @param app The plugin app
   * @param allowedCaller The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param lastValidRound The round when the permission expires
   * @param cooldown  The number of rounds that must pass before the plugin can be called again
   * @param adminPrivileges Whether the plugin has permissions to change the admin account
   * @param methods The methods that are allowed to be called for the plugin by the address
   * 
   */
  arc58_addNamedPlugin(
    name: arc4.Str,
    app: arc4.UintN64,
    allowedCaller: arc4.Address,
    lastValidRound: arc4.UintN64,
    cooldown: arc4.UintN64,
    adminPrivileges: arc4.Bool,
    methods: arc4.DynamicArray<MethodInfo>,
  ): void {
    // verifyTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');
    assert(!this.namedPlugins.has(name.native));

    const key = new PluginsKey({ application: app, allowedCaller: allowedCaller });
    this.namedPlugins.set(name.native, key);

    const value = new PluginInfo({
      lastValidRound: lastValidRound,
      cooldown: cooldown,
      lastCalled: new arc4.UintN64(0),
      adminPrivileges: adminPrivileges,
      methods: methods,
    });

    this.plugins.set(key, value);
  }

  /**
   * Remove a named plugin
   *
   * @param name The plugin name
   * 
   */
  arc58_removeNamedPlugin(name: arc4.Str): void {
    // verifyTxn(this.txn, { sender: this.admin.value });
    assert(Txn.sender === this.admin.value, 'Sender must be the admin');
    const [app, exists] = this.namedPlugins.maybe(name.native)

    assert(exists, 'plugin does not exist');
    assert(this.plugins.has(app), 'plugin does not exist');

    this.namedPlugins.delete(name.native);
    this.plugins.delete(app);
  }
}
