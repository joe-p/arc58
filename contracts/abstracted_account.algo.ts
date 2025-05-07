import { Contract, GlobalState, BoxMap, assert, uint64, Account, TransactionType, Application, abimethod, gtxn, itxn, OnCompleteAction, TemplateVar, Bytes } from '@algorandfoundation/algorand-typescript'
import { abiCall, Address, Bool, decodeArc4, DynamicArray, methodSelector, StaticBytes, UintN, UintN64, UintN8 } from '@algorandfoundation/algorand-typescript/arc4';
import { btoi, Global, len, Txn } from '@algorandfoundation/algorand-typescript/op'
import { ERR_ADMIN_ONLY, ERR_ALLOWANCE_ALREADY_EXISTS, ERR_ALLOWANCE_DOES_NOT_EXIST, ERR_CANNOT_CALL_OTHER_APPS_DURING_REKEY, ERR_INVALID_METHOD_SIGNATURE_LENGTH, ERR_INVALID_ONCOMPLETE, ERR_INVALID_PLUGIN_CALL, ERR_INVALID_SENDER_ARG, ERR_INVALID_SENDER_VALUE, ERR_MALFORMED_OFFSETS, ERR_METHOD_ON_COOLDOWN, ERR_MISSING_REKEY_BACK, ERR_ONLY_ADMIN_CAN_CHANGE_ADMIN, ERR_PLUGIN_DOES_NOT_EXIST, ERR_PLUGIN_EXPIRED, ERR_PLUGIN_ON_COOLDOWN, ERR_SENDER_MUST_BE_ADMIN_OR_CONTROLLED_ADDRESS, ERR_SENDER_MUST_BE_ADMIN_PLUGIN, ERR_ZERO_ADDRESS_DELEGATION_TYPE } from './errors';
import { AllowanceInfo, arc4AllowanceInfo, arc4AllowanceKey, arc4FundsRequest, arc4MethodInfo, arc4MethodRestriction, arc4PluginInfo, arc4PluginsKey, DelegationTypeSelf, FullPluginValidation, FundsRequest, MethodValidation, PluginInfo, PluginValidation, SpendAllowanceType, SpendAllowanceTypeDrip, SpendAllowanceTypeFlat, SpendAllowanceTypeWindow } from './types';
import { SpendingAccountFactory } from './spending_account_factory.algo';
import { AbstractAccountBoxPrefixAllowances, AbstractAccountBoxPrefixNamedPlugins, AbstractAccountBoxPrefixPlugins, AbstractAccountGlobalStateKeysAdmin, AbstractAccountGlobalStateKeysControlledAddress, AbstractAccountGlobalStateKeysLastChange, AbstractAccountGlobalStateKeysLastUserInteraction, AbstractAccountGlobalStateKeysSpendingAccountFactoryApp, AbstractAccountGlobalStateKeysSpendingAddress } from './constants';
import { SpendingAccountContract } from './spending_account.algo';

export class AbstractedAccount extends Contract {

  /** The admin of the abstracted account. This address can add plugins and initiate rekeys */
  admin = GlobalState<Account>({ key: AbstractAccountGlobalStateKeysAdmin })
  /** The address this app controls */
  controlledAddress = GlobalState<Account>({ key: AbstractAccountGlobalStateKeysControlledAddress });
  /** The last time the contract was interacted with in unix time */
  lastUserInteraction = GlobalState<uint64>({ key: AbstractAccountGlobalStateKeysLastUserInteraction })
  /** The last time state has changed on the abstracted account (not including lastCalled for cooldowns) in unix time */
  lastChange = GlobalState<uint64>({ key: AbstractAccountGlobalStateKeysLastChange })
  /** the spending account factory to use for allowances */
  spendingAccountFactoryApp = GlobalState<Application>({ key: AbstractAccountGlobalStateKeysSpendingAccountFactoryApp })

  /**
   * TEMPORARY STATE FIELDS
   * 
   * These are global state fields that are used for sharing metadata about usage
   * of the smart wallet and cleared before the end of the usage of the plugin.
   * by doing this we avoid sending application calls to fetch box data
   * & save ourselves from adding more arg requirements for plugins to adhere to.
   */

