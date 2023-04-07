// @ts-ignore
import { createApp } from 'https://unpkg.com/petite-vue?module'
import {
  SDK_BASE_URLS,
  getAccountList,
  getAccountById,
  initSDK,
  totalStaked,
  stakesPerAccount,
  amountCanBeStaked,
  stake,
  unstakePartial,
  unstake,
  getVestedSum,
  getFreeBalance,
} from './main'

createApp({
  chainNames: Object.keys(SDK_BASE_URLS),
  chainNameOrUrl: undefined,
  accountIdOrAddress: undefined,
  output: '',
  accountIds: null,
  sdk: undefined,
  account: undefined,
  amount: '',
  async requestAccountIds() {
    this.accountIds = (await getAccountList()).map(el => el.id)
  },
  setChainNameOrUrl(value: any) {
    if (value.target) {
      // eslint-disable-next-line no-underscore-dangle
      if (value.target._value) this.chainNameOrUrl = value.target._value
      else this.chainNameOrUrl = value.target.value
    }
  },
  setAccountIdOrAddress(value: any) {
    if (value.target) {
      // eslint-disable-next-line no-underscore-dangle
      if (value.target._value) this.accountIdOrAddress = value.target._value
      else this.accountIdOrAddress = value.target.value
    }
  },
  setAmount(value: any) {
    if (value.target) {
      // @ts-ignore
      // eslint-disable-next-line no-restricted-globals
      this.amount = event?.target?.value
    }
  },
  async functionWrapperLogger(func: Function, paramsArray: any[]) {
    this.output = ''
    let result = null
    try {
      result = await func(...paramsArray)
    } catch (e: any) {
      console.log(e)
      this.output = `Error: ${e.message}`
      return result
    }
    console.log(result)
    try {
      this.output = JSON.stringify(result, null, 2)
    } catch (e) {
      this.output = 'Error parsing result object'
    }
    return result
  },
  getAccountList() {
    return this.functionWrapperLogger(getAccountList, [])
  },
  async getAccountById(params: any) {
    const account = await this.functionWrapperLogger(getAccountById, params)
    this.account = account
    return account
  },
  async initSDK(params: any) {
    const sdk = await this.functionWrapperLogger(initSDK, params)
    this.sdk = sdk
    return sdk
  },
  async totalStaked(params: any) {
    return this.functionWrapperLogger(totalStaked, params)
  },
  async stakesPerAccount(params: any) {
    return this.functionWrapperLogger(stakesPerAccount, params)
  },
  async amountCanBeStaked(params: any) {
    return this.functionWrapperLogger(amountCanBeStaked, params)
  },
  async getVestedSum(params: any) {
    return this.functionWrapperLogger(getVestedSum, params)
  },
  async getFreeBalance(params: any) {
    return this.functionWrapperLogger(getFreeBalance, params)
  },
  async stake(params: any) {
    return this.functionWrapperLogger(stake, params)
  },
  async unstakePartial(params: any) {
    return this.functionWrapperLogger(unstakePartial, params)
  },
  async unstake(params: any) {
    return this.functionWrapperLogger(unstake, params)
  },
}).mount()
