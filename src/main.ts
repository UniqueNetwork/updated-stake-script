import { Client, Sdk, ExtrinsicResultResponse } from '@unique-nft/sdk'
import Extension, { IPolkadotExtensionAccount } from '@unique-nft/utils/extension'
import { Address } from '@unique-nft/utils'

import { amountChainFormat, amountFloatFormat } from './uitls'

export const SDK_BASE_URLS = <const>{
  opal: 'https://rest.unique.network/opal/v1',
  quartz: 'https://rest.unique.network/quartz/v1',
  unique: 'https://rest.unique.network/unique/v1',
}
type SDK_NETWORK = keyof typeof SDK_BASE_URLS
const SDK_NETWORKS = Object.keys(SDK_BASE_URLS) as SDK_NETWORK[]

export async function getAccountList(): Promise<IPolkadotExtensionAccount[]> {
  const enablingResult = await Extension.Polkadot.enableAndLoadAllWallets()

  if (!enablingResult.info.extensionFound) {
    console.log('Extension.Polkadot not found', Extension.Polkadot)
    throw new Error('Extension not found')
  } else if (!enablingResult.info.accountsFound) {
    throw new Error('No accounts found')
  } else if (enablingResult.info.userHasBlockedAllWallets) {
    throw new Error('All wallets are blocked')
  } else if (enablingResult.info.userHasWalletsButHasNoAccounts) {
    throw new Error('No accounts found. Please, create an account')
  }
  return enablingResult.accounts
}

export async function getAccountOrAddress(
  accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string,
  receivedAccounts?: IPolkadotExtensionAccount[],
): Promise<IPolkadotExtensionAccount | string> {
  if (!accountOrAccountIdOrAddress) {
    throw new Error('accountOrAccountIdOrAddress parameter in function getAccountOrAddress is empty')
  }
  if (typeof accountOrAccountIdOrAddress === 'object') {
    if (!accountOrAccountIdOrAddress.address) {
      throw new Error('Invalid input parameters')
    }
    return accountOrAccountIdOrAddress
  }
  const accounts = receivedAccounts || (await getAccountList())
  const account = accounts.find(el => el.id === accountOrAccountIdOrAddress)
  if (account) return account
  let isValidAddress = false
  try {
    isValidAddress = Address.validate.substrateAddress(accountOrAccountIdOrAddress)
  } catch (e) {
    //
  }
  if (!isValidAddress) {
    throw new Error('The input parameter is neither an address nor an account id for this wallet')
  }
  return accountOrAccountIdOrAddress
}

export async function getAccountById(
  accountId: string,
  accounts?: IPolkadotExtensionAccount[],
): Promise<IPolkadotExtensionAccount> {
  const account = await getAccountOrAddress(accountId, accounts)
  if (typeof account === 'string') throw new Error('Account not found')
  return account
}

export function initSDK(sdkInstanceOrChainNameOrUrl?: Client | string): Client {
  if (!sdkInstanceOrChainNameOrUrl) {
    throw new Error(`sdkInstanceOrChainNameOrUrl parameter in function initSDK is empty`)
  }

  if (typeof sdkInstanceOrChainNameOrUrl === 'object') {
    if (!(sdkInstanceOrChainNameOrUrl instanceof Client)) {
      throw new Error(
        `The sdkInstanceOrChainNameOrUrl is not an instance of Sdk: ${typeof sdkInstanceOrChainNameOrUrl}`,
      )
    }

    return sdkInstanceOrChainNameOrUrl
  }

  if (typeof sdkInstanceOrChainNameOrUrl !== 'string') {
    throw new Error(
      `The sdkInstanceOrChainNameOrUrl is not an object or a string: ${typeof sdkInstanceOrChainNameOrUrl}`,
    )
  }

  if (SDK_NETWORKS.includes(sdkInstanceOrChainNameOrUrl as SDK_NETWORK)) {
    console.log(`SDK initialized at ${SDK_BASE_URLS[sdkInstanceOrChainNameOrUrl as SDK_NETWORK]}`)
    return new Sdk({ baseUrl: SDK_BASE_URLS[sdkInstanceOrChainNameOrUrl as SDK_NETWORK] })
  }
  try {
    // check url is valid
    new URL(sdkInstanceOrChainNameOrUrl)

    // some warnings about url form
    if (!sdkInstanceOrChainNameOrUrl.startsWith('https://')) {
      console.warn(`The URL does not start with https://.`)
    }
    if (!sdkInstanceOrChainNameOrUrl.endsWith('/v1')) {
      console.warn(`The URL does not end with /v1.`)
    }

    console.log(`SDK initialized at ${sdkInstanceOrChainNameOrUrl}`)
    return new Sdk({ baseUrl: sdkInstanceOrChainNameOrUrl })
  } catch (e: any) {
    throw new Error(`The sdkInstanceOrChainNameOrUrl (url) input parameter is of the wrong type: ${e.message}`)
  }
}

