import { Account, Application, Bytes, Contract, Global, op } from "@algorandfoundation/algorand-typescript";
import { AbstractAccountGlobalStateKeysControlledAddress, AbstractAccountGlobalStateKeysSpendingAddress } from "../constants";

export type Arc58Accounts = {
  walletAddress: Account;
  origin: Account;
  sender: Account;
};


export class Plugin extends Contract {

  protected getAccounts(wallet: Application): Arc58Accounts {
    const origin = this.getOriginAccount(wallet)
    const sender = this.getSpendingAccount(wallet)
    return {
      walletAddress: wallet.address,
      origin,
      sender,
    }
  }

  /**
   * getOriginAddress returns the origin address of the contract
   * @param wallet The application to get the controlled address from
   * @returns The controlled address of the contract
   */
  protected getOriginAccount(wallet: Application): Account {
    const [controlledAccountBytes] = op.AppGlobal.getExBytes(
      wallet,
      Bytes(AbstractAccountGlobalStateKeysControlledAddress)
    )
    return Account(Bytes(controlledAccountBytes))
  }

  protected getSpendingAccount(wallet: Application): Account {
    const [spendingAddressBytes] = op.AppGlobal.getExBytes(
      wallet,
      Bytes(AbstractAccountGlobalStateKeysSpendingAddress)
    )
    return Account(Bytes(spendingAddressBytes))
  }

  protected rekeyAddress(rekeyBack: boolean, wallet: Application): Account {
    if (!rekeyBack) {
      return Global.zeroAddress
    }

    const { walletAddress, origin, sender } = this.getAccounts(wallet)
    if (sender !== origin) {
      return sender
    }

    return walletAddress
  }
}