  /** The spending address for the currently active plugin */
  spendingAddress = GlobalState<Account>({ key: AbstractAccountGlobalStateKeysSpendingAddress })

  /** Plugins that add functionality to the controlledAddress and the account that has permission to use it. */
  plugins = BoxMap<arc4PluginsKey, arc4PluginInfo>({ keyPrefix: AbstractAccountBoxPrefixPlugins }); // 36_500 + (400 * methods.length)

  /** Plugins that have been given a name for discoverability */
  namedPlugins = BoxMap<string, arc4PluginsKey>({ keyPrefix: AbstractAccountBoxPrefixNamedPlugins }); // 18_900 + (400 * key.length)

  /** The Allowances for plugins installed on the smart contract with useAllowance set to true */
  allowances = BoxMap<arc4AllowanceKey, arc4AllowanceInfo>({ keyPrefix: AbstractAccountBoxPrefixAllowances }) // 38_500

  private updateLastUserInteraction() {
    this.lastUserInteraction.value = Global.latestTimestamp
  }

  private updateLastChange() {
    this.lastChange.value = Global.latestTimestamp
  }

  private pluginCallAllowed(app: uint64, caller: Account, method: StaticBytes<4>): boolean {
    const key = new arc4PluginsKey({
      application: new UintN64(app),
      allowedCaller: new Address(caller)
    });

    if (!this.plugins(key).exists) {
      return false;
    }

    const methods = this.plugins(key).value.methods.copy();
    let methodAllowed = methods.length > 0 ? false : true;
    for (let i: uint64 = 0; i < methods.length; i += 1) {
      if (methods[i].selector === method) {
        methodAllowed = true;
        break;
      }
    }

    const p = decodeArc4<PluginInfo>(this.plugins(key).value.copy().bytes);
    const epochRef = p.useRounds ? Global.round : Global.latestTimestamp;

    return (
      p.lastCalled >= epochRef &&
      (epochRef - p.lastCalled) >= p.cooldown &&
      methodAllowed
    )
  }

  private txnRekeysBack(txn: gtxn.Transaction): boolean {
    // this check is for manual rekeyTo calls, it only ever uses the controlled address so its okay to hardcode it here
    if (
      txn.sender === this.controlledAddress.value &&
      txn.rekeyTo === Global.currentApplicationAddress
    ) {
      return true;
    }

    return (
      txn.type === TransactionType.ApplicationCall
      && txn.appId === Global.currentApplicationId
      && txn.numAppArgs === 1
      && txn.onCompletion === OnCompleteAction.NoOp
      && txn.appArgs(0) === methodSelector('arc58_verifyAuthAddr()void')
    )
  }

  private assertRekeysBack(): void {
    let rekeysBack = false;
    for (let i: uint64 = (Txn.groupIndex + 1); i < Global.groupSize; i += 1) {
      const txn = gtxn.Transaction(i)

      if (this.txnRekeysBack(txn)) {
        rekeysBack = true;
        break;
      }
    }

    assert(rekeysBack, ERR_MISSING_REKEY_BACK);
  }

  private pluginCheck(key: arc4PluginsKey): PluginValidation {

    const exists = this.plugins(key).exists;
    if (!exists) {
      return {
        exists: false,
        expired: true,
        hasCooldown: true,
        onCooldown: true,
        hasMethodRestrictions: false,
        valid: false
      }
    }

    const pluginInfo = decodeArc4<PluginInfo>(this.plugins(key).value.copy().bytes);
    const epochRef = pluginInfo.useRounds ? Global.round : Global.latestTimestamp;

    const expired = epochRef > pluginInfo.lastValid;
    const hasCooldown = pluginInfo.cooldown > 0;
    const onCooldown = (epochRef - pluginInfo.lastCalled) < pluginInfo.cooldown;
    const hasMethodRestrictions = pluginInfo.methods.length > 0;

    const valid = exists && !expired && !onCooldown;

    return {
      exists,
      expired,
      hasCooldown,
      onCooldown,
      hasMethodRestrictions,
      valid
    }
  }