export async function totalStaked(
  accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string,
  sdkInstanceOrChainNameOrUrl: Client | string,
): Promise<number> {
  const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
  const accountOrAddress = await getAccountOrAddress(accountOrAccountIdOrAddress)
  const address = typeof accountOrAddress === 'string' ? accountOrAddress : accountOrAddress.address

  const result: { human: string, empty: any } = await sdk.stateQuery.execute(
    {
      endpoint: 'rpc',
      module: 'appPromotion',
      method: 'totalStaked',
    },
    { args: [{ Substrate: address } as any] },
  )
  console.log(result)
  if (result.empty) return 0
  return amountFloatFormat(sdk, result.human)
}

export async function stakesPerAccount(accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string, sdkInstanceOrChainNameOrUrl: Client | string):
  Promise<number> {
  const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
  const accountOrAddress = await getAccountOrAddress(accountOrAccountIdOrAddress)
  const address = typeof accountOrAddress === 'string' ? accountOrAddress : accountOrAddress.address

  const result = await sdk.stateQuery.execute({
      endpoint: 'query',
      module: 'appPromotion',
      method: 'stakesPerAccount',
    },
    {args: [address]}
  )
  return Number(result.human)
}

const getLocksSum = async (sdk: Client, address: string, method, ids: string[] = []): Promise<bigint> => {
  const locks: { human: Array<{id: string, amount: string }>} = await sdk.stateQuery.execute(
    {
      endpoint: 'query',
      module: 'balances',
      method,
    },
    { args: [address] },
  );

  return locks.human?.reduce((acc, lock) => {
    return ids.includes(lock.id) ? acc + BigInt(lock.amount.split(',').join('')) : acc;
  }, 0n) || 0n;
}

export async function getVestedSum(
  accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string,
  sdkInstanceOrChainNameOrUrl: Client | string,
): Promise<number> {
  const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
  const accountOrAddress = await getAccountOrAddress(accountOrAccountIdOrAddress)
  const address = typeof accountOrAddress === 'string' ? accountOrAddress : accountOrAddress.address

  const vestedSum = await getLocksSum(sdk, address, 'locks', ['ormlvest'])
  console.dir({ vestedSum }, {depth: null});

  return amountFloatFormat(sdk, vestedSum.toString());
}

export async function getFreeBalance(
  accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string,
  sdkInstanceOrChainNameOrUrl: Client | string,
): Promise<number> {
  const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
  const accountOrAddress = await getAccountOrAddress(accountOrAccountIdOrAddress)
  const address = typeof accountOrAddress === 'string' ? accountOrAddress : accountOrAddress.address

  const { freeBalance } = await sdk.balance.get({ address })

  console.dir({ freeBalance }, {depth: null});

  return Number(freeBalance.amount);
}

