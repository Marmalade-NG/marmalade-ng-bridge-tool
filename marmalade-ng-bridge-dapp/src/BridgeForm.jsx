import {Grid, Container, Divider, Segment, Header, Icon, Form, Message, Button, Dimmer, Loader, Label} from 'semantic-ui-react'
import {useState, useEffect, useCallback} from 'react'
import {TransactionManager} from "./WalletManager";
import {PREDEF_LEDGERS} from "./OnChainRefs";
import Decimal from 'decimal.js';

const to_key = g => g?.keys?.[0] ?? "";
const pretty_amount = x => x?x.toFixed(1):"";

const ZERO = Decimal("0")

function TokenEndpoint({endpoint, setEndpoint, disabled, network})
{
  const predef = PREDEF_LEDGERS[network]
  const selectOptions = predef.map((x,i)=> ({text:x.name, value:i}))
  selectOptions.push({text:"", value:-1})

  const selected = predef.findIndex(x => x.ledger == endpoint?.ledger && x.chain == endpoint?.chain)

  const change_predef_ledger = (x) => { if(x!=-1) setEndpoint({...endpoint, ...predef[x]}) }

  return <>
    <Form.Select disabled={disabled} value={selected} fluid label='Ledger' options={selectOptions}
                 onChange={(_, e) => {change_predef_ledger(e.value)}}/>
    <Form.Group>
      <Form.Input disabled={disabled} label="Module" width={14} value={endpoint?.ledger?? ""} onChange={(e) => setEndpoint({...endpoint, ledger:e.target.value})}/>
      <Form.Input disabled={disabled} fluid label="Chain" width={2} value={endpoint?.chain?? ""} onChange={(e) => setEndpoint({...endpoint, chain:e.target.value})} />
    </Form.Group>
    <Form.Input disabled={disabled} readOnly label="Ledger type" value={endpoint?.type?? ""} />
    <Form.Input disabled={disabled} label="Token ID" value={endpoint?.token?? ""} onChange={(e) => setEndpoint({...endpoint, token:e.target.value})} />
  </>
}


function TypeLabel({data})
{
  const {type} = data;
  return <Container textAlign="center">
          {type=="NG-NG" &&       <Label circular color="purple" size="hug"> <Icon name="angle double right" /> Marmalade NG Cross Ledger </Label>}
          {type=="NG-LOOP" &&     <Label circular color="purple" size="big"> <Icon name="sync" /> Marmalade NG Token Upgrade </Label>}
          {type=="NG-XCHAIN" &&   <Label circular color="purple" size="big"> <Icon name="expand arrows alternate" /> Marmalade NG X-Chain </Label> }
          {type=="V1-NG" &&       <Label circular color="purple" size="big"> <Icon name="angle double right" /> Marmalade V1 - Marmalade NG </Label>}
          {type=="GENERIC-NG" &&  <Label circular color="purple" size="big"> <Icon name="angle double right" /> Generic Ledger - Marmalade NG </Label>}
          {type=="UNSUPPORTED" && <Label circular color="red" size="big"> <Icon name="close" /> Invalid bridging scheme </Label>}
        </Container>
}

function BridgeForm({account, wallet, bridge})
{
  const [data, _setData] = useState({})
  const [errors, setErrors] = useState(null);
  const [trx, setTrx] = useState(null);

  const [contTrx, setContTrx] = useState(null)
  const [waitingSpv, setWaitingSpv] = useState(false)

  const setData = x => {_setData(x); bridge.complete_data(x)
                                           .then( ([d,e]) => {_setData(d);setErrors(e)})
                                           .catch(e => setErrors([e.message]))
                                          };

  useEffect( ()=> {setData({...data, account:account})}, [account])

  const key = to_key(data.guard)

  const gen_transaction = () => {bridge.gen_transaction(data).then(setTrx)}

  const get_spv = () => {setWaitingSpv(true);
                         bridge.spv(trx?.hash, data.src.chain, data.dst.chain)
                               .then((spv) => bridge.gen_cont_transaction(data, trx?.hash, spv))
                               .then(setContTrx)
                               .finally(() => setWaitingSpv(false))}

  const do_reset = () => {_setData({account:account}); setErrors(null); setTrx(null); setContTrx(null); setWaitingSpv(false)}

  console.log(data)

  return  <>
            <Segment>
              <Segment basic>
                <Grid columns={2} textAlign='center' >
                  <Grid.Row verticalAlign='top'>
                    <Grid.Column  textAlign='left' >
                      <Header icon textAlign='center' as="h4">
                        <Icon name='plane departure' size="big" className="ICON_NAME"  />
                        Source
                      </Header>
                      <TokenEndpoint network={bridge.network} disabled={trx!=null} endpoint={data.src} setEndpoint={(x) => {setData({...data, src:x})}}/>

                      <Form.Group>
                        <Form.Input disabled={trx!=null} width={12} readOnly label="Guard (Key)" value={key}
                                    error={!key && data.src?.token?"Guard not found":null}/>

                        <Form.Input disabled={trx!=null} width={4} readOnly fluid label="Amount" value={pretty_amount(data.amount)}
                                    error={ (data.src?.token && data.amount && data.amount.eq(ZERO))?"Token not owned":null}/>
                      </Form.Group>
                    </Grid.Column>

                    <Grid.Column  textAlign='left'>
                      <Header icon textAlign='center' as="h4">
                        <Icon name='plane arrival' size="big" className="ICON_NAME"  />
                        Destination
                      </Header>
                      <TokenEndpoint network={bridge.network} disabled={trx!=null} endpoint={data.dst}  setEndpoint={x => setData({...data, dst:x})}/>
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
                <Divider vertical><Icon style={{marginTop:"-14px"}}name="angle double right" size="big" /></Divider>
              </Segment>
              {bridge.data_valid(data) && <TypeLabel data={data} />}
              {errors &&  <Message negative header='Bridge Error:' content={errors.join("\n")} />}
            </Segment>
            <Button primary onClick={gen_transaction} disabled={trx!=null || errors!=null || !bridge.data_valid(data)}> Generate Transaction </Button>
            <Button secondary onClick={do_reset}> Reset </Button>

            <Segment>
              <TransactionManager wallet={wallet} trx={trx} k_client={bridge} onSent={()=> {data.type=="NG-XCHAIN"?get_spv():null}}/>
            </Segment>

            {bridge.data_valid(data) && data.type == "NG-XCHAIN" &&
              <Dimmer.Dimmable as={Segment} blurring dimmed={contTrx==null}>
                <Label color='blue' ribbon>Continuation </Label>
                <Dimmer active={contTrx==null}>
                  <Loader size="big" active={waitingSpv}> Waiting for Burn proof </Loader>
                </Dimmer>

                <TransactionManager wallet={wallet} trx={contTrx} k_client={bridge} onSent={()=>null}/>
              </Dimmer.Dimmable>}
        </>


}

export {BridgeForm};
