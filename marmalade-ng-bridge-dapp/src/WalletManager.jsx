import {useState, useEffect} from 'react'
import YAML from 'yaml'
import {createEckoWalletQuicksign, signWithChainweaver} from '@kadena/client'
import {Card, Label, Message, Form,  TextArea, Loader, Dimmer, Image, Container, Button, Modal} from 'semantic-ui-react'
import {CopyButton} from './Common'

import ECKO_LOGO from './assets/ecko-wallet-rounded.png';
import CHAINWEAVER_LOGO from './assets/chainweaver-rounded.png';

const ecko = createEckoWalletQuicksign()
const cweaver = signWithChainweaver

const SIGNERS = {"Ecko":ecko, "ChainWeaver_Desktop":cweaver, "ChainWeaver":null, "":null, null:null}


const ecko_account = (networkId) => window.kadena.request({ method: 'kda_checkStatus', networkId})
                                                 .then((x) => x.account.account)

const SelectedLabel = () => <Label color="green" icon="selected radio" corner="right" />


const WalletImage = ({src}) => <Image src={src} size="small"/>

function EckoWalletCard({selected, onClick, onAccount, network})
{
  const [isConnecting, setIsConnecting] = useState(false);

  const connect_ok = () => {ecko_account(network).then(onAccount); onClick()}

  const _onClick = () => {setIsConnecting(true);
                          ecko.connect(network)
                               .then(connect_ok)
                               .finally(() => setIsConnecting(false))
                          }

  return  <Dimmer.Dimmable as={Card} dimmed={!ecko.isInstalled() || isConnecting} raised={selected} onClick={ecko.isInstalled()?_onClick:null} color={selected?"green":undefined} >
            {selected && <SelectedLabel />}
            <Dimmer inverted active={!ecko.isInstalled() || isConnecting} />
            <Loader active={isConnecting} />
            <Card.Content header='EckoWallet' style={{minHeight:"70px"}}/>
            <Card.Content >
              <WalletImage src={ECKO_LOGO} />
            </Card.Content>
          </Dimmer.Dimmable>
}

function ChainWeaverCard({selected, onClick})
{
  return  <Card onClick={onClick} raised={selected} color={selected?"green":undefined}>
            {selected && <SelectedLabel />}
            <Card.Content header='Chainweaver' style={{minHeight:"70px"}}/>
            <Card.Content >
              <WalletImage src={CHAINWEAVER_LOGO} />
            </Card.Content>
          </Card>
}

function ChainWeaverDesktopCard({selected, onClick})
{
  return  <Card onClick={onClick} raised={selected} color={selected?"green":undefined}>
            {selected && <SelectedLabel />}
            <Card.Content header='Chainweaver Desktop' style={{minHeight:"70px"}}/>
            <Card.Content >
              <WalletImage src={CHAINWEAVER_LOGO} />
            </Card.Content>
          </Card>
}

function WalletAccountManager({onWallet, onAccount, network})
{
  const [wallet, _setWallet] = useState("")
  const [account, _setAccount] = useState("")


  const setWallet = (x) => {_setWallet(x); onWallet(x)}
  const setAccount = (x) => {_setAccount(x), onAccount(x)}


  return  <>
            <Card.Group itemsPerRow={3}>
              <EckoWalletCard onClick={() => setWallet("Ecko")} selected={wallet==="Ecko"} onAccount={setAccount} network={network}/>
              <ChainWeaverCard onClick={() => setWallet("ChainWeaver")} selected={wallet==="ChainWeaver"} />
              <ChainWeaverDesktopCard onClick={() => setWallet("ChainWeaver_Desktop")} selected={wallet==="ChainWeaver_Desktop"}/>
            </Card.Group>

            <Form.Field >
              <label>Account:</label>
              <input placeholder='Account' value={account} onChange={(e) => setAccount(e.target.value)} disabled={!wallet || wallet==="Ecko"} />
            </Form.Field>
          </>
}


function SignatureModal({trx, open, onClose})
{
  const sigdata = (trx && open)?{cmd:trx.cmd,
                                 sigs: JSON.parse(trx.cmd).signers.map((x)=>({pubKey:x.pubKey, sig:null}))
                                }:null;

  const yaml_data = YAML.stringify(sigdata)

  return  <Modal closeIcon open={open} onClose={onClose} >
            <Modal.Header>Copy Transaction to SigBuilder</Modal.Header>
            <Modal.Content>
              <Form>
                <TextArea value={yaml_data} style={{ minHeight: 300 }}  />
              </Form>
              <Container textAlign="center">
                <CopyButton value={yaml_data} fontsize={24} />
              </Container>
            </Modal.Content>
            <Modal.Actions>
              <Button onClick={onClose} positive> Ok </Button>
            </Modal.Actions>
          </Modal>
}


function TransactionManager({trx, wallet, k_client, onSent})
{
    const [localResult, setLocalResult] = useState(null);
    const [localError, setLocalError] = useState(false);
    const [sigSendError, setSigSendError] = useState(null);
    const [successful, setSuccessful] = useState(false);
    const [signatureModal, setSignatureModal] = useState(false);

    const signer = SIGNERS[wallet]

    useEffect(() => { setLocalResult(null);
                      setLocalError(false);
                      setSigSendError(null);
                      setSuccessful(false);
                      if(trx)
                      {
                        k_client.local_check(trx, {signatureVerification:false, preflight:false})
                                .then(setLocalResult)
                                .catch((e)=>{setLocalResult(e.message); setLocalError(true)})
                      }
                    },[trx, k_client]);

    const do_sign = () => { setSigSendError(null);
                            setSuccessful(false);
                            if(signer)
                            {
                              signer(trx)
                              .then((t) => k_client.preflight(t))
                              .then((t) => k_client.send(t))
                              .then(() => setSuccessful(true))
                              .then(() => onSent(trx.hash))
                              .catch((x) => setSigSendError(x))
                            }
                            else
                              setSignatureModal(true)
                          }

    return  <>
              <Form.Field>
                <label>Transaction: {trx && <CopyButton value={trx.hash} fontsize={12}/>}</label>
                <input placeholder='hash' value={trx?trx.hash:""} disabled/>
              </Form.Field>
              {localResult && <Message positive={!localError} negative={localError} header='Local Result:' content={JSON.stringify(localResult)} />}

              <Button primary disabled={!trx || localError} onClick={do_sign}>Sign and Submit</Button>
              <SignatureModal trx={trx} open={signatureModal} onClose={() => {setSignatureModal(false); onSent(trx.hash)}} />
              {sigSendError && <Message negative header='Signature / Submit Error:' content={sigSendError.toString()} />}
              {successful && <Message positive header='Signature / Submit Result:' content="Transaction successfuly signed and submitted" />}
            </>
}


export {WalletAccountManager, TransactionManager}
