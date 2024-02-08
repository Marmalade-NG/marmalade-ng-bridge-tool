import {createClient, Pact,} from '@kadena/client'
import Decimal from 'decimal.js';


const BRIDGE_GAS_LIMIT = 2500;
const LOCAL_GAS_LIMIT = 10000;
const POLLING_CHAINS = ["1", "0", "8","1","0","8"]

const V1_INTERFACE = "kip.poly-fungible-v2"
const NG_INTERFACE = "ng-poly-fungible-v1"
const GENERIC_INTERFACE = "generic-burnable-nft-v1-beta1"

const OUTBOUNT_POLICY = "policy-bridge-outbound"

const INBOUND_POLICY_PREFIX = "policy-bridge-inbound"

const do_log = (x) => {console.log(x); return x;}

const to_dec = x => typeof x == "object"?Decimal(x.decimal):Decimal(x)

const fqn = (x,y) => [x,y].join(".")

const from_modref = x => fqn(x.refName.namespace, x.refName.name)

const str_am = x => x.toFixed(4)

const pact_am = x => ({decimal:str_am(x)})

const ZERO = Decimal("0")

const ONE = Decimal("1.0")
const NULL_TARGET = {ledger:"", chain:"", token:""}


function __to_key(g)
{
  const key = g?.keys?.[0] ?? "";
  if(!key)
    throw Error("Unsupported guard")
  return key;
}

function copy_target (from, to)
{
  if(from.ledger)
  {
    if(to.ledger && to.ledger != from.ledger)
      throw Error("Tokens / ledgers do not match");
    to.ledger = from.ledger;
  }

  if(from.chain)
  {
    if(to.chain && to.chain != from.chain)
      throw Error("Tokens / chains do not match");
    to.chain = from.chain;
  }

  if(from.token)
  {
    if(to.token && to.token != from.token)
      throw Error("Tokens do not match");
    to.token = from.token;
  }
}

const copy_chain = (from, to) => to?(to.chain?to:Object.assign(to, {chain:from.chain}))
                                   :null;


class MarmaladeNGBridgeClient
{
  #client;
  #network;
  #node;
  #ng_ns;
  #bridge_ns;
  #cache;

  constructor(node, network, ng_ns, bridge_ns)
  {
    this.#node = node;
    this.#network  = network;

    this.#ng_ns = ng_ns;
    this.#bridge_ns = bridge_ns;
    this.#cache = new Map()

    this.#client = createClient( ({chainId}) => `${this.#node}/chainweb/0.0/${this.#network}/chain/${chainId}/pact`)
  }

