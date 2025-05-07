import { Account, Application, assert, assertMatch, BoxMap, Contract, Global, gtxn, itxn, uint64 } from "@algorandfoundation/algorand-typescript";
import { abimethod, Address, compileArc4, DynamicArray, StaticBytes, UintN64 } from "@algorandfoundation/algorand-typescript/arc4";
import { SpendingAccountContract } from "./spending_account.algo";

const ERR_ONLY_APPS = 'Only applications can create spending accounts'
const ERR_FORBIDDEN = 'only the creator wallet can delete a spending account'

function bytes16(acc: Account): StaticBytes<16> {
  return new StaticBytes<16>(acc.bytes.slice(0, 16))
}

export class SpendingAccountFactory extends Contract {

  walletIDsByAccounts = BoxMap<StaticBytes<16>, uint64>({ keyPrefix: 'a' })

  create(payment: gtxn.PaymentTxn, plugin: uint64): uint64 {
    const caller = Global.callerApplicationId
    assert(caller !== 0, ERR_ONLY_APPS)

    const spendingAccount = compileArc4(SpendingAccountContract);

    const childAppMBR: uint64 = (
      200_000
      + (28_500 * spendingAccount.globalUints)
      + (50_000 * spendingAccount.globalBytes)
      + 12_500
    )

    assertMatch(
      payment,
      {
        receiver: Global.currentApplicationAddress,
        amount: childAppMBR,
      }
    )

    const newSpendAccount = spendingAccount.call
      .createApplication({
        args: [caller, plugin],
        fee: 0
      })
      .itxn
      .createdApp

    const id = newSpendAccount.id
    const spendAccount = bytes16(newSpendAccount.address)

    this.walletIDsByAccounts(spendAccount).value = caller

    itxn
      .payment({
        receiver: newSpendAccount.address,
        amount: 100_000,
        fee: 0,
      })
      .submit()

    return id
  }

  delete(id: uint64): void {
    const caller = Global.callerApplicationId
    assert(caller !== 0, ERR_ONLY_APPS)
    const key = bytes16(Application(id).address)
    assert(
      this.walletIDsByAccounts(key).exists &&
      caller === this.walletIDsByAccounts(key).value,
      ERR_FORBIDDEN
    )

    const spendingAccount = compileArc4(SpendingAccountContract);

    const childAppMBR: uint64 = (
      200_000
      + (28_500 * spendingAccount.globalUints)
      + (50_000 * spendingAccount.globalBytes)
      + 12_500
    )

    spendingAccount.call.deleteApplication({ appId: id, fee: 0 })

    this.walletIDsByAccounts(key).delete()

    itxn
      .payment({
        amount: childAppMBR,
        rekeyTo: Global.callerApplicationAddress,
        fee: 0,
      })
      .submit()
  }

  // @ts-ignore
  @abimethod({ readonly: true })
  exists(address: Address): boolean {
    return this.walletIDsByAccounts(bytes16(address.native)).exists
  }

  // @ts-ignore
  @abimethod({ readonly: true })
  get(address: Address): uint64 {
    if (!this.walletIDsByAccounts(bytes16(address.native)).exists) {
      return 0
    }
    return this.walletIDsByAccounts(bytes16(address.native)).value
  }

  // @ts-ignore
  @abimethod({ readonly: true })
  mustGet(address: Address): uint64 {
    assert(this.walletIDsByAccounts(bytes16(address.native)).exists, 'Account not found')
    return this.walletIDsByAccounts(bytes16(address.native)).value
  }

  // @ts-ignore
  @abimethod({ readonly: true })
  getList(addresses: DynamicArray<Address>): DynamicArray<UintN64> {
    const apps = new DynamicArray<UintN64>()
    for (let i: uint64 = 0; i < addresses.length; i++) {
      const address = addresses[i]
      if (this.walletIDsByAccounts(bytes16(address.native)).exists) {
        apps.push(new UintN64(this.walletIDsByAccounts(bytes16(address.native)).value))
      } else {
        apps.push(new UintN64(0))
      }
    }
    return apps
  }

  // @ts-ignore
  @abimethod({ readonly: true })
  mustGetList(addresses: DynamicArray<Address>): DynamicArray<UintN64> {
    const apps = new DynamicArray<UintN64>()
    for (let i: uint64 = 0; i < addresses.length; i++) {
      const address = addresses[i]
      assert(this.walletIDsByAccounts(bytes16(address.native)).exists, 'Account not found')
      apps.push(new UintN64(this.walletIDsByAccounts(bytes16(address.native)).value))
    }
    return apps
  }
}