  private fullPluginCheck(
    key: arc4PluginsKey,
    txn: gtxn.ApplicationCallTxn,
    methodOffsets: DynamicArray<UintN64>,
    methodIndex: uint64
  ): FullPluginValidation {

    const check = this.pluginCheck(key);

    if (!check.valid) {
      return {
        ...check,
        methodAllowed: false,
        methodHasCooldown: true,
        methodOnCooldown: true
      }
    }

    let mCheck: MethodValidation = {
      methodAllowed: !check.hasMethodRestrictions,
      methodHasCooldown: false,
      methodOnCooldown: false
    }

    if (check.hasMethodRestrictions) {
      assert(methodIndex < methodOffsets.length, ERR_MALFORMED_OFFSETS);
      mCheck = this.methodCheck(key, txn, methodOffsets[methodIndex].native);
    }

    return {
      ...check,
      ...mCheck,
      valid: check.valid && mCheck.methodAllowed
    }
  }

  /**
   * Guarantee that our txn group is valid in a single loop over all txns in the group
   * 
   * @param key the box key for the plugin were checking
   * @param methodOffsets the indices of the methods being used in the group
   */
  private assertValidGroup(key: arc4PluginsKey, methodOffsets: DynamicArray<UintN64>): void {

    const epochRef = this.plugins(key).value.useRounds.native
      ? Global.round
      : Global.latestTimestamp;

    const initialCheck = this.pluginCheck(key);

    assert(initialCheck.exists, ERR_PLUGIN_DOES_NOT_EXIST);
    assert(!initialCheck.expired, ERR_PLUGIN_EXPIRED);
    assert(!initialCheck.onCooldown, ERR_PLUGIN_ON_COOLDOWN);

    let rekeysBack = false;
    let methodIndex: uint64 = 0;

    for (let i: uint64 = (Txn.groupIndex + 1); i < Global.groupSize; i += 1) {
      const txn = gtxn.Transaction(i)

      if (this.txnRekeysBack(txn)) {
        rekeysBack = true;
        break;
      }

      if (txn.type !== TransactionType.ApplicationCall) {
        continue;
      }

      assert(txn.appId.id === key.application.native, ERR_CANNOT_CALL_OTHER_APPS_DURING_REKEY);
      assert(txn.onCompletion === OnCompleteAction.NoOp, ERR_INVALID_ONCOMPLETE);
      // ensure the first arg to a method call is the app id itself
      // index 1 is used because arg[0] is the method selector
      assert(txn.numAppArgs > 1, ERR_INVALID_SENDER_ARG);
      assert(Application(btoi(txn.appArgs(1))) === Global.currentApplicationId, ERR_INVALID_SENDER_VALUE);

      const check = this.fullPluginCheck(key, txn, methodOffsets, methodIndex);

      assert(!check.methodOnCooldown, ERR_METHOD_ON_COOLDOWN);
      assert(check.valid, ERR_INVALID_PLUGIN_CALL);

      if (initialCheck.hasCooldown) {
        this.plugins(key).value.lastCalled = new UintN64(epochRef)
      }

      methodIndex += 1;
    }

    assert(rekeysBack, ERR_MISSING_REKEY_BACK);
  }

  /**
   * Checks if the method call is allowed
   * 
   * @param key the box key for the plugin were checking
   * @param caller the address that triggered the plugin or global address
   * @param offset the index of the method being used
   * @returns whether the method call is allowed
   */
  private methodCheck(key: arc4PluginsKey, txn: gtxn.ApplicationCallTxn, offset: uint64): MethodValidation {

    assert(len(txn.appArgs(0)) === 4, ERR_INVALID_METHOD_SIGNATURE_LENGTH);
    const selectorArg = new StaticBytes<4>(txn.appArgs(0));

    const methods = this.plugins(key).value.methods.copy()
    const allowedMethod = methods[offset].copy();

    const hasCooldown = allowedMethod.cooldown.native > 0;

    const useRounds = this.plugins(key).value.useRounds.native

    const epochRef = useRounds ? Global.round : Global.latestTimestamp;
    const onCooldown = (epochRef - allowedMethod.lastCalled.native) < allowedMethod.cooldown.native;

    if (allowedMethod.selector === selectorArg && (!hasCooldown || !onCooldown)) {
      // update the last called round for the method
      if (hasCooldown) {
        const lastCalled = useRounds
          ? new UintN64(Global.round)
          : new UintN64(Global.latestTimestamp);

        methods[offset].lastCalled = lastCalled;

        this.plugins(key).value = new arc4PluginInfo({
          ...this.plugins(key).value,
          methods: methods.copy()
        });
      }

      return {
        methodAllowed: true,
        methodHasCooldown: hasCooldown,
        methodOnCooldown: onCooldown
      }
    }

    return {
      methodAllowed: false,
      methodHasCooldown: true,
      methodOnCooldown: true
    }
  }

