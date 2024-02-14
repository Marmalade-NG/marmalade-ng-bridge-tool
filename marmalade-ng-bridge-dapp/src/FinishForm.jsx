
import {useState, useEffect} from 'react'
import { Button, Form, Message, Header, Segment } from 'semantic-ui-react'
import {TransactionManager} from "./WalletManager";

function FinishForm({account, wallet, bridge})
{
  const [data, _setData] = useState({})
  const [error, setError] = useState(null);
  const [trxHash, _setTrxHash] = useState("");
  const [trxData, setTrxData] = useState(null);
  const [trx, setTrx] = useState(null);

  const [waitingSpv, setWaitingSpv] = useState(false)

  const setTrxHash = (x) => {_setTrxHash(x); if(x) {bridge.get_xchain_status(x)
                                                          .then(setTrxData)
                                                          .then(() => setError(null))
                                                          .catch((x) => {setError(x); setTrxData(null)});}}

  const gen_transaction = () => bridge.spv(trxHash, trxData.src.chain, trxData.dst.chain)
                                      .then( spv => bridge.gen_cont_transaction(trxData, trxHash, spv, account))
                                      .then(setTrx)
                                      .catch(setError);

  const do_reset = () => {_setTrxHash(""); setError(null); setTrxData(null); setTrx(null);}

  return  <>
          <Header textAlign="center"> Finish X-chain Transaction </Header>
          <Segment basic>
          This function is only necessary when something went wrong during a X-chain bridging attempt.
          And you want to recover the locked token.
          </Segment>
          <Form.Input disabled={trx!=null} label="Transaction Hash" value={trxHash} onChange={(e) => setTrxHash(e.target.value)}/>

          {trxData && <pre> {JSON.stringify(trxData, null, 2)}</pre>}


          <Button primary onClick={gen_transaction} disabled={!account || trx!=null || trxData==null || error!=null}> Generate Transaction </Button>
          <Button secondary onClick={do_reset}> Reset </Button>
          <Segment>
            <TransactionManager wallet={wallet} trx={trx} k_client={bridge} onSent={()=>null}/>
          </Segment>
          </>
}

export {FinishForm}