  get network() {return this.#network}

  get ng_interface() {return fqn(this.#ng_ns,NG_INTERFACE)}

  get generic_interface() {return fqn(this.#bridge_ns, GENERIC_INTERFACE)}

  get bridge_mod()  {return fqn(this.#bridge_ns, "bridge")}


  local_check(cmd, options)
  {
    return this.#client.local(cmd, options)
          .then((resp) => { if(resp?.result?.status !== 'success')
                             {console.warn(resp); throw Error(`Error in local call: ${resp?.result?.error?.message}`);}
                            else
                              return resp.result.data;});
  }

  local_pact(pact_code, chain)
  {
    const cmd = Pact.builder
                    .execution(pact_code)
                    .setMeta({chainId:chain, gasLimit:LOCAL_GAS_LIMIT})
                    .setNetworkId(this.#network)
                    .createTransaction();
    return this.local_check(cmd, {signatureVerification:false, preflight:false});
  }

  send(cmd)
  {
    return this.#client.send(cmd);
  }

  preflight(cmd)
  {
    return this.local_check(cmd, {signatureVerification:true, preflight:true})
               .then(()=> cmd)
  }

  spv(trx_hash, src_chain, target_chain)
  {
    return this.#client.pollCreateSpv({requestKey:trx_hash, chainId: src_chain, networkId: this.#network}, target_chain,
                                      {timeout:1000*600, interval:2000})
  }

  cached_local_pact(pact_code, chain)
  {
    const key = chain + pact_code;
    if(this.#cache.has(key))
      return Promise.resolve(this.#cache.get(key))
    return this.local_pact(pact_code, chain)
               .then( (x) => {this.#cache.set(key, x); return x})
  }

  module_type(ref)
  {
    return this.cached_local_pact(`(at 'interfaces (describe-module "${ref.ledger}"))`, ref.chain)
               .then( (res) => res.includes(this.ng_interface)?"NG"
                               :(res.includes(V1_INTERFACE)?"V1"
                               :(res.includes(this.generic_interface)?"GENERIC"
                               :null)) )
               .catch(() => {throw new Error("Ledger does not exist")});
  }

  async update_ledger_type(ref)
  {
    if(ref.ledger && ref.chain)
      ref.type = await this.module_type(ref);
    else
      ref.type = "";
  }

  kda_guard(account, chain)
  {
    return this.local_pact(`(coin.details "${account}")`, chain)
               .then(x => x.guard)
               .catch(() => {throw new Error("Unable to retrieve KDA account")})
  }


  outbound_policy(ref)
  {
    return this.cached_local_pact(`(${ref.ledger}.get-policies "${ref.token}")`, ref.chain)
               .then(x => x.find(m => m.refName.name == OUTBOUNT_POLICY))
               .then(x => x?from_modref(x):null)
               .catch(() => {throw new Error("Ledger does not exist")})
  }

  inbound_policy(ref)
  {
    return this.cached_local_pact(`(${ref.ledger}.get-policies "${ref.token}")`, ref.chain)
               .then(x => x.find(m => m.refName.name.startsWith(INBOUND_POLICY_PREFIX)))
               .then(x => x?from_modref(x):null)
               .catch(() => {throw new Error("Ledger does not exist")})
  }

  output_target(ref)
  {
    return this.outbound_policy(ref)
               .then(p => p?this.cached_local_pact(`(${p}.get-data "${ref.token}")`, ref.chain):null)
               .then(target => copy_chain(ref,target?.dest))
               .catch(() => {throw new Error("Token does not exist")})

  }

  input_target(ref)
  {
    return this.inbound_policy(ref)
               .then(p => p?this.cached_local_pact(`(${p}.get-data "${ref.token}")`, ref.chain):null)
               .then(target => copy_chain(ref,target?.source))
               .catch(() => {throw new Error("Token does not exist")})
  }

  generic_amount_guard(ref, account)
  {
    return this.local_pact(`(${ref.ledger}.owner-details "${ref.token}")`, ref.chain)
               .then(r => [r.owner==account?ONE:ZERO, r.guard]);
  }

  marmalade_amount_guard(ref, account)
  {
    return this.local_pact(`(${ref.ledger}.details "${ref.token}" "${account}")`, ref.chain)
               .then(({balance, guard}) => [to_dec(balance), guard])
               .catch(() => [ZERO, null])
  }

  async complete_data(data)
  {
    let {src, dst, account} = data;
    src ??= {}
    dst ??= {}

    let guard = undefined;
    let amount = ZERO;
    let errors = []

    await this.update_ledger_type(src);

    if(src.ledger && src.chain && src.type == "NG" && src.token)
    {
      const new_dst = await this.output_target(src);
      if (new_dst)
        copy_target(new_dst, dst ?? {});
      else
        errors.push("Inbound token not bridgable")
    }

    await this.update_ledger_type(dst);
    if(dst.type && dst.type != "NG")
      errors.push("Destination ledger must be NG")


    if(dst.ledger && dst.chain && dst.token && dst.type == "NG")
    {
      const new_src = await this.input_target(dst);
      if (new_src)
        copy_target(new_src, src);
      else
        errors.push("Outbound token not bridgable")

      await this.update_ledger_type(src);
    }

    if(src.type == "GENERIC" && src.token)
      [amount, guard] = await this.generic_amount_guard(src, account);

    if(account && (src.type == "NG" || src.type== "V1"))
      [amount, guard] = await this.marmalade_amount_guard(src, account)

    return [{type:this._bridge_type(src, dst), src:src, dst:dst, account:account, amount:amount, guard:guard}, errors.length==0?null:errors];
  }

  data_valid(data)
  {
    const {src, dst, account, guard, amount} = data;
    const ref_valid = x => x && x.ledger && x.chain && x.token && x.type
    return ref_valid(src) && ref_valid(dst) && guard && account && amount && !amount.eq(ZERO);
  }

  _bridge_type(src, dst)
  {
    const same_token = src.token==dst.token;
    const same_ledger = src.ledger==dst.ledger;
    const same_chain = src.chain==dst.chain;

    if(dst.type && dst.type!="NG")
      return "UNSUPPORTED"

    if(src.type=="NG")
    {
      if(!same_ledger && same_token && same_chain)
        return "NG-NG"
      if(same_ledger && !same_token && same_chain)
        return "NG-LOOP";
      if(same_ledger && same_token && !same_chain)
        return "NG-XCHAIN";
    }

    if(src.type=="V1" && same_chain)
      return "V1-NG";

    if(src.type=="GENERIC" && same_chain)
      return "GENERIC-NG"

    return null;
  }

  transaction_code(data)
  {
    const {src, dst, account, amount, type} = data;
    switch(type)
    {
      case "NG-NG":
        return `(${this.bridge_mod}.bridge-ng-to-ng ${src.ledger} ${dst.ledger} "${src.token}" "${account}" ${str_am(amount)})`
      case "NG-LOOP":
        return `(${this.bridge_mod}.bridge-ng-loop ${src.ledger} "${src.token}" "${dst.token}" "${account}" ${str_am(amount)})`
      case "NG-XCHAIN":
        return `(${this.bridge_mod}.bridge-ng-xchain ${src.ledger} "${dst.chain}" "${src.token}"  "${account}" ${str_am(amount)})`
      case "V1-NG":
        return `(${this.bridge_mod}.bridge-v1-to-ng ${src.ledger} ${src.helper} "${src.token}" "${dst.token}" "${account}" ${str_am(amount)})`
      case "GENERIC-NG":
        return `(${this.bridge_mod}.bridge-generic-to-ng ${src.ledger} ${dst.ledger} "${src.token}" "${dst.token})`
      default:
        throw Error("Unknown bridge type");
    }
  }

  async gen_transaction(data, gas_account)
  {
    const {src, account, amount, guard} = data;
    const _gas_account = gas_account ?? account;
    const _gas_guard = await this.kda_guard(_gas_account, src.chain);

    let cmd = Pact.builder
                  .execution(this.transaction_code(data))
                  .setMeta({sender:_gas_account, chainId:src.chain, gasLimit:BRIDGE_GAS_LIMIT})
                  .setNetworkId(this.#network)
                  .addSigner(__to_key(_gas_guard), (withCapability) => [withCapability('coin.GAS')])

    if(src.type == "V1" || src.type=="NG")
      cmd = cmd.addSigner(__to_key(guard), (withCapability) => [withCapability(`${src.ledger}.BURN`, src.token, account, pact_am(amount) )])

    return cmd.createTransaction()

  }

  async gen_cont_transaction(data, src_hash, spv, gas_account)
  {
    const {dst, account} = data;
    const _gas_account = gas_account ?? account;
    const _gas_guard = await this.kda_guard(_gas_account, dst.chain);

    const  cmd = Pact.builder
                 .continuation({pactId:src_hash, step:1, rollback:false, proof:spv})
                 .setMeta({sender:_gas_account, chainId:dst.chain, gasLimit:BRIDGE_GAS_LIMIT})
                 .setNetworkId(this.#network)
                 .addSigner(__to_key(_gas_guard), (withCapability) => [withCapability('coin.GAS')])

    return cmd.createTransaction();
  }

  get_xchain_status(trx_hash)
  {
    function _filter(data)
    {
      if(!data[trx_hash])
        throw Error("No transaction")
      else
        return data[trx_hash]
    }

    function _process(trx)
    {
      const {data, provenance} = trx.continuation.yield
      const ledger = from_modref(data.ledger)
      return {src:{ledger:ledger, token:data['token-id'], chain:data['source-chain']},
              dst:{ledger:ledger, token:data['token-id'], chain:provenance.targetChainId},
              account:data.account, amount:data.amount}
    }

    return this.#client.getStatus(POLLING_CHAINS.map(x => ({requestKey:trx_hash, chainId:x, networkId:this.#network})))
                       .then(_filter).then(_process)
  }

}

export {MarmaladeNGBridgeClient};