  private transferFunds(key: arc4PluginsKey, fundsRequests: DynamicArray<arc4FundsRequest>): void {
    for (let i: uint64 = 0; i < fundsRequests.length; i += 1) {
      const request = decodeArc4<FundsRequest>(fundsRequests[i].bytes)
      const pluginInfo = decodeArc4<PluginInfo>(this.plugins(key).value.copy().bytes);

      const allowanceKey = new arc4AllowanceKey({
        allowedCaller: key.allowedCaller,
        application: key.application,
        asset: new UintN64(request.asset)
      });

      this.verifyAllowance(
        pluginInfo.start,
        pluginInfo.useRounds,
        allowanceKey,
        request
      );

      if (request.asset !== 0) {
        itxn
          .assetTransfer({
            sender: this.controlledAddress.value,
            assetReceiver: this.spendingAddress.value,
            assetAmount: request.amount,
            xferAsset: request.asset,
            fee: 0,
          })
          .submit();
      } else {
        itxn
          .payment({
            sender: this.controlledAddress.value,
            receiver: this.spendingAddress.value,
            amount: request.amount,
            fee: 0,
          })
          .submit();
      }
    }
  }

  private verifyAllowance(
    start: uint64,
    useRounds: boolean,
    key: arc4AllowanceKey,
    fundRequest: FundsRequest
  ): void {
    assert(this.allowances(key).exists, 'Allowance does not exist');
    const { type, spent, allowed, last, max, interval } = decodeArc4<AllowanceInfo>(this.allowances(key).value.copy().bytes);
    const arc4EpochRef = useRounds
      ? new UintN64(Global.round)
      : new UintN64(Global.latestTimestamp)

    if (type === SpendAllowanceTypeFlat) {
      const leftover: uint64 = allowed - spent;
      const amount = fundRequest.amount

      assert(leftover >= amount, 'Allowance exceeded');

      this.allowances(key).value.spent = new UintN64(spent + amount);
    } else if (type === SpendAllowanceTypeWindow) {
      const currentWindowStart = this.getLatestWindowStart(useRounds, start, interval)
      const amount = fundRequest.amount

      if (currentWindowStart > last) {
        assert(allowed >= amount, 'Allowance exceeded');
      } else {
        // calc the remaining amount available in the current window
        const leftover: uint64 = allowed - spent;
        assert(leftover >= amount, 'Allowance exceeded');
      }

      const newSpent = new UintN64(spent + amount);

      this.allowances(key).value = new arc4AllowanceInfo({
        ...this.allowances(key).value,
        spent: newSpent,
        last: arc4EpochRef
      })

    } else if (type === SpendAllowanceTypeDrip) {
      const epochRef = useRounds ? Global.round : Global.latestTimestamp;

      const amount = fundRequest.amount
      const accrualRate = allowed
      const lastLeftover = spent

      const passed: uint64 = epochRef - last
      const accrued: uint64 = lastLeftover + ((passed / interval) * accrualRate)

      const available: uint64 = accrued > max ? max : accrued

      assert(available >= amount, 'Allowance exceeded');

      const leftover = new UintN64(available - amount)

      this.allowances(key).value = new arc4AllowanceInfo({
        ...this.allowances(key).value,
        spent: leftover,
        last: arc4EpochRef
      })
    }
  }

  private getLatestWindowStart(useRounds: boolean, start: uint64, interval: uint64): uint64 {
    if (useRounds) {
      return Global.round - ((Global.round - start) % interval)
    }
    return Global.latestTimestamp - ((Global.latestTimestamp - start) % interval)
  }