export async function amountCanBeStaked(
  accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string,
  sdkInstanceOrChainNameOrUrl: Client | string,
): Promise<number> {
  const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
  const accountOrAddress = await getAccountOrAddress(accountOrAccountIdOrAddress)
  const address = typeof accountOrAddress === 'string' ? accountOrAddress : accountOrAddress.address

  const { freeBalance } = await sdk.balance.get({ address })
  const { decimals } = freeBalance;

  const free = BigInt(freeBalance.raw);
  const locksSum = await getLocksSum(sdk, address, 'freezes', ['appstake', 'appstakeappstake'])

  const canBeStaked = (free - locksSum);

  const formatted = await amountFloatFormat(decimals, canBeStaked.toString());

  console.dir({ free, locksSum, canBeStaked, formatted }, {depth: null});

  return formatted;
}

export async function stake(
  accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string,
  sdkInstanceOrChainNameOrUrl: Client | string,
  initAmount: number | string,
): Promise<ExtrinsicResultResponse<any> & { success: boolean; }> {
  const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
  const account = await getAccountOrAddress(accountOrAccountIdOrAddress)
  if (typeof account === 'string') {
    throw new Error('Failed to get an account')
  }

  if (!initAmount) {
    throw new Error('The initAmount input parameter is empty')
  }
  const amount = await amountChainFormat(sdk, initAmount)

  const result: any = await sdk.extrinsics.submitWaitResult(
    {
      address: account.address,
      section: 'appPromotion',
      method: 'stake',
      args: [amount],
    },
    account.uniqueSdkSigner,
  )
  if (result.error) return { ...result, success: false }

  const chainPropertiesResult = await sdk.common.chainProperties();

  return {
    ...result,
    link: `extrinsic/${result.block.header.number}`,
    polkadotLink: `https://polkadot.js.org/apps/?rpc=${chainPropertiesResult.wsUrl}#/explorer/query/${result.block.header.number}`,
    success: true,
  }
}

export async function unstake(
  accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string,
  sdkInstanceOrChainNameOrUrl: Client | string
): Promise<ExtrinsicResultResponse<any> & { success: boolean; }> {
  const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
  const account = await getAccountOrAddress(accountOrAccountIdOrAddress)
  if (typeof account === 'string') {
    throw new Error('Failed to get an account')
  }

  const result: any = await sdk.extrinsics.submitWaitResult(
    {
      address: account.address,
      section: 'appPromotion',
      method: 'unstakeAll',
      args: [],
    },
    account.uniqueSdkSigner,
  )
  if (result.error) return { ...result, success: false }

  const chainPropertiesResult = await sdk.common.chainProperties();

  console.log('After the end of week this sum becomes completely free for further use')
  return {
    ...result,
    link: `extrinsic/${result.block.header.number}`,
    polkadotLink: `https://polkadot.js.org/apps/?rpc=${chainPropertiesResult.wsUrl}#/explorer/query/${result.block.header.number}`,
    success: true
  }
}

export async function unstakePartial(
  accountOrAccountIdOrAddress: IPolkadotExtensionAccount | string,
  sdkInstanceOrChainNameOrUrl: Client | string,
  initAmount: number | string,
): Promise<ExtrinsicResultResponse<any> & { success: boolean; }> {
  const sdk = initSDK(sdkInstanceOrChainNameOrUrl)
  const account = await getAccountOrAddress(accountOrAccountIdOrAddress)
  if (typeof account === 'string') {
    throw new Error('Failed to get an account')
  }

  if (!initAmount) {
    throw new Error('The initAmount input parameter is empty')
  }
  const amount = await amountChainFormat(sdk, initAmount)

  const result: any = await sdk.extrinsics.submitWaitResult(
    {
      address: account.address,
      section: 'appPromotion',
      method: 'unstakePartial',
      args: [amount],
    },
    account.uniqueSdkSigner,
  )
  if (result.error) return { ...result, success: false }

  const chainPropertiesResult = await sdk.common.chainProperties();

  console.log('After the end of week this sum becomes completely free for further use')
  return {
    ...result,
    link: `extrinsic/${result.block.header.number}`,
    polkadotLink: `https://polkadot.js.org/apps/?rpc=${chainPropertiesResult.wsUrl}#/explorer/query/${result.block.header.number}`,
    success: true
  }
}