  /**
   * What the value of this.address.value.authAddr should be when this.controlledAddress
   * is able to be controlled by this app. It will either be this.app.address or zeroAddress
   */
  private getAuthAddr(): Account {
    return this.spendingAddress.value === this.controlledAddress.value
      ? this.controlledAddress.value === Global.currentApplicationAddress
        ? Global.zeroAddress // contract controls itself
        : Global.currentApplicationAddress // contract controls a different account
      : Global.zeroAddress; // is a spending account 
  }

  /**
   * Create an abstracted account application.
   * This is not part of ARC58 and implementation specific.
   *
   * @param controlledAddress The address of the abstracted account. If zeroAddress, then the address of the contract account will be used
   * @param admin The admin for this app
   */
  // @ts-ignore
  @abimethod({ onCreate: 'require' })
  createApplication(controlledAddress: Address, admin: Address, spendingAccountFactoryApp: Application): void {
    assert(
      Txn.sender === controlledAddress.native
      || Txn.sender === admin.native,
      ERR_SENDER_MUST_BE_ADMIN_OR_CONTROLLED_ADDRESS
    );
    assert(admin !== controlledAddress);

    this.admin.value = admin.native;
    this.controlledAddress.value = controlledAddress.native === Global.zeroAddress ? Global.currentApplicationAddress : controlledAddress.native;
    this.spendingAccountFactoryApp.value = spendingAccountFactoryApp;
    this.spendingAddress.value = Global.zeroAddress;
    this.updateLastUserInteraction()
    this.updateLastChange()
  }

  /**
   * Attempt to change the admin for this app. Some implementations MAY not support this.
   *
   * @param newAdmin The new admin
   */
  arc58_changeAdmin(newAdmin: Address): void {
    assert(Txn.sender === this.admin.value, ERR_ONLY_ADMIN_CAN_CHANGE_ADMIN);
    this.admin.value = newAdmin.native;
    this.updateLastUserInteraction()
    this.updateLastChange()
  }

  /**
   * Attempt to change the admin via plugin.
   *
   * @param plugin The app calling the plugin
   * @param allowedCaller The address that triggered the plugin
   * @param newAdmin The new admin
   *
   */
  arc58_pluginChangeAdmin(plugin: uint64, allowedCaller: Address, newAdmin: Address): void {
    assert(Txn.sender === Application(plugin).address, ERR_SENDER_MUST_BE_ADMIN_PLUGIN);
    assert(
      this.controlledAddress.value.authAddress === Application(plugin).address,
      'This plugin is not in control of the account'
    );

    const key = new arc4PluginsKey({
      application: new UintN64(plugin),
      allowedCaller
    });

    assert(
      this.plugins(key).exists && this.plugins(key).value.admin.native,
      'This plugin does not have admin privileges'
    );

    this.admin.value = newAdmin.native;
    if (this.plugins(key).value.delegationType === DelegationTypeSelf) {
      this.updateLastUserInteraction();
    }
    this.updateLastChange()
  }

  /**
   * Get the admin of this app. This method SHOULD always be used rather than reading directly from state
   * because different implementations may have different ways of determining the admin.
   */
  // @ts-ignore
  @abimethod({ readonly: true })
  arc58_getAdmin(): Address {
    return new Address(this.admin.value);
  }

  /**
   * Verify the abstracted account is rekeyed to this app
   */
  arc58_verifyAuthAddr(): void {
    assert(this.spendingAddress.value.authAddress === this.getAuthAddr());
    this.spendingAddress.value = Global.zeroAddress
  }

  /**
   * Rekey the abstracted account to another address. Primarily useful for rekeying to an EOA.
   *
   * @param addr The address to rekey to
   * @param flash Whether or not this should be a flash rekey. If true, the rekey back to the app address must done in the same txn group as this call
   */
  arc58_rekeyTo(address: Address, flash: boolean): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);

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

    this.updateLastUserInteraction();
  }

  /**
   * check whether the plugin can be used
   *
   * @param plugin the plugin to be rekeyed to
   * @param address the address that triggered the plugin
   * @returns whether the plugin can be called via txn sender or globally
   */
  // @ts-ignore
  @abimethod({ readonly: true })
  arc58_canCall(
    plugin: uint64,
    global: boolean,
    address: Address,
    method: StaticBytes<4>
  ): boolean {
    if (global) {
      this.pluginCallAllowed(plugin, Global.zeroAddress, method);
    }
    return this.pluginCallAllowed(plugin, address.native, method);
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
  arc58_rekeyToPlugin(
    plugin: uint64,
    global: boolean,
    methodOffsets: DynamicArray<UintN64>,
    fundsRequest: DynamicArray<arc4FundsRequest>
  ): void {
    const pluginApp = Application(plugin)

    const key = new arc4PluginsKey({
      application: new UintN64(plugin),
      allowedCaller: global
        ? new Address(Global.zeroAddress)
        : new Address(Txn.sender)
    });

    assert(this.plugins(key).exists, ERR_PLUGIN_DOES_NOT_EXIST);

    this.assertValidGroup(key, methodOffsets);

    if (this.plugins(key).value.spendingApp.native !== 0) {
      const spendingApp = Application(this.plugins(key).value.spendingApp.native)
      this.spendingAddress.value = spendingApp.address;
      this.transferFunds(key, fundsRequest);

      abiCall(
        SpendingAccountContract.prototype.rekey,
        {
          appId: spendingApp,
          args: [new Address(pluginApp.address)],
          fee: 0,
        }
      )
    } else {
      this.spendingAddress.value = this.controlledAddress.value;

      itxn
        .payment({
          sender: this.spendingAddress.value,
          receiver: this.spendingAddress.value,
          rekeyTo: pluginApp.address,
          note: 'rekeying to plugin app',
          fee: 0,
        })
        .submit();
    }

    if (this.plugins(key).value.delegationType === DelegationTypeSelf) {
      this.updateLastUserInteraction();
    }
  }

  /**
   * Temporarily rekey to a named plugin app address
   *
   * @param name The name of the plugin to rekey to
   * @param global Whether this is global or local plugin usage
   * @param methodOffsets The indices of the methods being used in the group
   * if the plugin has method restrictions these indices are required to match
   * the methods used on each subsequent call to the plugin within the group
   * 
   */
  arc58_rekeyToNamedPlugin(name: string, global: boolean, methodOffsets: DynamicArray<UintN64>, fundsRequest: DynamicArray<arc4FundsRequest>): void {
    this.arc58_rekeyToPlugin(
      this.namedPlugins(name).value.application.native,
      global,
      methodOffsets,
      fundsRequest
    );
  }

  /**
   * Add an app to the list of approved plugins
   *
   * @param app The app to add
   * @param allowedCaller The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param delegationType the ownership of the delegation for last_interval updates
   * @param lastValidRound The round when the permission expires
   * @param cooldown  The number of rounds that must pass before the plugin can be called again
   * @param adminPrivileges Whether the plugin has permissions to change the admin account
   * @param methods The methods that are allowed to be called for the plugin by the address
   * 
   */
  arc58_addPlugin(
    app: uint64,
    allowedCaller: Address,
    admin: boolean,
    delegationType: UintN8,
    lastValid: uint64,
    cooldown: uint64,
    methods: DynamicArray<arc4MethodRestriction>,
    useAllowance: boolean,
    useRounds: boolean,
  ): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);
    const badDelegationCombo = (
      delegationType === DelegationTypeSelf &&
      allowedCaller.native === Global.zeroAddress
    )
    assert(!badDelegationCombo, ERR_ZERO_ADDRESS_DELEGATION_TYPE)
    const key = new arc4PluginsKey({
      application: new UintN64(app),
      allowedCaller
    });

    let methodInfos = new DynamicArray<arc4MethodInfo>();
    for (let i: uint64 = 0; i < methods.length; i += 1) {
      methodInfos.push(new arc4MethodInfo({
        selector: methods[i].selector,
        cooldown: methods[i].cooldown,
        lastCalled: new UintN64(0),
      }));
    }

    const epochRef = useRounds ? Global.round : Global.latestTimestamp;

    if (this.controlledAddress.value !== Global.currentApplicationAddress) {
      itxn
        .payment({
          sender: this.controlledAddress.value,
          receiver: Global.currentApplicationAddress,
          amount: 36_500 + (400 * methods.bytes.length),
          fee: 0,
        })
        .submit()
    }

    let spendingApp = new UintN64(0)
    if (useAllowance) {
      spendingApp = new UintN64(
        abiCall(
          SpendingAccountFactory.prototype.create,
          {
            sender: this.controlledAddress.value,
            appId: this.spendingAccountFactoryApp.value,
            args: [
              itxn.payment({
                amount: 269_500,
                receiver: this.spendingAccountFactoryApp.value.address,
                fee: 0,
              }),
              app,
            ],
            fee: 0,
          }
        ).returnValue
      )
    }

    this.plugins(key).value = new arc4PluginInfo({
      admin: new Bool(admin),
      delegationType,
      spendingApp,
      lastValid: new UintN64(lastValid),
      cooldown: new UintN64(cooldown),
      methods: methodInfos.copy(),
      useAllowance: new Bool(useAllowance),
      useRounds: new Bool(useRounds),
      lastCalled: new UintN64(0),
      start: new UintN64(epochRef),
    });

    this.updateLastUserInteraction();
    this.updateLastChange();
  }

  /**
   * Remove an app from the list of approved plugins
   *
   * @param app The app to remove
   * @param allowedCaller The address of that's allowed to call the app
   * @param methods The methods that to remove before attempting to uninstall the plugin
   * or the global zero address for all addresses
   */
  arc58_removePlugin(app: uint64, allowedCaller: Address): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);

    const key = new arc4PluginsKey({
      application: new UintN64(app),
      allowedCaller
    });

    assert(this.plugins(key).exists, ERR_PLUGIN_DOES_NOT_EXIST);

    const spendingApp = this.plugins(key).value.spendingApp.native;
    const methods = this.plugins(key).value.methods.copy();

    this.plugins(key).delete();

    if (this.controlledAddress.value !== Global.currentApplicationAddress) {
      itxn
        .payment({
          receiver: this.controlledAddress.value,
          amount: 36_500 + (400 * methods.bytes.length),
          fee: 0,
        })
        .submit()
    }

    if (spendingApp !== 0) {
      abiCall(
        SpendingAccountFactory.prototype.delete,
        {
          appId: this.spendingAccountFactoryApp.value,
          args: [spendingApp],
          fee: 0,
        }
      )
    }

    this.updateLastUserInteraction();
    this.updateLastChange();
  }

  /**
   * Add a named plugin
   *
   * @param name The plugin name
   * @param app The plugin app
   * @param allowedCaller The address of that's allowed to call the app
   * or the global zero address for all addresses
   * @param delegationType the ownership of the delegation for last_interval updates
   * @param lastValidRound The round when the permission expires
   * @param cooldown  The number of rounds that must pass before the plugin can be called again
   * @param adminPrivileges Whether the plugin has permissions to change the admin account
   * @param methods The methods that are allowed to be called for the plugin by the address
   * 
   */
  arc58_addNamedPlugin(
    name: string,
    app: uint64,
    allowedCaller: Address,
    admin: boolean,
    delegationType: UintN8,
    lastValid: uint64,
    cooldown: uint64,
    methods: DynamicArray<arc4MethodRestriction>,
    useAllowance: boolean,
    useRounds: boolean,
  ): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);
    assert(!this.namedPlugins(name).exists);

    const key = new arc4PluginsKey({
      application: new UintN64(app),
      allowedCaller
    });
    this.namedPlugins(name).value = key.copy();

    let methodInfos = new DynamicArray<arc4MethodInfo>();
    for (let i: uint64 = 0; i < methods.length; i += 1) {
      methodInfos.push(new arc4MethodInfo({
        selector: methods[i].selector,
        cooldown: methods[i].cooldown,
        lastCalled: new UintN64(0),
      }));
    }

    if (this.controlledAddress.value !== Global.currentApplicationAddress) {
      itxn
        .payment({
          sender: this.controlledAddress.value,
          receiver: Global.currentApplicationAddress,
          amount: 55_400 + (400 * (methods.bytes.length + Bytes(name).length)),
          fee: 0,
        })
        .submit()
    }

    let spendingApp = new UintN64(0)
    if (useAllowance) {
      spendingApp = new UintN64(
        abiCall(
          SpendingAccountFactory.prototype.create,
          {
            appId: this.spendingAccountFactoryApp.value,
            args: [
              itxn.payment({
                sender: this.controlledAddress.value,
                amount: 12_500,
                receiver: this.spendingAccountFactoryApp.value.address,
                fee: 0,
              }),
              0,
            ],
            fee: 0,
          }
        ).returnValue
      )
    }

    const epochRef = useRounds ? Global.round : Global.latestTimestamp;

    this.plugins(key).value = new arc4PluginInfo({
      admin: new Bool(admin),
      delegationType,
      spendingApp,
      lastValid: new UintN64(lastValid),
      cooldown: new UintN64(cooldown),
      methods: methodInfos.copy(),
      useAllowance: new Bool(useAllowance),
      useRounds: new Bool(useRounds),
      lastCalled: new UintN64(0),
      start: new UintN64(epochRef)
    })

    this.updateLastUserInteraction();
    this.updateLastChange();
  }

  /**
   * Remove a named plugin
   *
   * @param name The plugin name
   */
  arc58_removeNamedPlugin(name: string): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);
    assert(this.namedPlugins(name).exists, ERR_PLUGIN_DOES_NOT_EXIST);
    const app = this.namedPlugins(name).value.copy();
    assert(this.plugins(app).exists, ERR_PLUGIN_DOES_NOT_EXIST);

    const spendingApp = this.plugins(app).value.spendingApp.native;
    const methods = this.plugins(app).value.methods.copy();

    this.namedPlugins(name).delete();
    this.plugins(app).delete();

    if (this.controlledAddress.value !== Global.currentApplicationAddress) {
      itxn
        .payment({
          receiver: this.controlledAddress.value,
          amount: 55_400 + (400 * (methods.bytes.length + Bytes(name).length)),
          fee: 0,
        })
        .submit()
    }

    if (spendingApp !== 0) {
      abiCall(
        SpendingAccountFactory.prototype.delete,
        {
          appId: this.spendingAccountFactoryApp.value,
          args: [spendingApp],
          fee: 0,
        }
      )
    }

    this.updateLastUserInteraction();
    this.updateLastChange();
  }

  arc58_addAllowance(
    plugin: uint64,
    caller: Address,
    asset: uint64,
    type: SpendAllowanceType,
    allowed: uint64,
    max: uint64,
    interval: uint64,
  ): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);

    const pkey = new arc4PluginsKey({
      application: new UintN64(plugin),
      allowedCaller: caller
    });

    const key = new arc4AllowanceKey({
      ...pkey,
      asset: new UintN64(asset)
    });

    assert(this.plugins(pkey).exists, ERR_PLUGIN_DOES_NOT_EXIST);
    assert(!this.allowances(key).exists, ERR_ALLOWANCE_ALREADY_EXISTS);

    if (this.controlledAddress.value !== Global.currentApplicationAddress) {
      itxn
        .payment({
          sender: this.controlledAddress.value,
          receiver: Global.currentApplicationAddress,
          amount: 38_500,
          fee: 0,
        })
        .submit()
    }

    this.allowances(key).value = new arc4AllowanceInfo({
      type,
      spent: new UintN64(0),
      allowed: new UintN64(allowed),
      last: new UintN64(0),
      max: new UintN64(max),
      interval: new UintN64(interval),
    });

    this.updateLastUserInteraction();
    this.updateLastChange();
  }

  arc58_removeAllowance(plugin: uint64, caller: Address, asset: uint64): void {
    assert(Txn.sender === this.admin.value, ERR_ADMIN_ONLY);

    const pkey = new arc4PluginsKey({
      application: new UintN64(plugin),
      allowedCaller: caller
    });

    const key = new arc4AllowanceKey({
      ...pkey,
      asset: new UintN64(asset)
    });

    assert(this.plugins(pkey).exists, ERR_PLUGIN_DOES_NOT_EXIST);
    assert(this.allowances(key).exists, ERR_ALLOWANCE_DOES_NOT_EXIST);

    this.allowances(key).delete();

    if (this.controlledAddress.value !== Global.currentApplicationAddress) {
      itxn
        .payment({
          receiver: this.controlledAddress.value,
          amount: 38_500,
          fee: 0,
        })
        .submit()
    }

    this.updateLastUserInteraction();
    this.updateLastChange();
  }
}
